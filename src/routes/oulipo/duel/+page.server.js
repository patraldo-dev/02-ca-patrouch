// /oulipo/duel — the solitaire duel. Everything the page needs before the
// player locks comes from here; the draft itself only ever arrives through
// the lock endpoint, inside a locked round.
import { duelDay, getBoard, readDraft, readPrompt, readRound, roundView } from '#lib/server/oulipo-duel.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals }) {
    const base = { locale: locals.locale || 'es', signedIn: Boolean(locals.user) };
    if (!locals.user) {
        return { ...base, unavailable: false, round: null, prompt: null, draftReady: false, board: /** @type {import('#lib/oulipo/types.js').BoardRow[]} */ ([]) };
    }

    const db = locals.db;
    const day = duelDay();
    try {
        const row = await readRound(db, locals.user.id, day);
        let round = /** @type {import('#lib/oulipo/types.js').RoundView | null} */ (null);
        if (row) {
            const draft = await readDraft(db, row.locale, row.duel_date);
            if (draft) round = roundView(row, draft);
        }
        const today = round ? null : await readPrompt(db, day, base.locale);
        return {
            ...base,
            unavailable: false,
            round,
            prompt: today ? { id: today.id, text: today.prompt_text } : null,
            draftReady: Boolean(round) || Boolean(await readDraft(db, base.locale, day)),
            board: await getBoard(db, base.locale, day, { userId: locals.user.id })
        };
    } catch (error) {
        // Until the duel's tables exist the page simply says it is not open.
        console.error('[duel] load failed:', error instanceof Error ? error.message : error);
        return { ...base, unavailable: true, round: null, prompt: null, draftReady: false, board: /** @type {import('#lib/oulipo/types.js').BoardRow[]} */ ([]) };
    }
}
