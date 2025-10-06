// src/routes/admin/users/+page.server.js
import { loadTranslations } from '$lib/translations';

export async function load({ locals }) {
  await loadTranslations('en'); // ← Add this line
  
  const { results } = await locals.db.prepare(`
    SELECT id, username, email, role
    FROM users
    ORDER BY created_at DESC
  `).all();

  return { users: results };
}
