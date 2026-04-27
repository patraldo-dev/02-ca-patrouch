import { json } from '@sveltejs/kit';

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

    const { bottle_id } = await request.json();
    if (!bottle_id) return json({ error: 'Missing bottle_id' }, { status: 400 });

    const bottle = await db.prepare(
        'SELECT id, status, found_by, current_lat, current_lon, content, title FROM bottles WHERE id = ? AND bottle_type = ? AND is_test = 0'
    ).bind(bottle_id, 'physical').first();

    if (!bottle) return json({ error: 'Bottle not found' }, { status: 404 });
    if (bottle.found_by) return json({ error: 'Already captured', already_captured: true }, { status: 400 });

    const now = new Date().toISOString();
    // Bottle #5 is the treasure — bigger reward
    const isTreasure = bottle_id === 'phys-olasaltas-005';
    const rewardFuel = isTreasure ? 250 : 25;
    const rewardPoints = isTreasure ? 500 : 50;

    await db.prepare(`
        UPDATE bottles SET status = 'found', found_by = ?, found_at = ?, opened_by = ?
        WHERE id = ?
    `).bind(player.username, now, player.username, bottle_id).run();

    await db.prepare(`
        UPDATE bq_players SET fuel = fuel + ?, points = points + ?
        WHERE id = ?
    `).bind(rewardFuel, rewardPoints, player.id).run();

    return json({
        success: true,
        message: `Physical bottle captured! +${rewardFuel} fuel, +${rewardPoints} points`,
        bottle: { ...bottle, found_by: player.username, found_at: now },
        reward: { fuel: rewardFuel, points: rewardPoints }
    });
}
