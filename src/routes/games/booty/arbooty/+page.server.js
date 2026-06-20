export async function load({ locals, platform, url }) {
  const db = platform?.env?.DB_book;
  let myPlayer = null;
  let bottles = [];
  let portalConfig = null;
  const mode = url.searchParams.get('mode') || 'pirate';
  const themeId = url.searchParams.get('theme');

  // Load portal theme config if a theme is specified
  if (db && themeId) {
    try {
      const portal = await db.prepare(`
        SELECT id, galaxy_id, icon, color_primary, color_bg, color_text,
               name_es, name_en, name_fr,
               description_es, description_en, description_fr,
               narrator_tone, narrator_vocabulary, narrator_greeting,
               placement_mode, portal_distance, portal_y
        FROM portals WHERE id = ? AND status = 'active'
      `).bind(themeId).first();
      if (portal) {
        try { portal.narrator_vocabulary = JSON.parse(portal.narrator_vocabulary || '[]'); } catch {}
        portalConfig = portal;
      }
    } catch (e) {
      console.error('Portal config load error:', e);
    }
  }

  // Load physical bottles — available to everyone for event mode
  if (db) {
    try {
      const prefix = mode === 'event' ? 'event-%' : 'phys-%';
      const result = await db.prepare(
        "SELECT id, title, current_lat, current_lon, found_by, content_type FROM bottles WHERE id LIKE ? AND bottle_type = 'physical' AND is_test = 0 AND status != 'archived' ORDER BY id"
      ).bind(prefix).all();
      bottles = result.results || [];
    } catch (e) {
      console.error('Arbooty bottles load error:', e);
    }
  }

  // Only load player data if authenticated
  if (!locals.user && mode === 'event') {
    return { serverLocale: locals.locale || 'es', user: null, myPlayer: null, bottles, portalConfig };
  }

  if (locals.user) {
    try {
      myPlayer = await db.prepare('SELECT id, username, display_name, lat, lon FROM bq_players WHERE username = ?').bind(locals.user.username).first();
    } catch (e) {
      console.error('Arbooty player load error:', e);
    }
  }

  return {
    serverLocale: locals.locale || 'es',
    user: locals.user || null,
    myPlayer,
    bottles,
    portalConfig
  };
}
