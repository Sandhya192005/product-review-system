# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A tiny client-only Product Review System: a page with a form to add products (name, details, 1-5 star rating, review text), a live search box that filters the list, and delete-per-product. Data persists in the browser via `localStorage`. No backend, no database, no build step, no package manager.

## Running it

There is no dev server or build command. `home.html` links to `index.css` and `web.js` via normal `<link>`/`<script src>` tags, so open it directly in a browser (or serve the folder with any static file server, e.g. `python -m http.server`) to test changes.

## Architecture

Three files, properly wired together:

- `home.html` — markup only: search input, add-product form (with a clickable star-rating picker instead of a number input), and a `#product-list` grid container. Links `index.css` and loads `web.js` at the end of `<body>`.
- `index.css` — all styling: CSS custom properties for colors/spacing at the top, card-based layout for the form/list sections, the `.star-btn`/`.star-input` rating picker states (`.active`, `.error`), and a responsive `.product-grid` (`auto-fill, minmax(260px, 1fr)`).
- `web.js` — all behavior (see Data model below).

## Data model

`products` is an array of `{ id, name, details, rating (1-5), review }`, persisted to `localStorage` under the key `productReviews` on every add/delete (`loadProducts()` / `saveProducts()`).

- The rating picker is a row of `.star-btn` buttons (not the native `<input type="number">`); `selectedRating` tracks the pending value, `setRating()`/`previewRating()` drive the filled/empty star state, and submitting with no rating selected shows `.rating-error` instead of adding the product.
- `handleSubmit()` builds a new product object (`id: Date.now()`), `unshift`s it onto `products` (newest first), saves, resets the form, and re-renders through `handleSearch()` so the new card only appears if it matches whatever is currently typed in the search box.
- `handleSearch()` case-insensitively filters `products` by substring match on `name` or `details` and calls `renderProducts()` with the filtered list.
- `deleteProduct(id)` removes the matching product, saves, and re-renders via `handleSearch()`.
- `renderProducts(list)` rebuilds `#product-list` from `list`, but always sets the count badge from the full `products` array (not the filtered list) and shows one of two empty-state messages depending on whether `products` itself is empty vs. just the current filter matching nothing.
- All user-supplied text is passed through `escapeHtml()` (an off-DOM element's `textContent`/`innerHTML` roundtrip) before being interpolated into card markup — don't reintroduce raw interpolation of `name`/`details`/`review` into `innerHTML`.
