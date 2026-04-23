import { json } from "@sveltejs/kit";
async function GET({ platform }) {
  try {
    const db = platform?.env?.DB_book;
    if (!db) {
      return json({ error: "Database unavailable" }, { status: 503 });
    }
    const { results } = await db.prepare(`
            SELECT
                u.username,
                u.id as user_id,
                COUNT(*) as total_guesses,
                SUM(CASE WHEN g.was_correct = 1 THEN 1 ELSE 0 END) as correct_guesses,
                ROUND(CAST(SUM(CASE WHEN g.was_correct = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 1) as accuracy
            FROM agora_game_guesses g
            JOIN users u ON g.user_id = u.id
            GROUP BY g.user_id
            HAVING total_guesses >= 3
            ORDER BY accuracy DESC, correct_guesses DESC
            LIMIT 20
        `).all();
    return json(results || []);
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
export {
  GET
};
