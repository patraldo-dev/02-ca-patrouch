import { json } from '@sveltejs/kit';

export async function GET({ platform, url, locals }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const status = url.searchParams.get('status');
  const userId = url.searchParams.get('user_id');
  const includePositions = url.searchParams.get('positions') !== 'false';

  let where = '';
  const params = [];

  if (status) {
    where += ' AND b.status = ?';
    params.push(status);
  }
  if (userId) {
    where += ' AND b.user_id = ?';
    params.push(userId);
  }

  try {
    const { results } = await db.prepare(`
      SELECT b.* FROM bottles b WHERE 1=1${where} ORDER BY b.created_at DESC
    `).bind(...params).all();

    // Attach position trails
    if (includePositions && results.length > 0) {
      for (const bottle of results) {
        const pos = await db.prepare(`
          SELECT lat, lon, heading, speed_knots, recorded_at
          FROM bottle_positions WHERE bottle_id = ? ORDER BY recorded_at ASC
        `).bind(bottle.id).all();
        bottle.positions = pos.results || [];
      }
    }

    return json(results);
  } catch (e) {
    console.error('Bottles GET error:', e);
    return json({ error: 'Failed to fetch bottles' }, { status: 500 });
  }
}

export async function POST({ platform, locals, request }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'Database not available' }, { status: 500 });

  const user = locals.user;
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { content, content_type = 'message', title = '', bottle_type = 'glass' } = body;

  if (!content?.trim()) return json({ error: 'Content is required' }, { status: 400 });

  const id = crypto.randomUUID();
  try {
    await db.prepare(`
      INSERT INTO bottles (id, user_id, content, content_type, title, status, bottle_type)
      VALUES (?, ?, ?, ?, ?, 'preparing', ?)
    `).bind(id, user.id, content.trim(), content_type, title.trim(), bottle_type).run();

    return json({ id, status: 'preparing' }, { status: 201 });
  } catch (e) {
    console.error('Bottle create error:', e);
    return json({ error: 'Failed to create bottle' }, { status: 500 });
  }
}
