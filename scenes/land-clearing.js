// @ts-check
// Land clearing, drawn: the loader rides in on the trailer and backs out, rakes
// the overgrown lot lane by lane with the grapple, loads the brush pile into
// the trailer, switches to the bucket to grade the lot, and the load is tarped.

import {drawItem, randomItem} from './items.js';
import {GROUND, TRAILER, WORLD, applyCamera, clamp, clearFrame, lerp, paintOnce, seededRandom, stage, surface} from './kit.js';
import {drawLoader, drawTrailer, drawTruck, hitchOf} from './vehicles.js';

const LOT = {x: 150, y: 110, width: 1130, height: 790};
const PARKED = {x: 1460, y: 470, angle: Math.PI / 2};
const PILE = {x: 1180, y: 700, radiusX: 75, radiusY: 110};
const RAKE_LANES = [190, 310, 430, 550, 670, 790];
const GRADE_LANES = [260, 500, 740];
const LANE_ENDS = {west: 240, east: 1110};
const RAKE = {start: 0.1, end: 0.45};
const LOADING = {start: 0.45, end: 0.7, trips: 6};
const GRADE = {start: 0.7, end: 0.9};
const BRUSH_COUNT = 90;
const GRAB = {x: 1010, y: 700};
const DUMP = {x: 1244, y: 470};

/** @typedef {import('./kit.js').Pose} Pose */
/** @typedef {{x: number, y: number}} Point */

/** @param {number[]} lanes */
function lanePath(lanes) {
    /** @type {Point[]} */
    const points = [];
    lanes.forEach((y, index) => {
        const [first, second] = index % 2 === 0 ? [LANE_ENDS.east, LANE_ENDS.west] : [LANE_ENDS.west, LANE_ENDS.east];
        points.push({x: first, y}, {x: second, y});
    });
    return points;
}

/** The point and heading at a fraction of the way along a polyline. @param {Point[]} points @param {number} fraction */
function alongPath(points, fraction) {
    const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - (points[index]?.x ?? 0), point.y - (points[index]?.y ?? 0)));
    let remaining = fraction * lengths.reduce((total, length) => total + length, 0);
    for (let index = 0; index < lengths.length; index++) {
        const length = lengths[index] ?? 0;
        const from = points[index] ?? {x: 0, y: 0};
        const to = points[index + 1] ?? from;
        if (remaining <= length || index === lengths.length - 1) {
            const t = length === 0 ? 0 : clamp(remaining / length);
            return {x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t), angle: Math.atan2(to.y - from.y, to.x - from.x), segment: index};
        }
        remaining -= length;
    }
    return {x: 0, y: 0, angle: 0, segment: 0};
}

/** @param {number} size @param {string} base @param {string} line @param {number} lineGap */
function tile(size, base, line, lineGap) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return canvas;
    surface(context, seededRandom(size + lineGap), {x: 0, y: 0, width: size, height: size}, base, GROUND.dirt.flecks, 2);
    context.fillStyle = line;
    for (let y = 0; y < size; y += lineGap) context.fillRect(0, y, size, 2);
    return canvas;
}

/** @param {CanvasRenderingContext2D} context @param {() => number} random */
function paintVegetation(context, random) {
    surface(context, random, LOT, '#7c8440', ['#8a8f4a', '#6f7a3a', '#a39a5c', '#5d6a30'], 5);
    for (let shrub = 0; shrub < 70; shrub++) {
        const x = LOT.x + random() * LOT.width;
        const y = LOT.y + random() * LOT.height;
        const radius = 16 + random() * 26;
        context.fillStyle = shrub % 3 === 0 ? '#3f5a24' : '#4d6b2b';
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'rgba(255, 255, 255, 0.08)';
        context.beginPath();
        context.arc(x - radius / 3, y - radius / 3, radius / 2, 0, Math.PI * 2);
        context.fill();
    }
    for (let tree = 0; tree < 9; tree++) {
        context.fillStyle = '#33491d';
        context.beginPath();
        context.arc(LOT.x + 60 + random() * (LOT.width - 120), LOT.y + 60 + random() * (LOT.height - 120), 44 + random() * 26, 0, Math.PI * 2);
        context.fill();
    }
}

function paintGround() {
    return paintOnce((context) => {
        const random = seededRandom(80401);
        surface(context, random, {x: 0, y: 0, width: WORLD.width, height: WORLD.height}, GROUND.dirt.base, GROUND.dirt.flecks, 4);
        surface(context, random, {x: 1300, y: 0, width: 300, height: WORLD.height}, '#9b907e', ['#8a806f', '#aea391'], 3);
        paintVegetation(context, random);
    });
}

function buildBrush() {
    const random = seededRandom(4404);
    return Array.from({length: BRUSH_COUNT}, (_, order) => {
        const radius = Math.sqrt(random());
        const angle = random() * Math.PI * 2;
        return {
            item: randomItem(random, 'brush'),
            share: order / BRUSH_COUNT,
            x: PILE.x + Math.cos(angle) * radius * PILE.radiusX,
            y: PILE.y + Math.sin(angle) * radius * PILE.radiusY,
            angle: random() * Math.PI,
            trip: Math.floor((order / BRUSH_COUNT) * LOADING.trips),
            bedX: (random() - 0.5) * (TRAILER.halfLength * 2 - 50),
            bedY: (random() - 0.5) * (TRAILER.halfWidth * 2 - 40),
        };
    });
}

/** @param {number} trip */
function tripWindow(trip) {
    const length = (LOADING.end - LOADING.start) / LOADING.trips;
    return {start: LOADING.start + trip * length, length};
}

