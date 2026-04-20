import { json } from '@sveltejs/kit';

export async function GET({ platform, locals, url }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'No DB' }, { status: 500 });
  const user = locals.user;
  if (!user) return json({ error: 'Not logged in' }, { status: 401 });

  const playerId = url.searchParams.get('player_id') || user.id;

  // Only allow own data
  if (playerId !== user.id) {
    // Admins can see any player
    const adminRoles = ['admin'];
    if (!adminRoles.includes(user.role)) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Balance summary
  const summary = await db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_in,
      COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_out,
      COUNT(*) as total_count
    FROM bq_transactions WHERE player_id = ?
  `).bind(playerId).first();

  // By type breakdown
  const { results: byType } = await db.prepare(`
    SELECT type, SUM(amount) as total, COUNT(*) as count
    FROM bq_transactions WHERE player_id = ?
    GROUP BY type ORDER BY created_at DESC
  `).bind(playerId).all();

  // Last 50 transactions
  const { results: recent } = await db.prepare(`
    SELECT id, type, amount, description, related_id, created_at
    FROM bq_transactions WHERE player_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).bind(playerId).all();

  return json({ summary, byType: byType || [], recent: recent || [] });
}
