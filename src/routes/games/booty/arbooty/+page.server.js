export async function load({ locals, platform }) {
  const db = platform?.env?.DB_book;
  let myPlayer = null;

  if (locals.user) {
    try {
      myPlayer = await db.prepare('SELECT id FROM bq_players WHERE username = ? OR display_name = ?').bind(locals.user.username, locals.user.username).first();
    } catch (e) {
      console.error('Arbooty player load error:', e);
    }
  }

  return {
    serverLocale: locals.locale || 'es',
    user: locals.user || null,
    myPlayer
  };
}
