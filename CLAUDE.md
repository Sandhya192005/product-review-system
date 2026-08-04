# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A tiny client-only Product Review System: a login-gated page with a form to add products (name, details, 1-5 star rating, review text), a live search box that filters the list, and delete-per-product. Data persists in the browser via `localStorage`. No backend, no database, no build step, no package manager.

## Running it

There is no dev server or build command. `home.html`/`login.html` link to `index.css`, `auth.js`, and `web.js` via normal `<link>`/`<script src>` tags, so open `login.html` directly in a browser (or serve the folder with any static file server, e.g. `python -m http.server`) to test changes.

## Architecture

- `login.html` — combined sign-up/log-in page (tab-toggle between two forms). On success it calls `setSession()` and redirects to `home.html`; if a session already exists it redirects straight there instead of showing the forms.
- `auth.js` — shared auth logic loaded by both `login.html` and `home.html`: `loadUsers()`/`saveUsers()` (array of `{ username, passwordHash }` in `localStorage` under `prsUsers`), `hashPassword()` (SHA-256 via `crypto.subtle`, no plaintext passwords stored), `getSession()`/`setSession()`/`clearSession()` (`localStorage` key `prsSession`), and `requireSession()`.
- `home.html` — loads `auth.js` synchronously in `<head>` and calls `requireSession()` immediately (before `<body>` renders) to redirect unauthenticated visitors to `login.html` without a content flash. Body markup: a `.user-bar` (welcome message + logout button), search input, add-product form (clickable star-rating picker instead of a number input), and a `#product-list` grid container. Loads `web.js` at the end of `<body>`.
- `index.css` — all styling: CSS custom properties for colors/spacing at the top (purple/pink gradient brand theme), card-based layout for the form/list/auth sections, the `.star-btn`/`.star-input` rating picker states (`.active`, `.error`), `.auth-tabs`/`.auth-form` for the login page, and a responsive `.product-grid` (`auto-fill, minmax(260px, 1fr)`).
- `web.js` — product list behavior (see Data model below) plus wiring the `.user-bar` welcome text (from `getSession()`) and the logout button (`clearSession()` + redirect to `login.html`) on `DOMContentLoaded`.

**Auth is a client-only demo, not real security**: anyone with devtools can read `prsUsers`/`prsSession` straight out of `localStorage`, and there's no server to verify against. Fine for a learning project; don't extend this pattern to anything handling real user data.

## Data model

`products` is an array of `{ id, name, details, rating (1-5), review }`, persisted to `localStorage` under the key `productReviews` on every add/delete (`loadProducts()` / `saveProducts()`).

- The rating picker is a row of `.star-btn` buttons (not the native `<input type="number">`); `selectedRating` tracks the pending value, `setRating()`/`previewRating()` drive the filled/empty star state, and submitting with no rating selected shows `.rating-error` instead of adding the product.
- `handleSubmit()` builds a new product object (`id: Date.now()`), `unshift`s it onto `products` (newest first), saves, resets the form, and re-renders through `handleSearch()` so the new card only appears if it matches whatever is currently typed in the search box.
- `handleSearch()` case-insensitively filters `products` by substring match on `name` or `details` and calls `renderProducts()` with the filtered list.
- `deleteProduct(id)` removes the matching product, saves, and re-renders via `handleSearch()`.
- `renderProducts(list)` rebuilds `#product-list` from `list`, but always sets the count badge from the full `products` array (not the filtered list) and shows one of two empty-state messages depending on whether `products` itself is empty vs. just the current filter matching nothing.
- All user-supplied text is passed through `escapeHtml()` (an off-DOM element's `textContent`/`innerHTML` roundtrip) before being interpolated into card markup — don't reintroduce raw interpolation of `name`/`details`/`review` into `innerHTML`.
