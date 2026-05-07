import { requireRole } from '$lib/server/require-role.js';

export async function load({ locals, url }) {
    await requireRole(locals, ['admin'], url);
    return { user: locals.user };
}
