// @ts-check
// Demo day, drawn: two workers load a demolition pile into the trailer until
// the slab is clean, the trailer is tarped and the rig drives off.

import {createTrips, drawWorker} from './crew.js';
import {drawItem, randomItem} from './items.js';
import {CREW, GROUND, TRAILER, WORLD, applyCamera, clearFrame, lerp, paintOnce, seededRandom, stage, surface} from './kit.js';
import {drawTrailer, drawTruck, hitchOf} from './vehicles.js';

const PILE = {x: 720, y: 520, radiusX: 250, radiusY: 185};
const TRAILER_HOME = {x: 1200, y: 510, angle: 0};
const SLAB = {x: 390, y: 250, width: 640, height: 540};
const ITEM_COUNT = 234;
const TRIPS = createTrips({start: 0.08, end: 0.84, tripsPerWorker: 9});
const TARP = {start: 0.86, end: 0.92};
const DRIVE_OFF = {start: 0.93, end: 1, distance: 1100};
const GATE = {x: TRAILER_HOME.x - TRAILER.halfLength - 40, y: TRAILER_HOME.y};

/** @param {CanvasRenderingContext2D} context @param {() => number} random */
function paintSlab(context, random) {
    surface(context, random, SLAB, GROUND.concrete.base, GROUND.concrete.flecks);
    context.strokeStyle = 'rgba(70, 64, 56, 0.45)';
    context.lineWidth = 2;
    for (let crack = 0; crack < 7; crack++) {
        context.beginPath();
        let x = SLAB.x + 10 + random() * (SLAB.width - 20);
        let y = SLAB.y + 10 + random() * (SLAB.height - 20);
        context.moveTo(x, y);
        for (let step = 0; step < 6; step++) {
            x += (random() - 0.5) * 70;
            y += (random() - 0.3) * 50;
            context.lineTo(x, y);
        }
        context.stroke();
    }
    context.strokeStyle = 'rgba(40, 36, 30, 0.5)';
    context.lineWidth = 6;
    context.strokeRect(SLAB.x, SLAB.y, SLAB.width, SLAB.height);
}

function paintGround() {
    return paintOnce((context) => {
        const random = seededRandom(80226);
        surface(context, random, {x: 0, y: 0, width: WORLD.width, height: WORLD.height}, GROUND.dirt.base, GROUND.dirt.flecks, 4);
        for (const band of [
            {y: 0, height: 150},
            {y: 880, height: 120},
        ])
            surface(context, random, {x: 0, width: WORLD.width, ...band}, GROUND.grass.base, GROUND.grass.flecks, 5);
        surface(context, random, {x: 960, y: 330, width: 640, height: 360}, GROUND.asphalt.base, GROUND.asphalt.flecks);
        paintSlab(context, random);
    });
}

function buildPile() {
    const random = seededRandom(7207079133);
    const pieces = Array.from({length: ITEM_COUNT}, () => {
        const radius = Math.sqrt(random());
        const angle = random() * Math.PI * 2;
        return {
            item: randomItem(random, 'debris'),
            x: PILE.x + Math.cos(angle) * radius * PILE.radiusX,
            y: PILE.y + Math.sin(angle) * radius * PILE.radiusY,
            angle: random() * Math.PI,
            tripIndex: 0,
            bedX: 0,
            bedY: 0,
            bedAngle: random() * Math.PI,
        };
    });
    // The outside of the pile goes first; the trailer fills from the hitch end back.
    const distance = (/** @type {{x: number, y: number}} */ piece) => Math.hypot((piece.x - PILE.x) / PILE.radiusX, (piece.y - PILE.y) / PILE.radiusY);
    const ordered = [...pieces].sort((a, b) => distance(b) - distance(a));
    ordered.forEach((piece, order) => {
        const depth = order / ordered.length;
        piece.tripIndex = Math.floor(depth * TRIPS.total);
        piece.bedX = lerp(TRAILER.halfLength - 40, -TRAILER.halfLength + 40, depth) + (random() - 0.5) * 70;
        piece.bedY = (random() - 0.5) * (TRAILER.halfWidth * 2 - 44);
    });
    return ordered.reverse();
}

/** @param {number} tripIndex */
function pickupAt(tripIndex) {
    const random = seededRandom(1000 + tripIndex);
    const angle = (random() - 0.5) * 2.2;
    const reach = 40 + Math.sqrt(1 - tripIndex / TRIPS.total) * PILE.radiusX * 0.8;
    return {x: PILE.x + Math.cos(angle) * reach, y: PILE.y + Math.sin(angle) * reach * 0.8};
}

/** @param {number} worker */
function dropAt(worker) {
    return {x: GATE.x, y: GATE.y + (worker === 0 ? -38 : 38)};
}

export function createScene() {
    const ground = paintGround();
    const pieces = buildPile();
    return {
        /** @param {CanvasRenderingContext2D} context @param {number} progress @param {number} width @param {number} height */
        draw(context, progress, width, height) {
            clearFrame(context, width, height);
            applyCamera(context, width, height, progress, {landscapeX: [790, 770], portraitX: 960});
            context.drawImage(ground, 0, 0);
            for (const piece of pieces) if (progress < TRIPS.pickedAt(piece.tripIndex)) drawItem(context, piece.item, piece.x, piece.y, piece.angle);
            const trailer = {...TRAILER_HOME, x: TRAILER_HOME.x + stage(progress, DRIVE_OFF.start, DRIVE_OFF.end) * DRIVE_OFF.distance};
            const tarp = stage(progress, TARP.start, TARP.end);
            drawTruck(context, hitchOf(trailer));
            drawTrailer(context, trailer, {
                tarp,
                gate: 1 - tarp,
                load: (bed) => {
                    for (const piece of pieces) if (progress >= TRIPS.droppedAt(piece.tripIndex)) drawItem(bed, piece.item, piece.bedX, piece.bedY, piece.bedAngle);
                },
            });
            if (progress >= DRIVE_OFF.start) return;
            CREW.forEach((look, worker) => drawWorker(context, look, TRIPS.workerAt(worker, progress, pickupAt, dropAt)));
        },
    };
}
