// POST /api/oulipo/duel/rewrite — produce (or return) Sappho's rewrite of
// her piece without the sent words. May take a minute: up to four passes.
import { json } from '@sveltejs/kit';
import { duelDay, rewriteDuel } from '#lib/server/oulipo-duel.js';
import { fail } from '../_respond.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ locals }) {
    if (!locals.user) return json({ error: 'unauthorized' }, { status: 401 });
    try {
        const view = await rewriteDuel(locals.db, locals.platform?.env?.AI, {
            userId: locals.user.id,
            day: duelDay()
        });
        return json(view);
    } catch (error) {
        return fail(error, 'rewrite');
    }
}
