import { json } from "@sveltejs/kit";
import { l as logTransaction } from "../../../../../chunks/bottlequest-logger.js";
async function POST({ locals, platform, request }) {
  const db = platform?.env?.DB_book;
  const user = locals.user;
  if (!user || !db) return json({ success: false, message: "Not authenticated" }, { status: 401 });
  const existing = await db.prepare("SELECT id FROM bq_players WHERE username = ?").bind(user.username).first();
  if (existing) return json({ success: false, message: "⚠️ Ya eres un jugador del Crusade. ¡A conquistar!" }, { status: 400 });
  const body = await request.json();
  const portId = body.port_id || "port-pv";
  const port = await db.prepare("SELECT id, name, lat, lon FROM bq_ports WHERE id = ?").bind(portId).first();
  if (!port) return json({ success: false, message: "⚠️ Puerto no encontrado. Selecciona otro puerto." }, { status: 400 });
  const playerId = crypto.randomUUID();
  const username = user.username || user.email?.split("@")[0] || "unknown";
  const displayName = user.display_name || username;
  await db.prepare(`
        INSERT INTO bq_players (id, username, display_name, type, port_id, port_name, lat, lon, fuel, points, solo, team_id, team_name, team_color)
        VALUES (?, ?, ?, 'human', ?, ?, ?, ?, 100, 0, 1, NULL, NULL, NULL)
    `).bind(playerId, username, displayName, port.id, port.name, port.lat, port.lon).run();
  await logTransaction(db, { player_id: playerId, type: "join", amount: 0, detail: `Joined from port ${port.name}` });
  return json({ success: true, message: "Welcome to the Crusade!", playerId });
}
export {
  POST
};
