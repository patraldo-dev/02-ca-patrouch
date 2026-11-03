import { json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';

/**
 * GET: Fetch active narrator events (for display)
 * POST: Generate a portal dispatch notification (called by CF cron every 6h)
 * 
 * Portal dispatches replace the old Booty Battle Kraken system.
 * They scan recent Agora writings and portal activity, then generate
 * atmospheric notifications that connect the community to the portal universe.
 */

export async function GET({ platform }) {
    const db = env?.DB_book;
    if (!db) return json({ events: [] });

    try {
        const { results } = await db.prepare(`
            SELECT * FROM narrator_events 
            WHERE (expires_at IS NULL OR expires_at > datetime('now'))
            ORDER BY created_at DESC LIMIT 5
        `).all();
        return json({ events: results || [] });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}

export async function POST() {
    // Retired 2026-10-26: portal dispatches were game-flavor notifications
    // broadcast to every user 4x daily. The cron that called this was removed
    // from patrouch-cron-worker; this stub keeps manual triggers from
    // resurrecting the spam. GET is kept for narrator_events display.
    return json(
        { error: 'Portal dispatches retired — notifications are activity-only now.' },
        { status: 410 }
    );
}
