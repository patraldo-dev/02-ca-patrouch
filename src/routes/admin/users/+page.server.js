// src/routes/admin/users/+page.server.js
export async function load({ locals }) {
  const { results } = await locals.db.prepare(`
    SELECT id, username, email, role
    FROM users
    ORDER BY created_at DESC
  `).all();
  
  return { users: results };
}
