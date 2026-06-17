import { json } from '@sveltejs/kit';
import { logTransaction } from '$lib/server/bottlequest-logger';
import { TRANSPORT_MODES, calculateMoveCost } from '$lib/transport.js';

const CAPTURE_RADIUS = 0.001; // ~100 meters — generous for navmesh-level capture

// Legacy speed multipliers (kept for backward compat)
const SPEED_MULT = {
    drift: 0.5,
    sail: 1.0,
    motor: 4.0
};

const SPEED_MOVE_MULT = {
    drift: 1.0,
    sail: 2.0,
    motor: 10.0
};

// Zone multipliers based on distance to target
function getZoneMult(distDeg) {
    if (distDeg > 0.05) return 1.0;       // ✈️ Fly: normal
    if (distDeg > 0.005) return 2.0;      // 🚕 Taxi: 2x
    return 5.0;                            // 🚶 Walk: 5x
}

// Night penalty: 1.5x fuel cost if target solar time is between 18:00-06:00
function getNightMult(targetLon) {
    const now = new Date();
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const solarHours = (utcHours + targetLon / 15 + 24) % 24;
    return (solarHours >= 18 || solarHours < 6) ? 1.5 : 1.0;
}

// Competition multiplier: how many other players within 0.05° of target
async function getCompetitionMult(db, targetLat, targetLon, excludePlayerId) {
    const { results: nearby } = await db.prepare(`
        SELECT COUNT(*) as c FROM bq_players
        WHERE id != ? AND type = 'human'
        AND ABS(lat - ?) < 0.05 AND ABS(lon - ?) < 0.05
    `).bind(excludePlayerId, targetLat, targetLon).all();
    const count = nearby?.[0]?.c || 0;
    if (count === 0) return 1.0;
    if (count === 1) return 3.0;
    return 5.0;
}

// Haversine in km
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Degree distance
function degDist(lat1, lon1, lat2, lon2) {
    return Math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2);
}

