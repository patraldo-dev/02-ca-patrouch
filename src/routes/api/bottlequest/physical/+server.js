import { json } from '@sveltejs/kit';
import { haversineDistance as haversine, CAPTURE_RADIUS_M } from '$lib/geo.js';

export async function POST({ locals, platform, request }) {
    const db = platform?.env?.DB_book;
    const user = locals.user;
    if (!user || !db) return json({ error: 'Not authenticated' }, { status: 401 });

    const player = await db.prepare('SELECT id, username, points, fuel FROM bq_players WHERE username = ?').bind(user.username).first();
    if (!player) return json({ error: 'Not a player' }, { status: 403 });

    const { bottle_id, lat, lon } = await request.json();
    if (!bottle_id || !lat || !lon) return json({ error: 'Missing data' }, { status: 400 });

    const bottle = await db.prepare(
        'SELECT id, found_by, current_lat, current_lon, content, title FROM bottles WHERE id = ? AND bottle_type = ? AND is_test = 0'
    ).bind(bottle_id, 'physical').first();

    if (!bottle) return json({ error: 'Bottle not found' }, { status: 404 });
    if (bottle.found_by) return json({ error: 'Ya fue capturada' }, { status: 200, body: { already_captured: true } });

    const dist = haversine(lat, lon, bottle.current_lat, bottle.current_lon);
    if (dist > CAPTURE_RADIUS_M) {
        return json({ error: `Too far: ${Math.round(dist)}m` }, { status: 403 });
    }

    const now = new Date().toISOString();
    const rewardFuel = 25;
    const rewardPoints = 50;

    // Atomic capture
    const captureResult = await db.prepare(
        'UPDATE bottles SET status = ?, found_by = ?, found_at = ?, opened_by = ? WHERE id = ? AND found_by IS NULL'
    ).bind('found', player.username, now, player.username, bottle_id).run();

    if (!captureResult.meta.changes) {
        return json({ error: 'Race condition' }, { status: 409 });
    }

    // Reward
    await db.prepare('UPDATE bq_players SET fuel = fuel + ?, points = points + ?, arbooty_points = arbooty_points + ? WHERE id = ?')
        .bind(rewardFuel, rewardPoints, rewardPoints, player.id).run();

    // R2 content (best effort)
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
        bottle: { id: bottle.id, title: bottle.title, content, found_by: player.username, found_at: now },
        reward: { fuel: rewardFuel, points: rewardPoints }
    });
}
