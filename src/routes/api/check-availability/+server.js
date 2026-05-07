import { json } from '@sveltejs/kit';

export async function GET({ url, platform }) {
    const field = url.searchParams.get('field'); // 'username' or 'email'
    const value = url.searchParams.get('value');

    if (!field || !value || !['username', 'email'].includes(field)) {
        return json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const db = platform?.env?.DB_book;
    if (!db) {
        return json({ error: 'Service unavailable' }, { status: 500 });
    }

    try {
        const row = await db.prepare(
            `SELECT id FROM users WHERE ${field} = ?`
        ).bind(value.trim().toLowerCase()).first();

        return json({ available: !row });
    } catch {
        return json({ error: 'Check failed' }, { status: 500 });
    }
}
