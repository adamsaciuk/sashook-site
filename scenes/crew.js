// @ts-check
// The two-person crew (and a homeowner) and their back-and-forth carrying trips.

import {CREW, ease, lerp} from './kit.js';

/** @typedef {import('./kit.js').WorkerState} WorkerState */

/** @param {CanvasRenderingContext2D} context @param {{shirt: string, hat: string}} look @param {WorkerState} state @param {string} carried */
export function drawWorker(context, look, state, carried = '#a8743f') {
    context.save();
    context.translate(state.x, state.y);
    context.fillStyle = 'rgba(0, 0, 0, 0.28)';
    context.beginPath();
    context.ellipse(7, 9, 24, 16, 0, 0, Math.PI * 2);
    context.fill();
    context.rotate(state.facing);
    const swing = Math.sin(state.stride) * 7;
    const hands = state.isCarrying
        ? [
              {x: 17, y: -9},
              {x: 17, y: 9},
          ]
        : [
              {x: swing, y: -21},
              {x: -swing, y: 21},
          ];
    if (state.isCarrying) {
        context.fillStyle = carried;
        context.fillRect(20, -18, 14, 36);
        context.fillStyle = 'rgba(255, 255, 255, 0.25)';
        context.fillRect(24, -10, 12, 18);
    }
    context.fillStyle = '#e0b48f';
    for (const hand of hands) {
        context.beginPath();
        context.arc(hand.x, hand.y, 4.5, 0, Math.PI * 2);
        context.fill();
    }
    context.fillStyle = look.shirt;
    context.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(0, 0, 12, 21, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = look.hat;
    context.beginPath();
    context.ellipse(2, 0, 11, 10, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
}

/**
 * Two workers alternating trips between a pickup and a drop point, half a trip apart.
 * @param {{start: number, end: number, tripsPerWorker: number, workers?: number}} schedule
 */
export function createTrips(schedule) {
    const workers = schedule.workers ?? CREW.length;
    const length = (schedule.end - schedule.start) / schedule.tripsPerWorker;
    const total = schedule.tripsPerWorker * workers;
    /** @param {number} tripIndex */
    const startOf = (tripIndex) => schedule.start + tripIndex * (length / workers);
    return {
        total,
        /** @param {number} tripIndex */
        pickedAt: (tripIndex) => startOf(tripIndex) + length * 0.08,
        /** @param {number} tripIndex */
        droppedAt: (tripIndex) => startOf(tripIndex) + length * 0.5,
        /**
         * @param {number} worker @param {number} progress
         * @param {(tripIndex: number) => {x: number, y: number}} pickupAt @param {(worker: number) => {x: number, y: number}} dropAt
         * @returns {WorkerState}
         */
        workerAt(worker, progress, pickupAt, dropAt) {
            const drop = dropAt(worker);
            if (progress < startOf(worker)) return {...pickupAt(worker), facing: 0, isCarrying: false, stride: 0};
            const trip = Math.min(schedule.tripsPerWorker - 1, Math.floor((progress - startOf(worker)) / length));
            const tripIndex = trip * workers + worker;
            const phase = (progress - startOf(tripIndex)) / length;
            const pickup = pickupAt(tripIndex);
            if (phase >= 1) return {x: drop.x - 50, y: drop.y, facing: Math.PI, isCarrying: false, stride: 0};
            if (phase < 0.1) return {...pickup, facing: Math.atan2(drop.y - pickup.y, drop.x - pickup.x), isCarrying: phase > 0.06, stride: 0};
            if (phase < 0.45) return walk(pickup, drop, ease((phase - 0.1) / 0.35), true, phase);
            if (phase < 0.55) return {...drop, facing: Math.atan2(drop.y - pickup.y, drop.x - pickup.x), isCarrying: phase < 0.5, stride: 0};
            return walk(drop, pickup, ease((phase - 0.55) / 0.45), false, phase);
        },
    };
}

/** @param {{x: number, y: number}} from @param {{x: number, y: number}} to @param {number} t @param {boolean} isCarrying @param {number} phase @returns {WorkerState} */
function walk(from, to, t, isCarrying, phase) {
    return {x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t), facing: Math.atan2(to.y - from.y, to.x - from.x), isCarrying, stride: phase * 90};
}