export async function POST({ request, locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { target_lat, target_lon, speed = 'sail', bottle_id, path_steps, transport_mode } = await request.json();
        if (target_lat == null || target_lon == null) {
            return json({ error: 'target_lat and target_lon required' }, { status: 400 });
        }

        // Accept both legacy 'speed' and new 'transport_mode'
        const mode = transport_mode && TRANSPORT_MODES[transport_mode]
            ? transport_mode
            : 'sail'; // default to legacy sail

        // Find player
        let player = await db.prepare(
            `SELECT id, lat, lon, fuel, type, paralyzed_until, checkin_fuel FROM bq_players WHERE username = ?`
        ).bind(locals.user.username).first();
        if (!player && locals.user.email) {
            const emailPrefix = locals.user.email.split('@')[0];
            if (emailPrefix !== locals.user.username) {
                player = await db.prepare(
                    `SELECT id, lat, lon, fuel, type, paralyzed_until, checkin_fuel FROM bq_players WHERE username = ?`
                ).bind(emailPrefix).first();
            }
        }

        if (!player) return json({ error: 'No player found' }, { status: 404 });

        // Player position — needed by narrator event zone checks below
        const fromLat = player.lat;
        const fromLon = player.lon;

        // Narrator event modifiers (populated during event check)
        let speedPenaltyMult = 1.0;
        let fuelPenaltyAmount = 0;

        // Check paralysis
        if (player.paralyzed_until) {
            const paralyzedUntil = new Date(player.paralyzed_until.replace(' ', 'T') + 'Z');
            if (paralyzedUntil > new Date()) {
                return json({ error: 'Paralyzed by El Narrador', paralyzed_until: player.paralyzed_until }, { status: 403 });
            }
        }

        // Check ALL active narrator events (not just weather/storm)
        const { results: activeEvents } = await db.prepare(`
            SELECT * FROM narrator_events
            WHERE (expires_at IS NULL OR expires_at > datetime('now'))
            AND started_at <= datetime('now')
        `).all();

        const playerType = player.type || 'human'; // 'human' or 'ai'

        // Pier sanctuary check — players at pier are immune to calamities
        const { isAtPier } = await import('$lib/server/pier.js');
        const atPier = isAtPier(fromLat, fromLon);

        for (const event of activeEvents || []) {
            // Parse effects
            let effects = {};
            try { effects = JSON.parse(event.effects || '{}'); } catch {}

            // Check if event targets this player type
            const targetPlayers = event.target_players || 'all';
            if (targetPlayers !== 'all' && targetPlayers !== playerType) continue; // not targeted

            // Pier sanctuary — skip harmful events if at pier
            if (atPier) {
                const harmfulTypes = ['paralyze', 'storm', 'kraken', 'mutiny', 'fog', 'doldrums', 'market_crash', 'siren', 'bounty'];
                if (harmfulTypes.includes(event.event_type)) continue;
            }

            // Check if event is zone-specific
            if (event.affected_zone) {
                let zoneLat, zoneLon, zoneRadius;
                try {
                    const zone = JSON.parse(event.affected_zone);
                    zoneLat = zone.lat; zoneLon = zone.lon; zoneRadius = zone.radius || 2;
                } catch { continue; }

                const distToZone = haversineKm(fromLat, fromLon, zoneLat, zoneLon);
                if (distToZone > zoneRadius) continue; // not in zone
            }

            // Apply effects
            const noMove = effects.no_move === true;
            const noVision = effects.no_vision === true;
            const halfSpeed = effects.half_speed === true;
            const fuelPenalty = effects.fuel_penalty || 0;

            // AI-specific: if no_vision, AI can't navigate
            if (noVision && playerType === 'ai') {
                return json({
                    error: `LIDAR/CV offline — ${event.title}`,
                    event: event.title,
                    event_narrative: event.narrative,
                    blocked: true,
                    reason: 'no_vision'
                }, { status: 403 });
            }

            // Universal: no_move blocks everyone
            if (noMove) {
                return json({
                    error: `El Narrador decrees: ${event.title}`,
                    event: event.title,
                    event_narrative: event.narrative,
                    blocked: true,
                    reason: 'no_move'
                }, { status: 403 });
            }

            // Apply speed/cost modifiers (stored for later use in cost calc)
            if (halfSpeed) speedPenaltyMult = 2.0; // doubles fuel cost
            if (fuelPenalty) fuelPenaltyAmount += fuelPenalty;
        }

        const distDeg = degDist(fromLat, fromLon, target_lat, target_lon);

        if (distDeg < 0.000001) {
            return json({ error: 'Already here' }, { status: 400 });
        }

        // Calculate distance in km
        const distKm = haversineKm(fromLat, fromLon, target_lat, target_lon);

        // Calculate power cost (no Brent — fixed per tier + mode)
        let fuelCost;
        let speedMult, zoneMult, compMult, nightMult;
        const transportDef = TRANSPORT_MODES[mode];

        const baseCostPerKm = 1; // reference value for cost breakdown

        if (path_steps && path_steps > 0) {
            const tierMult = distKm > 100 ? 1000000 : distKm > 20 ? 100000 : distKm > 5 ? 10000 : distKm > 1 ? 1000 : distKm > 0.2 ? 100 : distKm > 0.05 ? 10 : 1;
            nightMult = getNightMult(target_lon);
            zoneMult = null;
            compMult = null;

            if (transportDef) {
                // New transport mode system — fixed costs, no external index
                const costResult = calculateMoveCost(mode, path_steps, tierMult);
                fuelCost = costResult.totalCost + fuelPenaltyAmount;
                speedMult = transportDef.speedMult;
            } else {
                // Legacy speed system
                speedMult = SPEED_MULT[speed];
                fuelCost = Math.ceil(path_steps * tierMult * speedMult * nightMult * speedPenaltyMult) + fuelPenaltyAmount;
            }
        } else {
            // Legacy distance-based cost
            if (transportDef) {
                nightMult = getNightMult(target_lon);
                fuelCost = Math.ceil(distKm * (transportDef.costPerKm || baseCostPerKm) * nightMult * speedPenaltyMult) + (transportDef.flatCost || 0) + fuelPenaltyAmount;
                speedMult = transportDef.speedMult;
                zoneMult = null;
                compMult = null;
            } else {
                speedMult = SPEED_MULT[speed];
                zoneMult = getZoneMult(distDeg);
                compMult = bottle_id ? await getCompetitionMult(db, target_lat, target_lon, player.id) : 1.0;
                nightMult = getNightMult(target_lon);
                fuelCost = Math.ceil(distKm * baseCostPerKm * speedMult * zoneMult * compMult * nightMult * speedPenaltyMult) + fuelPenaltyAmount;
            }
        }

        const totalFuel = (player.fuel || 0) + (player.checkin_fuel || 0);
        if (totalFuel < fuelCost) {
            return json({
                error: `Not enough fuel. Need ${fuelCost}, have ${totalFuel}`,
                cost_breakdown: { distKm: distKm.toFixed(1), speedMult, zoneMult, compMult, nightMult, fuelCost }
            }, { status: 402 });
        }

        // Spend checkin_fuel first, then regular fuel
        let fromCheckin = Math.min(player.checkin_fuel || 0, fuelCost);
        let fromRegular = fuelCost - fromCheckin;
        await db.prepare(`UPDATE bq_players SET lat = ?, lon = ?, fuel = fuel - ?, checkin_fuel = checkin_fuel - ? WHERE id = ?`)
            .bind(target_lat, target_lon, fromRegular, fromCheckin, player.id).run();

        // Record move
        await db.prepare(
            `INSERT INTO bq_moves (id, player_id, from_lat, from_lon, to_lat, to_lon, distance_km, fuel_cost, speed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), player.id, fromLat, fromLon, target_lat, target_lon, distKm, fuelCost, speed).run();

        await logTransaction(db, { player_id: player.id, type: 'move', amount: -fuelCost, detail: `${speed} ${distKm.toFixed(1)}km (${fromLat.toFixed(4)},${fromLon.toFixed(4)}) → (${target_lat.toFixed(4)},${target_lon.toFixed(4)})` });

        // Check bottle capture
        let captured = null;
        if (bottle_id) {
            const bottle = await db.prepare(
                `SELECT id, title, status FROM bottles WHERE id = ? AND status IN ('launched', 'sailing', 'beached')`
            ).bind(bottle_id).first();

            if (bottle) {
                const bPos = await db.prepare(
                    `SELECT lat, lon FROM bottle_positions WHERE bottle_id = ? ORDER BY recorded_at DESC LIMIT 1`
                ).bind(bottle_id).first();

                if (bPos) {
                    const bottleDist = degDist(target_lat, target_lon, bPos.lat, bPos.lon);
                    if (bottleDist <= CAPTURE_RADIUS) {
                        // Capture!
                        const captureBonus = 50;
                        await db.prepare(`UPDATE bottles SET status = 'found', opened_by = ?, opened_at = datetime('now') WHERE id = ?`)
                            .bind(locals.user.id, bottle_id).run();
                        await db.prepare(`UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`)
                            .bind(captureBonus, captureBonus, player.id).run();
                        await db.prepare(`UPDATE bq_bean_inventory SET amount = amount + 2 WHERE player_id = ? AND bean_type = 'licorice'`).bind(player.id).run();
                        captured = { bottle_id: bottle.id, title: bottle.title, bonus: captureBonus, reward: { amount: 2 } };

                        // Resolve all bets on this bottle
                        try {
                            const { results: openBets } = await db.prepare(
                                `SELECT * FROM bq_bets WHERE bottle_id = ? AND status = 'open'`
                            ).bind(bottle_id).all();
                            for (const bet of (openBets || [])) {
                                const won = bet.bet_on_player_id === player.id;
                                const winnings = won ? Math.floor(bet.amount * bet.odds * 0.95) : 0;
                                const botFee = won ? Math.floor(bet.amount * bet.odds * 0.05) : 0;
                                await db.prepare(`UPDATE bq_bets SET status = ?, resolved_at = datetime('now') WHERE id = ?`).bind(won ? 'won' : 'lost', bet.id).run();
                                if (won) {
                                    await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(winnings, bet.player_id).run();
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
                    }
                }
            }
        }

        const updated = await db.prepare(`SELECT fuel, lat, lon FROM bq_players WHERE id = ?`).bind(player.id).first();

        return json({
            moved: true,
            new_fuel: updated?.fuel,
            checkin_fuel: updated?.checkin_fuel || 0,
            cost: fuelCost,
            from_checkin: fromCheckin,
            nightPenalty: nightMult > 1,
            nightMult,
            cost_breakdown: { distKm: distKm.toFixed(1), baseCostPerKm, speed, speedMult, zoneMult, compMult, nightMult },
            captured,
            position: { lat: updated?.lat, lon: updated?.lon }
        });

    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}

// GET: movement history
export async function GET({ locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const player = await db.prepare(`SELECT id FROM bq_players WHERE username = ?`).bind(locals.user.username).first();
        if (!player) return json({ moves: [] });

        const { results: moves } = await db.prepare(`
            SELECT m.*, p.display_name, p.username FROM bq_moves m
            LEFT JOIN bq_players p ON m.player_id = p.id
            WHERE m.player_id = ?
            ORDER BY m.created_at DESC LIMIT 20
        `).bind(player.id).all();

        return json({ moves: moves || [] });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
