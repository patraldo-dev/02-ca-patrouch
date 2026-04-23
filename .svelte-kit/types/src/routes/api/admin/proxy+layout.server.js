// @ts-nocheck
// src/routes/admin/+layout.server.js
/** @param {Parameters<import('./$types').LayoutServerLoad>[0]} event */
export async function load({ locals }) {
    // Only allow admin access if user is logged in (you can add role-based auth later)
    if (!locals.user) {
        throw redirect(302, '/login');
    }
    return {};
}
