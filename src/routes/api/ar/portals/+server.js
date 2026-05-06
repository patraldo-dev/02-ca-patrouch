import { json } from '@sveltejs/kit';

/**
 * POST /api/ar/portals
 *
 * Create a new AR portal (auth required).
 * Used by admin panel or Narrator cron worker.
 */
export async function POST({ request, platform, locals }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'No database' }, { status: 500 });

  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { game_id, theme, lat, lng, proclamation, agora_ref, narrator_clip_url, glb_variant, radius_m, ttl_hours, metadata } = await request.json();

    if (!game_id || !theme || !lat || !lng || !proclamation) {
      return json({ error: 'game_id, theme, lat, lng, proclamation required' }, { status: 400 });
    }

    const validThemes = ['arboleda', 'fiesta', 'oceano', 'narrador', 'espacio', 'urbano', 'fantasia'];
    if (!validThemes.includes(theme)) {
      return json({ error: `Invalid theme: ${validThemes.join(', ')}` }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const ttlHours = Math.max(1, Math.min(ttl_hours || 6, 168));
    const expiresAt = now + (ttlHours * 3600);

    await db.prepare(`
      INSERT INTO ar_portals (id, game_id, theme, lat, lng, radius_m, proclamation, agora_ref, narrator_clip_url, glb_variant, created_by, created_at, expires_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, game_id, theme, lat, lng, radius_m || 30, proclamation,
      agora_ref || null, narrator_clip_url || null, glb_variant || null,
      locals.user.username, now, expiresAt,
      metadata ? JSON.stringify(metadata) : null
    ).run();

    return json({
      success: true,
      portal: { id, gameId: game_id, theme, lat, lng, proclamation, expiresAt },
    });
  } catch (e) {
    console.error('ar_portals create error:', e);
    return json({ error: 'Create failed' }, { status: 500 });
  }
}
