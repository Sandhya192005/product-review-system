# Product Review System

A login-gated app for adding products with a 1–5 star rating and a written review, then searching through them. Built with plain HTML, CSS, and JavaScript.

## Features

- Sign up / log in with hashed passwords (SHA-256 via the Web Crypto API)
- Add a product with name, details, star rating, and review text
- Live search that filters by product name or details
- Delete a product
- Responsive card grid layout

## Tech Stack

- HTML, CSS, vanilla JavaScript
- No build tools, frameworks, or dependencies

## Getting Started

No installation needed — open `login.html` directly in a browser, or serve the folder:

```
python -m http.server 8000
```

Then visit http://localhost:8000/login.html.

## How Data Is Stored

This is a client-only demo — there is no backend or database.

- `prsUsers` (localStorage) — accounts, with SHA-256-hashed passwords (no plaintext)
- `prsSession` (localStorage) — the active session
- `productReviews` (localStorage) — the product list

Since there's no server to verify against, this auth is for demonstration only — don't extend this pattern to anything handling real user data.

## Project Structure

```
login.html   sign up / log in (tab-toggle between the two)
home.html    product list, search, and add-product form (protected)
auth.js      shared auth logic (hashing, session, requireSession)
web.js       product list behavior — add, search, delete, render
index.css    all styling
```
