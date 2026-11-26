// /oulipo — the language the visitor is reading in, for the link to the
// duel, which has a site of its own now.
/** @type {import('./$types').PageServerLoad} */
export function load({ locals }) {
    return { locale: locals.locale || 'es' };
}
