// src/routes/admin/+layout.server.js
import { redirect } from '@sveltejs/kit';
import { loadTranslations } from '$lib/translations';

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals }) {
    // Admin auth check
    if (!locals.user) {
        throw redirect(302, '/login');
    }

    // Load translations server-side
    const locale = 'en'; // or get from locals.user.locale
    await loadTranslations(locale);

    return {
        user: locals.user
    };
}
