export async function load({ locals, platform }) {
  const db = platform?.env?.DB_book;
  let myPlayer = null;
  let bottles = [];

  if (locals.user) {
    try {
      myPlayer = await db.prepare('SELECT id, username, display_name, lat, lon FROM bq_players WHERE username = ? OR display_name = ?').bind(locals.user.username, locals.user.username).first();
    } catch (e) {
      console.error('Arbooty player load error:', e);
    }
  }

  // Load physical bottles for AR markers
  if (db) {
    try {
      const result = await db.prepare(
        "SELECT id, title, current_lat, current_lon, found_by FROM bottles WHERE id LIKE 'phys-%' ORDER BY id"
      ).all();
      bottles = result.results || [];
    } catch (e) {
      console.error('Arbooty bottles load error:', e);
    }
  }

  return {
    serverLocale: locals.locale || 'es',
    user: locals.user || null,
    myPlayer,
    bottles
  };
}
