// src/routes/confirm/+server.js
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, platform }) {
    const token = url.searchParams.get('token');
    if (!token) {
        // No token? Show error or redirect to signup
        throw redirect(302, '/signup?error=invalid_token');
    }

    const db = platform?.env?.DB_book;
    if (!db) {
        return new Response('Database unavailable', { status: 500 });
    }

    // Find user with this token
    const user = await db
        .prepare('SELECT id FROM users WHERE email_verification_token = ?')
        .bind(token)
        .first();

    if (!user) {
        // Token not found → already used or invalid
        throw redirect(302, '/confirmation-success?already=true');
    }

    // Mark as verified — use seconds for SQLite TIMESTAMP
    const now = Math.floor(Date.now() / 1000);
    await db
        .prepare('UPDATE users SET email_verified_at = ?, email_verification_token = NULL WHERE id = ?')
        .bind(now, user.id)
        .run();

    // Redirect to success page
    throw redirect(302, '/confirmation-success');
}
