// @ts-check
// What gets hauled: demolition debris, household junk and brush, drawn top-down.

/** @typedef {import('./kit.js').Item} Item */

const ITEM_KINDS = {
    debris: [
        {kind: 'board', weight: 34, colors: ['#a8743f', '#8b5e34', '#b98b55', '#7a5230']},
        {kind: 'drywall', weight: 22, colors: ['#dcd6c9', '#cfc8b9', '#e6e1d6']},
        {kind: 'shingle', weight: 14, colors: ['#4a4845', '#3d3b39', '#5a5652']},
        {kind: 'brick', weight: 10, colors: ['#a4553a', '#8f4631']},
        {kind: 'insulation', weight: 7, colors: ['#e8a6a0', '#f0b9a8']},
        {kind: 'concrete', weight: 8, colors: ['#9a958c', '#aaa59b']},
        {kind: 'metal', weight: 5, colors: ['#8d9399', '#b5bbc0']},
    ],
    household: [
        {kind: 'box', weight: 38, colors: ['#c89b62', '#b98a52', '#d4a970']},
        {kind: 'bag', weight: 14, colors: ['#2c3528', '#222']},
        {kind: 'sofa', weight: 5, colors: ['#6b4f3a', '#56606b']},
        {kind: 'tire', weight: 7, colors: ['#1d1d1d']},
        {kind: 'bike', weight: 5, colors: ['#c0392b', '#2e86c1']},
        {kind: 'can', weight: 10, colors: ['#9aa3ad', '#d9d9d9']},
        {kind: 'board', weight: 10, colors: ['#a8743f', '#8b5e34']},
        {kind: 'shelf', weight: 7, colors: ['#7f8c8d']},
    ],
    brush: [
        {kind: 'branch', weight: 50, colors: ['#6b4f2a', '#5a4323']},
        {kind: 'leaves', weight: 50, colors: ['#4f6b2a', '#5d7a31', '#43602a']},
    ],
};

/** @type {Record<string, (random: () => number) => {width: number, height: number}>} */
const ITEM_SIZES = {
    board: (random) => ({width: 70 + random() * 90, height: 10 + random() * 6}),
    metal: (random) => ({width: 60 + random() * 70, height: 5 + random() * 3}),
    brick: () => ({width: 15, height: 8}),
    shingle: (random) => ({width: 18 + random() * 8, height: 18 + random() * 8}),
    sofa: () => ({width: 90, height: 44}),
    mattress: () => ({width: 84, height: 58}),
    tire: () => ({width: 30, height: 30}),
    bike: () => ({width: 60, height: 22}),
    can: () => ({width: 16, height: 16}),
    shelf: () => ({width: 80, height: 24}),
    branch: (random) => ({width: 60 + random() * 70, height: 6 + random() * 4}),
    leaves: (random) => ({width: 30 + random() * 30, height: 26 + random() * 24}),
};

/** @param {() => number} random @param {'debris' | 'household' | 'brush'} family @returns {Item} */
export function randomItem(random, family) {
    const kinds = ITEM_KINDS[family];
    let roll = random() * kinds.reduce((total, entry) => total + entry.weight, 0);
    let chosen = kinds[0];
    for (const entry of kinds) {
        roll -= entry.weight;
        if (roll <= 0) {
            chosen = entry;
            break;
        }
    }
    if (!chosen) return {kind: 'box', width: 30, height: 30, color: '#c89b62'};
    const sizeOf = ITEM_SIZES[chosen.kind] ?? ((/** @type {() => number} */ next) => ({width: 26 + next() * 34, height: 20 + next() * 26}));
    return {kind: chosen.kind, ...sizeOf(random), color: chosen.colors[Math.floor(random() * chosen.colors.length)] ?? '#999'};
}

/** @param {CanvasRenderingContext2D} context @param {Item} item */
function itemShape(context, item) {
    const halfWidth = item.width / 2;
    const halfHeight = item.height / 2;
    context.fillStyle = item.color;
    context.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    context.lineWidth = 1.5;
    context.beginPath();
    if (item.kind === 'insulation' || item.kind === 'leaves') context.ellipse(0, 0, halfWidth, halfHeight, 0, 0, Math.PI * 2);
    else if (item.kind === 'can') context.arc(0, 0, halfWidth, 0, Math.PI * 2);
    else if (item.kind === 'bag' || item.kind === 'sofa' || item.kind === 'mattress') context.roundRect(-halfWidth, -halfHeight, item.width, item.height, 10);
    else context.rect(-halfWidth, -halfHeight, item.width, item.height);
    context.fill();
    context.stroke();
}

/** @param {CanvasRenderingContext2D} context @param {Item} item */
function itemDetail(context, item) {
    context.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    context.lineWidth = 2;
    if (item.kind === 'tire') {
        context.fillStyle = '#555';
        context.beginPath();
        context.arc(0, 0, 7, 0, Math.PI * 2);
        context.fill();
    } else if (item.kind === 'box') {
        context.beginPath();
        context.moveTo(0, -item.height / 2);
        context.lineTo(0, item.height / 2);
        context.stroke();
    } else if (item.kind === 'sofa') {
        context.strokeRect(-item.width / 2 + 8, -item.height / 2 + 6, item.width - 16, item.height - 18);
    } else if (item.kind === 'bike') {
        context.fillStyle = '#1d1d1d';
        for (const x of [-20, 20]) context.fillRect(x - 10, -3, 20, 6);
    }
}

/** @param {CanvasRenderingContext2D} context @param {Item} item @param {number} x @param {number} y @param {number} angle */
export function drawItem(context, item, x, y, angle) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    itemShape(context, item);
    itemDetail(context, item);
    context.restore();
}
