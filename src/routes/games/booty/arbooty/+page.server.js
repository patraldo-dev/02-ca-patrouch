export async function load({ locals, platform, url }) {
  const db = platform?.env?.DB_book;
  let myPlayer = null;
  let bottles = [];
  const mode = url.searchParams.get('mode') || 'pirate';

  // Load physical bottles — available to everyone for fiesta mode
  if (db) {
    try {
      const prefix = mode === 'fiesta' ? 'fiesta-%' : 'phys-%';
      const result = await db.prepare(
        "SELECT id, title, current_lat, current_lon, found_by, content_type FROM bottles WHERE id LIKE ? AND bottle_type = 'physical' AND is_test = 0 ORDER BY id"
      ).bind(prefix).all();
      bottles = result.results || [];
    } catch (e) {
      console.error('Arbooty bottles load error:', e);
    }
  }

  // Only load player data if authenticated
  if (!locals.user && mode === 'fiesta') {
    return { serverLocale: locals.locale || 'es', user: null, myPlayer: null, bottles };
  }

  if (locals.user) {
    try {
      myPlayer = await db.prepare('SELECT id, username, display_name, lat, lon FROM bq_players WHERE username = ? OR display_name = ?').bind(locals.user.username, locals.user.username).first();
    } catch (e) {
      console.error('Arbooty player load error:', e);
    }
  }

  return {
    serverLocale: locals.locale || 'es',
    user: locals.user || null,
    myPlayer,
    bottles
  };
}
