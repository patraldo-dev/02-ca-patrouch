async function logTransaction(db, { player_id, type, amount = 0, detail = "", related_id = null }) {
  if (!db) return;
  try {
    await db.prepare(`
            INSERT INTO bq_transactions (id, player_id, type, amount, detail, related_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
      crypto.randomUUID(),
      player_id,
      type,
      amount,
      detail,
      related_id
    ).run();
  } catch (e) {
    console.error("logTransaction failed:", e.message);
  }
}
export {
  logTransaction as l
};
