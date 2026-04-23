// src/routes/admin/+layout.server.js
/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals }) {
    // Only allow admin access if user is logged in (you can add role-based auth later)
    if (!locals.user) {
        throw redirect(302, '/login');
    }
    return {};
}
