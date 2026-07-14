// POST /api/portals/[id]/visit
// Records that the current visitor entered a portal realm, for:
//   (a) co-presence notifications — "🟢 someone is exploring a realm you've visited"
//   (b) the "recent visitors" HUD surface.
//
// Called by NetworkSystem when a peer_joined event arrives and the local user
// is authenticated. Anonymous visits are still recorded (user_id null) for
// aggregate counts. Co-visitor notifications are throttled per (visitor, portal)
// so we don't spam: only notify a prior visitor once per ~10 minutes per portal.
import { json } from '@sveltejs/kit';
import { notify } from '$lib/server/notify.js';

const NOTIFY_COOLDOWN_MS = 10 * 60 * 1000; // 10 min between same-portal co-visit pings

export async function POST({ params, request, platform, locals }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    const { id: portalId } = params;
    const user = locals?.user || null;

    // The entering visitor's identity (optional — anonymous visitors logged too)
    let displayName = user?.display_name || user?.username || null;
    let body;
    try { body = await request.json(); } catch { body = {}; }
    if (body?.displayName) displayName = body.displayName;

    const portalName = await fetchPortalName(db, portalId);

    try {
        // Record the visit.
        await db.prepare(
            'INSERT INTO portal_visits (portal_id, user_id, display_name) VALUES (?, ?, ?)'
        ).bind(portalId, user?.id || null, displayName).run();
    } catch (e) {
        console.error('[portal-visit] insert failed:', e.message);
        return json({ error: 'Failed to record visit' }, { status: 500 });
    }

    // Co-visitor notification: if the entering user is known, notify OTHER
    // distinct users who visited this portal recently (last 24h) that someone
    // is exploring a realm they know. Throttled so each recipient gets at most
    // one such ping per cooldown window.
    if (user?.id && portalName) {
        try {
            await notifyCoVisitors(db, portalId, portalName, user.id, displayName || user.username || 'Someone');
        } catch (e) {
            console.error('[portal-visit] co-visitor notify failed:', e.message);
        }
    }

    return json({ ok: true });
}

async function fetchPortalName(db, portalId) {
    try {
        const row = await db.prepare(
            'SELECT name_es, name_en FROM portals WHERE id = ?'
        ).bind(portalId).first();
        return row?.name_es || row?.name_en || null;
    } catch {
        return null;
    }
}

// Notify prior visitors of the same portal (co-presence). Each recipient is
// throttled by checking their most recent co-visit notification for this portal.
async function notifyCoVisitors(db, portalId, portalName, enteringUserId, enteringName) {
    // Distinct prior visitors (last 24h, excluding the entering user).
    const { results: priorVisitors } = await db.prepare(`
        SELECT DISTINCT user_id FROM portal_visits
        WHERE portal_id = ? AND user_id IS NOT NULL AND user_id != ?
          AND visited_at > datetime('now', '-1 day')
    `).bind(portalId, enteringUserId).all();

    if (!priorVisitors?.length) return;

    const title = '🟢 Presencia en el reino';
    const body = `${enteringName} está explorando "${portalName}".`;
    const meta = JSON.stringify({ portal_id: portalId, type: 'co_visit' });

    for (const v of priorVisitors) {
        // Throttle: skip if we already notified this user about this portal recently.
        const recent = await db.prepare(`
            SELECT created_at FROM notifications
            WHERE user_id = ? AND type = 'co_visit'
              AND json_extract(meta, '$.portal_id') = ?
            ORDER BY created_at DESC LIMIT 1
        `).bind(v.user_id, portalId).first();

        if (recent?.created_at) {
            const age = Date.now() - new Date(recent.created_at.replace(' ', 'T') + 'Z').getTime();
            if (age < NOTIFY_COOLDOWN_MS) continue;
        }

        await notify(db, {
            user_id: v.user_id,
            type: 'co_visit',
            title,
            body,
            meta,
        });
    }
}
