// src/routes/api/auth/signup/+server.js
import { json } from '@sveltejs/kit';
import { hashPassword } from '$lib/auth-helpers.js';
import { generateSessionToken } from '$lib/utils.js';
import { sendMailgunEmail, getConfirmationEmailContent } from '$lib/email.js';

export async function POST({ request, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'DB unavailable' }, { status: 500 });

    const { username, email, password } = await request.json();
    if (!username || !email || !password) {
        return json({ error: 'All fields required' }, { status: 400 });
    }

    // Check if user exists
    const existing = await db
        .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
        .bind(username, email)
        .first();
    if (existing) {
        return json({ error: 'Username or email already taken' }, { status: 409 });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    const newUser = await db
        .prepare('INSERT INTO users (id, username, email, hashed_password, role) VALUES (?, ?, ?, ?, ?) RETURNING id, username, email')
        .bind(userId, username, email, passwordHash, 'user')
        .first();

    if (!newUser) {
        return json({ error: 'Signup failed' }, { status: 500 });
    }

    // Generate verification token
    const emailVerificationToken = crypto.randomUUID();
    await db
        .prepare('UPDATE users SET email_verification_token = ? WHERE id = ?')
        .bind(emailVerificationToken, newUser.id)
        .run();

    // Send verification email
    try {
        const confirmUrl = `https://patrouch.ca/confirm?token=${encodeURIComponent(emailVerificationToken)}`;
        const emailContent = getConfirmationEmailContent('account', confirmUrl);
        await sendMailgunEmail({
            to: email,
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html
        }, {
            MAILGUN_API_KEY: platform.env.MAILGUN_API_KEY,
            MAILGUN_DOMAIN: platform.env.MAILGUN_DOMAIN
        });
    } catch (err) {
        console.error('Failed to send verification email:', err);
    }

    return json({ success: true });
}
