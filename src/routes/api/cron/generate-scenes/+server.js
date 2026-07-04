/**
 * POST /api/cron/generate-scenes
 *
 * Daily cycle. Delegates to the portal architect, which makes the four-way
 * decision (enhance_scene / add_scene / birth_portal / enhance_metadata)
 * based on recent writings vs the existing portal landscape.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 * AI:   platform.env.AI binding
 */

import { runCycle } from '$lib/server/portal-architect.js';

export async function POST({ platform, request }) {
    const auth = request.headers.get('authorization');
    const CRON_SECRET = await platform?.env?.CRON_SECRET?.get?.() ?? null;

    if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = platform?.env?.DB_book;
    const ai = platform?.env?.AI;

    if (!db || !ai) {
        return json({ error: 'DB or AI binding unavailable' }, { status: 503 });
    }

    // CLOUDFLARE_API_TOKEN is needed for art generation on birthed portals.
    const cfToken = await platform?.env?.CLOUDFLARE_API_TOKEN?.get?.() ?? null;

    try {
        const result = await runCycle(db, ai, { cfToken });

        return json({
            success: true,
            reasoning: result.plan_reasoning,
            actions_proposed: (result.actions || []).length,
            applied: result.applied,
            skipped: result.skipped,
            timestamp: new Date().toISOString(),
        });
    } catch (e) {
        console.error('generate-scenes (architect) error:', e);
        return json({ error: 'Architect cycle failed: ' + e.message }, { status: 500 });
    }
}

function json(data, init) {
    return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
    });
}
