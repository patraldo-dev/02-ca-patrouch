// src/routes/api/newsletter/subscribe/+server.js
import { json } from '@sveltejs/kit';

function generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function POST({ request, platform }) {
    try {
        const { email, type = 'daily-prompt' } = await request.json();

        if (!email) {
            return json({ error: 'Email is required' }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return json({ error: 'Invalid email format' }, { status: 400 });
        }

        if (!platform?.env?.DB_book) {
            return json({ error: 'Database not available' }, { status: 500 });
        }

        const db = platform.env.DB_book;

        // Check if already subscribed
        const existing = await db.prepare(
            'SELECT id, confirmed FROM subscribers WHERE email = ? AND type = ?'
        ).bind(email, type).first();

        if (existing) {
            if (existing.confirmed) {
                return json({ error: 'Already subscribed' }, { status: 400 });
            } else {
                // Resend confirmation
                const token = generateToken();
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                await db.prepare(
                    'UPDATE subscribers SET confirmation_token = ?, token_expires_at = ? WHERE id = ?'
                ).bind(token, expiresAt, existing.id).run();
                return json({
                    success: true,
                    message: 'Confirmation resent. Check your email.',
                    requiresConfirmation: true
                });
            }
        }

        const token = generateToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        await db.prepare(
            'INSERT INTO subscribers (email, type, confirmation_token, token_expires_at, confirmed, created_at) VALUES (?, ?, ?, ?, 0, ?)'
        ).bind(email, type, token, expiresAt, new Date().toISOString()).run();

        return json({
            success: true,
            message: 'Subscription initiated. Check your email to confirm.',
            requiresConfirmation: true
        });
    } catch (error) {
        console.error('Subscription error:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
}
