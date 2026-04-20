// src/lib/server/bottlequest-logger.js
// Call logTransaction(db, playerId, type, amount, description, relatedId)
// from any Bottle Booty API endpoint

export async function logTransaction(db, playerId, type, amount, description = '', relatedId = null) {
  if (!playerId || !db) return;
  try {
    await db.prepare(`
      INSERT INTO bq_transactions (player_id, type, amount, description, related_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(playerId, type, amount, description, relatedId).run();
  } catch (e) {
    console.error('Transaction log error:', e);
  }
}
