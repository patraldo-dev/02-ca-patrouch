// src/routes/api/confirm/+server.js
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
    try {
        const token = url.searchParams.get('token');
        if (!token) {
            return new Response('Invalid confirmation link', { status: 400 });
        }

        const db = locals.db;

        // Find subscriber
        const subscriber = await db.prepare(`
            SELECT id, email, type, token_expires_at, confirmed
            FROM subscribers
            WHERE confirmation_token = ?
        `).bind(token).first();

        if (!subscriber) {
            return new Response('Invalid or expired confirmation link', { status: 400 });
        }

        if (subscriber.confirmed) {
            throw redirect(302, '/confirmation-success?already=true');
        }

        // Check expiry
        const now = Math.floor(Date.now() / 1000);
        if (now > subscriber.token_expires_at) {
            return new Response('Confirmation link has expired', { status: 400 });
        }

        // Confirm
        await db.prepare(`
            UPDATE subscribers
            SET confirmed = 1, confirmed_at = strftime('%s', 'now'), confirmation_token = NULL, token_expires_at = NULL
            WHERE id = ?
        `).bind(subscriber.id).run();

        // Send welcome email (replace with real Mailgun later)
        console.log(`
🎉 WELCOME — Send welcome email to ${subscriber.email} for ${subscriber.type}
        `);

        throw redirect(302, '/confirmation-success');

    } catch (error) {
        if (error instanceof redirect) throw error;
        console.error('Confirmation error:', error);
        return new Response('Failed to confirm subscription', { status: 500 });
    }
}
