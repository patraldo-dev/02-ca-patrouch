// src/routes/api/auth/signup/+server.js
import { Argon2id } from "oslo/password";

// Optional: if you want custom-length IDs (like Lucia's 15-char)
function generateId(length = 15) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, length);
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
    try {
        const { email, username, password } = await request.json();
        const db = locals.db;

        // Validate input
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

        // Check for duplicate email
        const emailCheck = await db.prepare(`
            SELECT id FROM users WHERE email = ?
        `).bind(email).all();

        if (emailCheck.results.length > 0) {
            return new Response(
                JSON.stringify({ error: 'Email already in use' }),
                { status: 400 }
            );
        }

        // Check for duplicate username
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
        const hashedPassword = await new Argon2id().hash(password);

        // Generate IDs (using crypto.randomUUID)
        const userId = crypto.randomUUID(); // or generateId(15)
        const emailVerificationToken = crypto.randomUUID(); // or generateId(32)

        // Insert user
        const result = await db.prepare(`
            INSERT INTO users (
                id, email, username, hashed_password, email_verification_token
            ) VALUES (?, ?, ?, ?, ?)
        `).bind(
            userId,
            email,
            username,
            hashedPassword,
            emailVerificationToken
        ).run();

        if (!result.success) {
            throw new Error('Failed to create user');
        }

        // 📧 SIMULATE email
        console.log(`
📧 SIMULATED EMAIL — Copy this link to verify:
http://localhost:5173/verify?token=${emailVerificationToken}
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
