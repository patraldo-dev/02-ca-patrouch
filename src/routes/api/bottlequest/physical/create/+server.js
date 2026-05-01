import { json } from '@sveltejs/kit';

export async function POST({ locals, platform, request }) {
    const db = platform?.env?.DB_book;
    const user = locals.user;
    if (!user || !db) return json({ error: 'Not authenticated' }, { status: 401 });

    const { title, content, lat, lon, mode = 'fiesta' } = await request.json();
    if (!title || !content) return json({ error: 'Title and content required' }, { status: 400 });
    if (!lat || !lon) return json({ error: 'GPS location required' }, { status: 400 });

    const prefix = mode === 'fiesta' ? 'fiesta' : 'phys';
    const bottleId = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const bottleKey = bottleId.toUpperCase().replace(/-/g, '-');

    // Store content in R2
    const r2Key = bottleId;
    try {
        await platform.env.BOOTY_CONTENT.put(r2Key, content, {
            httpMetadata: { contentType: 'text/plain' }
        });
    } catch (e) {
        return json({ error: 'Failed to store content' }, { status: 500 });
    }

    // Insert bottle record — content points to R2
    await db.prepare(`
        INSERT INTO bottles (id, bottle_type, title, content, content_type, current_lat, current_lon, launch_lat, launch_lon, status, user_id, bottle_key, is_test)
        VALUES (?, 'physical', ?, ?, 'message', ?, ?, ?, ?, 'launched', ?, ?, 0)
    `).bind(bottleId, title, `[R2:${r2Key}]`, lat, lon, lat, lon, user.id, bottleKey).run();

    return json({
        success: true,
        bottle: { id: bottleId, title, lat, lon }
    });
}
