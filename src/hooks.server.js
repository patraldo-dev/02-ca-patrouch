// src/hooks.server.js
/**
 * SvelteKit server hook — implements session management per Lucia v3 migration guide.
 * @see https://lucia-auth.com/lucia-v3/migrate
 */

import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";

// Session constants (from Lucia guide)
const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Generates a cryptographically secure session ID (from Lucia guide)
 * @returns {string}
 */
function generateSessionId() {
    const bytes = new Uint8Array(25);
    crypto.getRandomValues(bytes);
    return encodeBase32LowerCaseNoPadding(bytes);
}

/**
 * Validates a session (from Lucia guide, adapted for D1)
 * @param {any} db - D1 database instance
 * @param {string} sessionId - Session ID to validate
 * @returns {Promise<{ id: string, userId: string, expiresAt: Date, fresh: boolean } | null>}
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

    // Auto-refresh if past halfway (Lucia guide pattern)
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
 * Invalidates a session (from Lucia guide)
 * @param {any} db - D1 database instance
 * @param {string} sessionId - Session ID to invalidate
 * @returns {Promise<void>}
 */
async function invalidateSession(db, sessionId) {
    await db.prepare(`
        DELETE FROM user_session
        WHERE id = ?
    `).bind(sessionId).run();
}

/**
 * Sets session cookie (from Lucia guide)
 * @param {Headers} headers - Response headers
 * @param {string} sessionId - Session ID
 * @param {Date} expiresAt - Expiration date
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
 * Deletes session cookie (from Lucia guide)
 * @param {Headers} headers - Response headers
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
    // Attach DB
    if (event.platform?.env?.DB) {
        event.locals.db = event.platform.env.DB;
    } else {
        // Mock D1 for local dev
        console.warn('⚠️ Using MOCK D1 database');

        event.locals.db = {
            prepare: (sql) => {
                const stmt = {
                    bind: (...params) => {
                        return {
                            all: async () => {
                                // Mock books
                                if (sql.includes('books')) {
                                    return {
                                        results: [
                                            {
                                                id: 'book-1',
                                                title: 'The Name of the Wind',
                                                author: 'Patrick Rothfuss',
                                                cover_image_url: 'https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/f8a136eb-363e-4a24-0f54-70bb4f4bf800/thumbnail',
                                                description: 'Epic fantasy...',
                                                published_year: 2007,
                                                avg_rating: 4.8,
                                                review_count: 215
                                            }
                                        ]
                                    };
                                }
                                // Mock users (for login)
                                if (sql.includes('users') && (params[0] === 'test@example.com' || params[0] === 'testuser')) {
                                    return {
                                        results: [{
                                            id: 'user-123',
                                            username: 'testuser',
                                            email: 'test@example.com',
                                            hashed_password: '$argon2id$v=19$m=65536,t=3,p=4$...hashed...', // mock hash
                                            email_verified_at: new Date().toISOString()
                                        }]
                                    };
                                }
                                // Mock sessions
                                if (sql.includes('user_session') && params[0] === 'session-mock-123') {
                                    return {
                                        results: [{
                                            id: 'session-mock-123',
                                            user_id: 'user-123',
                                            expires_at: Math.floor(Date.now() / 1000) + 3600
                                        }]
                                    };
                                }
                                return { results: [] };
                            },
                            first: async () => null,
                            run: async () => ({ success: true })
                        };
                    }
                };
                stmt.all = async () => await stmt.bind().all();
                stmt.first = async () => await stmt.bind().first();
                stmt.run = async () => await stmt.bind().run();
                return stmt;
            }
        };
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

    // Attach to locals
    event.locals.session = session;
    event.locals.user = user;

    // Resolve request
    const response = await resolve(event);

    // Refresh session cookie if needed
    if (session?.fresh) {
        setSessionCookie(response.headers, session.id, session.expiresAt);
    }

    return response;
}
