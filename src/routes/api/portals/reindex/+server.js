import { json } from '@sveltejs/kit';

/**
 * POST /api/portals/reindex
 * Scans Agora writings, matches trigger keywords, updates active_writings_count per portal.
 * If a dormant portal's count crosses the activation threshold, it condenses into existence.
 *
 * Can be called by:
 * - CF Cron Worker (daily)
 * - Admin trigger
 * - After a writing is published
 */

const ACTIVATION_THRESHOLD = 3; // minimum writings to activate a dormant portal

export async function POST({ platform, request }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    try {
        // Fetch all portals (active + dormant) with their triggers
        const { results: portals } = await db.prepare(`
            SELECT id, galaxy_id, triggers, status FROM portals
        `).all();

        // Fetch all published public writings
        const { results: writings } = await db.prepare(`
            SELECT id, title, content FROM writings
            WHERE status = 'published' AND visibility = 'public'
        `).all();

        const results = [];

        for (const portal of portals || []) {
            let triggers = [];
            try { triggers = JSON.parse(portal.triggers || '[]'); } catch {}

            if (triggers.length === 0) continue;

            let matchCount = 0;
            for (const w of writings || []) {
                const text = ((w.title || '') + ' ' + (w.content || '')).toLowerCase();
                const hasMatch = triggers.some(t => text.includes(t.toLowerCase()));
                if (hasMatch) matchCount++;
            }

            const wasDormant = portal.status === 'dormant';
            const nowActive = wasDormant && matchCount >= ACTIVATION_THRESHOLD;

            // Update count and possibly status
            if (nowActive) {
                await db.prepare(`
                    UPDATE portals SET active_writings_count = ?, status = 'active', discovered_at = datetime('now')
                    WHERE id = ?
                `).bind(matchCount, portal.id).run();
                results.push({ portal: portal.id, writings: matchCount, condensed: true });
            } else if (matchCount !== portal.active_writings_count) {
                await db.prepare(`
                    UPDATE portals SET active_writings_count = ? WHERE id = ?
                `).bind(matchCount, portal.id).run();
                results.push({ portal: portal.id, writings: matchCount, condensed: false });
            }
        }

        return json({
            indexed: results.length,
            portals: results,
            totalWritings: writings?.length || 0
        });
    } catch (e) {
        console.error('Portal reindex error:', e);
        return json({ error: 'Reindex failed: ' + e.message }, { status: 500 });
    }
}
