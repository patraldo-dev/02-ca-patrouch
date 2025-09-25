// src/routes/+layout.server.js
/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals }) {
    // Pass the user from locals to the layout
    return {
        user: locals?.user || null
    };
}
