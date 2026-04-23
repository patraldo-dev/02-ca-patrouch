import { json } from '@sveltejs/kit';
import { logTransaction } from '$lib/server/bottlequest-logger';

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcOdds(distKm) {
    // Closer = lower odds (favorite). Farther = higher odds (underdog)
    if (distKm <= 10) return 1.2;
    if (distKm <= 100) return 1.5 + (distKm / 200);
    if (distKm <= 1000) return 2.0 + (distKm / 500);
    return 5.0 + (distKm / 2000);
}

// POST: place a bet
export async function POST({ request, locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { bottle_id, bet_on_player_id, amount } = await request.json();
        if (!bottle_id || !bet_on_player_id || !amount || amount < 1) {
            return json({ error: 'Missing fields' }, { status: 400 });
        }

        // Find player
        const player = await db.prepare(
            `SELECT id, fuel FROM bq_players WHERE username = ?`
        ).bind(locals.user.username).first();
        if (!player) return json({ error: 'No player found' }, { status: 404 });

        // Can't bet on yourself
        if (player.id === bet_on_player_id) {
            return json({ error: "Can't bet on yourself" }, { status: 400 });
        }

        // Check bottle is active
        const bottle = await db.prepare(
            `SELECT id, status FROM bottles WHERE id = ? AND status IN ('launched', 'sailing')`
        ).bind(bottle_id).first();
        if (!bottle) return json({ error: 'Bottle not active' }, { status: 404 });

        // Check target player exists
        const target = await db.prepare(`SELECT id FROM bq_players WHERE id = ?`).bind(bet_on_player_id).first();
        if (!target) return json({ error: 'Player not found' }, { status: 404 });

        // Max 3 open bets per player
        const { results: openBets } = await db.prepare(
            `SELECT COUNT(*) as c FROM bq_bets WHERE player_id = ? AND status = 'open'`
        ).bind(player.id).all();
        if (openBets?.[0]?.c >= 3) {
            return json({ error: 'Max 3 open bets at a time' }, { status: 429 });
        }

        // Max bet = 30% of current fuel
        const maxBet = Math.floor(player.fuel * 0.3);
        if (amount > maxBet) {
            return json({ error: `Max bet is 30% of fuel (${maxBet})` }, { status: 400 });
        }

        if (player.fuel < amount) {
            return json({ error: `Insufficient fuel (${player.fuel})` }, { status: 400 });
        }

        // Calculate odds
        const bottlePos = await db.prepare(
            `SELECT lat, lon FROM bottle_positions WHERE bottle_id = ? ORDER BY recorded_at DESC LIMIT 1`
        ).bind(bottle_id).first();
        const targetPos = await db.prepare(
            `SELECT lat, lon FROM bq_players WHERE id = ?`
        ).bind(bet_on_player_id).first();

        let odds = 2.0;
        if (bottlePos && targetPos) {
            const dist = haversineKm(targetPos.lat, targetPos.lon, bottlePos.lat, bottlePos.lon);
            odds = calcOdds(dist);
        }

        // Deduct fuel
        await db.prepare(`UPDATE bq_players SET fuel = fuel - ? WHERE id = ?`).bind(amount, player.id).run();

        // Create bet
        await db.prepare(
            `INSERT INTO bq_bets (id, player_id, bottle_id, bet_on_player_id, amount, odds) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), player.id, bottle_id, bet_on_player_id, amount, odds).run();

        const updated = await db.prepare(`SELECT fuel FROM bq_players WHERE id = ?`).bind(player.id).first();

        await logTransaction(db, { player_id: player.id, type: 'bet_placed', amount: -amount, detail: `Bet ${amount} on ${bet_on_player_id} for bottle ${bottle_id}` });

        return json({
            odds,
            potential_win: Math.floor(amount * odds * 0.95), // 5% bot commission on winnings
            remaining_fuel: updated?.fuel || 0
        });

    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}

// GET: list bets + odds for active bottles
export async function GET({ url, locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });

    try {
        // Get all active bottles
        const { results: bottles } = await db.prepare(
            `SELECT b.id, b.title, b.status, bp.lat, bp.lon FROM bottles b
             LEFT JOIN bottle_positions bp ON b.id = bp.bottle_id
             WHERE b.status IN ('launched', 'sailing')
             GROUP BY b.id ORDER BY b.created_at DESC LIMIT 10`
        ).all();

        // Get all players with positions
        const { results: players } = await db.prepare(
            `SELECT id, display_name, username, lat, lon, type FROM bq_players`
        ).all();

        // Calculate odds for each bottle/player combo
        const oddsBoard = [];
        for (const bottle of bottles) {
            if (!bottle.lat) continue;
            const odds = [];
            for (const p of players) {
                const dist = haversineKm(p.lat, p.lon, bottle.lat, bottle.lon);
                odds.push({
                    player_id: p.id,
                    display_name: p.display_name || p.username,
                    type: p.type,
                    distance_km: Math.round(dist),
                    odds: Math.round(calcOdds(dist) * 100) / 100
                });
            }
            odds.sort((a, b) => a.distance_km - b.distance_km);
            oddsBoard.push({
                bottle_id: bottle.id,
                bottle_title: bottle.title,
                odds
            });
        }

        // Get user's bets if authenticated
        let myBets = [];
        if (locals.user) {
            const player = await db.prepare(`SELECT id FROM bq_players WHERE username = ?`).bind(locals.user.username).first();
            if (player) {
                const { results: bets } = await db.prepare(`
                    SELECT b.*, bp.display_name as bet_on_name, bt.title as bottle_title
                    FROM bq_bets b
                    LEFT JOIN bq_players bp ON b.bet_on_player_id = bp.id
                    LEFT JOIN bottles bt ON b.bottle_id = bt.id
                    WHERE b.player_id = ?
                    ORDER BY b.created_at DESC LIMIT 20
                `).bind(player.id).all();
                myBets = bets || [];
            }
        }

        return json({ oddsBoard, myBets });

    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}

// Resolve bets when a bottle is captured — called internally
export async function PUT({ request, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });

    try {
        const { bottle_id, winner_player_id } = await request.json();
        if (!bottle_id || !winner_player_id) {
            return json({ error: 'Missing fields' }, { status: 400 });
        }

        // Find all open bets on this bottle
        const { results: bets } = await db.prepare(
            `SELECT * FROM bq_bets WHERE bottle_id = ? AND status = 'open'`
        ).bind(bottle_id).all();

        for (const bet of bets) {
            const won = bet.bet_on_player_id === winner_player_id;
            const winnings = won ? Math.floor(bet.amount * bet.odds * 0.95) : 0; // 5% bot fee
            const botFee = won ? Math.floor(bet.amount * bet.odds * 0.05) : 0;

            await db.prepare(
                `UPDATE bq_bets SET status = ?, resolved_at = datetime('now') WHERE id = ?`
            ).bind(won ? 'won' : 'lost', bet.id).run();

            if (won) {
                await db.prepare(
                    `UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`
                ).bind(winnings, bet.player_id).run();

                // Bot commission
                if (botFee > 0) {
                    const { results: bots } = await db.prepare(`SELECT id FROM bq_players WHERE type = 'ai'`).all();
                    const botShare = bots?.length ? Math.ceil(botFee / bots.length) : botFee;
                    for (const bot of bots) {
                        await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(botShare, bot.id).run();
                    }
                }
            }
        }

        return json({ resolved: bets?.length || 0 });

    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
