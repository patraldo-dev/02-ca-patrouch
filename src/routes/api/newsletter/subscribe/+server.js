// src/routes/api/newsletter/subscribe/+server.js
import { json, error } from '@sveltejs/kit';

// Function to generate a random token
function generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform }) {
    try {
        const { email } = await request.json();
        
        if (!email) {
            return json({ error: 'Email is required' }, { status: 400 });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return json({ error: 'Invalid email format' }, { status: 400 });
        }
        
        if (!platform?.env?.DB) {
            return json({ error: 'Database not available' }, { status: 500 });
        }
        
        const db = platform.env.DB;
        
        // Check if email already exists in the 'subscribers' table
        const existing = await db.prepare(`
            SELECT id, confirmed FROM subscribers WHERE email = ?
        `).bind(email).first();
        
        if (existing) {
            if (existing.confirmed) {
                return json({ error: 'Email already subscribed and confirmed' }, { status: 400 });
            } else {
                return json({ error: 'Email already subscribed but not confirmed. Please check your email.' }, { status: 400 });
            }
        }
        
        // Generate a confirmation token
        const token = generateToken();
        
        // Set expiration time (24 hours from now)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        // Add new subscriber with confirmation token to the 'subscribers' table
        await db.prepare(`
            INSERT INTO subscribers (email, confirmation_token, expires_at, created_at)
            VALUES (?, ?, ?, ?)
        `).bind(email, token, expiresAt, new Date().toISOString()).run();
        
        // Here you would typically send an email with the confirmation link
        // The confirmation link should be: https://yourdomain.com/confirm?token={token}
        
        return json({ 
            success: true, 
            message: 'Subscription initiated. Please check your email to confirm.',
            // For testing purposes, include the confirmation URL
            confirmationUrl: `/confirm?token=${token}`
        });
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
}
