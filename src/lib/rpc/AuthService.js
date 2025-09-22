// src/lib/rpc/AuthService.js
import { RpcTarget } from 'capnweb';
import { AuthenticatedSession } from './AuthenticatedSession.js';
import { generateSessionToken } from '$lib/utils.js'; // You'll create this next
import { hashPassword, verifyPassword } from '$lib/auth-helpers.js'; // You'll create this next

/**
 * Main authentication service exposed via RPC.
 * Handles login, signup, and returns AuthenticatedSession capabilities.
 */
export class AuthService extends RpcTarget {
    /**
     * @param {import('@cloudflare/workers-types').D1Database} db - Your D1 database instance (DB_book)
     */
    constructor(db) {
        super();
        this.db = db;
    }

    /**
     * Authenticate user and return session capability + cookie instructions
     * @param {string} username
     * @param {string} password
     * @returns {Promise<{ session: AuthenticatedSession, setCookie: Object }>}
     */
    async login(username, password) {
        // 1. Find user by username
        const user = await this.db
            .prepare('SELECT id, username, email, password_hash FROM users WHERE username = ?')
            .bind(username)
            .first();

        if (!user) {
            throw new Error("Invalid credentials");
        }

        // 2. Verify password
        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
            throw new Error("Invalid credentials");
        }

        // 3. Create new session in DB
        const sessionId = generateSessionToken(); // e.g., crypto.randomUUID()
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

        await this.db
            .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
            .bind(sessionId, user.id, expiresAt)
            .run();

        // 4. Create the RPC session object (passing DB_book!)
        const sessionObj = new AuthenticatedSession(
            this.db, // ✅ Critical: Pass DB_book instance
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
                    secure: true, // Set to false in dev if not using HTTPS
                    sameSite: 'strict',
                    maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
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

        // Create user
        const newUser = await this.db
            .prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?) RETURNING id, username, email')
            .bind(username, email, passwordHash)
            .first();

        if (!newUser) {
            throw new Error("Signup failed");
        }

        // Create session (same as login)
        const sessionId = generateSessionToken();
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

        await this.db
            .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
            .bind(sessionId, newUser.id, expiresAt)
            .run();

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
}
