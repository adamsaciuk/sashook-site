// @ts-check
// Booking form niceties. The form works without this file; the server checks everything.

const MAX_PHOTOS = 8;

/** @param {HTMLInputElement} input @param {HTMLElement} previews */
function showPhotoPreviews(input, previews) {
    previews.replaceChildren();
    const files = Array.from(input.files ?? []);
    for (const file of files.slice(0, MAX_PHOTOS)) {
        if (!file.type.startsWith('image/')) continue;
        const image = document.createElement('img');
        image.src = URL.createObjectURL(file);
        image.alt = file.name;
        image.onload = () => URL.revokeObjectURL(image.src);
        previews.append(image);
    }
    if (files.length > MAX_PHOTOS) {
        const note = document.createElement('p');
        note.className = 'field-error';
        note.textContent = `Only the first ${MAX_PHOTOS} photos will be sent.`;
        previews.append(note);
    }
}

/** @param {HTMLElement} dropzone @param {HTMLInputElement} input @param {HTMLElement} previews */
function wireDropzone(dropzone, input, previews) {
    input.addEventListener('change', () => showPhotoPreviews(input, previews));
    dropzone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropzone.classList.add('is-dragging');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragging'));
    dropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropzone.classList.remove('is-dragging');
        if (!event.dataTransfer?.files.length) return;
        input.files = event.dataTransfer.files;
        showPhotoPreviews(input, previews);
    });
}

/** @param {HTMLInputElement} flexible @param {HTMLElement} rows */
function wireFlexibleToggle(flexible, rows) {
    const apply = () => {
        rows.classList.toggle('is-disabled', flexible.checked);
        rows.querySelectorAll('[data-time-input]').forEach((field) => {
            /** @type {HTMLInputElement | HTMLSelectElement} */ (field).disabled = flexible.checked;
        });
    };
    flexible.addEventListener('change', apply);
    apply();
}

/** @param {HTMLFormElement} form */
function wireSubmit(form) {
    form.addEventListener('submit', () => {
        const button = form.querySelector('[data-submit]');
        if (!(button instanceof HTMLButtonElement)) return;
        button.disabled = true;
        button.textContent = 'Sending...';
    });
}

function start() {
    const form = document.querySelector('[data-book-form]');
    const dropzone = document.querySelector('[data-dropzone]');
    const input = document.querySelector('[data-photo-input]');
    const previews = document.querySelector('[data-photo-previews]');
    const flexible = document.querySelector('[data-flexible]');
    const rows = document.querySelector('[data-time-rows]');
    if (dropzone instanceof HTMLElement && input instanceof HTMLInputElement && previews instanceof HTMLElement) wireDropzone(dropzone, input, previews);
    if (flexible instanceof HTMLInputElement && rows instanceof HTMLElement) wireFlexibleToggle(flexible, rows);
    if (form instanceof HTMLFormElement) wireSubmit(form);
}

start();
