// src/routes/api/auth/logout/+server.js
/** @type {import('./$types').RequestHandler} */
export async function POST({ locals, cookies }) {
    const sessionId = cookies.get('session');
    
    if (sessionId && locals.db) {
        // Directly delete session from DB
        await locals.db.prepare(`
            DELETE FROM user_session
            WHERE id = ?
        `).bind(sessionId).run();
    }

    // Clear cookie
    const response = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
            'Set-Cookie': 'session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/'
        }
    });

    return response;
}
