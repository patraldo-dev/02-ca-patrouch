import { json } from "@sveltejs/kit";
import { l as logTransaction } from "../../../../../chunks/bottlequest-logger.js";
const CAPTURE_RADIUS = 5e-6;
const SPEED_MULT = {
  drift: 0.5,
  // cheap but slow
  sail: 1,
  // normal
  motor: 4
  // fast but expensive
};
function getZoneMult(distDeg) {
  if (distDeg > 0.05) return 1;
  if (distDeg > 5e-3) return 2;
  return 5;
}
function getNightMult(targetLon) {
  const now = /* @__PURE__ */ new Date();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const solarHours = (utcHours + targetLon / 15 + 24) % 24;
  return solarHours >= 18 || solarHours < 6 ? 1.5 : 1;
}
async function getCompetitionMult(db, targetLat, targetLon, excludePlayerId) {
  const { results: nearby } = await db.prepare(`
        SELECT COUNT(*) as c FROM bq_players
        WHERE id != ? AND type = 'human'
        AND ABS(lat - ?) < 0.05 AND ABS(lon - ?) < 0.05
    `).bind(excludePlayerId, targetLat, targetLon).all();
  const count = nearby?.[0]?.c || 0;
  if (count === 0) return 1;
  if (count === 1) return 3;
  return 5;
}
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function degDist(lat1, lon1, lat2, lon2) {
  return Math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2);
}
async function POST({ request, locals, platform }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: "No DB" }, { status: 500 });
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { target_lat, target_lon, speed = "sail", bottle_id } = await request.json();
    if (target_lat == null || target_lon == null) {
      return json({ error: "target_lat and target_lon required" }, { status: 400 });
    }
    if (!["drift", "sail", "motor"].includes(speed)) {
      return json({ error: "Invalid speed. Use: drift, sail, motor" }, { status: 400 });
    }
    const player = await db.prepare(
      `SELECT id, lat, lon, fuel, type, paralyzed_until, checkin_fuel FROM bq_players WHERE username = ?`
    ).bind(locals.user.username).first();
    if (!player) return json({ error: "No player found" }, { status: 404 });
    if (player.paralyzed_until) {
      const paralyzedUntil = /* @__PURE__ */ new Date(player.paralyzed_until.replace(" ", "T") + "Z");
      if (paralyzedUntil > /* @__PURE__ */ new Date()) {
        return json({ error: "Paralyzed by El Narrador", paralyzed_until: player.paralyzed_until }, { status: 403 });
      }
    }
    const { results: activeEvents } = await db.prepare(`
            SELECT * FROM narrator_events
            WHERE event_type IN ('weather', 'storm')
            AND (duration_hours IS NULL OR datetime(started_at, '+' || duration_hours || ' hours') > datetime('now'))
            AND started_at <= datetime('now')
        `).all();
    for (const event of activeEvents || []) {
      if (!event.affected_zone) continue;
      let zoneLat, zoneLon, zoneRadius;
      try {
        const zone = JSON.parse(event.affected_zone);
        zoneLat = zone.lat;
        zoneLon = zone.lon;
        zoneRadius = zone.radius || 2;
      } catch {
        continue;
      }
      const distToZone = haversineKm(fromLat, fromLon, zoneLat, zoneLon);
      if (distToZone < zoneRadius) {
        return json({
          error: `El Narrador decrees: ${event.title || "Movement forbidden in this zone"}`,
          event: event.title,
          event_narrative: event.narrative,
          blocked: true
        }, { status: 403 });
      }
    }
    const fromLat = player.lat;
    const fromLon = player.lon;
    const distDeg = degDist(fromLat, fromLon, target_lat, target_lon);
    if (distDeg < 1e-6) {
      return json({ error: "Already here" }, { status: 400 });
    }
    const distKm = haversineKm(fromLat, fromLon, target_lat, target_lon);
    const market = await db.prepare(`SELECT cost_per_km FROM bq_market WHERE id = 'daily'`).first();
    const baseCostPerKm = market?.cost_per_km || 0.73;
    const speedMult = SPEED_MULT[speed];
    const zoneMult = getZoneMult(distDeg);
    const compMult = bottle_id ? await getCompetitionMult(db, target_lat, target_lon, player.id) : 1;
    const nightMult = getNightMult(target_lon);
    const fuelCost = Math.ceil(distKm * baseCostPerKm * speedMult * zoneMult * compMult * nightMult);
    const totalFuel = (player.fuel || 0) + (player.checkin_fuel || 0);
    if (totalFuel < fuelCost) {
      return json({
        error: `Not enough fuel. Need ${fuelCost}, have ${totalFuel}`,
        cost_breakdown: { distKm: distKm.toFixed(1), baseCostPerKm, speedMult, zoneMult, compMult, nightMult, fuelCost }
      }, { status: 402 });
    }
    let fromCheckin = Math.min(player.checkin_fuel || 0, fuelCost);
    let fromRegular = fuelCost - fromCheckin;
    await db.prepare(`UPDATE bq_players SET lat = ?, lon = ?, fuel = fuel - ?, checkin_fuel = checkin_fuel - ? WHERE id = ?`).bind(target_lat, target_lon, fromRegular, fromCheckin, player.id).run();
    await db.prepare(
      `INSERT INTO bq_moves (id, player_id, from_lat, from_lon, to_lat, to_lon, distance_km, fuel_cost, speed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), player.id, fromLat, fromLon, target_lat, target_lon, distKm, fuelCost, speed).run();
    await logTransaction(db, { player_id: player.id, type: "move", amount: -fuelCost, detail: `${speed} ${distKm.toFixed(1)}km (${fromLat.toFixed(4)},${fromLon.toFixed(4)}) → (${target_lat.toFixed(4)},${target_lon.toFixed(4)})` });
    let captured = null;
    if (bottle_id) {
      const bottle = await db.prepare(
        `SELECT id, title, status FROM bottles WHERE id = ? AND status IN ('launched', 'sailing')`
      ).bind(bottle_id).first();
      if (bottle) {
        const bPos = await db.prepare(
          `SELECT lat, lon FROM bottle_positions WHERE bottle_id = ? ORDER BY recorded_at DESC LIMIT 1`
        ).bind(bottle_id).first();
        if (bPos) {
          const bottleDist = degDist(target_lat, target_lon, bPos.lat, bPos.lon);
          if (bottleDist <= CAPTURE_RADIUS) {
            const captureBonus = 50;
            await db.prepare(`UPDATE bottles SET status = 'found', opened_by = ?, opened_at = datetime('now') WHERE id = ?`).bind(locals.user.id, bottle_id).run();
            await db.prepare(`UPDATE bq_players SET points = points + ?, fuel = fuel + ? WHERE id = ?`).bind(captureBonus, captureBonus, player.id).run();
            await db.prepare(`UPDATE bq_bean_inventory SET amount = amount + 2 WHERE player_id = ? AND bean_type = 'licorice'`).bind(player.id).run();
            captured = { bottle_id: bottle.id, title: bottle.title, bonus: captureBonus, beans: { type: "licorice", amount: 2 } };
            try {
              const { results: openBets } = await db.prepare(
                `SELECT * FROM bq_bets WHERE bottle_id = ? AND status = 'open'`
              ).bind(bottle_id).all();
              for (const bet of openBets || []) {
                const won = bet.bet_on_player_id === player.id;
                const winnings = won ? Math.floor(bet.amount * bet.odds * 0.95) : 0;
                const botFee = won ? Math.floor(bet.amount * bet.odds * 0.05) : 0;
                await db.prepare(`UPDATE bq_bets SET status = ?, resolved_at = datetime('now') WHERE id = ?`).bind(won ? "won" : "lost", bet.id).run();
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
              console.error("Bet resolution error:", betErr);
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
async function GET({ locals, platform }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: "No DB" }, { status: 500 });
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
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
export {
  GET,
  POST
};
