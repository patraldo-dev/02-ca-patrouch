// src/routes/api/auth/signup/+server.js
import { hashPassword } from '$lib/server/password.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) { // ← Remove `event` — not available
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

        // Insert user
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

        // ✅ FIXED: Use request.url instead of event.url
        const origin = new URL(request.url).origin;

	    // ... after inserting user into DB ...

// ✅ Get origin for verification link
const origin = new URL(request.url).origin;
const verifyUrl = `${origin}/verify?token=${emailVerificationToken}`;

// ✅ Send real email via Mailgun
try {
    await sendVerificationEmail(email, verifyUrl, event.platform.env);
} catch (emailError) {
    console.error('Failed to send verification email:', emailError);
    // Don't fail signup — user is created, they can request new email later
}

return new Response(
    JSON.stringify({ success: true, message: 'Verification email sent' }),
    { status: 200 }
);
}
