import { requireRole } from '$lib/server/require-role.js';

export async function load({ locals, url }) {
    await requireRole(locals, ['member', 'admin'], url);
    return { user: locals.user, serverLocale: locals.locale || 'es' };
}
