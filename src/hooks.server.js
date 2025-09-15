// src/hooks.server.js
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // Make D1 available via platform.env.DB
    if (event.platform?.env?.DB) {
        event.locals.db = event.platform.env.DB;
    }
    return await resolve(event);
}
