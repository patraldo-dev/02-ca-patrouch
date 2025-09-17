// src/routes/api/auth/login/+server.js
import { verifyPassword } from '$lib/server/password.js';
import { generateId } from '$lib/server/utils.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
    try {
        const { identifier, password } = await request.json();
        const db = locals.db;

        if (!identifier || !password) {
            return new Response(
                JSON.stringify({ error: 'Email/username and password required' }),
                { status: 400 }
            );
        }

        // Look up user
        const { results } = await db.prepare(`
            SELECT id, username, email, hashed_password, password_salt, email_verified_at
            FROM users
            WHERE email = ? OR username = ?
            LIMIT 1
        `).bind(identifier, identifier).all();

        if (results.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Invalid credentials' }),
                { status: 400 }
            );
        }

        const user = results[0];

        // Verify password
        const validPassword = await verifyPassword(password, user.hashed_password, user.password_salt);
        if (!validPassword) {
            return new Response(
                JSON.stringify({ error: 'Invalid credentials' }),
                { status: 400 }
            );
        }

        // Check email verified
        if (!user.email_verified_at) {
            return new Response(
                JSON.stringify({ error: 'Email not verified' }),
                { status: 400 }
            );
        }

        // Create session
        const sessionId = generateId(40);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await db.prepare(`
            INSERT INTO user_session (id, user_id, expires_at)
            VALUES (?, ?, ?)
        `).bind(
            sessionId,
            user.id,
            Math.floor(expiresAt.getTime() / 1000)
        ).run();

        // Set cookie
        const response = new Response(JSON.stringify({ success: true }), {
            status: 200
        });

        const cookie = [
            `session=${sessionId}`,
            'HttpOnly',
            'SameSite=Lax',
            `Expires=${expiresAt.toUTCString()}`,
            'Path=/'
        ];

        if (process.env.NODE_ENV === 'production') {
            cookie.push('Secure');
        }

        response.headers.set('Set-Cookie', cookie.join('; '));

        return response;

    } catch (error) {
        console.error('Login error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500 }
        );
    }
}
