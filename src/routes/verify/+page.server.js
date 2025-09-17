// src/routes/verify/+page.server.js
/** @type {import('./$types').PageServerLoad} */
export async function load({ url, locals }) {
    const token = url.searchParams.get('token');

    // Validate token presence
    if (!token) {
        return {
            status: 400,
            error: 'No verification token provided'
        };
    }

    const db = locals.db;

    try {
        // Find user with this token
        const { results } = await db.prepare(`
            SELECT id FROM users WHERE email_verification_token = ?
        `).bind(token).all();

        if (results.length === 0) {
            return {
                status: 400,
                error: 'Invalid or expired verification token'
            };
        }

        const userId = results[0].id;

        // Update user: mark as verified, clear token
        await db.prepare(`
            UPDATE users
            SET email_verified_at = CURRENT_TIMESTAMP,
                email_verification_token = NULL
            WHERE id = ?
        `).bind(userId).run();

        return {
            status: 200,
            success: true
        };

    } catch (error) {
        console.error('Email verification error:', error);
        return {
            status: 500,
            error: 'Internal server error'
        };
    }
}
