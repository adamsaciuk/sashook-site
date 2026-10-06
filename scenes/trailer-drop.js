// @ts-check
// Dump trailer drop-off, drawn: the rig backs the trailer up a driveway and
// leaves it on boards; the homeowner fills it over three days (night falls
// twice); the truck comes back, hitches, tarps it and hauls it away.

import {createTrips, drawWorker} from './crew.js';
import {drawItem, randomItem} from './items.js';
import {GROUND, TRAILER, WORLD, applyCamera, clamp, clearFrame, lerp, paintOnce, roof, seededRandom, stage, surface} from './kit.js';
import {drawTrailer, drawTruck, hitchOf} from './vehicles.js';

const STREET_Y = 905;
const DRIVEWAY = {x: 950, y: 300, width: 300, height: 460};
const PARKED = {x: 1100, y: 560, angle: Math.PI / 2};
const FRONT_DOOR = {x: 620, y: 330};
const GATE_SIDE = {x: 1050, y: 335};
const HOMEOWNER = {shirt: '#2e86c1', hat: '#5b4632'};
const ITEM_COUNT = 70;
const TRIPS = createTrips({start: 0.44, end: 0.74, tripsPerWorker: 7, workers: 1});
const NIGHTS = [0.53, 0.65];
const NIGHT_HALF_WIDTH = 0.035;

/** @typedef {import('./kit.js').Pose} Pose */

/** @param {{x: number, y: number}} from @param {{x: number, y: number}} via @param {{x: number, y: number}} to @param {number} t */
function curve(from, via, to, t) {
    const a = lerp(from.x, via.x, t);
    const b = lerp(via.x, to.x, t);
    const c = lerp(from.y, via.y, t);
    const d = lerp(via.y, to.y, t);
    return {x: lerp(a, b, t), y: lerp(c, d, t)};
}

function paintGround() {
    return paintOnce((context) => {
        const random = seededRandom(80125);
        surface(context, random, {x: 0, y: 0, width: WORLD.width, height: WORLD.height}, GROUND.grass.base, GROUND.grass.flecks, 5);
        roof(context, random, {x: 250, y: -60, width: 1100, height: 360});
        surface(context, random, DRIVEWAY, GROUND.concrete.base, GROUND.concrete.flecks);
        surface(context, random, {x: 600, y: 300, width: 40, height: 460}, GROUND.concrete.base, GROUND.concrete.flecks);
        surface(context, random, {x: 0, y: 760, width: WORLD.width, height: 50}, '#c9c4b9', GROUND.concrete.flecks);
        surface(context, random, {x: 0, y: 812, width: WORLD.width, height: 188}, GROUND.asphalt.base, GROUND.asphalt.flecks);
        context.fillStyle = '#e4e1da';
        context.fillRect(960, 296, 280, 8);
        context.strokeStyle = 'rgba(60, 56, 50, 0.35)';
        context.lineWidth = 2;
        for (let y = DRIVEWAY.y + 115; y < DRIVEWAY.y + DRIVEWAY.height; y += 115) {
            context.beginPath();
            context.moveTo(DRIVEWAY.x, y);
            context.lineTo(DRIVEWAY.x + DRIVEWAY.width, y);
            context.stroke();
        }
        context.fillStyle = '#3f5a24';
        for (const x of [320, 420, 760, 860]) {
            context.beginPath();
            context.arc(x, 330, 26, 0, Math.PI * 2);
            context.fill();
        }
    });
}

function buildLoad() {
    const random = seededRandom(3303);
    return Array.from({length: ITEM_COUNT}, (_, order) => {
        const depth = order / ITEM_COUNT;
        return {
            item: randomItem(random, 'household'),
            tripIndex: Math.floor(depth * TRIPS.total),
            x: lerp(TRAILER.halfLength - 45, -TRAILER.halfLength + 45, depth) + (random() - 0.5) * 60,
            y: (random() - 0.5) * (TRAILER.halfWidth * 2 - 50),
            angle: random() * Math.PI,
        };
    });
}

