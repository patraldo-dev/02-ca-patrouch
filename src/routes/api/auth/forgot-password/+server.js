// src/routes/api/auth/forgot-password/+server.js
import { json } from '@sveltejs/kit';
import { sendMailgunEmail, getConfirmationEmailContent } from '$lib/email.js';
import { generateSessionToken } from '$lib/utils.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) {
        return json({ error: 'DB unavailable' }, { status: 500 });
    }

    const { email } = await request.json();
    if (!email) {
        return json({ error: 'Email required' }, { status: 400 });
    }

    // Find user
    const user = await db
        .prepare('SELECT id, username FROM users WHERE email = ?')
        .bind(email)
        .first();

    if (!user) {
        // Don't reveal if email exists — prevent enumeration
        return json({ success: true }); // Still return success
    }

    // Generate reset token (reuse session token generator)
    const resetToken = generateSessionToken();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    // Store in DB
    await db
        .prepare('UPDATE users SET email_verification_token = ?, email_verified_at = ? WHERE id = ?')
        .bind(resetToken, expiresAt, user.id)
        .run();

    // Send email
    const resetUrl = `https://patrouch.ca/reset-password?token=${encodeURIComponent(resetToken)}`;
    const emailContent = getConfirmationEmailContent('password reset', resetUrl);

    try {
        await sendMailgunEmail({
            to: email,
            subject: 'Reset Your Password',
            text: `Click to reset: ${resetUrl}`,
            html: `
                <h2>Reset Your Password</h2>
                <p>Click the button below to reset your password:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>Or copy and paste this link: <br><code>${resetUrl}</code></p>
                <p>This link expires in 1 hour.</p>
            `
        }, {
            MAILGUN_API_KEY: import.meta.env.MAILGUN_API_KEY,
            MAILGUN_DOMAIN: import.meta.env.MAILGUN_DOMAIN
        });
    } catch (err) {
        console.error('Failed to send reset email:', err);
        // Still return success — don’t reveal internal errors
    }

    return json({ success: true });
}
