// Shared answers for the duel's endpoints (api/oulipo/duel/*).
import { json } from '@sveltejs/kit';
import { DuelError } from '#lib/server/oulipo-duel.js';

/** The request body, or null when it is not JSON. @param {Request} request */
export async function readJson(request) {
    try {
        return await request.json();
    } catch {
        return null;
    }
}

/**
 * A DuelError answers with its status and code. Anything else is a 500 that
 * says nothing it should not; the detail stays in the logs.
 * @param {unknown} error
 * @param {string} where
 */
export function fail(error, where) {
    if (error instanceof DuelError) {
        return json({ error: error.code, detail: error.detail }, { status: error.status });
    }
    console.error(`[duel] ${where} failed:`, error instanceof Error ? error.message : error);
    return json({ error: 'server_error' }, { status: 500 });
}
