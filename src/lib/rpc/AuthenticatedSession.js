// src/lib/rpc/AuthenticatedSession.js
import { RpcTarget } from 'capnweb';

/**
 * Represents an authenticated user session.
 * All methods are server-side and secure.
 * Uses your D1 database (DB_book) passed via constructor.
 */
export class AuthenticatedSession extends RpcTarget {
    /**
     * @param {import('@cloudflare/workers-types').D1Database} db - Your D1 database instance (DB_book)
     * @param {Object} session - Session data from your 'sessions' table
     * @param {string} session.id - Session token
     * @param {string} session.userId - Associated user ID
     * @param {number} session.expiresAt - Expiry timestamp (ms)
     * @param {Object} user - User data
     * @param {string} user.id
     * @param {string} user.username
     * @param {string} user.email
     */
    constructor(db, session, user) {
        super();
        this.db = db;
        this.session = session;
        this.user = user;
    }

    /**
     * Get safe user profile data
     * @returns {Promise<Object>} User profile (id, username, email)
     */
    async getProfile() {
        return {
            id: this.user.id,
            username: this.user.username,
            email: this.user.email
        };
    }

    /**
     * Update user preferences (example: theme)
     * @param {Object} updates
     * @param {string} [updates.theme] - e.g., 'dark', 'light'
     * @returns {Promise<Object>} Updated user profile
     */
    async updateProfile(updates) {
        // Validate input (basic example)
        if (updates.theme && typeof updates.theme !== 'string') {
            throw new Error("Invalid theme value");
        }

        // Update user in DB
        const result = await this.db
            .prepare('UPDATE users SET theme = ? WHERE id = ? RETURNING *')
            .bind(updates.theme || null, this.user.id)
            .first();

        if (!result) {
            throw new Error("User not found or update failed");
        }

        // Return updated profile (safe subset)
        return {
            id: result.id,
            username: result.username,
            email: result.email
        };
    }

    /**
     * Invalidate this session server-side (logout)
     * @returns {Promise<boolean>} True if logout succeeded
     */
    async logout() {
        await this.db
            .prepare('DELETE FROM sessions WHERE id = ?')
            .bind(this.session.id)
            .run();
        return true;
    }

    /**
     * Example: List user's books (showcasing promise pipelining potential)
     * @returns {Promise<Array<Object>>} List of books
     */
    async listBooks() {
        const books = await this.db
            .prepare('SELECT id, title, slug FROM books WHERE user_id = ?')
            .bind(this.user.id)
            .all();

        return books.results || [];
    }
}
