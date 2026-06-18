import { json } from '@sveltejs/kit';
import { logTransaction } from '$lib/server/bottlequest-logger';
import { POIS, EDGES, hopsBetween, getTravelNarrative, calculateTravelCost, TRAVEL_MODES, canBoat } from '$lib/poi.js';

const CAPTURE_RADIUS = 0.001; // ~100 meters

// Haversine in km
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degDist(lat1, lon1, lat2, lon2) {
    return Math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2);
}

export async function POST({ request, locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { poi_id, travel_mode = 'walk', bottle_id } = body;

        // ═══ POI-based travel (new system) ═══
        if (poi_id) {
            const targetPoi = POIS[poi_id];
            if (!targetPoi) return json({ error: 'Unknown POI' }, { status: 400 });

            // Find player
            let player = await db.prepare(
                `SELECT id, lat, lon, fuel, type, paralyzed_until, checkin_fuel, current_poi FROM bq_players WHERE username = ?`
            ).bind(locals.user.username).first();
            if (!player && locals.user.email) {
                const emailPrefix = locals.user.email.split('@')[0];
                if (emailPrefix !== locals.user.username) {
                    player = await db.prepare(
                        `SELECT id, lat, lon, fuel, type, paralyzed_until, checkin_fuel, current_poi FROM bq_players WHERE username = ?`
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

            // Determine current POI
            const fromPoiId = player.current_poi || nearestPoi(player.lat, player.lon);
            if (fromPoiId === poi_id) {
                return json({ error: 'Ya estás aquí' }, { status: 400 });
            }

            // Calculate travel cost
            const costResult = calculateTravelCost(fromPoiId, poi_id, travel_mode);
            if (costResult.impossible) {
                return json({ error: 'No hay ruta disponible', from: fromPoiId, to: poi_id }, { status: 400 });
            }

            const fuelCost = costResult.cost;
            const totalFuel = (player.fuel || 0) + (player.checkin_fuel || 0);
            if (totalFuel < fuelCost) {
                return json({
                    error: `Power insuficiente. Necesitas ${fuelCost}, tienes ${totalFuel}`,
                    cost: fuelCost,
                    fuel: totalFuel,
                }, { status: 402 });
            }

            // Spend fuel
            let fromCheckin = Math.min(player.checkin_fuel || 0, fuelCost);
            let fromRegular = fuelCost - fromCheckin;
            await db.prepare(`
                UPDATE bq_players
                SET lat = ?, lon = ?, fuel = fuel - ?, checkin_fuel = checkin_fuel - ?, current_poi = ?
                WHERE id = ?
            `).bind(targetPoi.lat, targetPoi.lon, fromRegular, fromCheckin, poi_id, player.id).run();

            // Log move
            await db.prepare(
                `INSERT INTO bq_moves (id, player_id, from_lat, from_lon, to_lat, to_lon, distance_km, fuel_cost, speed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(crypto.randomUUID(), player.id, player.lat, player.lon, targetPoi.lat, targetPoi.lon, 0, fuelCost, travel_mode).run();

            await logTransaction(db, { player_id: player.id, type: 'move', amount: -fuelCost, detail: `${travel_mode} → ${targetPoi.name}` });

            // Check bottle capture at this POI
            let captured = null;
            let nearbyBottles = [];

            if (bottle_id) {
                const bottle = await db.prepare(
                    `SELECT id, title, status, current_lat, current_lon FROM bottles WHERE id = ? AND status IN ('launched', 'sailing', 'beached')`
                ).bind(bottle_id).first();

                if (bottle) {
                    const bDist = degDist(targetPoi.lat, targetPoi.lon, bottle.current_lat, bottle.current_lon);
                    if (bDist <= CAPTURE_RADIUS) {
                        const captureBonus = 50;
                        await db.prepare(`UPDATE bottles SET status = 'found', opened_by = ?, opened_at = datetime('now') WHERE id = ?`)
                            .bind(locals.user.id, bottle_id).run();
                        await db.prepare(`UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`)
                            .bind(captureBonus, captureBonus, player.id).run();
                        captured = { bottle_id: bottle.id, title: bottle.title, bonus: captureBonus };
                    }
                }
            }

            // Find bottles near this POI (for discovery)
            const { results: bottlesHere } = await db.prepare(`
                SELECT id, title, status FROM bottles
                WHERE status IN ('launched', 'sailing', 'beached')
                AND ABS(current_lat - ?) < 0.002 AND ABS(current_lon - ?) < 0.002
                LIMIT 10
            `).bind(targetPoi.lat, targetPoi.lon).all();
            nearbyBottles = bottlesHere || [];

            const updated = await db.prepare(`SELECT fuel, checkin_fuel, lat, lon FROM bq_players WHERE id = ?`).bind(player.id).first();

            return json({
                moved: true,
                poi: targetPoi,
                narrative: costResult.narrative,
                cost: fuelCost,
                hops: costResult.hops,
                mode: travel_mode,
                mode_label: TRAVEL_MODES[travel_mode]?.label || travel_mode,
                new_fuel: updated?.fuel,
                checkin_fuel: updated?.checkin_fuel || 0,
                captured,
                nearby_bottles: nearbyBottles,
                position: { lat: updated?.lat, lon: updated?.lon },
            });
        }

        // ═══ Legacy coordinate-based move (backward compat) ═══
        const { target_lat, target_lon, speed = 'sail', path_steps, transport_mode } = body;
        if (target_lat == null || target_lon == null) {
            return json({ error: 'poi_id or target_lat/target_lon required' }, { status: 400 });
        }

        const mode = transport_mode && require('$lib/transport.js').TRANSPORT_MODES[transport_mode]
            ? transport_mode : 'sail';

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

        const fromLat = player.lat;
        const fromLon = player.lon;
        const distDeg = degDist(fromLat, fromLon, target_lat, target_lon);
        if (distDeg < 0.000001) return json({ error: 'Already here' }, { status: 400 });
        const distKm = haversineKm(fromLat, fromLon, target_lat, target_lon);

        // Simple flat cost for legacy moves
        const fuelCost = Math.max(1, Math.ceil(distKm * 10));
        const totalFuel = (player.fuel || 0) + (player.checkin_fuel || 0);
        if (totalFuel < fuelCost) {
            return json({ error: `Not enough power. Need ${fuelCost}, have ${totalFuel}` }, { status: 402 });
        }

        let fromCheckin = Math.min(player.checkin_fuel || 0, fuelCost);
        let fromRegular = fuelCost - fromCheckin;
        await db.prepare(`UPDATE bq_players SET lat = ?, lon = ?, fuel = fuel - ?, checkin_fuel = checkin_fuel - ? WHERE id = ?`)
            .bind(target_lat, target_lon, fromRegular, fromCheckin, player.id).run();

        await db.prepare(
            `INSERT INTO bq_moves (id, player_id, from_lat, from_lon, to_lat, to_lon, distance_km, fuel_cost, speed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), player.id, fromLat, fromLon, target_lat, target_lon, distKm, fuelCost, speed).run();

        await logTransaction(db, { player_id: player.id, type: 'move', amount: -fuelCost, detail: `${speed} ${distKm.toFixed(1)}km` });

        // Check bottle capture
        let captured = null;
        if (bottle_id) {
            const bottle = await db.prepare(
                `SELECT id, title, status FROM bottles WHERE id = ? AND status IN ('launched', 'sailing', 'beached')`
            ).bind(bottle_id).first();
            if (bottle) {
                const bottleDist = degDist(target_lat, target_lon, bottle.current_lat || 0, bottle.current_lon || 0);
                if (bottleDist <= CAPTURE_RADIUS) {
                    const captureBonus = 50;
                    await db.prepare(`UPDATE bottles SET status = 'found', opened_by = ?, opened_at = datetime('now') WHERE id = ?`)
                        .bind(locals.user.id, bottle_id).run();
                    await db.prepare(`UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`)
                        .bind(captureBonus, captureBonus, player.id).run();
                    captured = { bottle_id: bottle.id, title: bottle.title, bonus: captureBonus };
                }
            }
        }

        const updated = await db.prepare(`SELECT fuel, checkin_fuel, lat, lon FROM bq_players WHERE id = ?`).bind(player.id).first();
        return json({
            moved: true,
            new_fuel: updated?.fuel,
            checkin_fuel: updated?.checkin_fuel || 0,
            cost: fuelCost,
            captured,
            position: { lat: updated?.lat, lon: updated?.lon },
        });

    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}

function nearestPoi(lat, lon) {
    let best = null;
    let bestDist = Infinity;
    for (const poi of Object.values(POIS)) {
        const d = (poi.lat - lat) ** 2 + (poi.lon - lon) ** 2;
        if (d < bestDist) { bestDist = d; best = poi.id; }
    }
    return best;
}

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
