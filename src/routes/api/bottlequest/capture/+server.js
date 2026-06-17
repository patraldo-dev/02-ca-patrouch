import { json } from '@sveltejs/kit';
import { haversineDistance } from '$lib/geo.js';

/**
 * Proximity-based bottle capture.
 * Bottles snap to navmesh nodes — player must be at the snapped point to capture.
 * Small radius: precise, intentional captures.
 */

const CAPTURE_RADIUS = {
    beached: 15,   // 15m — snapped to shore node
    sailing: 15,   // 15m — snapped to ocean node
    launched: 15,
};

const CAPTURE_BONUS = 50;
const CAPTURE_FUEL = 25;

export async function POST({ request, locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { bottle_id, snapped_lat, snapped_lon } = await request.json();
        if (!bottle_id) return json({ error: 'bottle_id required' }, { status: 400 });

        // Find player
        let player = await db.prepare(
            `SELECT id, lat, lon, fuel, type, paralyzed_until FROM bq_players WHERE username = ?`
        ).bind(locals.user.username).first();
        if (!player && locals.user.email) {
            const emailPrefix = locals.user.email.split('@')[0];
            if (emailPrefix !== locals.user.username) {
                player = await db.prepare(
                    `SELECT id, lat, lon, fuel, type, paralyzed_until FROM bq_players WHERE username = ?`
                ).bind(emailPrefix).first();
            }
        }
        if (!player) return json({ error: 'No player found' }, { status: 404 });

        // Check paralysis
        if (player.paralyzed_until) {
            const paralyzedUntil = new Date(player.paralyzed_until.replace(' ', 'T') + 'Z');
            if (paralyzedUntil > new Date()) {
                return json({ error: 'Paralyzed by El Narrador', paralyzed_until: player.paralyzed_until }, { status: 403 });
            }
        }

        // Find bottle with current position
        const bottle = await db.prepare(
            `SELECT id, title, status, content_type FROM bottles WHERE id = ? AND status IN ('launched', 'sailing', 'beached')`
        ).bind(bottle_id).first();
        if (!bottle) return json({ error: 'Bottle not available for capture' }, { status: 404 });

        // Get bottle position
        const bPos = await db.prepare(
            `SELECT lat, lon FROM bottle_positions WHERE bottle_id = ? ORDER BY recorded_at DESC LIMIT 1`
        ).bind(bottle_id).first();

        let bottleLat, bottleLon;
        if (bPos) {
            bottleLat = bPos.lat;
            bottleLon = bPos.lon;
        } else {
            // Fallback: try bottles table directly
            const fallback = await db.prepare(
                `SELECT current_lat, current_lon FROM bottles WHERE id = ?`
            ).bind(bottle_id).first();
            if (!fallback || !fallback.current_lat) {
                return json({ error: 'Bottle position unknown' }, { status: 400 });
            }
            bottleLat = fallback.current_lat;
            bottleLon = fallback.current_lon;
        }

        // Check proximity — use snapped position if provided (client computed navmesh snap)
        const targetLat = snapped_lat ?? bottleLat;
        const targetLon = snapped_lon ?? bottleLon;
        const distM = haversineDistance(player.lat, player.lon, targetLat, targetLon);
        const radius = CAPTURE_RADIUS[bottle.status] || 15;

        if (distM > radius) {
            return json({
                error: `Demasiado lejos — ${Math.round(distM)}m (necesitas estar a ${radius}m)`,
                distance_m: Math.round(distM),
                required_radius: radius,
                bottle_pos: { lat: targetLat, lon: targetLon },
            }, { status: 403 });
        }

        // Capture!
        await db.prepare(
            `UPDATE bottles SET status = 'found', opened_by = ?, opened_at = datetime('now') WHERE id = ? AND status IN ('launched', 'sailing', 'beached')`
        ).bind(locals.user.id, bottle_id).run();

        await db.prepare(
            `UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`
        ).bind(CAPTURE_BONUS, CAPTURE_FUEL, player.id).run();

        // Licorice beans reward
        try {
            await db.prepare(
                `UPDATE bq_bean_inventory SET amount = amount + 2 WHERE player_id = ? AND bean_type = 'licorice'`
            ).bind(player.id).run();
        } catch {}

        // Log transaction
        try {
            await db.prepare(
                `INSERT INTO bq_transactions (id, player_id, type, amount, detail) VALUES (?, ?, 'capture', ?, ?)`
            ).bind(crypto.randomUUID(), player.id, CAPTURE_FUEL, `Captured ${bottle.title || bottle_id} (${distM.toFixed(0)}m)`).run();
        } catch {}

        // Resolve bets
        try {
            const { results: openBets } = await db.prepare(
                `SELECT * FROM bq_bets WHERE bottle_id = ? AND status = 'open'`
            ).bind(bottle_id).all();
            for (const bet of (openBets || [])) {
                const won = bet.bet_on_player_id === player.id;
                const winnings = won ? Math.floor(bet.amount * bet.odds * 0.95) : 0;
                const botFee = won ? Math.floor(bet.amount * bet.odds * 0.05) : 0;
                await db.prepare(
                    `UPDATE bq_bets SET status = ?, resolved_at = datetime('now') WHERE id = ?`
                ).bind(won ? 'won' : 'lost', bet.id).run();
                if (won) {
                    await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`)
                        .bind(winnings, bet.player_id).run();
                    if (botFee > 0) {
                        const { results: bots } = await db.prepare(`SELECT id FROM bq_players WHERE type = 'ai'`).all();
                        const bs = bots?.length ? Math.ceil(botFee / bots.length) : botFee;
                        for (const bot of bots) {
                            await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(bs, bot.id).run();
                        }
                    }
                }
            }
        } catch (betErr) {
            console.error('Bet resolution error:', betErr);
        }

        return json({
            success: true,
            captured: true,
            bottle_id: bottle.id,
            title: bottle.title,
            distance_m: Math.round(distM),
            reward: { fuel: CAPTURE_FUEL, points: CAPTURE_BONUS, beans: 2 },
        });

    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
