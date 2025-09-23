// src/lib/rpc/AuthService.js
import { RpcTarget } from 'capnweb';
import { AuthenticatedSession } from './AuthenticatedSession.js';
import { generateSessionToken } from '$lib/utils.js';
import { hashPassword, verifyPassword } from '$lib/auth-helpers.js';
import { sendMailgunEmail, getConfirmationEmailContent } from '$lib/email.js';

/**
 * Main authentication service exposed via RPC.
 * Handles login, signup, logout, and profile fetching.
 * Follows object-capability security model.
 */
export class AuthService extends RpcTarget {
    /**
     * @param {import('@cloudflare/workers-types').D1Database} db - Your D1 database instance (DB_book)
     * @param {object} env - Environment variables and secrets (from Worker entry point)
     */
    constructor(db, env) {
        super();
        if (!db) {
            throw new Error('DB_book is required');
        }
        if (!env) {
            throw new Error('env is required (for Mailgun secrets)');
        }
        this.db = db;
        this.env = env;
    }

    /**
     * Authenticate user by email OR username
     * @param {string} identifier - Email or username
     * @param {string} password
     * @returns {Promise<{ session: AuthenticatedSession, setCookie: Object }>}
     */
    async login(identifier, password) {
        // 1. Find user by email OR username
        const user = await this.db
            .prepare(`
                SELECT id, username, email, hashed_password 
                FROM users 
                WHERE email = ? OR username = ?
                LIMIT 1
            `)
            .bind(identifier, identifier)
            .first();

        if (!user) {
            throw new Error("Invalid credentials");
        }

        // 2. Verify password
        const valid = await verifyPassword(password, user.hashed_password);
        if (!valid) {
            throw new Error("Invalid credentials");
        }

        // 3. Create session in DB — using user_session table
        const sessionId = generateSessionToken();
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

        await this.db
            .prepare('INSERT INTO user_session (id, user_id, expires_at) VALUES (?, ?, ?)')
            .bind(sessionId, user.id, expiresAt)
            .run();

        // 4. Create live RPC session object
        const sessionObj = new AuthenticatedSession(
            this.db,
            { id: sessionId, userId: user.id, expiresAt },
            { id: user.id, username: user.username, email: user.email }
        );

        // 5. Return session + instructions for client to set cookie
        return {
            session: sessionObj,
            setCookie: {
                name: 'session',
                value: sessionId,
                attributes: {
                    path: '/',
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60
                }
            }
        };
    }

    /**
     * Create new user and log them in
     * @param {string} username
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{ session: AuthenticatedSession, setCookie: Object }>}
     */
    async signup(username, email, password) {
        // Basic validation
        if (!username || !email || !password) {
            throw new Error("All fields required");
        }

        // Check if user exists
        const existing = await this.db
            .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
            .bind(username, email)
            .first();

        if (existing) {
            throw new Error("Username or email already taken");
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Generate UUID in JavaScript for id
        const userId = crypto.randomUUID();

        // Create user — using hashed_password and role
        const newUser = await this.db
            .prepare('INSERT INTO users (id, username, email, hashed_password, role) VALUES (?, ?, ?, ?, ?) RETURNING id, username, email')
            .bind(userId, username, email, passwordHash, 'user') // ← Set default role
            .first();

        if (!newUser) {
            throw new Error("Signup failed");
        }

        // Generate email verification token
        const emailVerificationToken = crypto.randomUUID();

        // Update user with token
        await this.db
            .prepare('UPDATE users SET email_verification_token = ? WHERE id = ?')
            .bind(emailVerificationToken, newUser.id)
            .run();

        // Build confirmation URL
        const confirmUrl = `https://patrouch.ca/confirm?token=${encodeURIComponent(emailVerificationToken)}`;

        // Get email content
        const emailContent = getConfirmationEmailContent('account', confirmUrl);

        // Send email — using secrets from this.env
        try {

console.log('🔑 MAILGUN_API_KEY:', this.env.MAILGUN_API_KEY); // ← ADD THIS
    console.log('🌐 MAILGUN_DOMAIN:', this.env.MAILGUN_DOMAIN);

    if (!this.env.MAILGUN_API_KEY) {
        throw new Error('Mailgun API key missing');
    }
            await sendMailgunEmail({
                to: email,
                subject: emailContent.subject,
                text: emailContent.text,
                html: emailContent.html
            }, {
                MAILGUN_API_KEY: this.env.MAILGUN_API_KEY,  // ← Secret from Worker env
                MAILGUN_DOMAIN: this.env.MAILGUN_DOMAIN     // ← Env var from wrangler.jsonc
            });
            console.log('✅ Verification email sent to', email);
        } catch (err) {
            console.error('❌ Failed to send verification email:', err.message);
            // Don't fail signup — just log it
        }

        // Create session — using user_session table
        const sessionId = generateSessionToken();
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

        await this.db
            .prepare('INSERT INTO user_session (id, user_id, expires_at) VALUES (?, ?, ?)')
            .bind(sessionId, newUser.id, expiresAt)
            .run();

        // Create RPC session object
        const sessionObj = new AuthenticatedSession(
            this.db,
            { id: sessionId, userId: newUser.id, expiresAt },
            { id: newUser.id, username: newUser.username, email: newUser.email }
        );

        return {
            session: sessionObj,
            setCookie: {
                name: 'session',
                value: sessionId,
                attributes: {
                    path: '/',
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60
                }
            }
        };
    }

    /**
     * Log out by invalidating session via token
     * @param {string} sessionToken - The session ID/token from cookie
     * @returns {Promise<boolean>} True if logout succeeded
     */
    async logout(sessionToken) {
        if (!sessionToken || typeof sessionToken !== 'string') {
            throw new Error("Invalid session token");
        }

        // Delete session from user_session table
        await this.db
            .prepare('DELETE FROM user_session WHERE id = ?')
            .bind(sessionToken)
            .run();

        return true;
    }

    /**
     * Get user profile by session token (for protected pages)
     * @param {string} sessionToken - Session ID from cookie
     * @returns {Promise<Object>} User profile (id, username, email)
     */
    async getProfileByToken(sessionToken) {
        if (!sessionToken) {
            throw new Error("Session token required");
        }

        const now = Date.now();

        // Validate session exists and is not expired — from user_session table
        const session = await this.db
            .prepare('SELECT user_id, expires_at FROM user_session WHERE id = ? AND expires_at > ?')
            .bind(sessionToken, now)
            .first();

        if (!session) {
            throw new Error("Session expired or invalid");
        }

        // Get user
        const user = await this.db
            .prepare('SELECT id, username, email FROM users WHERE id = ?')
            .bind(session.user_id)
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        return {
            id: user.id,
            username: user.username,
            email: user.email
        };
    }
}
