// src/routes/admin/+layout.server.js
/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals }) {
    // Only allow admin access if user is logged in
    if (!locals.user) {
        throw redirect(302, '/login');
    }
    return {};
}
