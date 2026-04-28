import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = locals.db;
    const bottles = await db.prepare(`
        SELECT id, title, content, content_type, status, 
               launch_lat, launch_lon, current_lat, current_lon,
               launched_at, found_by, found_at, is_test, bottle_key, user_id
        FROM bottles 
        WHERE bottle_type = 'physical'
        ORDER BY created_at DESC
    `).all();

    return json({ bottles: bottles.results || [] });
}

/** @type {import('./$types').RequestHandler} */
export async function PUT({ request, locals }) {
    if (!locals.user || locals.user.role !== 'admin') {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, launch_lat, launch_lon, current_lat, current_lon } = await request.json();
        const db = locals.db;

        await db.prepare(`
            UPDATE bottles 
            SET launch_lat = ?, launch_lon = ?, current_lat = ?, current_lon = ?
            WHERE id = ?
        `).bind(launch_lat, launch_lon, current_lat, current_lon, id).run();

        return json({ success: true });
    } catch (err) {
        console.error('Bottle update error:', err);
        return json({ error: 'Failed to update bottle' }, { status: 500 });
    }
}
