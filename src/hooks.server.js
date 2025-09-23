// src/hooks.server.js
/**
 * SvelteKit server hook — real D1 only, no mock, no fallback.
 */
globalThis.process = globalThis.process || {};
globalThis.process.env = globalThis.process.env || {};
globalThis.process.env.OSLO_PASSWORD_DISABLE_NATIVE = "1";

import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";

// Session constants
const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Generates a cryptographically secure session ID
 */
function generateSessionId() {
    const bytes = new Uint8Array(25);
    crypto.getRandomValues(bytes);
    return encodeBase32LowerCaseNoPadding(bytes);
}

/**
 * Validates a session
 */
async function validateSession(db, sessionId) {
    const now = Math.floor(Date.now() / 1000);

    const { results } = await db.prepare(`
        SELECT id, user_id, expires_at
        FROM user_session
        WHERE id = ?
    `).bind(sessionId).all();

    if (results.length === 0) {
        return null;
    }

    const row = results[0];
    const session = {
        id: row.id,
        userId: row.user_id,
        expiresAt: new Date(row.expires_at * 1000),
        fresh: false
    };

    // Expired?
    if (now >= row.expires_at) {
        await invalidateSession(db, sessionId);
        return null;
    }

    // Auto-refresh if past halfway
    if (now >= row.expires_at - (SESSION_EXPIRES_IN_SECONDS / 2)) {
        const newExpiresAt = now + SESSION_EXPIRES_IN_SECONDS;
        await db.prepare(`
            UPDATE user_session
            SET expires_at = ?
            WHERE id = ?
        `).bind(newExpiresAt, sessionId).run();

        session.expiresAt = new Date(newExpiresAt * 1000);
        session.fresh = true;
    }

    return session;
}

/**
 * Invalidates a session
 */
async function invalidateSession(db, sessionId) {
    await db.prepare(`
        DELETE FROM user_session
        WHERE id = ?
    `).bind(sessionId).run();
}

/**
 * Sets session cookie
 */
function setSessionCookie(headers, sessionId, expiresAt) {
    const cookie = [
        `session=${sessionId}`,
        'HttpOnly',
        'SameSite=Lax',
        `Expires=${expiresAt.toUTCString()}`,
        'Path=/'
    ];

    if (process.env.NODE_ENV === 'production') {
        cookie.push('Secure');
    }

    headers.set('Set-Cookie', cookie.join('; '));
}

/**
 * Deletes session cookie
 */
function deleteSessionCookie(headers) {
    const cookie = [
        'session=',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=0',
        'Path=/'
    ];

    if (process.env.NODE_ENV === 'production') {
        cookie.push('Secure');
    }

    headers.set('Set-Cookie', cookie.join('; '));
}

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // ⚠️ CRITICAL: Force real D1 — no mock, no fallback
    if (!event.platform?.env?.DB_book) {
        throw new Error('❌ D1 database binding "DB_book" not found. Check wrangler.jsonc.');
    }

    event.locals.db = event.platform.env.DB_book;
    console.log('✅ Using REAL D1 database — no mock allowed');

    // Log Mailgun key for debugging
    if (event.platform?.env?.MAILGUN_API_KEY) {
        console.log('🔑 MAILGUN_API_KEY is set (length:', event.platform.env.MAILGUN_API_KEY.length, ')');
    } else {
        console.error('❌ MAILGUN_API_KEY is MISSING or undefined');
    }

    // Validate session from cookie
    const sessionId = event.cookies.get('session');
    let session = null;
    let user = null;

    if (sessionId) {
        session = await validateSession(event.locals.db, sessionId);
        if (session) {
            // Fetch user
            const { results } = await event.locals.db.prepare(`
                SELECT id, username, email, email_verified_at
                FROM users
                WHERE id = ?
            `).bind(session.userId).all();

            if (results[0]) {
                user = results[0];
                user.email_verified = user.email_verified_at !== null;
            } else {
                // User deleted — invalidate session
                await invalidateSession(event.locals.db, sessionId);
                session = null;
            }
        } else {
            // Invalid session — clear cookie
            deleteSessionCookie(event.cookies);
        }
    }

    // Attach to locals → powers $page.data.user in +layout.svelte
    event.locals.session = session;
    event.locals.user = user; // ← This is what your layout uses for "Welcome, {username}"
    if (event.platform) {
        event.locals.platform = event.platform;
    }

    // Resolve request
    const response = await resolve(event);

    // Refresh session cookie if needed
    if (session?.fresh) {
        setSessionCookie(response.headers, session.id, session.expiresAt);
    }

    return response;
}
