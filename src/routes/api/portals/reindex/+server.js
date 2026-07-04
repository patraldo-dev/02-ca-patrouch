/**
 * POST /api/portals/reindex
 *
 * Phase 1 (kept in-house): Scans Agora writings against existing portal
 * triggers, updates active_writings_count, activates dormant portals past
 * threshold.
 *
 * Phase 2 (delegated): Discovery/birthing now runs through the portal
 * architect, which makes the full four-way decision (enhance/add/birth/
 * metadata) with guardrails. This keeps one source of truth for portal
 * lifecycle — the cron and reindex both call runCycle().
 */

import { json } from '@sveltejs/kit';
import { runCycle } from '$lib/server/portal-architect.js';

const ACTIVATION_THRESHOLD = 5;

export async function POST({ platform }) {
    const db = platform?.env?.DB_book;
    const ai = platform?.env?.AI;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    try {
        // ── Phase 1: Update existing portal counts ──
        const { results: portals } = await db.prepare(`
            SELECT id, galaxy_id, triggers, status, active_writings_count FROM portals
        `).all();

        const { results: writings } = await db.prepare(`
            SELECT id, title, content FROM writings
            WHERE status = 'published' AND visibility = 'public'
        `).all();

        const updated = [];
        const matchedWritingIds = new Set();

        for (const portal of portals || []) {
            let triggers = [];
            try { triggers = JSON.parse(portal.triggers || '[]'); } catch {}
            if (triggers.length === 0) continue;

            let matchCount = 0;
            for (const w of writings || []) {
                const text = ((w.title || '') + ' ' + (w.content || '')).toLowerCase();
                const hasMatch = triggers.some(t => text.includes(t.toLowerCase()));
                if (hasMatch) {
                    matchCount++;
                    matchedWritingIds.add(w.id);
                }
            }

            const wasDormant = portal.status === 'dormant';
            const nowActive = wasDormant && matchCount >= ACTIVATION_THRESHOLD;

            if (nowActive) {
                await db.prepare(`
                    UPDATE portals SET active_writings_count = ?, status = 'active', discovered_at = datetime('now')
                    WHERE id = ?
                `).bind(matchCount, portal.id).run();
                updated.push({ portal: portal.id, writings: matchCount, condensed: true });
            } else if (matchCount !== portal.active_writings_count) {
                await db.prepare(`
                    UPDATE portals SET active_writings_count = ? WHERE id = ?
                `).bind(matchCount, portal.id).run();
                updated.push({ portal: portal.id, writings: matchCount, condensed: false });
            }
        }

        // ── Phase 2: Delegate discovery/birthing to the architect ──
        let architectResult = { applied: [], skipped: [], actions: [] };
        if (ai) {
            const cfToken = await platform?.env?.CLOUDFLARE_API_TOKEN?.get?.() ?? null;
            try {
                architectResult = await runCycle(db, ai, { cfToken });
            } catch (err) {
                console.error('Reindex architect cycle failed:', err.message);
                architectResult = { applied: [], skipped: [], error: err.message };
            }
        }

        return json({
            updated: updated.length,
            updates: updated,
            discovered: (architectResult.applied || []).filter(a => a.action === 'birth_portal').length,
            discoveries: (architectResult.applied || []).filter(a => a.action === 'birth_portal'),
            architect_applied: architectResult.applied || [],
            architect_skipped: architectResult.skipped || [],
            architect_reasoning: architectResult.plan_reasoning,
            totalWritings: writings?.length || 0,
            unmatched: (writings?.length || 0) - matchedWritingIds.size
        });
    } catch (e) {
        console.error('Portal reindex error:', e);
        return json({ error: 'Reindex failed: ' + e.message }, { status: 500 });
    }
}
