// GET /api/oulipo/duel/board — the day's board in the player's language.
import { json } from '@sveltejs/kit';
import { duelDay, getBoard } from '#lib/server/oulipo-duel.js';
import { fail } from '../_respond.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals }) {
    if (!locals.user) return json({ error: 'unauthorized' }, { status: 401 });
    try {
        const board = await getBoard(locals.db, locals.locale, duelDay(), { userId: locals.user.id });
        return json({ board });
    } catch (error) {
        return fail(error, 'board');
    }
}
