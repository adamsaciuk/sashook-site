// @ts-check
// The rig and the machine: white crew-cab pickup, black high-sided dump trailer,
// yellow compact track loader, and a homeowner's car. Poses face +x.

import {TRAILER, TRUCK, toWorld} from './kit.js';

/** @typedef {import('./kit.js').Pose} Pose */

/** @param {CanvasRenderingContext2D} context @param {Pose} pose */
function enter(context, pose) {
    context.save();
    context.translate(pose.x, pose.y);
    context.rotate(pose.angle);
}

/** The white crew-cab pickup; pose is the hitch ball, facing forward. @param {CanvasRenderingContext2D} context @param {Pose} pose */
export function drawTruck(context, pose) {
    enter(context, pose);
    context.fillStyle = 'rgba(0, 0, 0, 0.3)';
    context.fillRect(10, -52, TRUCK.length, 128);
    context.fillStyle = '#1c1c1c';
    for (const x of [44, 214]) for (const y of [-66, 58]) context.fillRect(x - 20, y, 40, 8);
    context.fillStyle = '#f1f0ec';
    context.beginPath();
    context.roundRect(0, -TRUCK.halfWidth, TRUCK.length, TRUCK.halfWidth * 2, 18);
    context.fill();
    context.fillStyle = '#3a3a3c';
    context.fillRect(12, -52, 110, 104);
    context.fillStyle = '#1f2a33';
    context.fillRect(124, -50, 10, 100);
    context.fillRect(226, -50, 18, 100);
    context.fillStyle = '#fafaf8';
    context.fillRect(136, -54, 88, 108);
    context.fillStyle = '#1c1c1c';
    context.fillRect(222, -74, 10, 12);
    context.fillRect(222, 62, 10, 12);
    context.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(248, 0);
    context.lineTo(278, 0);
    context.stroke();
    context.restore();
}

/** A homeowner's car, facing +x; pose is the car's centre. @param {CanvasRenderingContext2D} context @param {Pose} pose @param {string} colour */
export function drawCar(context, pose, colour = '#2e5f9c') {
    enter(context, pose);
    context.fillStyle = 'rgba(0, 0, 0, 0.3)';
    context.fillRect(-100, -38, 214, 92);
    context.fillStyle = colour;
    context.beginPath();
    context.roundRect(-110, -46, 220, 92, 22);
    context.fill();
    context.fillStyle = '#1f2a33';
    context.fillRect(-70, -38, 14, 76);
    context.fillRect(34, -38, 20, 76);
    context.fillStyle = 'rgba(255, 255, 255, 0.18)';
    context.fillRect(-54, -40, 86, 80);
    context.restore();
}

/** Where the trailer's coupler sits in the world; hitch the truck here. @param {Pose} trailer */
export function hitchOf(trailer) {
    return {...toWorld(trailer, TRAILER.hitch, 0), angle: trailer.angle};
}

/** @param {CanvasRenderingContext2D} context @param {number} amount */
function drawTarp(context, amount) {
    const {halfLength, halfWidth} = TRAILER;
    context.globalAlpha = amount;
    context.fillStyle = '#2f5f9c';
    context.fillRect(-halfLength - 6, -halfWidth - 6, halfLength * 2 + 12, halfWidth * 2 + 12);
    context.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    context.lineWidth = 3;
    for (let x = -halfLength + 40; x < halfLength; x += 70) {
        context.beginPath();
        context.moveTo(x, -halfWidth);
        context.lineTo(x + 20, halfWidth);
        context.stroke();
    }
    context.fillStyle = '#f5b700';
    for (const x of [-100, 10, 120]) context.fillRect(x, -halfWidth - 10, 10, halfWidth * 2 + 20);
    context.globalAlpha = 1;
}

// Sashook's high sides (Adam's photo, 2026-09-30): black-stained wooden boards on
// top of the steel box, held by black steel stakes bolted on the outside, with a
// bigger post at each corner. From above: board tops, stakes along the outside.
const STAKE_SPACING = 95;

/** @param {CanvasRenderingContext2D} context */
function drawStakes(context) {
    const {halfLength, halfWidth} = TRAILER;
    context.fillStyle = '#0d0c0b';
    for (let x = -halfLength + STAKE_SPACING; x < halfLength; x += STAKE_SPACING) {
        context.fillRect(x - 5, -halfWidth - 14, 10, 9);
        context.fillRect(x - 5, halfWidth + 5, 10, 9);
    }
    for (const x of [-halfLength, halfLength]) for (const y of [-halfWidth, halfWidth]) context.fillRect(x - 10, y - 10, 20, 20);
    context.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let x = -halfLength + STAKE_SPACING; x < halfLength; x += STAKE_SPACING) {
        context.fillRect(x - 1, -halfWidth - 11, 2, 2);
        context.fillRect(x - 1, halfWidth + 9, 2, 2);
    }
}

