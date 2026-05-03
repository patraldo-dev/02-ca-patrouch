import { json } from '@sveltejs/kit';
import { haversineDistance as haversine, CAPTURE_RADIUS_M } from '$lib/geo.js';

export async function POST({ locals, platform, request }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No database' }, { status: 500 });

    const { bottle_id, lat, lon, nickname } = await request.json();
    if (!bottle_id || !lat || !lon) return json({ error: 'Missing data' }, { status: 400 });

    // Resolve who is capturing
    let capturerName = nickname?.trim() || null;
    let playerId = null;
    let giveReward = false;

    if (locals.user) {
        const player = await db.prepare('SELECT id, username FROM bq_players WHERE username = ?').bind(locals.user.username).first();
        if (player) {
            capturerName = player.username;
            playerId = player.id;
            giveReward = true;
        }
    }

    if (!capturerName) {
        return json({ error: 'Se necesita un nombre o iniciar sesión' }, { status: 400 });
    }

    const bottle = await db.prepare(
        'SELECT id, found_by, current_lat, current_lon, content, title FROM bottles WHERE id = ? AND bottle_type = ? AND is_test = 0'
    ).bind(bottle_id, 'physical').first();

    if (!bottle) return json({ error: 'Bottle not found' }, { status: 404 });
    if (bottle.found_by) return json({ error: 'Ya fue capturada', already_captured: true }, { status: 400 });

    const dist = haversine(lat, lon, bottle.current_lat, bottle.current_lon);
    if (dist > CAPTURE_RADIUS_M) {
        return json({ error: `Too far: ${Math.round(dist)}m` }, { status: 403 });
    }

    const now = new Date().toISOString();

    const captureResult = await db.prepare(
        'UPDATE bottles SET status = ?, found_by = ?, found_at = ?, opened_by = ? WHERE id = ? AND found_by IS NULL'
    ).bind('found', capturerName, now, capturerName, bottle_id).run();

    if (!captureResult.meta.changes) {
        return json({ error: 'Race condition' }, { status: 409 });
    }

    // Only give fuel/points to registered players
    if (giveReward && playerId) {
        await db.prepare('UPDATE bq_players SET fuel = fuel + 25, points = points + 50, arbooty_points = arbooty_points + 50 WHERE id = ?')
            .bind(playerId).run();
    }

    // R2 content
    let content = bottle.content;
    if (content.startsWith('[R2:')) {
        try {
            const r2Key = content.slice(4, -1);
            const r2Obj = await platform?.env?.BOOTY_CONTENT?.get(r2Key);
            if (r2Obj) content = await r2Obj.text();
        } catch (e) {}
    }

    return json({
        success: true,
        bottle: { id: bottle.id, title: bottle.title, content, found_by: capturerName, found_at: now },
        reward: giveReward ? { fuel: 25, points: 50 } : null
    });
}
