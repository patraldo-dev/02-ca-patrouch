// src/routes/(auth-pages)/+layout.server.js

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals, url }) {
    // If user is already logged in, redirect them away from auth pages
    if (locals.user) {
        // Redirect to dashboard, profile, or wherever makes sense
        const redirectUrl = '/dashboard'; // or '/profile', '/admin', etc.
        
        // Return redirect instruction
        return {
            status: 302,
            headers: {
                location: redirectUrl
            }
        };
    }

    // Otherwise, proceed normally
    return {};
}
