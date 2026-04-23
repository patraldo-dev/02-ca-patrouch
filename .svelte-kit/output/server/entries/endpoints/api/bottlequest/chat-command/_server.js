import { json } from "@sveltejs/kit";
async function POST({ request, locals, platform }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: "No DB" }, { status: 500 });
  const user = locals.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const { message } = await request.json();
  if (!message || typeof message !== "string") return json({ error: "No message" }, { status: 400 });
  try {
    const player = await db.prepare("SELECT username, lat, lon, fuel, checkin_fuel FROM bq_players WHERE username = ?").bind(user.username).first();
    if (!player) return json({ error: "Not a player" }, { status: 404 });
    const { results: bottles } = await db.prepare(`
            SELECT id, title, current_lat, current_lon, status FROM bottles WHERE status IN ('launched', 'sailing')
        `).all();
    const { results: players } = await db.prepare(`
            SELECT username, display_name, lat, lon FROM bq_players WHERE username != ?
        `).bind(user.username).all();
    const market = await db.prepare("SELECT cost_per_km, brent_price FROM bq_market WHERE id = 'daily'").first();
    const context = {
      player: { lat: player.lat, lon: player.lon, fuel: player.fuel, checkin_fuel: player.checkin_fuel },
      bottles: bottles.map((b) => ({ id: b.id, title: b.title, lat: b.current_lat, lon: b.current_lon, status: b.status })),
      players: players.map((p) => ({ username: p.username, display_name: p.display_name, lat: p.lat, lon: p.lon })),
      cost_per_km: market?.cost_per_km || 0.73,
      brent: market?.brent_price || 73
    };
    const ports = [
      { name: "Vancouver", lat: 49.28, lon: -123.12 },
      { name: "Victoria", lat: 48.43, lon: -123.37 },
      { name: "Seattle", lat: 47.61, lon: -122.33 },
      { name: "Portland", lat: 45.52, lon: -122.68 },
      { name: "San Francisco", lat: 37.77, lon: -122.42 },
      { name: "Monterey", lat: 36.6, lon: -121.89 },
      { name: "Santa Barbara", lat: 34.42, lon: -119.7 },
      { name: "Long Beach", lat: 33.76, lon: -118.19 },
      { name: "Santa Monica", lat: 34.01, lon: -118.5 },
      { name: "San Diego", lat: 32.72, lon: -117.17 },
      { name: "Cabo San Lucas", lat: 22.89, lon: -109.92 },
      { name: "Mazatlán", lat: 23.21, lon: -106.41 },
      { name: "Puerto Vallarta", lat: 20.7, lon: -105.3 },
      { name: "Manzanillo", lat: 19.05, lon: -104.32 },
      { name: "Acapulco", lat: 16.85, lon: -99.9 },
      { name: "Huatulco", lat: 15.77, lon: -96.13 },
      { name: "Honolulu", lat: 21.31, lon: -157.86 },
      { name: "Papeete", lat: -17.53, lon: -149.57 },
      { name: "Galápagos", lat: -0.74, lon: -90.31 },
      { name: "Valparaíso", lat: -33.05, lon: -71.62 },
      { name: "Lima", lat: -12.05, lon: -77.15 }
    ];
    const prompt = `You are a pirate navigation AI for the game Booty Battle. Parse the player's command and respond with ONLY valid JSON.

CONTEXT:
- Player at: ${player.lat}, ${player.lon} (fuel: ${player.fuel + (player.checkin_fuel || 0)})
- Active bottles: ${JSON.stringify(context.bottles)}
- Other players: ${JSON.stringify(context.players)}
- Known ports: ${JSON.stringify(ports)}
- Cost per km: ${context.cost_per_km} (brent $${context.brent}/barrel)

PLAYER SAID: "${message}"

Possible actions:
1. "move" - player wants to go somewhere. Find the best matching coordinates from ports, bottles, players, or relative directions.
2. "info" - player asks about status, bottles, players, distance, weather.
3. "greet" - player says hi or casual stuff.
4. "unknown" - can't determine intent.

For "move": calculate approximate fuel cost (distance_km × cost_per_km × speed_mult). Speed: drift=0.5, sail=1, motor=4.
For "info": provide a helpful answer about the game state.
For "greet": respond as a pirate navigator.
For "unknown": ask what they want to do.

Reply ONLY with JSON:
{
  "action": "move" | "info" | "greet" | "unknown",
  "target_lat": <number or null>,
  "target_lon": <number or null>,
  "target_name": "<what they said, e.g. San Diego>",
  "estimated_cost": <number or null>,
  "distance_km": <number or null>,
  "reply": "<friendly pirate-style response, max 120 chars, in the same language as the player's message>"
}`;
    const ai = platform.env.AI;
    if (!ai) return json({ error: "AI unavailable" }, { status: 503 });
    const aiRes = await ai.run("@cf/mistralai/mistral-small-3.1-24b-instruct", {
      messages: [
        { role: "system", content: "You are a pirate navigator AI. Reply only with valid JSON. No markdown." },
        { role: "user", content: prompt }
      ],
      max_tokens: 250
    });
    const aiText = aiRes?.response || "";
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return json({ reply: "¡Ay, el código del mar me falló! Intenta de nuevo.", action: "unknown" });
    const result = JSON.parse(jsonMatch[0]);
    if (result.action === "move" && result.target_lat && result.target_lon) {
      const R = 6371;
      const dLat = (result.target_lat - player.lat) * Math.PI / 180;
      const dLon = (result.target_lon - player.lon) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(player.lat * Math.PI / 180) * Math.cos(result.target_lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      result.distance_km = Math.round(distKm);
      const { results: activeEvents } = await db.prepare(`
                SELECT * FROM narrator_events
                WHERE event_type IN ('weather', 'storm', 'current', 'wind')
                AND (duration_hours IS NULL OR datetime(started_at, '+' || duration_hours || ' hours') > datetime('now'))
                AND started_at <= datetime('now')
            `).all();
      let eventModifier = 1;
      let eventWarning = null;
      for (const event of activeEvents || []) {
        if (!event.affected_zone) continue;
        try {
          const zone = JSON.parse(event.affected_zone);
          const zLat = zone.lat, zLon = zone.lon, zRad = zone.radius || 200;
          const eDLat = (zone.lat - result.target_lat) * Math.PI / 180;
          const eDLon = (zone.lon - result.target_lon) * Math.PI / 180;
          const ea = Math.sin(eDLat / 2) ** 2 + Math.cos(result.target_lat * Math.PI / 180) * Math.cos(zone.lat * Math.PI / 180) * Math.sin(eDLon / 2) ** 2;
          const eDist = R * 2 * Math.atan2(Math.sqrt(ea), Math.sqrt(1 - ea));
          if (eDist < zRad) {
            if (event.event_type === "storm" || event.event_type === "weather") {
              eventModifier *= 2;
              eventWarning = `⚠️ ${event.title || "El Narrador decrees danger in this zone"}`;
            } else if (event.event_type === "current") {
              eventModifier *= 0.7;
              eventWarning = `🌊 ${event.title || "Favorable currents!"}`;
            } else if (event.event_type === "wind") {
              eventModifier *= 1.5;
              eventWarning = `💨 ${event.title || "Strong winds ahead"}`;
            }
          }
        } catch {
        }
      }
      if (player.paralyzed_until && /* @__PURE__ */ new Date(player.paralyzed_until.replace(" ", "T") + "Z") > /* @__PURE__ */ new Date()) {
        result.action = "blocked";
        result.reply = eventWarning || "⚠️ El Narrador has decreed you cannot move right now.";
        result.warning = eventWarning;
        return json(result);
      }
      const now = /* @__PURE__ */ new Date();
      const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
      const solarH = (utcH + result.target_lon / 15 + 24) % 24;
      const nightMult = solarH >= 18 || solarH < 6 ? 1.5 : 1;
      const distDeg = Math.sqrt((result.target_lat - player.lat) ** 2 + (result.target_lon - player.lon) ** 2);
      let zoneMult = 1;
      if (distDeg <= 5e-3) zoneMult = 5;
      else if (distDeg <= 0.05) zoneMult = 2;
      result.estimated_cost = {
        drift: Math.ceil(distKm * context.cost_per_km * 0.5 * zoneMult * nightMult * eventModifier),
        sail: Math.ceil(distKm * context.cost_per_km * 1 * zoneMult * nightMult * eventModifier),
        motor: Math.ceil(distKm * context.cost_per_km * 4 * zoneMult * nightMult * eventModifier)
      };
      const totalBeans = player.fuel + (player.checkin_fuel || 0);
      const cheapestCost = Math.min(result.estimated_cost.drift, result.estimated_cost.sail, result.estimated_cost.motor);
      if (totalBeans < cheapestCost) {
        result.action = "blocked";
        result.reply = `🫘 ¡No tienes suficientes Jelly Beans! Necesitas al menos ${cheapestCost} pero solo tienes ${totalBeans}. Haz check-in o pide beans a otro jugador.`;
        result.beans_needed = cheapestCost;
        result.beans_current = totalBeans;
      }
      if (eventWarning) result.warning = eventWarning;
      if (nightMult > 1) result.night_penalty = true;
    }
    return json(result);
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
export {
  POST
};
