// src/routes/api/admin/users/+server.js
/** @type {import('./$types').RequestHandler} */
export async function GET({ locals }) {
    if (!locals.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    try {
        const { results } = await locals.db.prepare(`
            SELECT id, username, email
            FROM users
            ORDER BY username ASC
        `).all();

        return new Response(JSON.stringify(results), { status: 200 });
    } catch (error) {
        console.error('Get users error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}