/** Loader pose and state while shuttling brush from the pile to the trailer. @param {number} progress */
function shuttle(progress) {
    const trip = Math.min(LOADING.trips - 1, Math.floor((progress - LOADING.start) / tripWindow(0).length));
    const phase = clamp((progress - tripWindow(trip).start) / tripWindow(trip).length);
    const chord = Math.atan2(DUMP.y - GRAB.y, DUMP.x - GRAB.x);
    const travel = phase < 0.15 ? 0 : phase < 0.45 ? (phase - 0.15) / 0.3 : phase < 0.6 ? 1 : 1 - (phase - 0.6) / 0.4;
    const pose = {x: lerp(GRAB.x, DUMP.x, travel), y: lerp(GRAB.y, DUMP.y, travel), angle: chord * Math.sin(Math.PI * travel)};
    const carrying = phase < 0.15 ? phase / 0.15 : phase < 0.45 ? 1 : phase < 0.6 ? 1 - (phase - 0.45) / 0.15 : 0;
    return {pose, carrying, trip, hasDumped: phase >= 0.5};
}

/** @param {number} progress @returns {{pose: Pose, tool: 'grapple' | 'bucket', carrying: number}} */
function loaderAt(progress) {
    if (progress < 0.05) return {pose: {...PARKED}, tool: 'grapple', carrying: 0};
    if (progress < RAKE.start) {
        const back = stage(progress, 0.05, 0.08);
        const turn = stage(progress, 0.08, RAKE.start);
        const start = {x: LANE_ENDS.east, y: RAKE_LANES[0] ?? 190};
        return {
            pose: {x: lerp(PARKED.x, start.x, turn), y: lerp(lerp(PARKED.y, 170, back), start.y, turn), angle: lerp(PARKED.angle, Math.PI, turn)},
            tool: 'grapple',
            carrying: 0,
        };
    }
    if (progress < LOADING.start) {
        const spot = alongPath(lanePath(RAKE_LANES), stage(progress, RAKE.start, RAKE.end));
        return {pose: spot, tool: 'grapple', carrying: 0.55};
    }
    if (progress < LOADING.end) {
        const {pose, carrying} = shuttle(progress);
        return {pose, tool: 'grapple', carrying};
    }
    if (progress < GRADE.end) return {pose: alongPath(lanePath(GRADE_LANES), stage(progress, GRADE.start, GRADE.end)), tool: 'bucket', carrying: 0};
    const park = stage(progress, GRADE.end, 0.96);
    return {pose: {x: lerp(LANE_ENDS.east, 1230, park), y: lerp(GRADE_LANES[2] ?? 740, 860, park), angle: lerp(0, -Math.PI / 2, park)}, tool: 'bucket', carrying: 0};
}

/** Strokes the ground a machine has already worked, up to where it is now. @param {CanvasRenderingContext2D} context @param {Point[]} points @param {number} fraction @param {CanvasPattern | null} pattern @param {number} width */
function strokeWorked(context, points, fraction, pattern, width) {
    if (fraction <= 0 || !pattern) return;
    const here = alongPath(points, fraction);
    context.strokeStyle = pattern;
    context.lineWidth = width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(points[0]?.x ?? 0, points[0]?.y ?? 0);
    for (let index = 1; index <= here.segment; index++) context.lineTo(points[index]?.x ?? 0, points[index]?.y ?? 0);
    context.lineTo(here.x, here.y);
    context.stroke();
}

export function createScene() {
    const ground = paintGround();
    const brush = buildBrush();
    let raked = /** @type {CanvasPattern | null} */ (null);
    let graded = /** @type {CanvasPattern | null} */ (null);
    return {
        /** @param {CanvasRenderingContext2D} context @param {number} progress @param {number} width @param {number} height */
        draw(context, progress, width, height) {
            clearFrame(context, width, height);
            raked ??= context.createPattern(tile(64, '#7d6a50', 'rgba(70, 56, 40, 0.55)', 8), 'repeat');
            graded ??= context.createPattern(tile(64, '#8a7759', 'rgba(0, 0, 0, 0)', 64), 'repeat');
            const loader = loaderAt(progress);
            applyCamera(context, width, height, progress, {landscapeX: [760, 780], portraitX: clamp(loader.pose.x, 700, 1350), focusY: 480});
            context.drawImage(ground, 0, 0);
            strokeWorked(context, lanePath(RAKE_LANES), stage(progress, RAKE.start, RAKE.end), raked, 150);
            strokeWorked(context, lanePath(GRADE_LANES), stage(progress, GRADE.start, GRADE.end), graded, 250);
            const cleared = clamp((progress - RAKE.start) / (RAKE.end - RAKE.start));
            const loaded = progress < LOADING.start ? -1 : shuttle(progress);
            for (const piece of brush) {
                const isGone = loaded !== -1 && (piece.trip < loaded.trip || (piece.trip === loaded.trip && loaded.carrying > 0.2) || progress >= LOADING.end);
                if (piece.share < cleared && !isGone) drawItem(context, piece.item, piece.x, piece.y, piece.angle);
            }
            drawTruck(context, hitchOf(PARKED));
            drawTrailer(context, PARKED, {
                tarp: stage(progress, GRADE.end, 0.95),
                load: (bed) => {
                    for (const piece of brush) {
                        const isIn = progress >= LOADING.end || (loaded !== -1 && (piece.trip < loaded.trip || (piece.trip === loaded.trip && loaded.hasDumped)));
                        if (isIn) drawItem(bed, piece.item, piece.bedX, piece.bedY, piece.angle);
                    }
                },
            });
            drawLoader(context, loader.pose, {tool: loader.tool, carrying: loader.carrying});
        },
    };
}
