// src/routes/api/subscribe/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
    try {
        const { email, type = 'book-updates' } = await request.json();
        const db = locals.db;

        // Validate
        if (!email) {
            return json({ success: false, message: 'Email is required' }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return json({ success: false, message: 'Invalid email format' }, { status: 400 });
        }

        if (!['book-updates', 'newsletter'].includes(type)) {
            return json({ success: false, message: 'Invalid subscription type' }, { status: 400 });
        }

        // Check if already confirmed
        const existing = await db.prepare(`
            SELECT id, confirmed FROM subscribers WHERE email = ? AND type = ?
        `).bind(email, type).first();

        if (existing?.confirmed) {
            return json({
                success: false,
                message: `Email already subscribed to ${type}`
            }, { status: 409 });
        }

        // Generate token
        const tokenArray = new Uint8Array(32);
        crypto.getRandomValues(tokenArray);
        const confirmationToken = Array.from(tokenArray, byte => byte.toString(16).padStart(2, '0')).join('');
        const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours

        // Insert or update
        if (existing) {
            await db.prepare(`
                UPDATE subscribers 
                SET confirmation_token = ?, token_expires_at = ?
                WHERE id = ?
            `).bind(confirmationToken, expiresAt, existing.id).run();
        } else {
            const id = crypto.randomUUID();
            await db.prepare(`
                INSERT INTO subscribers (
                    id, email, type, confirmation_token, token_expires_at, confirmed, created_at
                ) VALUES (?, ?, ?, ?, ?, 0, strftime('%s', 'now'))
            `).bind(id, email, type, confirmationToken, expiresAt).run();
        }

        // Get origin
        const origin = new URL(request.url).origin;
        const confirmUrl = `${origin}/confirm?token=${confirmationToken}`;

        // Send email (replace with real Mailgun later)
        console.log(`
📧 SUBSCRIBE — Send confirmation email to ${email}:
${confirmUrl}
        `);

        return json({
            success: true,
            message: 'Please check your email to confirm your subscription!'
        });

    } catch (error) {
        console.error('Subscribe error:', error);
        return json({
            success: false,
            message: 'Failed to process subscription'
        }, { status: 500 });
    }
}
