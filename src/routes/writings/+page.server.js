import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    if (!locals.user) throw redirect(302, '/login?redirect=' + encodeURIComponent(url.pathname));
    return { user: locals.user };
}
