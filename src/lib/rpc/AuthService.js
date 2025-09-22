// src/lib/rpc/AuthService.js
import { RpcTarget } from 'capnweb';
import { AuthenticatedSession } from './AuthenticatedSession.js';
import { generateSessionToken } from '$lib/utils.js';
import { hashPassword, verifyPassword } from '$lib/auth-helpers.js';

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

        // 3. Create session
        const sessionId = generateSessionToken();
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

        await this.db
            .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
            .bind(sessionId, user.id, expiresAt)
            .run();

        // 4. Create RPC session object
        const sessionObj = new AuthenticatedSession(
            this.db,
            { id: sessionId, userId: user.id, expiresAt },
            { id: user.id, username: user.username, email: user.email }
        );

        // 5. Return session + cookie
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

    // ... your other methods (signup, logout, getProfileByToken, etc.) go here, inside the class
}
