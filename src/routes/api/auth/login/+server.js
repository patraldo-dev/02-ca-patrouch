// src/routes/api/auth/login/+server.js
import { json } from '@sveltejs/kit';
import { verifyPassword } from '$lib/auth-helpers.js';
import { generateSessionToken } from '$lib/utils.js';

export async function POST({ request, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'DB unavailable' }, { status: 500 });
    
    const { identifier, password } = await request.json();
    
    if (!identifier || !password) {
        return json({ error: 'Identifier and password required' }, { status: 400 });
    }
    
    // Find user by email OR username
    const user = await db
        .prepare(`SELECT id, username, email, hashed_password FROM users WHERE email = ? OR username = ? LIMIT 1`)
        .bind(identifier, identifier)
        .first();
    
    if (!user || !await verifyPassword(password, user.hashed_password)) {
        return json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    // Create session
    const sessionId = generateSessionToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    
    await db
        .prepare('INSERT INTO user_session (id, user_id, expires_at) VALUES (?, ?, ?)')
        .bind(sessionId, user.id, expiresAt)
        .run();
    
    // Set HttpOnly cookie
    const response = json({ 
        success: true, 
        user: { id: user.id, username: user.username, email: user.email } 
    });
    
    response.headers.set(
        'Set-Cookie',
        `session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
    );
    
    return response;
}
