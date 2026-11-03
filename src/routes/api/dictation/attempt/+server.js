// src/routes/api/dictation/attempt/+server.js
// Persist dictée attempts (typed or photographed-handwritten) and serve
// the user's history + aggregate stats for the progress chart.
import { json } from '@sveltejs/kit';

function gate(user) {
    if (!user) return 401;
    if (!['member', 'admin'].includes(user.role || '')) return 403;
    return 0;
}

export async function POST({ locals, request }) {
    const denied = gate(locals?.user);
    if (denied) return json({ error: 'Unauthorized' }, { status: denied });

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request' }, { status: 400 });
    }

    const locale = ['en', 'es', 'fr'].includes(body.locale) ? body.locale : 'es';
    const mode = body.mode === 'handwritten' ? 'handwritten' : 'typed';
    const accuracy = Math.max(0, Math.min(100, Number(body.accuracy) || 0));
    const faults = Math.max(0, Math.min(9999, Math.round(Number(body.faults) || 0)));
    const extras = Math.max(0, Math.min(9999, Math.round(Number(body.extras) || 0)));
    const wordCount = Math.max(0, Math.min(9999, Math.round(Number(body.wordCount) || 0)));
    const writingId = typeof body.writingId === 'string' ? body.writingId.slice(0, 64) : null;
    const manuscriptUrl =
        typeof body.manuscriptUrl === 'string' && body.manuscriptUrl.startsWith('https://imagedelivery.net/')
            ? body.manuscriptUrl
            : null;

    const id = crypto.randomUUID();
    try {
        await locals.db
            .prepare(
                `INSERT INTO dictation_attempts
                 (id, user_id, writing_id, locale, mode, accuracy, faults, extras, word_count, manuscript_url)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
                id,
                locals.user.id,
                writingId,
                locale,
                mode,
                accuracy,
                faults,
                extras,
                wordCount,
                manuscriptUrl
            )
            .run();
    } catch (e) {
        console.error('[dictation-attempt] insert failed:', e.message);
        return json({ error: 'Could not save attempt' }, { status: 500 });
    }

    return json({ id });
}

export async function GET({ locals }) {
    const denied = gate(locals?.user);
    if (denied) return json({ error: 'Unauthorized' }, { status: denied });

    let rows = [];
    let aggregates = null;
    try {
        const res = await locals.db
            .prepare(
                `SELECT id, writing_id, locale, mode, accuracy, faults, extras, word_count, manuscript_url, created_at
                 FROM dictation_attempts WHERE user_id = ?
                 ORDER BY created_at DESC, rowid DESC LIMIT 100`
            )
            .bind(locals.user.id)
            .all();
        rows = res.results || [];

        aggregates = await locals.db
            .prepare(
                `SELECT COUNT(*) AS total,
                        ROUND(AVG(accuracy), 1) AS avg_accuracy,
                        MAX(accuracy) AS best_accuracy,
                        SUM(CASE WHEN mode = 'handwritten' THEN 1 ELSE 0 END) AS handwritten
                 FROM dictation_attempts WHERE user_id = ?`
            )
            .bind(locals.user.id)
            .first();
    } catch (e) {
        console.error('[dictation-attempt] load failed:', e.message);
        return json({ error: 'Could not load attempts' }, { status: 500 });
    }

    return json({
        attempts: rows,
        stats: aggregates || { total: 0, avg_accuracy: null, best_accuracy: null, handwritten: 0 }
    });
}