/** @param {CanvasRenderingContext2D} context @param {number} gate */
function drawWalls(context, gate) {
    const {halfLength, halfWidth} = TRAILER;
    context.strokeStyle = '#1d1a17';
    context.lineWidth = 12;
    context.strokeRect(-halfLength, -halfWidth, halfLength * 2, halfWidth * 2);
    context.strokeStyle = 'rgba(120, 100, 80, 0.25)';
    context.lineWidth = 1;
    context.strokeRect(-halfLength - 2, -halfWidth - 2, halfLength * 2 + 4, halfWidth * 2 + 4);
    drawStakes(context);
    context.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    context.lineWidth = 2;
    context.strokeRect(-halfLength - 8, -halfWidth - 8, halfLength * 2 + 16, halfWidth * 2 + 16);
    context.fillStyle = '#d62d20';
    context.fillRect(-halfLength - 4, -halfWidth - 4, 8, 8);
    context.fillRect(-halfLength - 4, halfWidth - 4, 8, 8);
    context.strokeStyle = '#161412';
    context.lineWidth = 6;
    const swingX = 90 * gate;
    const swingY = 60 * gate;
    context.beginPath();
    context.moveTo(-halfLength, -halfWidth);
    context.lineTo(-halfLength - swingX, -halfWidth - swingY + (1 - gate) * halfWidth);
    context.moveTo(-halfLength, halfWidth);
    context.lineTo(-halfLength - swingX, halfWidth + swingY - (1 - gate) * halfWidth);
    context.stroke();
}

/**
 * The black high-sided dump trailer. Pose is the bed centre; the rear gate is at -x.
 * @param {CanvasRenderingContext2D} context @param {Pose} pose
 * @param {{tarp?: number, gate?: number, load?: (context: CanvasRenderingContext2D) => void, boards?: number}} options
 */
export function drawTrailer(context, pose, options = {}) {
    const {halfLength, halfWidth, hitch} = TRAILER;
    enter(context, pose);
    if (options.boards) {
        context.globalAlpha = options.boards;
        context.fillStyle = '#c9a36a';
        for (const [x, y] of [
            [hitch - 70, -30],
            [-30, -halfWidth - 20],
            [-30, halfWidth - 20],
        ])
            context.fillRect(x ?? 0, y ?? 0, 70, 40);
        context.globalAlpha = 1;
    }
    context.fillStyle = 'rgba(0, 0, 0, 0.32)';
    context.fillRect(-halfLength - 4, -halfWidth + 10, halfLength * 2 + 24, halfWidth * 2 + 8);
    context.strokeStyle = '#1b1916';
    context.lineWidth = 14;
    context.beginPath();
    context.moveTo(halfLength, -halfWidth + 30);
    context.lineTo(hitch, 0);
    context.lineTo(halfLength, halfWidth - 30);
    context.stroke();
    context.fillStyle = '#1b1916';
    context.beginPath();
    context.arc(hitch, 0, 10, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#26221e';
    context.fillRect(-halfLength, -halfWidth, halfLength * 2, halfWidth * 2);
    if (options.load) {
        context.save();
        context.beginPath();
        context.rect(-halfLength, -halfWidth, halfLength * 2, halfWidth * 2);
        context.clip();
        options.load(context);
        context.restore();
    }
    if (options.tarp) drawTarp(context, options.tarp);
    drawWalls(context, options.gate ?? 0);
    context.restore();
}

/**
 * The yellow compact track loader, facing +x, with a rake grapple or a bucket.
 * @param {CanvasRenderingContext2D} context @param {Pose} pose @param {{tool: 'grapple' | 'bucket', carrying?: number}} options
 */
export function drawLoader(context, pose, options) {
    enter(context, pose);
    context.fillStyle = 'rgba(0, 0, 0, 0.3)';
    context.fillRect(-66, -52, 190, 124);
    context.fillStyle = '#1e1e1e';
    context.fillRect(-72, -62, 132, 22);
    context.fillRect(-72, 40, 132, 22);
    context.fillStyle = '#f2b705';
    context.fillRect(-76, -40, 118, 80);
    context.fillStyle = '#2a2a2a';
    context.fillRect(-76, -26, 18, 52);
    context.fillStyle = '#20262b';
    context.fillRect(-26, -30, 50, 60);
    context.strokeStyle = '#111';
    context.lineWidth = 3;
    context.strokeRect(-26, -30, 50, 60);
    context.fillStyle = '#f2b705';
    context.fillRect(20, -46, 70, 10);
    context.fillRect(20, 36, 70, 10);
    if (options.tool === 'bucket') {
        context.fillStyle = '#3a3a3a';
        context.fillRect(88, -66, 30, 132);
        context.fillStyle = '#8d9399';
        context.fillRect(114, -66, 5, 132);
    } else {
        context.strokeStyle = '#2a2a2a';
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(90, -64);
        context.lineTo(90, 64);
        for (let y = -60; y <= 60; y += 15) {
            context.moveTo(90, y);
            context.lineTo(126, y);
        }
        context.stroke();
    }
    if (options.carrying) {
        context.globalAlpha = options.carrying;
        context.fillStyle = '#4f6b2a';
        context.beginPath();
        context.ellipse(118, 0, 26, 58, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#6b4f2a';
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(100, -40);
        context.lineTo(140, 30);
        context.moveTo(106, 30);
        context.lineTo(136, -36);
        context.stroke();
        context.globalAlpha = 1;
    }
    context.restore();
}
