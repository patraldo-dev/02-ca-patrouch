import { json } from '@sveltejs/kit';
import { getUserWritings } from '$lib/server/writing-stats.js';

export async function GET(event) {
  const user = event.locals.user;
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(event.request.url);
  const page = parseInt(url.searchParams.get('page')) || 1;
  const limit = parseInt(url.searchParams.get('limit')) || 10;
  const visibility = url.searchParams.get('visibility') || null;

  const result = await getUserWritings(event.locals.db, user.id, { page, limit, visibility });
  return json(result);
}
