// src/routes/admin/+layout.server.js
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    if (!locals.user) {
        throw redirect(302, '/login');
    }
    
    if (locals.user.role !== 'admin') {
        throw redirect(302, '/'); // or show a 403 page
    }

if (locals.user.role !== 'user') {
  throw error(403, 'Admin access required');
}

    return { user: locals.user };
}
