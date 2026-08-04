// Client-only demo auth: users and password hashes live in localStorage.
// There is no server to verify against, so this is not real security —
// anyone with devtools can read localStorage. Good enough for a learning
// project, not for anything handling real user data.

const USERS_KEY = 'prsUsers';
const SESSION_KEY = 'prsSession';

function loadUsers() {
    try {
        const stored = localStorage.getItem(USERS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (err) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
}

function getSession() {
    try {
        const stored = localStorage.getItem(SESSION_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (err) {
        return null;
    }
}

function setSession(username) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: username }));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

function requireSession() {
    if (!getSession()) {
        window.location.href = 'login.html';
    }
}
