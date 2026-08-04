const STORAGE_KEY = 'productReviews';

let products = loadProducts();
let selectedRating = 0;

document.addEventListener('DOMContentLoaded', function () {
    const session = getSession();
    if (session) {
        document.getElementById('welcome-message').textContent = 'Welcome, ' + session.username;
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
});

// Persistence

function loadProducts() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (err) {
        return [];
    }
}

function saveProducts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
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

    if (!selectedRating) {
        document.getElementById('star-input').classList.add('error');
        return;
    }

    products.unshift({
        id: Date.now(),
        name: name,
        details: details,
        rating: selectedRating,
        review: review
    });
    saveProducts();

    document.getElementById('product-form').reset();
    selectedRating = 0;
    previewRating(0);

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

// Render

function renderProducts(list) {
    const container = document.getElementById('product-list');
    const emptyState = document.getElementById('empty-state');
    const countBadge = document.getElementById('product-count');

    container.innerHTML = '';
    countBadge.textContent = products.length;

    if (list.length === 0) {
        emptyState.textContent = products.length === 0
            ? 'No products yet — add one above to get started.'
            : 'No products match your search.';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    list.forEach(function (product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML =
            '<div class="product-card-header">' +
                '<h3>' + escapeHtml(product.name) + '</h3>' +
                '<button type="button" class="delete-btn" data-id="' + product.id + '" aria-label="Delete ' + escapeHtml(product.name) + '">&times;</button>' +
            '</div>' +
            '<p class="product-details">' + escapeHtml(product.details) + '</p>' +
            '<p class="star-rating" aria-label="' + product.rating + ' out of 5 stars">' +
                '★'.repeat(product.rating) + '☆'.repeat(5 - product.rating) +
            '</p>' +
            '<p class="product-review">' + escapeHtml(product.review) + '</p>';
        container.appendChild(card);
    });

    container.querySelectorAll('.delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            deleteProduct(Number(btn.dataset.id));
        });
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
