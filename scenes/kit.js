// @ts-check
// The drawing kit every drawn scene shares, so all four stand-in videos look
// like one set: the same drone height, ground textures, crew, truck, trailer
// and loader. Modelled on Sashook's own rig (2026-09-30): a white crew-cab
// pickup with a bed cover, a black high-sided tandem dump trailer, and a yellow
// compact track loader with a rake grapple or a bucket.
//
// World units: 1600 x 1000, top-down. Poses face +x (a vehicle's front).

export const WORLD = {width: 1600, height: 1000};
export const TRAILER = {halfLength: 190, halfWidth: 98, hitch: 266};
export const TRUCK = {length: 280, halfWidth: 62};
export const CREW = [
    {shirt: '#ff7a1a', hat: '#f5b700'},
    {shirt: '#c6e03a', hat: '#f4f4f0'},
];

/** @typedef {{x: number, y: number, angle: number}} Pose */
/** @typedef {{x: number, y: number, facing: number, isCarrying: boolean, stride: number}} WorkerState */
/** @typedef {{kind: string, width: number, height: number, color: string}} Item */

/** @param {number} seed */
export function seededRandom(seed) {
    let state = seed;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
}

export const clamp = (/** @type {number} */ value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
export const ease = (/** @type {number} */ t) => t * t * (3 - 2 * t);
export const lerp = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ t) => a + (b - a) * t;

/** Progress through a window of the timeline, eased, 0 before and 1 after. @param {number} progress @param {number} start @param {number} end */
export function stage(progress, start, end) {
    return ease(clamp((progress - start) / (end - start)));
}

/** @param {Pose} pose @param {number} localX @param {number} localY */
export function toWorld(pose, localX, localY) {
    const cos = Math.cos(pose.angle);
    const sin = Math.sin(pose.angle);
    return {x: pose.x + localX * cos - localY * sin, y: pose.y + localX * sin + localY * cos};
}

// ------------------------------------------------------------- the ground ---

/** Paints once onto its own canvas; scenes draw it every frame. @param {(context: CanvasRenderingContext2D) => void} paint */
export function paintOnce(paint) {
    const canvas = document.createElement('canvas');
    canvas.width = WORLD.width;
    canvas.height = WORLD.height;
    const context = canvas.getContext('2d');
    if (context) paint(context);
    return canvas;
}

/** A textured patch of ground: dirt, grass, concrete, asphalt. @param {CanvasRenderingContext2D} context @param {() => number} random @param {{x: number, y: number, width: number, height: number}} area @param {string} base @param {string[]} flecks @param {number} size */
export function surface(context, random, area, base, flecks, size = 3) {
    context.fillStyle = base;
    context.fillRect(area.x, area.y, area.width, area.height);
    const count = Math.round((area.width * area.height) / (size * size * 18));
    for (let index = 0; index < count; index++) {
        context.fillStyle = flecks[index % flecks.length] ?? base;
        context.globalAlpha = 0.25 + random() * 0.35;
        context.fillRect(area.x + random() * area.width, area.y + random() * area.height, size * (0.5 + random()), size * (0.5 + random()));
    }
    context.globalAlpha = 1;
}

export const GROUND = {
    dirt: {base: '#7b6a53', flecks: ['#6b5b46', '#8d7b62', '#5f513f']},
    grass: {base: '#56702f', flecks: ['#4a6128', '#6a8638', '#3f5422']},
    concrete: {base: '#bdb7ab', flecks: ['#a9a397', '#cfc9bd', '#9d978b']},
    asphalt: {base: '#56524c', flecks: ['#4a4641', '#625e57']},
    roof: {base: '#4d4f55', flecks: ['#44464b', '#5a5c62']},
};

/** A pitched roof seen from above: two planes and a ridge. @param {CanvasRenderingContext2D} context @param {() => number} random @param {{x: number, y: number, width: number, height: number}} area */
export function roof(context, random, area) {
    surface(context, random, area, GROUND.roof.base, GROUND.roof.flecks, 3);
    context.fillStyle = 'rgba(255, 255, 255, 0.06)';
    context.fillRect(area.x, area.y, area.width, area.height / 2);
    context.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    context.lineWidth = 4;
    context.strokeRect(area.x, area.y, area.width, area.height);
    context.beginPath();
    context.moveTo(area.x, area.y + area.height / 2);
    context.lineTo(area.x + area.width, area.y + area.height / 2);
    context.stroke();
}

// ----------------------------------------------------------------- camera ---

/**
 * Cover-fits the world into the canvas, with a slow drone rise (zoom out) over the story.
 * @param {CanvasRenderingContext2D} context @param {number} width @param {number} height @param {number} progress
 * @param {{zoomFrom?: number, landscapeX: [number, number], portraitX: number, focusY?: number}} framing
 */
export function applyCamera(context, width, height, progress, framing) {
    const zoom = lerp(framing.zoomFrom ?? 1.14, 1, ease(progress));
    const scale = Math.max(width / WORLD.width, height / WORLD.height) * zoom;
    const focusX = width < height ? framing.portraitX : lerp(framing.landscapeX[0], framing.landscapeX[1], progress);
    const focusY = framing.focusY ?? WORLD.height / 2;
    context.setTransform(scale, 0, 0, scale, width / 2 - focusX * scale, height / 2 - focusY * scale);
}

/** Clears the canvas before a frame. @param {CanvasRenderingContext2D} context @param {number} width @param {number} height */
export function clearFrame(context, width, height) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, width, height);
}
