// @ts-check
// Runs a scroll story: pins the stage, maps scroll to progress, draws the
// scene and swaps the message at each step. Without this file, or with reduced
// motion, the section stays a plain list (a still frame for the latter).

const MAX_PIXEL_RATIO = 2;
const STILL_PROGRESS = 0.55;

/** @typedef {{draw(context: CanvasRenderingContext2D, progress: number, width: number, height: number): void}} Scene */

// Drawn stand-ins, loaded only for the stories on the page.
/** @type {Record<string, () => Promise<{createScene: () => Scene}>>} */
const DRAWN_SCENES = {
    'demo-day': () => import('./scenes/demo-day.js'),
    'trailer-drop': () => import('./scenes/trailer-drop.js'),
    'land-clearing': () => import('./scenes/land-clearing.js'),
    'garage-cleanout': () => import('./scenes/garage-cleanout.js'),
};

/** Real footage as numbered frames, e.g. /media/demo-day/frame-{n}.webp. focusX (0 to 1) keeps the action in view when a tall screen crops the sides. @param {string} pattern @param {number} count @param {number} focusX @returns {Scene} */
function createFrameScene(pattern, count, focusX) {
    /** @type {HTMLImageElement[]} */
    const frames = [];
    for (let index = 1; index <= count; index++) {
        const image = new Image();
        image.decoding = 'async';
        image.src = pattern.replace('{n}', String(index).padStart(3, '0'));
        frames.push(image);
    }
    return {
        draw(context, progress, width, height) {
            const wanted = Math.round(progress * (count - 1));
            // Nearest frame that has arrived, so a slow connection shows something.
            let image = frames[wanted];
            for (let offset = 1; image && !image.complete && offset < count; offset++) image = frames[wanted - offset] ?? frames[wanted + offset];
            if (!image || !image.complete || image.naturalWidth === 0) return;
            const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
            context.setTransform(1, 0, 0, 1, 0, 0);
            const drawnWidth = image.naturalWidth * scale;
            const left = Math.min(0, Math.max(width - drawnWidth, width / 2 - focusX * drawnWidth));
            context.drawImage(
                image,
                left,
                (height - image.naturalHeight * scale) / 2,
                image.naturalWidth * scale,
                image.naturalHeight * scale,
            );
        },
    };
}

/** @param {HTMLElement} section @returns {Promise<Scene | null>} */
async function chooseScene(section) {
    const pattern = section.dataset['frames'] ?? '';
    const count = Number(section.dataset['frameCount'] ?? '0');
    if (pattern && count > 1) return createFrameScene(pattern, count, Number(section.dataset['focusX'] ?? '0.5'));
    const load = DRAWN_SCENES[section.dataset['scene'] ?? ''];
    return load ? (await load()).createScene() : null;
}

/** @param {HTMLCanvasElement} canvas */
function sizeCanvas(canvas) {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const width = Math.round(canvas.clientWidth * ratio);
    const height = Math.round(canvas.clientHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    return {width, height};
}

/** @param {HTMLElement} section */
function progressOf(section) {
    const travel = section.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    return Math.min(1, Math.max(0, -section.getBoundingClientRect().top / travel));
}

/** @param {HTMLElement} section */
export async function startStory(section) {
    const canvas = section.querySelector('[data-story-canvas]');
    const context = canvas instanceof HTMLCanvasElement ? canvas.getContext('2d') : null;
    if (!(canvas instanceof HTMLCanvasElement) || !context) return;
    const steps = Array.from(section.querySelectorAll('[data-story-step]'));
    const dots = Array.from(section.querySelectorAll('[data-story-dot]'));
    const scene = await chooseScene(section);
    if (!scene) return;
    const isStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Each message can take over at its own frame (data-step-frames), so text and picture stay
    // together; the scroll stops land partway into each message, and on the last frame for the last.
    const frameCount = Number(section.dataset['frameCount'] ?? '0');
    const toProgress = (/** @type {number} */ frame) => (frame - 1) / Math.max(1, frameCount - 1);
    const starts = (section.dataset['stepFrames'] ?? '').split(',').filter(Boolean).map((frame) => toProgress(Number(frame)));
    const hasStarts = starts.length === steps.length && frameCount > 1;
    if (hasStarts) {
        section.querySelectorAll('.story-snap').forEach((snap, index) => {
            if (!(snap instanceof HTMLElement)) return;
            const start = starts[index] ?? 0;
            const next = starts[index + 1];
            const stop = next === undefined ? 1 : start + (next - start) * 0.35;
            snap.style.position = 'absolute';
            snap.style.height = '1px';
            snap.style.top = `calc(${stop} * (100% - 100svh))`;
        });
    }
    /** @param {number} progress */
    const activeStep = (progress) => {
        if (!hasStarts) return Math.round(progress * (steps.length - 1));
        let active = 0;
        starts.forEach((start, index) => { if (progress + 1e-6 >= start) active = index; });
        return active;
    };
    section.classList.add(isStill ? 'is-still' : 'is-live');
    if (!isStill) document.documentElement.classList.add('has-story-snap');

    let isQueued = false;
    const render = () => {
        isQueued = false;
        const {width, height} = sizeCanvas(canvas);
        const progress = isStill ? STILL_PROGRESS : progressOf(section);
        scene.draw(context, progress, width, height);
        if (isStill) return;
        const active = activeStep(progress);
        steps.forEach((step, index) => step.classList.toggle('is-active', index === active));
        dots.forEach((dot, index) => dot.classList.toggle('is-active', index === active));
        section.classList.toggle('has-started', progress > 0.02);
    };
    const queue = () => {
        if (isQueued) return;
        isQueued = true;
        requestAnimationFrame(render);
    };
    window.addEventListener('scroll', queue, {passive: true});
    window.addEventListener('resize', queue);
    queue();
}
