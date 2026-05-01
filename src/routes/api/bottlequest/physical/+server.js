import { json } from '@sveltejs/kit';
import { haversineDistance as haversine, CAPTURE_RADIUS_M } from '$lib/geo.js';

export async function GET({ locals, platform }) {
    const db = platform?.env?.DB_book;
    const user = locals.user;
    if (!user || !db) return json({ error: 'Not authenticated' }, { status: 401 });

    // Check player exists
    const player = await db.prepare('SELECT id FROM bq_players WHERE username = ?').bind(user.username).first();
    if (!player) return json({ error: 'Not a player' }, { status: 403 });

    const bottles = await db.prepare(`
        SELECT b.id, b.title, b.content, b.content_type, b.bottle_type,
               b.current_lat, b.current_lon, b.launch_lat, b.launch_lon,
               b.launched_at, b.found_by, b.found_at, b.status, b.bottle_key
        FROM bottles b
        WHERE b.bottle_type = 'physical' AND b.is_test = 0
    `).all();

    return json({ bottles: bottles.results || [] });
}

export async function POST({ locals, platform, request }) {
    const db = platform?.env?.DB_book;
    const user = locals.user;
    if (!user || !db) return json({ error: 'Not authenticated' }, { status: 401 });

    const player = await db.prepare('SELECT id, username, points, fuel FROM bq_players WHERE username = ?').bind(user.username).first();
    if (!player) return json({ error: 'Not a player' }, { status: 403 });

    const { bottle_id, lat, lon } = await request.json();
    if (!bottle_id) return json({ error: 'Missing bottle_id' }, { status: 400 });
    if (!lat || !lon) return json({ error: 'Missing coordinates — GPS required' }, { status: 400 });

    const bottle = await db.prepare(
        'SELECT id, status, found_by, current_lat, current_lon, content, title FROM bottles WHERE id = ? AND bottle_type = ? AND is_test = 0'
    ).bind(bottle_id, 'physical').first();

    if (!bottle) return json({ error: 'Bottle not found' }, { status: 404 });
    if (bottle.found_by) return json({ error: 'Already captured', already_captured: true }, { status: 400 });

    // Server-side geofencing
    const dist = haversine(lat, lon, bottle.current_lat, bottle.current_lon);
    if (dist > CAPTURE_RADIUS_M) {
        return json({ error: `Too far! ${Math.round(dist)}m away. Get within ${CAPTURE_RADIUS_M}m.`, distance: Math.round(dist), required: CAPTURE_RADIUS_M }, { status: 403 });
    }

    const now = new Date().toISOString();
    // Bottle #5 is the treasure — bigger reward
    const isTreasure = bottle_id === 'phys-olasaltas-005';
    const rewardFuel = isTreasure ? 250 : 25;
    const rewardPoints = isTreasure ? 500 : 50;

    const captureResult = await db.prepare(`
        UPDATE bottles SET status = 'found', found_by = ?, found_at = ?, opened_by = ?
        WHERE id = ? AND found_by IS NULL
    `).bind(player.username, now, player.username, bottle_id).run();

    // Race condition: another player captured between SELECT and UPDATE
    if (!captureResult.meta.changes) {
        return json({ error: 'Ya fue capturada por otro jugador', race_condition: true }, { status: 409 });
    }

    await db.prepare(`
        UPDATE bq_players SET fuel = fuel + ?, points = points + ?, arbooty_points = arbooty_points + ?
        WHERE id = ?
    `).bind(rewardFuel, rewardPoints, rewardPoints, player.id).run();

    // Add arbooty to player's games if not already
    await db.prepare(`
        UPDATE bq_players SET games = CASE WHEN games LIKE '%arbooty%' THEN games ELSE games || ',arbooty' END
        WHERE id = ? AND games NOT LIKE '%arbooty%'
    `).bind(player.id).run();

    return json({
        success: true,
        message: `Physical bottle captured! +${rewardFuel} fuel, +${rewardPoints} points`,
        bottle: { ...bottle, found_by: player.username, found_at: now },
        reward: { fuel: rewardFuel, points: rewardPoints }
    });
}
