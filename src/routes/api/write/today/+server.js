import { json } from '@sveltejs/kit';
import { getTodayData } from '$lib/server/writing-stats.js';

export async function GET(event) {
  const user = event.locals.user;
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const db = event.locals.db;
  const ai = event.platform?.env?.AI;
  const data = await getTodayData(db, ai, user.id);

  return json(data);
}
