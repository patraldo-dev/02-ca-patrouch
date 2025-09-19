// src/routes/api/confirm/+server.js
import { redirect } from '@sveltejs/kit';
import { sendMailgunEmail, getWelcomeEmailContent } from '$lib/email.js';

export async function GET({ url, platform }) {
    try {
        const token = url.searchParams.get('token');
        if (!token) {
            return new Response('Invalid confirmation link', { status: 400 });
        }

        if (!platform?.env) {
            return new Response('Service temporarily unavailable', { status: 500 });
        }

        // Find subscriber
        const subscriber = await platform.env.DB_book
            .prepare(`
                SELECT id, email, type, token_expires_at, confirmed 
                FROM subscribers 
                WHERE confirmation_token = ?
            `)
            .bind(token)
            .first();

        if (!subscriber) {
            return new Response('Invalid or expired confirmation link', { status: 400 });
        }

        if (subscriber.confirmed) {
            throw redirect(302, '/confirmation-success?already=true');
        }

        // Check expiry
        const now = new Date();
        const expiresAt = new Date(subscriber.token_expires_at);
        if (now > expiresAt) {
            return new Response('Confirmation link has expired', { status: 400 });
        }
	     console.log('DB binding:', platform.env.DB_book ? 'PRESENT' : 'MISSING');

        // Confirm
        await platform.env.DB_book
            .prepare(`
                UPDATE subscribers 
                SET confirmed = 1, confirmed_at = ?, confirmation_token = NULL, token_expires_at = NULL
                WHERE id = ?
            `)
            .bind(new Date().toISOString(), subscriber.id)
            .run();

        // Send welcome email
        const emailContent = getWelcomeEmailContent(subscriber.type);
        await sendMailgunEmail({
            to: subscriber.email,
            ...emailContent
        }, platform.env);

        throw redirect(302, '/confirmation-success');

    } catch (error) {
        if (error.status === 302) {
            throw error;
        }
        console.error('Confirmation error:', error);
        return new Response('Failed to confirm subscription', { status: 500 });
    }
}
