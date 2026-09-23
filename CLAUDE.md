# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A tiny client-only Product Review System: a login-gated page with a form to add products (name, details, 1-5 star rating, review text), a live search box that filters the list, and delete-per-product. Data persists in the browser via `localStorage`. No backend, no database, no build step, no package manager.

## Running it

There is no build command, no test suite, and no linter — nothing to install and nothing to run. Verification is manual: open the app in a browser and exercise the flow.

`home.html`/`login.html` link to `index.css`, `auth.js`, and `web.js` via normal `<link>`/`<script src>` tags, so `login.html` can be opened directly. Prefer serving the folder over HTTP (`python -m http.server`, then visit `http://localhost:8000/login.html`): `hashPassword()` uses `crypto.subtle`, which only exists in a secure context, so if sign-up/log-in fails silently under `file://`, that's why.

To reset state while testing, clear the `prsUsers`, `prsSession`, and `productReviews` keys from `localStorage`.

## Architecture

- `login.html` — combined sign-up/log-in page (tab-toggle between two forms). The form validation and submit handlers live in an inline `<script>` in this page, not in `auth.js`; on success they call `setSession()` and redirect to `home.html`. If a session already exists the page redirects straight there instead of showing the forms.
- `auth.js` — shared auth *primitives* loaded by both pages (no form logic): `loadUsers()`/`saveUsers()` (array of `{ username, passwordHash }` in `localStorage` under `prsUsers`), `hashPassword()` (SHA-256 via `crypto.subtle`, no plaintext passwords stored), `getSession()`/`setSession()`/`clearSession()` (`localStorage` key `prsSession`), and `requireSession()`.
- `home.html` — loads `auth.js` synchronously in `<head>` and calls `requireSession()` immediately (before `<body>` renders) to redirect unauthenticated visitors to `login.html` without a content flash. Single-page dashboard with three anchored sections — `#dashboard` (hero + stats), `#add-review` (the form), `#products` (search + `#product-list` grid) — linked from a sticky `.site-nav`. Deliberately *not* split into separate pages: `web.js` binds `#product-form` and `#search` unconditionally at load, so a page missing either would throw. Loads `web.js` at the end of `<body>`.
- `index.css` — all styling. Palette tokens live in `:root` (midnight navy surfaces, electric cyan `--primary` as the interactive accent, teal `--secondary`, gold `--rating` for stars, coral `--danger` for destructive actions). Cyan is used for interactive/active states only, not as a background wash. Also holds the `.star-btn`/`.star-input` picker states (`.active`, `.error`), `.auth-tabs`/`.auth-form` for the login page, and a responsive `.product-grid` (`auto-fill, minmax(290px, 1fr)`).
- `web.js` — product list behavior (see Data model below), the photo picker, `renderStats()`, plus wiring the `#welcome-message` heading in the dashboard hero (from `getSession()`) and the logout button (`clearSession()` + redirect to `login.html`) on `DOMContentLoaded`.

`renderStats()` derives Total Reviews, Average Rating and Latest Review from the `products` array alone — no stored counters, and nothing invented. Latest Review uses `products[0].name` because `handleSubmit()` `unshift`s, and sets it via `textContent` since it is user-supplied text.

Every file is plain global-scope script — `web.js` and `login.html`'s inline script call `auth.js`'s functions as globals. Don't add `type="module"`, `defer`, or wrap files in an IIFE without rewiring the call sites, and keep `auth.js` first in load order.

**Auth is a client-only demo, not real security**: anyone with devtools can read `prsUsers`/`prsSession` straight out of `localStorage`, and there's no server to verify against. Fine for a learning project; don't extend this pattern to anything handling real user data.

Usernames are compared case-insensitively for both sign-up uniqueness and log-in, but the original casing is what gets stored and shown in the welcome message.

## Data model

`products` is an array of `{ id, name, details, rating (1-5), review, image }`, persisted to `localStorage` under the key `productReviews` on every add/delete (`loadProducts()` / `saveProducts()`). `image` is an optional JPEG data URL or `null`; products saved before the photo feature simply have no `image` key, and every read site treats a missing value as "no photo".

- **Photos are downscaled before they are stored.** `localStorage` is ~5MB for the whole origin and base64 adds ~33%, so a raw phone photo would consume the entire budget. `handleImageFile()` reads the file, and `shrinkImage()` redraws it through a canvas capped at `IMAGE_MAX_DIMENSION` (900px on the long edge) and re-encodes it as JPEG at `IMAGE_QUALITY` (0.72), filling white first because JPEG has no alpha. Don't store the original file.
- `saveProducts()` returns a boolean rather than throwing — with photos the quota is a realistic limit. `handleSubmit()` checks it and `shift()`s the just-added product back off on failure, so the in-memory list never drifts from what's stored.
- The photo is attached to a card with `photo.src = product.image` **after** `innerHTML` is set, never interpolated into the markup string — same reasoning as `escapeHtml()` for text.
- Two file inputs back the picker: a plain one for the gallery and one with `capture="environment"` that asks a phone for the camera directly. Both are `display: none` and driven by `.image-btn` buttons via `.click()`.

- The rating picker is a row of `.star-btn` buttons (not the native `<input type="number">`); `selectedRating` tracks the pending value, `setRating()`/`previewRating()` drive the filled/empty star state, and submitting with no rating selected shows `.rating-error` instead of adding the product.
- `handleSubmit()` builds a new product object (`id: Date.now()`), `unshift`s it onto `products` (newest first), saves, resets the form, and re-renders through `handleSearch()` so the new card only appears if it matches whatever is currently typed in the search box.
- `handleSearch()` case-insensitively filters `products` by substring match on `name` or `details` and calls `renderProducts()` with the filtered list.
- `deleteProduct(id)` removes the matching product, saves, and re-renders via `handleSearch()`.
- `renderProducts(list)` rebuilds `#product-list` from `list`, but always sets the count badge from the full `products` array (not the filtered list) and shows one of two empty-state messages depending on whether `products` itself is empty vs. just the current filter matching nothing. It re-binds the delete handlers on every render (handlers are per-card, not delegated), so any new per-card interaction has to be wired inside this function too.

## Cross-file couplings worth knowing

These break silently and won't show up as an error in the console:

- **Delete is driven by a CSS transition.** Clicking `.delete-btn` only adds the `.removing` class and waits for a `transitionend` event before calling `deleteProduct()`. If `.product-card`'s `transition` in `index.css` stops covering `opacity`/`transform`, or a `prefers-reduced-motion` rule zeroes it out, the event never fires and deleting stops working entirely. The listener also checks `e.target === card`: `transitionend` bubbles, and the card photo has its own `transform` transition, so a child's event would otherwise trigger the removal early. Any new transitioning child inside a card keeps that guard necessary.
- **The rating error is shown purely by CSS.** JS toggles `.error` on `#star-input`; the message appears via the adjacent-sibling rule `.star-input.error + .rating-error`. `#rating-error` must stay the immediate next sibling of `#star-input` in `home.html`.
- **The add-product form is `novalidate` and JS only checks the rating.** The `required` attributes on name/details/review are inert, so blank products can currently be added. That's existing behavior, not an oversight to silently "fix" — change it deliberately if asked.
- **All user-supplied text is passed through `escapeHtml()`** (an off-DOM element's `textContent`/`innerHTML` roundtrip) before being interpolated into card markup — don't reintroduce raw interpolation of `name`/`details`/`review` into `innerHTML`.
