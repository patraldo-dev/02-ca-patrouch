import { json } from "@sveltejs/kit";
async function GET({ platform }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ events: [] });
  try {
    const url = new URL(platform?.request?.url || "http://localhost");
    const game = url.searchParams.get("game") || "both";
    let query = `SELECT * FROM narrator_events WHERE (expires_at IS NULL OR expires_at > datetime('now'))`;
    if (game !== "both") query += ` AND (target_game = 'both' OR target_game = ?)`;
    query += ` ORDER BY created_at DESC LIMIT 5`;
    const stmt = game !== "both" ? db.prepare(query).bind(game) : db.prepare(query);
    const { results } = await stmt.all();
    return json({ events: results || [] });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
async function POST({ request, platform }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: "No DB" }, { status: 500 });
  const cronSecret = await platform?.env?.CRON_SECRET?.get?.() ?? null;
  const auth = request.headers.get("Authorization");
  if (!auth || !cronSecret || auth !== `Bearer ${cronSecret}`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const ai = platform?.env?.AI;
  try {
    let data = {};
    try {
      data = await request.json();
    } catch {
    }
    if (!data.title || !data.narrative) {
      let extractText = function(r) {
        if (typeof r === "string") return r;
        if (r?.choices?.[0]?.message?.content) return r.choices[0].message.content;
        if (r?.response) return r.response;
        return JSON.stringify(r);
      };
      if (!ai) return json({ error: "AI unavailable" }, { status: 503 });
      const { results: players } = await db.prepare("SELECT username, lat, lon, fuel FROM bq_players").all();
      const playerContext = (players || []).slice(0, 10).map((p) => `${p.username} at (${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}) with ${p.fuel} beans`).join("; ");
      const prompt = `You are El Narrador (Albot Camus), the omniscient narrator of a pirate bottle game on the Pacific coast of Mexico. You speak with authority and mischief.

Current players: ${playerContext || "None"}

Create ONE event. Vary your style dramatically — be unpredictable. Mix these categories freely:

ACTIONS (with consequences):
- A bottle washes ashore near a player — they have 2h to capture it
- A treasure map fragment appears at a specific coordinate
- Currents shift — bottles drift faster toward the Bahía de Banderas
- A pirate ghost ship appears on the horizon
- Players near a port get bonus fuel
- A bounty is placed on a specific player's bottle
- Someone spots land — first player to reach it gets treasure

ATMOSPHERE:
- A storm approaches from the west
- Bioluminescent waves light up the night ocean
- A whale breaches near a player's position
- The moon reveals a message in the tide pools
- Fog rolls in — visibility drops, capture radius doubles

CHALLENGES:
- Riddle of the tide — answer correctly for fuel bonus
- Navigation challenge — find the coordinates hidden in the narrative
- Alliance request — two players must cooperate for bonus

Generate a JSON object with:
- title: dramatic title (max 10 words)
- narrative: 2-4 sentences, vivid and engaging (max 350 chars). Include action, urgency, or mystery.
- event_type: one of "flavor", "action", "challenge", "weather", "event"
- duration_hours: 6 or 12

- effects: JSON object with game mechanics that apply. Use these:
  {"freeze_hours": 2} — all players paralyzed (siesta), no movement
  {"fuel_bonus": 50} — all players gain fuel
  {"capture_radius_mult": 2} — capture radius doubled
  {"drift_speed_mult": 1.5} — bottles drift 50% faster
  {"drift_speed_mult": 0.5} — bottles drift 50% slower (calm seas)
  {"visibility": "fog"} — reduced map visibility
  {"visibility": "clear"} — enhanced map visibility
  {"bounty_player": "username"} — bonus for capturing that player's bottle
  {"bonus_fuel_port": true} — players near a port get fuel

- target_game: one of "booty", "arbooty", "both" — which game this event affects
Always include at least one effect. The effect MUST relate to the narrative.
Be creative. Be bold. Create events that make players WANT to check the game.`;
      const aiResp = await ai.run("@cf/mistralai/mistral-small-3.1-24b-instruct", {
        messages: [
          { role: "system", content: "Respond ONLY with valid JSON. No markdown, no backticks, no explanation." },
          { role: "user", content: prompt }
        ],
        max_tokens: 250
      });
      console.log("[NARRATOR] TYPE:", typeof aiResp, "KEYS:", aiResp && typeof aiResp === "object" ? Object.keys(aiResp) : "N/A", "FULL:", JSON.stringify(aiResp).slice(0, 500));
      const aiText = extractText(aiResp);
      let jsonStr = aiText.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] || aiText.match(/\{[\s\S]*\}/)?.[0];
      if (!jsonStr) return json({ error: "AI did not return JSON", aiPreview: aiText.slice(0, 500) }, { status: 500 });
      data = JSON.parse(jsonStr.trim());
    }
    const { title, narrative, event_type, modifier_type, modifier_value, affected_zone, target_players, duration_hours, title_es, narrative_es, title_fr, narrative_fr } = data;
    const id = crypto.randomUUID();
    const dur = duration_hours || 6;
    const expiresSql = `datetime('now', '+${dur} hours')`;
    let tEs = title_es, nEs = narrative_es, tFr = title_fr, nFr = narrative_fr;
    if (!tEs) tEs = title;
    if (!nEs) nEs = narrative;
    if (!tFr) tFr = title;
    if (!nFr) nFr = narrative;
    await db.prepare(`
            INSERT INTO narrator_events (id, title, narrative, event_type, duration_hours, expires_at, effects, target_game)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, title, narrative, event_type || "flavor", dur, expiresSql, JSON.stringify(data.effects || {}), data.target_game || "both").run();
    try {
      const { notifyAll } = await import("../../../../chunks/notify.js");
      await notifyAll(db, { type: "narrator", title: "🌊 " + title, body: narrative });
    } catch (e) {
      console.error("[narrator] notify failed:", e.message);
    }
    return json({ success: true, id });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
export {
  GET,
  POST
};
