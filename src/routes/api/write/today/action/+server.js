import { json } from '@sveltejs/kit';
import { handleAction } from '$lib/server/writing-stats.js';

export async function POST(event) {
  const user = event.locals.user;
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await event.request.json();
  const { action } = body;

  if (!action || !['accepted', 'passed'].includes(action)) {
    return json({ error: 'Action must be "accepted" or "passed"' }, { status: 400 });
  }

  const db = event.locals.db;
  const ai = event.platform?.env?.AI;
  const result = await handleAction(db, ai, user.id, action);

  if (result.error) return json(result, { status: 429 });
  return json(result);
}
