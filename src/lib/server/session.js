// src/lib/server/session.js
import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";

// Generate cryptographically secure session ID
function generateSessionId() {
    const bytes = new Uint8Array(25); // 25 bytes = 40 chars in base32
    crypto.getRandomValues(bytes);
    return encodeBase32LowerCaseNoPadding(bytes);
}

const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Create new session
export async function createSession(db, userId) {
    const now = Math.floor(Date.now() / 1000);
    const sessionId = generateSessionId();
    const expiresAt = now + SESSION_EXPIRES_IN_SECONDS;

    await db.prepare(`
        INSERT INTO user_session (id, user_id, expires_at)
        VALUES (?, ?, ?)
    `).bind(sessionId, userId, expiresAt).run();

    return {
        id: sessionId,
        userId,
        expiresAt: new Date(expiresAt * 1000)
    };
}

// Validate session
export async function validateSession(db, sessionId) {
    const now = Math.floor(Date.now() / 1000);

    const { results } = await db.prepare(`
        SELECT id, user_id, expires_at
        FROM user_session
        WHERE id = ?
    `).bind(sessionId).all();

    if (results.length === 0) {
        return null;
    }

    const row = results[0];
    const session = {
        id: row.id,
        userId: row.user_id,
        expiresAt: new Date(row.expires_at * 1000)
    };

    // Expired?
    if (now >= row.expires_at) {
        await invalidateSession(db, sessionId);
        return null;
    }

    // Auto-refresh if past halfway
    if (now >= row.expires_at - (SESSION_EXPIRES_IN_SECONDS / 2)) {
        const newExpiresAt = now + SESSION_EXPIRES_IN_SECONDS;
        await db.prepare(`
            UPDATE user_session
            SET expires_at = ?
            WHERE id = ?
        `).bind(newExpiresAt, sessionId).run();

        session.expiresAt = new Date(newExpiresAt * 1000);
        session.fresh = true; // ← ADD THIS

    }

    return session;
}

// Invalidate session
export async function invalidateSession(db, sessionId) {
    await db.prepare(`
        DELETE FROM user_session
        WHERE id = ?
    `).bind(sessionId).run();
}

// Invalidate all sessions for user
export async function invalidateAllSessions(db, userId) {
    await db.prepare(`
        DELETE FROM user_session
        WHERE user_id = ?
    `).bind(userId).run();
}
