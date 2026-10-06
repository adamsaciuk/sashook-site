// @ts-check
// Page behaviour for the home and storyboard pages: scroll stories, the ZIP check and the load estimator.
// Each part is an enhancement; the page reads and works without it.

import {startStory} from './story.js';

/** @param {HTMLFormElement} form */
function startAreaCheck(form) {
    const input = form.querySelector('input[name="zip"]');
    const answer = form.querySelector('[data-area-answer]');
    if (!(input instanceof HTMLInputElement) || !(answer instanceof HTMLElement)) return;
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const response = await fetch(`/area?zip=${encodeURIComponent(input.value)}`, {headers: {Accept: 'application/json'}});
        /** @type {{kind: string, message: string}} */
        const result = await response.json();
        answer.className = `area-answer area-${result.kind}`;
        answer.textContent = `${result.message} `;
        if (result.kind === 'served') {
            const link = document.createElement('a');
            link.href = '/book';
            link.textContent = 'Request a booking';
            answer.append(link);
        }
    });
}

/** @typedef {{key: string, label: string, fill: number, price: string, example: string}} Load */

/** @param {HTMLElement} root */
function startEstimator(root) {
    /** @type {Load[]} */
    const loads = JSON.parse(root.dataset['loads'] ?? '[]');
    const range = root.querySelector('[data-estimate-range]');
    const label = root.querySelector('[data-estimate-label]');
    const price = root.querySelector('[data-estimate-price]');
    const example = root.querySelector('[data-estimate-example]');
    const book = root.querySelector('[data-estimate-book]');
    const pieces = Array.from(root.querySelectorAll('.load-piece'));
    if (!(range instanceof HTMLInputElement) || !label || !price || !example || !(book instanceof HTMLAnchorElement)) return;
    const show = () => {
        const load = loads[Number(range.value)];
        if (!load) return;
        label.textContent = load.label;
        price.textContent = load.price;
        example.textContent = load.example;
        book.href = `/book?service=junk-removal&load=${load.key}`;
        range.setAttribute('aria-valuetext', `${load.label}, ${load.price}`);
        pieces.forEach((piece) => piece.classList.toggle('is-in', Number(piece.getAttribute('data-level')) <= load.fill + 0.001));
    };
    range.addEventListener('input', show);
    show();
}

for (const story of document.querySelectorAll('[data-story]')) if (story instanceof HTMLElement) startStory(story);
const areaCheck = document.querySelector('[data-area-check]');
if (areaCheck instanceof HTMLFormElement) startAreaCheck(areaCheck);
const estimator = document.querySelector('[data-estimator]');
if (estimator instanceof HTMLElement) startEstimator(estimator);
