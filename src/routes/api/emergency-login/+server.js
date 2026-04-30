// TEMPORARY: Direct session creation for admin lockout recovery
// DELETE AFTER USE
import { json } from '@sveltejs/kit';

export async function POST({ request, platform, cookies }) {
    const { email, emergencyKey } = await request.json();
    
    // Simple emergency key check (not stored in code long-term)
    if (emergencyKey !== 'patrouch-2026-unlock') {
        return json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = platform?.env?.DB_book;
    const { results } = await db.prepare(
        'SELECT id, name, email FROM "user" WHERE email = ?'
    ).bind(email).all();
    
    const user = results?.[0];
    if (!user) return json({ error: 'User not found' }, { status: 404 });

    // Create session using Better Auth's internal method
    const { createAuth } = await import('$lib/auth.js');
    const auth = createAuth(platform.env);
    
    const session = await auth.api.signInEmail({
        body: { email, password: '' }
    });
    
    // If BA doesn't work, create session manually
    const sessionId = crypto.randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    await db.prepare(
        'INSERT INTO session (id, userId, expiresAt, token, ip) VALUES (?, ?, ?, ?, ?)'
    ).bind(sessionId, user.id, expires, crypto.randomUUID(), '127.0.0.1').run();

    cookies.set('better-auth.session_token', sessionId, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60
    });

    return json({ success: true });
}
