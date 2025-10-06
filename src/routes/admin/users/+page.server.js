// src/routes/admin/users/+page.server.js
import { loadTranslations } from '$lib/translations';

export async function load({ locals }) {
  // Load translations (same as admin layout)
  await loadTranslations('en'); // or detect locale
  
  const { results } = await locals.db.prepare(`
    SELECT id, username, email, role
    FROM users
    ORDER BY created_at DESC
  `).all();

  return { users: results };
}
