// src/routes/api/auth/logout/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'DB unavailable' }, { status: 500 });

    // In a real app, you'd get token from request body or cookie
    // For now, we'll rely on cookie being cleared by client
    // and session validation in hooks.server.js

    const response = json({ success: true });
    response.headers.set(
        'Set-Cookie',
        'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict'
    );
    return response;
}
