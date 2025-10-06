// src/routes/admin/+page.server.js
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  // Ensure user is authenticated and is admin
  if (!locals.user || locals.user.role !== 'admin') {
    throw redirect(302, '/login');
  }

  return {
    user: locals.user
  };
}
