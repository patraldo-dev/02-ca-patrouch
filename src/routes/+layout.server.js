// src/routes/+layout.server.js
/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals, cookies }) {
    const serverLocale = cookies.get('preferredLanguage') || null;
    return {
        user: locals?.user || null,
        serverLocale
    };
}
