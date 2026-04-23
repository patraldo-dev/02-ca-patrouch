// src/routes/admin/+layout.server.js
import { redirect, error } from '@sveltejs/kit'; // ✅ Import error

export async function load({ locals }) {
    if (!locals.user) {
        throw redirect(302, '/login');
    }
    
    if (locals.user.role !== 'admin') {
        throw error(403, 'Admin access required');
    }

    return { user: locals.user };
}
