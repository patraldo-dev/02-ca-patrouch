// src/routes/api/auth/signup/+server.js
import { hashPassword } from '$lib/server/password.js';
import { generateId } from '$lib/server/utils.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals, event }) {
    try {
        const { email, username, password } = await request.json();
        const db = locals.db;

        // Validate
        if (!email || !username || !password) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return new Response(
                JSON.stringify({ error: 'Password must be at least 6 characters' }),
                { status: 400 }
            );
        }

        // Check duplicates
        const emailCheck = await db.prepare(`
            SELECT id FROM users WHERE email = ?
        `).bind(email).all();

        if (emailCheck.results.length > 0) {
            return new Response(
                JSON.stringify({ error: 'Email already in use' }),
                { status: 400 }
            );
        }

        const usernameCheck = await db.prepare(`
            SELECT id FROM users WHERE username = ?
        `).bind(username).all();

        if (usernameCheck.results.length > 0) {
            return new Response(
                JSON.stringify({ error: 'Username already taken' }),
                { status: 400 }
            );
        }

        // Hash password
        const { hash, salt } = await hashPassword(password);

        // Generate IDs
        const userId = crypto.randomUUID();
        const emailVerificationToken = crypto.randomUUID();

        // Insert user (store hash + salt)
        const result = await db.prepare(`
            INSERT INTO users (
                id, email, username, hashed_password, password_salt, email_verification_token
            ) VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            userId,
            email,
            username,
            hash,
            salt,
            emailVerificationToken
        ).run();

        if (!result.success) {
            throw new Error('Failed to create user');
        }

	            const origin = event.url.origin; // ← Use this

        console.log(`
📧 SIMULATED EMAIL — Copy this link to verify:

const origin = event.url.origin;

console.log(`
📧 SIMULATED EMAIL — Copy this link to verify:
${origin}/verify?token=${emailVerificationToken}
`);

        return new Response(
            JSON.stringify({ success: true }),
            { status: 200 }
        );

    } catch (error) {
        console.error('Signup error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500 }
        );
    }
}
