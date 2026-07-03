/**
 * POST /api/cron/generate-scenes
 *
 * Called by CF Cron Worker daily. Reads published writings, groups them
 * by portal triggers, sends to Workers AI (mistral-small) to generate
 * ECS scene configs, stores in portal_scenes table.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 * AI:   platform.env.AI binding (@cf/mistralai/mistral-small-3.1-24b-instruct)
 *
 * The Mistral call + normalization live in $lib/server/scene-generator.js
 * so the on-demand endpoint (/api/portals/[id]/generate-scene) shares them.
 */

import { generateSceneForPortal, matchWritingsByTriggers } from '$lib/server/scene-generator.js';

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

    try {
        // 1. Fetch all active portals with their triggers
        const { results: portals } = await db.prepare(
            `SELECT id, galaxy_id, icon, color_primary, color_bg, color_text, triggers,
                    name_es, name_en, name_fr
             FROM portals WHERE status = 'active'`
        ).all();

        if (!portals?.length) {
            return json({ error: 'No active portals' }, { status: 404 });
        }

        // 2. Fetch recent published writings (last 30 days, all locales)
        const { results: writings } = await db.prepare(
            `SELECT id, title, content, locale, category
             FROM writings
             WHERE status = 'published'
               AND created_at > datetime('now', '-30 days')
             ORDER BY created_at DESC
             LIMIT 50`
        ).all();

        if (!writings?.length) {
            return json({ message: 'No recent writings to process', portals_processed: 0 });
        }

        let processed = 0;
        let failed = 0;

        // 3. For each portal, match writings by triggers and generate scene
        for (const portal of portals) {
            let triggers = [];
            try { triggers = JSON.parse(portal.triggers || '[]'); } catch { triggers = []; }

            const matched = matchWritingsByTriggers(writings, triggers, 8);

            // Skip portals without enough matched writings — keep existing config
            if (matched.length < 3) continue;

            try {
                const { sceneConfig, sourceIds } = await generateSceneForPortal(ai, portal, matched);

                await db.prepare(
                    `INSERT INTO portal_scenes (portal_id, scene_config, source_writings, generated_at)
                     VALUES (?, ?, ?, datetime('now'))
                     ON CONFLICT(portal_id) DO UPDATE SET
                       scene_config = excluded.scene_config,
                       source_writings = excluded.source_writings,
                       generated_at = excluded.generated_at`
                ).bind(
                    portal.id,
                    JSON.stringify(sceneConfig),
                    JSON.stringify(sourceIds)
                ).run();

                processed++;
            } catch (err) {
                console.error(`Scene generation failed for ${portal.id}:`, err.message);
                failed++;
            }
        }

        return json({
            success: true,
            portals_processed: processed,
            portals_failed: failed,
            total_writings_analyzed: writings.length,
            timestamp: new Date().toISOString()
        });

    } catch (e) {
        console.error('generate-scenes error:', e);
        return json({ error: 'Scene generation failed: ' + e.message }, { status: 500 });
    }
}

function json(data, init) {
    return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
    });
}
