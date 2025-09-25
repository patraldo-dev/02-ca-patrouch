// src/routes/(auth-pages)/login/+page.server.js
import { redirect } from '@sveltejs/kit';

// Session constants (in milliseconds)
const SESSION_EXPIRES_IN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Validates a session and returns the user if valid
 */
async function validateSessionAndGetUser(db, sessionId) {
    const now = Date.now(); // milliseconds
    const { results } = await db.prepare(`
        SELECT s.id, s.user_id, s.expires_at, u.id, u.username, u.email, u.email_verified_at
        FROM user_session s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND s.expires_at > ?
    `).bind(sessionId, now).all();
    
    if (results.length === 0) {
        return null;
    }
    
    const row = results[0];
    const user = {
        id: row.id,
        username: row.username,
        email: row.email,
        email_verified: row.email_verified_at !== null
    };
    
    return user;
}

/**
 * Invalidates a session
 */
async function invalidateSession(db, sessionId) {
    await db.prepare(`
        DELETE FROM user_session
        WHERE id = ?
    `).bind(sessionId).run();
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ request, cookies, url, platform }) {
    // Get session cookie
    const sessionId = cookies.get('session');
    
    // If user is already logged in, redirect to home page
    if (sessionId) {
        try {
            // Access the database
            if (!platform?.env?.DB_book) {
                throw new Error('Database not available');
            }
            
            const db = platform.env.DB_book;
            
            // Validate session and get user
            const user = await validateSessionAndGetUser(db, sessionId);
            
            if (user) {
                // User is already logged in, redirect to home
                throw redirect(302, '/');
            }
        } catch (error) {
            // If it's a redirect error, rethrow it
            if (error.status === 302) {
                throw error;
            }
            
            // Otherwise, it's a validation error, so continue to login page
            console.error('Session validation failed:', error);
        }
    }
    
    // Get redirect parameter (where to go after login)
    const redirectTo = url.searchParams.get('redirect') || '/';
    
    // Get error message from query string (if any)
    const errorMessage = url.searchParams.get('error') || null;
    
    // Return data needed for the login page
    return {
        redirectTo,
        errorMessage,
        message: errorMessage 
            ? 'Login failed. Please check your credentials and try again.' 
            : 'Please log in to access your account.'
    };
}
