import { json } from '@sveltejs/kit';
import { publishWriting, saveDraft } from '$lib/server/writing-stats.js';

export async function POST(event) {
  const user = event.locals.user;
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await event.request.json();
  const { title, content, promptId, aiAssisted, visibility, status } = body;

  if (!title?.trim() || !content?.trim()) {
    return json({ error: 'Title and content are required' }, { status: 400 });
  }

  const db = event.locals.db;

  if (status === 'draft') {
    const result = await saveDraft(db, user.id, { title, content, promptId, aiAssisted });
    return json({ success: true, ...result });
  }

  const result = await publishWriting(db, user.id, { title, content, promptId, aiAssisted, visibility });
  return json({ success: true, ...result });
}
