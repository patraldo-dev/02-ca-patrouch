import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  if (!locals.user) return { user: null };

  const db = locals.db;
  const ai = locals.platform?.env?.AI;

  // Get recent writings
  const { results: recentWritings } = await db.prepare(
    'SELECT w.id, w.title, w.word_count, w.status, w.visibility, w.created_at FROM writings w WHERE w.user_id = ? ORDER BY w.created_at DESC LIMIT 5'
  ).bind(locals.user.id).all();

  return { user: locals.user, recentWritings };
}
