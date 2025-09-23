// src/routes/api/auth/reset-password/+server.js
import { json } from '@sveltejs/kit';
import { hashPassword } from '$lib/auth-helpers.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) {
        return json({ error: 'DB unavailable' }, { status: 500 });
    }

    const { token, password } = await request.json();
    if (!token || !password) {
        return json({ error: 'Token and password required' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);

    // Find user with valid token
    const user = await db
        .prepare('SELECT id FROM users WHERE email_verification_token = ? AND email_verified_at > ?')
        .bind(token, now)
        .first();

    if (!user) {
        return json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password and clear token
    await db
        .prepare('UPDATE users SET hashed_password = ?, email_verification_token = NULL, email_verified_at = NULL WHERE id = ?')
        .bind(passwordHash, user.id)
        .run();

    return json({ success: true });
}
