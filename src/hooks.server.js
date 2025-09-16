// src/hooks.server.js
import { validateSession, invalidateSession } from '$lib/server/session.js';
import { setSessionCookie, deleteSessionCookie } from '$lib/server/cookies.js';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // Attach real D1 if available (production or `wrangler dev --remote`)
    if (event.platform?.env?.DB) {
        event.locals.db = event.platform.env.DB;
    } else {
        // 🧪 Mock D1 for local development — SAFE, ASYNC, DEBUGGABLE
        console.warn('⚠️ Using MOCK D1 database — no real DB connected. For real data, use `wrangler dev --remote`.');

        event.locals.db = {
            /**
             * Simulates D1 `prepare(sql).bind(...params).all()`
             */
            prepare: (sql) => {
                const stmt = {
                    bind: (...params) => {
                        const queryContext = { sql, params };
                        return {
                            /**
                             * Mock `all()` — returns { results: [...] }
                             */
                            all: async () => {
                                console.log('🧪 Mock D1 .all() called:', queryContext);

                                // Mock books query
                                if (sql.includes('SELECT') && sql.includes('books')) {
                                    return {
                                        results: [
                                            {
                                                id: 'book-1',
                                                title: 'The Name of the Wind',
                                                author: 'Patrick Rothfuss',
                                                cover_image_url: 'https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/f8a136eb-363e-4a24-0f54-70bb4f4bf800/thumbnail',
                                                description: 'Epic fantasy about Kvothe, a magically gifted young man.',
                                                published_year: 2007,
                                                avg_rating: 4.8,
                                                review_count: 215
                                            },
                                            {
                                                id: 'book-2',
                                                title: 'Project Hail Mary',
                                                author: 'Andy Weir',
                                                cover_image_url: 'https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/f8a136eb-363e-4a24-0f54-70bb4f4bf800/thumbnail',
                                                description: 'A lone astronaut must save Earth from disaster.',
                                                published_year: 2021,
                                                avg_rating: 4.7,
                                                review_count: 189
                                            },
                                            {
                                                id: 'book-3',
                                                title: 'Piranesi',
                                                author: 'Susanna Clarke',
                                                cover_image_url: 'https://imagedelivery.net/4bRSwPonOXfEIBVZiDXg0w/f8a136eb-363e-4a24-0f54-70bb4f4bf800/thumbnail',
                                                description: 'A man dwells in a mysterious, infinite house.',
                                                published_year: 2020,
                                                avg_rating: 4.3,
                                                review_count: 94
                                            }
                                        ]
                                    };
                                }

                                // Default: empty result
                                return { results: [] };
                            },

                            /**
                             * Mock `first()` — returns first row or null
                             */
                            first: async () => {
                                const result = await this.all();
                                return result.results[0] || null;
                            },

                            /**
                             * Mock `run()` — for INSERT/UPDATE/DELETE
                             */
                            run: async () => {
                                console.log('🧪 Mock D1 .run() called — would execute:', queryContext);
                                return { success: true, meta: { duration: 0.001 } };
                            }
                        };
                    }
                };

                // 👇 ALSO attach .all(), .first(), .run() directly to stmt for convenience
                stmt.all = async () => await stmt.bind().all();
                stmt.first = async () => await stmt.bind().first();
                stmt.run = async () => await stmt.bind().run();

                return stmt;
            }
        };
    }

    // Get session from cookie
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

    // Continue
    const response = await resolve(event);

    // If session was refreshed, update cookie
    if (session?.fresh) {
        setSessionCookie(response.headers, session.id, session.expiresAt);
    }

    return response;
}