/** Where the trailer is at progress p. @param {number} progress @returns {Pose} */
function trailerAt(progress) {
    if (progress < 0.2) return {x: lerp(-800, 1330, stage(progress, 0.06, 0.2)), y: STREET_Y, angle: 0};
    if (progress < 0.91) {
        const t = stage(progress, 0.2, 0.32);
        return {...curve({x: 1330, y: STREET_Y}, {x: 1100, y: STREET_Y}, PARKED, t), angle: lerp(0, PARKED.angle, t)};
    }
    if (progress < 0.96) {
        const t = stage(progress, 0.91, 0.96);
        return {...curve(PARKED, {x: 1100, y: STREET_Y}, {x: 1500, y: STREET_Y}, t), angle: lerp(PARKED.angle, 0, t)};
    }
    return {x: lerp(1500, 2700, stage(progress, 0.96, 1)), y: STREET_Y, angle: 0};
}

/** The truck on its own while the trailer sits in the driveway; null when hitched. @param {number} progress @returns {Pose | null} */
function soloTruckAt(progress) {
    const hitch = hitchOf(PARKED);
    if (progress < 0.34 || progress >= 0.86) return null;
    if (progress < 0.39) {
        const t = stage(progress, 0.34, 0.39);
        return {...curve(hitch, {x: 1100, y: STREET_Y}, {x: 1500, y: STREET_Y}, t), angle: lerp(PARKED.angle, 0, t)};
    }
    if (progress < 0.76) return {x: lerp(1500, 2600, stage(progress, 0.39, 0.42)), y: STREET_Y, angle: 0};
    if (progress < 0.81) return {x: lerp(2600, 850, stage(progress, 0.76, 0.81)), y: STREET_Y, angle: Math.PI};
    const t = stage(progress, 0.81, 0.86);
    return {...curve({x: 850, y: STREET_Y}, {x: 1100, y: STREET_Y}, hitch, t), angle: lerp(Math.PI, PARKED.angle, t)};
}

/** @param {CanvasRenderingContext2D} context @param {number} progress @param {number} width @param {number} height */
function drawNight(context, progress, width, height) {
    const darkness = Math.max(...NIGHTS.map((night) => clamp(1 - Math.abs(progress - night) / NIGHT_HALF_WIDTH)));
    if (darkness <= 0) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = `rgba(12, 18, 38, ${0.55 * darkness})`;
    context.fillRect(0, 0, width, height);
}

export function createScene() {
    const ground = paintGround();
    const load = buildLoad();
    return {
        /** @param {CanvasRenderingContext2D} context @param {number} progress @param {number} width @param {number} height */
        draw(context, progress, width, height) {
            clearFrame(context, width, height);
            applyCamera(context, width, height, progress, {landscapeX: [880, 860], portraitX: 1100, focusY: 580});
            context.drawImage(ground, 0, 0);
            const trailer = trailerAt(progress);
            const solo = soloTruckAt(progress);
            const tarp = stage(progress, 0.86, 0.91);
            const boards = stage(progress, 0.3, 0.34) * (1 - stage(progress, 0.91, 0.93));
            if (!solo) drawTruck(context, hitchOf(trailer));
            drawTrailer(context, trailer, {
                tarp,
                gate: stage(progress, 0.34, 0.4) * (1 - tarp),
                boards,
                load: (bed) => {
                    for (const piece of load) if (progress >= TRIPS.droppedAt(piece.tripIndex)) drawItem(bed, piece.item, piece.x, piece.y, piece.angle);
                },
            });
            if (solo) drawTruck(context, solo);
            if (progress > 0.42 && progress < 0.76)
                drawWorker(
                    context,
                    HOMEOWNER,
                    TRIPS.workerAt(
                        0,
                        progress,
                        () => FRONT_DOOR,
                        () => GATE_SIDE,
                    ),
                    '#c89b62',
                );
            drawNight(context, progress, width, height);
        },
    };
}
