// src/routes/api/subscribe/+server.js
import { json } from '@sveltejs/kit';
import { sendMailgunEmail, getConfirmationEmailContent } from '$lib/email.js';

export async function POST({ request, platform, url }) {
    try {
        if (!platform?.env) {
            return json({ 
                success: false, 
                message: 'Service temporarily unavailable' 
            }, { status: 500 });
        }

        const { email, type = 'newsletter' } = await request.json();

        // Validation
        if (!email) {
            return json({
                success: false,
                message: 'Email is required'
            }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return json({
                success: false,
                message: 'Invalid email format'
            }, { status: 400 });
        }

        if (!['newsletter', 'book-updates'].includes(type)) {
            return json({
                success: false,
                message: 'Invalid subscription type'
            }, { status: 400 });
        }

        // Check if already confirmed
        const existingSubscriber = await platform.env.DB_book
            .prepare('SELECT id, confirmed FROM subscribers WHERE email = ? AND type = ?')
            .bind(email, type)
            .first();

        if (existingSubscriber?.confirmed) {
            return json({
                success: false,
                message: `Email already subscribed to ${type}`
            }, { status: 409 });
        }

        // Generate token
        const tokenArray = new Uint8Array(32);
        crypto.getRandomValues(tokenArray);
        const confirmationToken = Array.from(tokenArray, byte => byte.toString(16).padStart(2, '0')).join('');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Insert or update
        if (existingSubscriber) {
            await platform.env.DB_book
                .prepare('UPDATE subscribers SET confirmation_token = ?, token_expires_at = ? WHERE id = ?')
                .bind(confirmationToken, expiresAt.toISOString(), existingSubscriber.id)
                .run();
        } else {
            await platform.env.DB_book
                .prepare(`
                    INSERT INTO subscribers (email, type, confirmation_token, token_expires_at, confirmed, created_at) 
                    VALUES (?, ?, ?, ?, 0, ?)
                `)
                .bind(email, type, confirmationToken, expiresAt.toISOString(), new Date().toISOString())
                .run();
        }

        // Create confirmation URL
        const confirmationUrl = `${url.origin}/api/confirm?token=${confirmationToken}`;

        // Send confirmation email
        const emailContent = getConfirmationEmailContent(type, confirmationUrl);
        const emailSent = await sendMailgunEmail({
            to: email,
            ...emailContent
        }, platform.env);

        if (!emailSent) {
            console.error('Failed to send confirmation email to:', email);
            return json({
                success: false,
                message: 'Failed to send confirmation email'
            }, { status: 500 });
        }

        return json({
            success: true,
            message: 'Please check your email to confirm your subscription!'
        });

    } catch (error) {
        console.error('Subscription error:', error);
        return json({
            success: false,
            message: 'Failed to process subscription'
        }, { status: 500 });
    }
}
