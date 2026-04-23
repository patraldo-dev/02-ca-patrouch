import { json } from '@sveltejs/kit';

export async function PUT({ request, locals }) {
  const db = locals.db;
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { opt_in } = await request.json();
    const value = opt_in ? 1 : 0;

    await db.prepare(
      `UPDATE users SET booty_keywords_opt_in = ? WHERE id = ?`
    ).bind(value, locals.user.id).run();

    return json({ opt_in: !!value });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
