import { redirect } from '@sveltejs/kit';

export async function load({ locals, url }) {
  // Fetch all launched bottles (public)
  let bottles = [];
  try {
    const db = locals.db;
    const { results } = await db.prepare(`
      SELECT b.* FROM bottles b WHERE b.status IN ('launched', 'sailing', 'beached', 'found')
      ORDER BY b.created_at DESC
    `).all();
    bottles = results || [];

    // Attach positions for trails
    for (const bottle of bottles) {
      const pos = await db.prepare(`
        SELECT lat, lon, recorded_at FROM bottle_positions WHERE bottle_id = ? ORDER BY recorded_at ASC
      `).bind(bottle.id).all();
      bottle.positions = pos.results || [];
    }
  } catch (e) {
    console.error('Bottles page load error:', e);
  }

  return {
    user: locals.user || null,
    bottles
  };
}
