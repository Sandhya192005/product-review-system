const STORAGE_KEY = 'productReviews';

// localStorage holds roughly 5MB for the whole origin, and base64 adds ~33%
// on top of the file size, so a raw phone photo would use the entire budget
// by itself. Every image is redrawn through a canvas at these limits first.
const IMAGE_MAX_DIMENSION = 900;
const IMAGE_QUALITY = 0.72;

let products = loadProducts();
let selectedRating = 0;
let selectedImage = null;

document.addEventListener('DOMContentLoaded', function () {
    const session = getSession();
    if (session) {
        document.getElementById('welcome-message').textContent = 'Welcome back, ' + session.username;
    }
    document.getElementById('logout-btn').addEventListener('click', function () {
        clearSession();
        window.location.href = 'login.html';
    });

    renderProducts(products);

    document.getElementById('product-form').addEventListener('submit', handleSubmit);
    document.getElementById('search').addEventListener('input', handleSearch);

    document.querySelectorAll('.star-btn').forEach(function (btn) {
        const value = Number(btn.dataset.value);
        btn.addEventListener('click', function () { setRating(value); });
        btn.addEventListener('mouseenter', function () { previewRating(value); });
    });
    document.getElementById('star-input').addEventListener('mouseleave', function () {
        previewRating(selectedRating);
    });

    // Photo picker. The buttons stand in for the hidden file inputs so the
    // control can be styled; the inputs themselves do the real work.
    const galleryInput = document.getElementById('image-gallery-input');
    const cameraInput = document.getElementById('image-camera-input');

    document.getElementById('pick-gallery').addEventListener('click', function () {
        galleryInput.click();
    });
    document.getElementById('pick-camera').addEventListener('click', function () {
        cameraInput.click();
    });

    [galleryInput, cameraInput].forEach(function (input) {
        input.addEventListener('change', function () {
            handleImageFile(input.files[0]);
        });
    });

    document.getElementById('image-remove').addEventListener('click', clearImage);
});

// Photo attachment

function handleImageFile(file) {
    if (!file) {
        return;
    }

    const hint = document.getElementById('image-hint');

    if (!file.type || file.type.indexOf('image/') !== 0) {
        hint.textContent = 'That file is not an image.';
        hint.classList.add('error');
        return;
    }

    hint.textContent = 'Processing photo...';
    hint.classList.remove('error');

    const reader = new FileReader();

    reader.onload = function () {
        const img = new Image();

        img.onload = function () {
            selectedImage = shrinkImage(img);
            showImagePreview(selectedImage);
            hint.textContent = 'Photo attached. It was resized before saving.';
            hint.classList.remove('error');
        };

        img.onerror = function () {
            hint.textContent = 'That image could not be read.';
            hint.classList.add('error');
        };

        img.src = reader.result;
    };

    reader.onerror = function () {
        hint.textContent = 'That file could not be read.';
        hint.classList.add('error');
    };

    reader.readAsDataURL(file);
}

// Redraw at a capped size and re-encode as JPEG, which is what keeps a photo
// small enough to live in localStorage.
function shrinkImage(img) {
    const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    // JPEG has no alpha channel, so transparent PNGs would come out black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
}

function showImagePreview(dataUrl) {
    const preview = document.getElementById('image-preview');
    // Assigning .src rather than building HTML keeps the data URL out of any
    // markup string.
    document.getElementById('image-preview-img').src = dataUrl;
    preview.hidden = false;
}

function clearImage() {
    selectedImage = null;

    const preview = document.getElementById('image-preview');
    preview.hidden = true;
    document.getElementById('image-preview-img').removeAttribute('src');

    document.getElementById('image-gallery-input').value = '';
    document.getElementById('image-camera-input').value = '';

    const hint = document.getElementById('image-hint');
    hint.textContent = 'Large photos are resized before saving.';
    hint.classList.remove('error');
}

// Persistence

function loadProducts() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (err) {
        return [];
    }
}

// Returns false if the write failed. With photos attached the ~5MB quota is a
// realistic limit rather than a theoretical one, so callers must check.
function saveProducts() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
        return true;
    } catch (err) {
        return false;
    }
}

// Star rating picker

function setRating(value) {
    selectedRating = value;
    previewRating(value);
    document.getElementById('star-input').classList.remove('error');
}

function previewRating(value) {
    document.querySelectorAll('.star-btn').forEach(function (btn) {
        btn.classList.toggle('active', Number(btn.dataset.value) <= value);
    });
}

// Add product

function handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('product-name').value.trim();
    const details = document.getElementById('product-details').value.trim();
    const review = document.getElementById('product-review').value.trim();
    const formError = document.getElementById('form-error');

    formError.textContent = '';

    if (!selectedRating) {
        document.getElementById('star-input').classList.add('error');
        return;
    }

    products.unshift({
        id: Date.now(),
        name: name,
        details: details,
        rating: selectedRating,
        review: review,
        image: selectedImage
    });

    if (!saveProducts()) {
        // Undo the add so the list on screen keeps matching what is stored.
        products.shift();
        formError.textContent = selectedImage
            ? 'Not enough browser storage left to save this photo. Try removing it, or delete an older review.'
            : 'Not enough browser storage left to save this review.';
        return;
    }

    document.getElementById('product-form').reset();
    selectedRating = 0;
    previewRating(0);
    clearImage();

    // Re-apply the current search filter so the new product only
    // appears immediately if it matches what's typed in the search box.
    handleSearch();
}

// Search

function handleSearch() {
    const term = document.getElementById('search').value.toLowerCase().trim();
    const filtered = products.filter(function (product) {
        return product.name.toLowerCase().includes(term) ||
            product.details.toLowerCase().includes(term);
    });
    renderProducts(filtered);
}

// Delete

function deleteProduct(id) {
    products = products.filter(function (product) { return product.id !== id; });
    saveProducts();
    handleSearch();
}

// Dashboard stats

// Derived from `products` only — no extra state, nothing persisted.
function renderStats() {
    const totalEl = document.getElementById('stat-total');
    const averageEl = document.getElementById('stat-average');
    const latestEl = document.getElementById('stat-latest');

    totalEl.textContent = products.length;

    if (products.length === 0) {
        averageEl.innerHTML = '&mdash;';
        latestEl.innerHTML = '&mdash;';
        return;
    }

    const sum = products.reduce(function (acc, product) {
        return acc + Number(product.rating);
    }, 0);
    averageEl.textContent = (sum / products.length).toFixed(1);

    // handleSubmit() unshifts, so index 0 is always the newest product.
    // textContent, not innerHTML — this is user-supplied text.
    latestEl.textContent = products[0].name;
    latestEl.title = products[0].name;
}

// Render

// Static markup — no user-supplied text is interpolated into these.
const EMPTY_NO_PRODUCTS =
    '<div class="empty-icon" aria-hidden="true">' +
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.4l6.1-.9Z"/></svg>' +
    '</div>' +
    '<h3>No reviews yet</h3>' +
    '<p>Start by adding your first product review.</p>' +
    '<a class="btn-primary" href="#add-review">+ Add Review</a>';

const EMPTY_NO_MATCHES =
    '<div class="empty-icon" aria-hidden="true">' +
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
    '</div>' +
    '<h3>No matching reviews</h3>' +
    '<p>Try another product name or keyword.</p>';

function renderProducts(list) {
    const container = document.getElementById('product-list');
    const emptyState = document.getElementById('empty-state');
    const countBadge = document.getElementById('product-count');

    container.innerHTML = '';
    countBadge.textContent = products.length;
    renderStats();

    if (list.length === 0) {
        emptyState.innerHTML = products.length === 0
            ? EMPTY_NO_PRODUCTS
            : EMPTY_NO_MATCHES;
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    list.forEach(function (product) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += '<span class="star' + (i <= product.rating ? ' filled' : '') + '">★</span>';
        }

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML =
            (product.image ? '<div class="product-media"></div>' : '') +
            '<div class="product-card-header">' +
                '<div>' +
                    '<h3>' + escapeHtml(product.name) + '</h3>' +
                    '<p class="product-details">' + escapeHtml(product.details) + '</p>' +
                '</div>' +
                '<button type="button" class="delete-btn" data-id="' + product.id + '" aria-label="Delete ' + escapeHtml(product.name) + '">' +
                    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>' +
                '</button>' +
            '</div>' +
            '<div class="product-rating-row">' +
                '<span class="star-rating" aria-label="' + product.rating + ' out of 5 stars">' + stars + '</span>' +
                '<span class="rating-value">' + product.rating + '/5</span>' +
            '</div>' +
            '<p class="product-review">' + escapeHtml(product.review) + '</p>';

        // The photo is attached by property, never interpolated into the
        // markup above, so a stored data URL can't inject anything.
        if (product.image) {
            const photo = document.createElement('img');
            photo.src = product.image;
            photo.alt = 'Photo of ' + product.name;
            photo.loading = 'lazy';
            card.querySelector('.product-media').appendChild(photo);
        }

        container.appendChild(card);
    });

    container.querySelectorAll('.delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const card = btn.closest('.product-card');
            const id = Number(btn.dataset.id);
            card.classList.add('removing');
            // transitionend bubbles, and the card photo has its own transform
            // transition — so ignore events coming from children and only act
            // on the card's own fade-out.
            card.addEventListener('transitionend', function handler(e) {
                if (e.target !== card) {
                    return;
                }
                card.removeEventListener('transitionend', handler);
                deleteProduct(id);
            });
        });
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
