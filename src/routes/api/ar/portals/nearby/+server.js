import { json } from '@sveltejs/kit';
import { haversineDistance } from '$lib/geo.js';

/**
 * GET /api/ar/portals/nearby?lat=&lng=&game=arbooty&radius=500
 *
 * Returns active portals near the given coordinates.
 * Distance computed server-side — never trust the client.
 * Bounding box pre-filter, then exact haversine filter.
 */
export async function GET({ url, platform }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: 'No database' }, { status: 500 });

  const lat = parseFloat(url.searchParams.get('lat'));
  const lng = parseFloat(url.searchParams.get('lng'));
  const game = url.searchParams.get('game') || null;
  const radius = parseInt(url.searchParams.get('radius')) || 500;

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return json({ error: 'lat and lng required' }, { status: 400 });
  }

  // Clamp radius to prevent abuse
  const maxRadius = Math.min(radius, 2000);
  const now = Math.floor(Date.now() / 1000);

  try {
    // Bounding box pre-filter (1 degree ≈ 111km)
    const latDelta = maxRadius / 111000;
    const lngDelta = maxRadius / (111000 * Math.cos(lat * Math.PI / 180));

    let query = `
      SELECT id, game_id, theme, lat, lng, proclamation,
             agora_ref, narrator_clip_url, glb_variant,
             created_by, created_at, expires_at, captured_by, metadata
      FROM ar_portals
      WHERE expires_at > ?
        AND lat BETWEEN ? AND ?
        AND lng BETWEEN ? AND ?
    `;
    const bindings = [now, lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta];

    if (game) {
      query += ` AND game_id = ?`;
      bindings.push(game);
    }

    query += ` ORDER BY expires_at ASC`;

    const { results } = await db.prepare(query).bind(...bindings).all();
    const portals = (results || []).map(p => {
      const distanceMeters = haversineDistance(lat, lng, p.lat, p.lng);
      return {
        id: p.id,
        theme: p.theme,
        lat: p.lat,
        lng: p.lng,
        distanceMeters: Math.round(distanceMeters * 10) / 10,
        proclamation: p.proclamation,
        narratorClipUrl: p.narrator_clip_url || null,
        glbVariant: p.glb_variant || null,
        captured: !!p.captured_by,
        expiresAt: p.expires_at,
        createdBy: p.created_by,
      };
    });

    // Filter by exact haversine distance (bounding box is approximate)
    const nearby = portals.filter(p => p.distanceMeters <= maxRadius);

    return json({ portals: nearby });
  } catch (e) {
    console.error('ar_portals nearby error:', e);
    return json({ error: 'Query failed' }, { status: 500 });
  }
}
