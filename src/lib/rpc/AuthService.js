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
            SELECT id, username, email, password_hash 
            FROM users 
            WHERE email = ? OR username = ?
            LIMIT 1
        `)
        .bind(identifier, identifier) // ← Same value for both placeholders
        .first();

    if (!user) {
        throw new Error("Invalid credentials");
    }

    // 2. Verify password (same as before)
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
        throw new Error("Invalid credentials");
    }

    // 3. Create session (same as before)
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
