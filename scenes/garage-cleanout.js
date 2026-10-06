// @ts-check
// Garage cleanout, drawn: a packed two-car garage (roof cut away) with the
// trailer backed up to the door; two workers carry it all out, the floor is
// swept, the rig leaves, and the owner's car pulls in.

import {createTrips, drawWorker} from './crew.js';
import {drawItem, randomItem} from './items.js';
import {CREW, GROUND, TRAILER, WORLD, applyCamera, clearFrame, lerp, paintOnce, roof, seededRandom, stage, surface} from './kit.js';
import {drawCar, drawTrailer, drawTruck, hitchOf} from './vehicles.js';

const GARAGE = {x: 520, y: 150, width: 560, height: 490};
const PARKED = {x: 800, y: 850, angle: Math.PI / 2};
const DOOR_Y = GARAGE.y + GARAGE.height;
const ITEM_COUNT = 110;
const TRIPS = createTrips({start: 0.06, end: 0.72, tripsPerWorker: 10});
const SWEEP = {start: 0.72, end: 0.8};
const TARP = {start: 0.8, end: 0.85};
const DRIVE_OFF = {start: 0.85, end: 0.92, distance: 900};
const CAR_IN = {start: 0.92, end: 1, fromY: 1250, toY: 420};

function paintGround() {
    return paintOnce((context) => {
        const random = seededRandom(80226);
        surface(context, random, {x: 0, y: 0, width: WORLD.width, height: WORLD.height}, GROUND.grass.base, GROUND.grass.flecks, 5);
        roof(context, random, {x: 150, y: -60, width: 1300, height: 210});
        roof(context, random, {x: 150, y: 150, width: 370, height: 380});
        roof(context, random, {x: 1080, y: 150, width: 370, height: 380});
        surface(context, random, GARAGE, '#c9c5bc', ['#bdb9b0', '#d3cfc6', '#b3aea4'], 3);
        surface(context, random, {x: 500, y: DOOR_Y, width: 600, height: WORLD.height - DOOR_Y}, GROUND.concrete.base, GROUND.concrete.flecks);
        context.fillStyle = 'rgba(40, 36, 30, 0.25)';
        context.beginPath();
        context.ellipse(800, 420, 60, 34, 0, 0, Math.PI * 2);
        context.fill();
    });
}

/** @param {CanvasRenderingContext2D} context */
function drawGarageWalls(context) {
    context.strokeStyle = '#2b2824';
    context.lineWidth = 16;
    context.beginPath();
    context.moveTo(GARAGE.x + 20, DOOR_Y);
    context.lineTo(GARAGE.x, DOOR_Y);
    context.lineTo(GARAGE.x, GARAGE.y);
    context.lineTo(GARAGE.x + GARAGE.width, GARAGE.y);
    context.lineTo(GARAGE.x + GARAGE.width, DOOR_Y);
    context.lineTo(GARAGE.x + GARAGE.width - 20, DOOR_Y);
    context.stroke();
}

function buildClutter() {
    const random = seededRandom(6606);
    const clutter = Array.from({length: ITEM_COUNT}, (_, index) => {
        const isShelf = index < 14;
        return {
            item: isShelf ? {kind: 'shelf', width: 70, height: 24, color: '#7f8c8d'} : randomItem(random, 'household'),
            x: isShelf ? GARAGE.x + 50 + (index % 7) * 76 : GARAGE.x + 40 + random() * (GARAGE.width - 80),
            y: isShelf ? GARAGE.y + 22 + Math.floor(index / 7) * 30 : GARAGE.y + 80 + random() * (GARAGE.height - 110),
            angle: isShelf ? 0 : random() * Math.PI,
            tripIndex: 0,
            bedX: 0,
            bedY: (random() - 0.5) * (TRAILER.halfWidth * 2 - 50),
        };
    });
    // Front of the garage first, shelves last; the trailer fills from its front (hitch end) back.
    const ordered = [...clutter].sort((a, b) => b.y - a.y);
    ordered.forEach((piece, order) => {
        const depth = order / ordered.length;
        piece.tripIndex = Math.floor(depth * TRIPS.total);
        piece.bedX = lerp(TRAILER.halfLength - 45, -TRAILER.halfLength + 45, depth) + (random() - 0.5) * 50;
    });
    return ordered;
}

/** @param {CanvasRenderingContext2D} context @param {number} progress */
function drawSweep(context, progress) {
    const swept = stage(progress, SWEEP.start, SWEEP.end);
    if (swept <= 0) return;
    const front = lerp(GARAGE.y, DOOR_Y, swept);
    context.fillStyle = 'rgba(232, 229, 222, 0.55)';
    context.fillRect(GARAGE.x, GARAGE.y, GARAGE.width, front - GARAGE.y);
    if (swept >= 1) return;
    context.fillStyle = 'rgba(110, 100, 88, 0.6)';
    context.beginPath();
    context.ellipse(800, front + 8, 90 * (0.4 + swept), 10, 0, 0, Math.PI * 2);
    context.fill();
    const look = CREW[0];
    if (look) drawWorker(context, look, {x: 800 + Math.sin(progress * 400) * 160, y: front - 26, facing: Math.PI / 2, isCarrying: false, stride: progress * 300});
}

export function createScene() {
    const ground = paintGround();
    const clutter = buildClutter();
    return {
        /** @param {CanvasRenderingContext2D} context @param {number} progress @param {number} width @param {number} height */
        draw(context, progress, width, height) {
            clearFrame(context, width, height);
            applyCamera(context, width, height, progress, {landscapeX: [800, 800], portraitX: 800, focusY: 560});
            context.drawImage(ground, 0, 0);
            for (const piece of clutter) if (progress < TRIPS.pickedAt(piece.tripIndex)) drawItem(context, piece.item, piece.x, piece.y, piece.angle);
            drawSweep(context, progress);
            drawGarageWalls(context);
            const trailer = {...PARKED, y: PARKED.y + stage(progress, DRIVE_OFF.start, DRIVE_OFF.end) * DRIVE_OFF.distance};
            const tarp = stage(progress, TARP.start, TARP.end);
            drawTruck(context, hitchOf(trailer));
            drawTrailer(context, trailer, {
                tarp,
                gate: 1 - tarp,
                load: (bed) => {
                    for (const piece of clutter) if (progress >= TRIPS.droppedAt(piece.tripIndex)) drawItem(bed, piece.item, piece.bedX, piece.bedY, piece.angle);
                },
            });
            if (progress < SWEEP.start) {
                const pickupAt = (/** @type {number} */ tripIndex) => {
                    const piece = clutter.find((candidate) => candidate.tripIndex === tripIndex);
                    return piece ? {x: piece.x, y: piece.y} : {x: 800, y: DOOR_Y - 40};
                };
                const dropAt = (/** @type {number} */ worker) => ({x: PARKED.x + (worker === 0 ? -40 : 40), y: DOOR_Y - 6});
                CREW.forEach((look, worker) => drawWorker(context, look, TRIPS.workerAt(worker, progress, pickupAt, dropAt), '#c89b62'));
            }
            if (progress >= CAR_IN.start) drawCar(context, {x: 800, y: lerp(CAR_IN.fromY, CAR_IN.toY, stage(progress, CAR_IN.start, CAR_IN.end)), angle: -Math.PI / 2});
        },
    };
}
