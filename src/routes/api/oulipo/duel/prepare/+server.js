// POST /api/oulipo/duel/prepare — bring today's prompt and Sappho's hidden
// draft into being for the player's language. Answers with the prompt and
// the fact that the draft is ready; never with the draft itself.
import { json } from '@sveltejs/kit';
import { duelDay, prepareDuel } from '#lib/server/oulipo-duel.js';
import { fail } from '../_respond.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ locals }) {
    if (!locals.user) return json({ error: 'unauthorized' }, { status: 401 });
    try {
        return json(await prepareDuel(locals.db, locals.platform?.env?.AI, locals.locale, duelDay()));
    } catch (error) {
        return fail(error, 'prepare');
    }
}
