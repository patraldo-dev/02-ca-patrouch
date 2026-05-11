export async function load({ locals }) {
  const { results } = await locals.db.prepare(`
    SELECT id, name, description, lat, lng, category, image_url, link_url, sort_order, active, created_at, updated_at
    FROM tour_landmarks
    ORDER BY sort_order ASC, name ASC
  `).all();

  return { landmarks: results || [] };
}
