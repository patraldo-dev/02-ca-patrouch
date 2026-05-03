import { json } from '@sveltejs/kit';
import { haversineDistance as haversine, CAPTURE_RADIUS_M } from '$lib/geo.js';

const COOLDOWN_MS = 60_000; // 60s between captures
const TRAP_PENALTY = 50;

export async function POST({ locals, platform, request }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No database' }, { status: 500 });

    const { bottle_id, lat, lon, nickname } = await request.json();
    if (!bottle_id || !lat || !lon) return json({ error: 'Missing data' }, { status: 400 });

    // Resolve capturer
    let capturerName = nickname?.trim() || null;
    let playerId = null;
    let giveReward = false;

    if (locals.user) {
        const player = await db.prepare('SELECT id, username FROM bq_players WHERE username = ?').bind(locals.user.username).first();
        if (player) { capturerName = player.username; playerId = player.id; giveReward = true; }
    }
    if (!capturerName) return json({ error: 'Se necesita un nombre' }, { status: 400 });

    const bottle = await db.prepare(
        "SELECT id, found_by, current_lat, current_lon, content, title, content_type FROM bottles WHERE id = ? AND bottle_type = 'physical' AND is_test = 0"
    ).bind(bottle_id).first();

    if (!bottle) return json({ error: 'Bottle not found' }, { status: 404 });
    if (bottle.found_by) return json({ error: 'Ya fue capturada', already_captured: true });

    // Cooldown check — last capture by this player
    const lastCapture = await db.prepare(
        "SELECT found_at FROM bottles WHERE found_by = ? AND bottle_type = 'physical' ORDER BY found_at DESC LIMIT 1"
    ).bind(capturerName).first();
    if (lastCapture) {
        const elapsed = Date.now() - (parseFloat(lastCapture.found_at) * 1000 || new Date(lastCapture.found_at).getTime());
        const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        if (remaining > 0) {
            return json({ error: `⏳ Espera ${remaining}s antes de capturar otra`, cooldown: remaining }, { status: 429 });
        }
    }

    const dist = haversine(lat, lon, bottle.current_lat, bottle.current_lon);
    if (dist > CAPTURE_RADIUS_M) return json({ error: `Too far: ${Math.round(dist)}m` }, { status: 403 });

    const now = new Date().toISOString();
    const isTrap = bottle.content_type === 'trap';
    const isChallenge = bottle.content_type === 'challenge';

    const captureResult = await db.prepare(
        'UPDATE bottles SET status = ?, found_by = ?, found_at = ?, opened_by = ? WHERE id = ? AND found_by IS NULL'
    ).bind('found', capturerName, now, capturerName, bottle_id).run();

    if (!captureResult.meta.changes) return json({ error: 'Race condition' }, { status: 409 });

    if (giveReward && playerId) {
        if (isTrap) {
            await db.prepare('UPDATE bq_players SET points = points - ?, arbooty_points = arbooty_points - ? WHERE id = ?')
                .bind(TRAP_PENALTY, TRAP_PENALTY, playerId).run();
        } else {
            await db.prepare('UPDATE bq_players SET fuel = fuel + 25, points = points + 50, arbooty_points = arbooty_points + 50 WHERE id = ?')
                .bind(playerId).run();
        }
    }

    // R2 content
    let content = bottle.content;
    if (content.startsWith('[R2:')) {
        try {
            const r2Obj = await platform?.env?.BOOTY_CONTENT?.get(content.slice(4, -1));
            if (r2Obj) content = await r2Obj.text();
        } catch (e) {}
    }

    return json({
        success: true,
        trap: isTrap,
        challenge: isChallenge,
        bottle: { id: bottle.id, title: bottle.title, content, found_by: capturerName, found_at: now },
        reward: giveReward
            ? isTrap ? { fuel: 0, points: -TRAP_PENALTY } : isChallenge ? { fuel: 25, points: 100 } : { fuel: 25, points: 50 }
            : null
    });
}
