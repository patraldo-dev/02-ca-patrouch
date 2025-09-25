// src/routes/(auth-pages)/login/+page.server.js
import { redirect } from '@sveltejs/kit';
import { parse } from 'cookie';

/** @type {import('./$types').PageServerLoad} */
export async function load({ request, cookies, url }) {
    // Get session cookie
    const sessionCookie = cookies.get('session');
    
    // If user is already logged in, redirect to home page
    if (sessionCookie) {
        try {
            // Validate the session and get user data
            // Replace this with your actual session validation logic
            const user = await validateSessionAndGetUser(sessionCookie);
            
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
    
    // Check for any redirect parameters (e.g., redirected from a protected page)
    const redirectTo = url.searchParams.get('redirect') || '/';
    
    // Check for error messages (e.g., from a failed login attempt)
    const errorMessage = url.searchParams.get('error') || null;
    
    // Return data needed for the login page
    return {
        redirectTo,
        errorMessage,
        // You can add any other data needed for the login page
        // For example, if you want to show a specific message based on the redirect
        message: errorMessage 
            ? 'Login failed. Please check your credentials and try again.' 
            : 'Please log in to access your account.'
    };
}

// This is a placeholder function - replace with your actual session validation logic
async function validateSessionAndGetUser(sessionCookie) {
    // Here you would:
    // 1. Validate the session token against your database
    //
