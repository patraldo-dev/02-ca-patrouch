// src/hooks.server.js
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
                                                cover_image_url: 'https://via.placeholder.com/300x450?text=Book+1',
                                                description: 'Epic fantasy about Kvothe, a magically gifted young man.',
                                                published_year: 2007,
                                                avg_rating: 4.8,
                                                review_count: 215
                                            },
                                            {
                                                id: 'book-2',
                                                title: 'Project Hail Mary',
                                                author: 'Andy Weir',
                                                cover_image_url: 'https://via.placeholder.com/300x450?text=Book+2',
                                                description: 'A lone astronaut must save Earth from disaster.',
                                                published_year: 2021,
                                                avg_rating: 4.7,
                                                review_count: 189
                                            },
                                            {
                                                id: 'book-3',
                                                title: 'Piranesi',
                                                author: 'Susanna Clarke',
                                                cover_image_url: 'https://via.placeholder.com/300x450?text=Book+3',
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

    // Continue with SvelteKit's request handling
    return await resolve(event);
}
