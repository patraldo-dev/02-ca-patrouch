import { json } from "@sveltejs/kit";
async function POST({ request, platform }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: "No DB" }, { status: 500 });
  const cronSecret = platform?.env?.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("Authorization");
    if (!auth || auth !== `Bearer ${cronSecret}`) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const results = [];
  try {
    const { results: writings } = await db.prepare(`
            SELECT w.id, w.title, w.content, w.user_id, u.username, u.display_name
            FROM writings w
            JOIN users u ON w.user_id = u.id
            WHERE w.status = 'published' AND w.created_at > datetime('now', '-3 days')
            ORDER BY w.created_at DESC
        `).all();
    const writingsText = (writings || []).map(
      (w) => `[${w.display_name || w.username}] "${w.title}": ${(w.content || "").slice(0, 300)}`
    ).join("\n\n");
    const { results: bottles } = await db.prepare(`
            SELECT id, title, current_lat, current_lon, status, launched_at
            FROM bottles WHERE status IN ('launched', 'sailing')
        `).all();
    const { results: bots } = await db.prepare("SELECT * FROM bq_booty_bots").all();
    const { results: events } = await db.prepare(`
            SELECT * FROM narrator_events
            WHERE started_at > datetime('now', '-6 hours')
            AND (duration_hours IS NULL OR datetime(started_at, '+' || duration_hours || ' hours') > datetime('now'))
        `).all();
    const market = await db.prepare("SELECT * FROM bq_market WHERE id = 'daily'").first();
    const brent = market?.brent_price || 73;
    const { results: players } = await db.prepare(`
            SELECT id, username, display_name, lat, lon, type, fuel, points
            FROM bq_players WHERE type = 'human'
        `).all();
    for (const bot of bots) {
      if (bot.hijacked_by && new Date(bot.hijacked_until) > /* @__PURE__ */ new Date()) {
        results.push({ bot: bot.name, action: "hijacked", by: bot.hijacked_by });
        continue;
      }
      const stormEvent = events.find(
        (e) => e.event_type === "storm" && (!e.target_players || e.target_players.includes(bot.id))
      );
      if (stormEvent) {
        results.push({ bot: bot.name, action: "stalled", reason: "storm" });
        continue;
      }
      const paralysisEvent = events.find(
        (e) => e.event_type === "paralysis" && (!e.target_players || e.target_players.includes(bot.id))
      );
      if (paralysisEvent) {
        results.push({ bot: bot.name, action: "paralyzed", reason: "narrator" });
        continue;
      }
      const prompt = `You are ${bot.name}, a Booty Bot pirate. Your personality: ${bot.personality}

CURRENT SITUATION:
- Your position: ${bot.lat}, ${bot.lon}
- Your beans: ${bot.beans}
- Brent crude price: $${brent} per barrel (movement cost = brent/100 per km)
- Active bottles: ${JSON.stringify(bottles.map((b) => ({ id: b.id, title: b.title, lat: b.current_lat, lon: b.current_lon })))}
- Nearby humans: ${JSON.stringify(players.map((p) => ({ name: p.display_name || p.username, lat: p.lat, lon: p.lon, beans: p.fuel })))}

RECENT WRITINGS FROM PLAYERS:
${writingsText.slice(0, 2e3)}

ASIMOV RULES (you MUST follow):
1. Never harm humans - no killing, no paralyzing, max 10% beans stolen per cycle
2. Obey your hijacker if any (unless it violates Rule 1)
3. Protect yourself (unless it violates Rule 1 or 2)

Decide your action. Reply with ONLY valid JSON:
{
  "action": "move" | "idle" | "comment" | "steal_beans" | "sabotage",
  "target_lat": <number or null>,
  "target_lon": <number or null>,
  "target_player": "<username or null>",
  "comment": "<something you say based on the writings, max 100 chars>",
  "reason": "<why you did this, max 80 chars>"
}`;
      let decision = { action: "idle", reason: "no AI response" };
      try {
        const aiResponse = await fetch("https://api.cloudflare.com/client/v4/accounts/" + platform.env.CF_ACCOUNT_ID + "/ai/run/@cf/mistralai/mistral-small-3.1-24b-instruct", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + platform.env.CF_API_TOKEN,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: "You are a pirate AI. Reply only with valid JSON. No markdown, no explanation." },
              { role: "user", content: prompt }
            ],
            max_tokens: 200,
            temperature: 0.8
          })
        });
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const aiText = aiData.result?.response || "";
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            decision = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (e) {
        decision = { action: "idle", reason: "AI error: " + e.message };
      }
      let result = { bot: bot.name, decision };
      if (decision.action === "move" && decision.target_lat && decision.target_lon) {
        const latDiff = Math.abs(decision.target_lat - bot.lat);
        const lonDiff = Math.abs(decision.target_lon - bot.lon);
        const distDeg = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
        const distKm = distDeg * 111;
        const cost = Math.ceil(distKm * (brent / 100) * 0.5);
        if (cost > 0 && bot.beans >= cost) {
          await db.prepare("UPDATE bq_booty_bots SET lat = ?, lon = ?, beans = beans - ? WHERE id = ?").bind(decision.target_lat, decision.target_lon, cost, bot.id).run();
          result.moved = true;
          result.cost = cost;
        } else {
          result.moved = false;
          result.reason = "insufficient beans";
        }
      }
      if (decision.action === "steal_beans" && decision.target_player) {
        const target = players.find((p) => p.username === decision.target_player);
        if (target && target.fuel > 0) {
          const maxSteal = Math.floor(target.fuel * 0.1);
          const steal = Math.min(maxSteal, 5);
          if (steal > 0) {
            await db.prepare("UPDATE bq_players SET fuel = fuel - ? WHERE username = ?").bind(steal, target.username).run();
            await db.prepare("UPDATE bq_booty_bots SET beans = beans + ? WHERE id = ?").bind(steal, bot.id).run();
            result.stole = steal;
            result.from = target.username;
          }
        }
      }
      if (decision.action === "comment" && decision.comment) {
        result.comment = decision.comment;
      }
      result.reason = decision.reason || result.reason;
      results.push(result);
    }
    for (let i = 0; i < bots.length; i++) {
      for (let j = i + 1; j < bots.length; j++) {
        const a = bots[i], b = bots[j];
        const dLat = a.lat - b.lat;
        const dLon = a.lon - b.lon;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);
        if (dist < 1e-3) {
          const scoreA = (a.beans || 0) + (a.captured_bottles || 0) * 10;
          const scoreB = (b.beans || 0) + (b.captured_bottles || 0) * 10;
          if (scoreA > scoreB) {
            await db.prepare("UPDATE bq_booty_bots SET beans = 0 WHERE id = ?").bind(b.id).run();
            results.push({ combat: true, winner: a.name, loser: b.name, action: "respawn" });
          } else if (scoreB > scoreA) {
            await db.prepare("UPDATE bq_booty_bots SET beans = 0 WHERE id = ?").bind(a.id).run();
            results.push({ combat: true, winner: b.name, loser: a.name, action: "respawn" });
          } else {
            await db.prepare("UPDATE bq_booty_bots SET beans = 0 WHERE id IN (?, ?)").bind(a.id, b.id).run();
            results.push({ combat: true, draw: true, bots: [a.name, b.name] });
          }
        }
      }
    }
    return json({ success: true, timestamp: (/* @__PURE__ */ new Date()).toISOString(), results });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
export {
  POST
};
