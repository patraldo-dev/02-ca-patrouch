// src/lib/rpc/AuthService.js
import { RpcTarget } from 'capnweb';
import { AuthenticatedSession } from './AuthenticatedSession.js';

export class AuthService extends RpcTarget {
    constructor(db, env) {
        super();
        this.db = db;
        this.env = env;
    }

    // Keep ONLY non-auth methods
    async logout(sessionToken) {
        if (!sessionToken) throw new Error("Invalid session token");
        await this.db.prepare('DELETE FROM user_session WHERE id = ?').bind(sessionToken).run();
        return true;
    }

    async getProfileByToken(sessionToken) {
        if (!sessionToken) throw new Error("Session token required");
        const now = Date.now();
        const session = await this.db
            .prepare('SELECT user_id FROM user_session WHERE id = ? AND expires_at > ?')
            .bind(sessionToken, now)
            .first();
        if (!session) throw new Error("Session expired or invalid");
        const user = await this.db
            .prepare('SELECT id, username, email FROM users WHERE id = ?')
            .bind(session.user_id)
            .first();
        if (!user) throw new Error("User not found");
        return { id: user.id, username: user.username, email: user.email };
    }
}
