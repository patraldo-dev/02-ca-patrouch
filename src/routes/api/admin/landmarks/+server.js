import { json } from '@sveltejs/kit';

/**
 * GET /api/admin/landmarks — list all tour landmarks
 * POST /api/admin/landmarks — create new landmark
 * PUT /api/admin/landmarks — update landmark (requires id in body)
 * DELETE /api/admin/landmarks?id= — delete landmark
 */
export async function GET({ platform, locals }) {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'No database' }, { status: 500 });

  const { results } = await db.prepare(`
    SELECT id, name, description, lat, lng, category, image_url, link_url, sort_order, active, created_at, updated_at
    FROM tour_landmarks
    ORDER BY sort_order ASC, name ASC
  `).all();

  return json({ landmarks: results || [] });
}

export async function POST({ request, platform, locals }) {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'No database' }, { status: 500 });

  try {
    const { name, description, lat, lng, category, image_url, link_url, sort_order, active } = await request.json();

    if (!name || lat == null || lng == null) {
      return json({ error: 'name, lat, lng required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.prepare(`
      INSERT INTO tour_landmarks (id, name, description, lat, lng, category, image_url, link_url, sort_order, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, name, description || '', lat, lng,
      category || 'landmark', image_url || '', link_url || '',
      sort_order || 0, active !== false ? 1 : 0, now, now
    ).run();

    return json({ success: true, id });
  } catch (e) {
    console.error('landmarks create error:', e);
    return json({ error: 'Create failed' }, { status: 500 });
  }
}

export async function PUT({ request, platform, locals }) {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'No database' }, { status: 500 });

  try {
    const { id, name, description, lat, lng, category, image_url, link_url, sort_order, active } = await request.json();

    if (!id) return json({ error: 'id required' }, { status: 400 });

    const now = Math.floor(Date.now() / 1000);

    await db.prepare(`
      UPDATE tour_landmarks
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          lat = COALESCE(?, lat),
          lng = COALESCE(?, lng),
          category = COALESCE(?, category),
          image_url = COALESCE(?, image_url),
          link_url = COALESCE(?, link_url),
          sort_order = COALESCE(?, sort_order),
          active = COALESCE(?, active),
          updated_at = ?
      WHERE id = ?
    `).bind(name, description, lat, lng, category, image_url, link_url, sort_order, active, now, id).run();

    return json({ success: true });
  } catch (e) {
    console.error('landmarks update error:', e);
    return json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE({ url, platform, locals }) {
  if (!locals.user || locals.user.role !== 'admin') {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'No database' }, { status: 500 });

  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'id required' }, { status: 400 });

  await db.prepare('DELETE FROM tour_landmarks WHERE id = ?').bind(id).run();

  return json({ success: true });
}
