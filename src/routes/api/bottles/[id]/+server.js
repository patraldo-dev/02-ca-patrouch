import { json } from '@sveltejs/kit';

export async function GET({ platform, params, locals }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  try {
    const bottle = await db.prepare('SELECT * FROM bottles WHERE id = ?').bind(params.id).first();
    if (!bottle) return json({ error: 'Not found' }, { status: 404 });

    const pos = await db.prepare(`
      SELECT lat, lon, heading, speed_knots, sea_temp, wind_speed, wind_dir, recorded_at
      FROM bottle_positions WHERE bottle_id = ? ORDER BY recorded_at ASC
    `).bind(params.id).all();
    bottle.positions = pos.results || [];

    return json(bottle);
  } catch (e) {
    console.error('Bottle GET error:', e);
    return json({ error: 'Failed to fetch bottle' }, { status: 500 });
  }
}

export async function PUT({ platform, params, locals, request }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const user = locals.user;
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { content, content_type, title, bottle_type, status, launch_lat, launch_lon } = body;

  const existing = await db.prepare('SELECT * FROM bottles WHERE id = ?').bind(params.id).first();
  if (!existing) return json({ error: 'Not found' }, { status: 404 });

  // Only owner or admin can update
  if (existing.user_id !== user.id && user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Handle launch
    if (status === 'launched' && existing.status === 'preparing') {
      const lat = launch_lat || 20.6534; // Puerto Vallarta
      const lon = launch_lon || -105.2253;
      const now = new Date().toISOString();

      await db.prepare(`
        UPDATE bottles SET status = 'launched', launched_at = ?, launch_lat = ?, launch_lon = ?,
        current_lat = ?, current_lon = ?, updated_at = datetime('now') WHERE id = ?
      `).bind(now, lat, lon, lat, lon, params.id).run();

      await db.prepare(`
        INSERT INTO bottle_positions (id, bottle_id, lat, lon, speed_knots, recorded_at)
        VALUES (?, ?, ?, ?, 0, ?)
      `).bind(crypto.randomUUID(), params.id, lat, lon, now).run();

      return json({ status: 'launched' });
    }

    // Regular update
    const updates = [];
    const values = [];
    if (content !== undefined) { updates.push('content = ?'); values.push(content); }
    if (content_type !== undefined) { updates.push('content_type = ?'); values.push(content_type); }
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (bottle_type !== undefined) { updates.push('bottle_type = ?'); values.push(bottle_type); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }

    if (updates.length === 0) return json({ error: 'Nothing to update' }, { status: 400 });

    updates.push("updated_at = datetime('now')");
    values.push(params.id);

    await db.prepare(`UPDATE bottles SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    return json({ ok: true });
  } catch (e) {
    console.error('Bottle update error:', e);
    return json({ error: 'Failed to update bottle' }, { status: 500 });
  }
}

export async function DELETE({ platform, params, locals }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const user = locals.user;
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await db.prepare('SELECT * FROM bottles WHERE id = ?').bind(params.id).first();
  if (!existing) return json({ error: 'Not found' }, { status: 404 });

  if (existing.user_id !== user.id && user.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await db.prepare('DELETE FROM bottle_positions WHERE bottle_id = ?').bind(params.id).run();
    await db.prepare('DELETE FROM bottles WHERE id = ?').bind(params.id).run();
    return json({ ok: true });
  } catch (e) {
    console.error('Bottle delete error:', e);
    return json({ error: 'Failed to delete bottle' }, { status: 500 });
  }
}
