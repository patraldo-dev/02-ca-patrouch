// src/routes/+layout.server.js
import { parse } from 'cookie';

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ request }) {
    // Get cookies from the request
    const cookieHeader = request.headers.get('cookie');
    const cookies = cookieHeader ? parse(cookieHeader) : {};
    const sessionCookie = cookies.session;
    
    let user = null;
    
    // If session cookie exists, validate it and get user data
    if (sessionCookie) {
        try {
            // Here you should validate the session and fetch the user
            // This is where your session validation logic should go
            // For example:
            // user = await validateSessionAndGetUser(sessionCookie);
            
            // For now, we'll just return a placeholder
            // Replace this with your actual session validation logic
            user = {
                id: 'placeholder-id',
                username: 'Guest'
            };
        } catch (error) {
            console.error('Session validation failed:', error);
        }
    }
    
    return {
        user: locals.user
    };
}
