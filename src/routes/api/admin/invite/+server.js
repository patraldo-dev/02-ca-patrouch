// src/routes/api/admin/invite/+server.js
import { json, error } from '@sveltejs/kit';

export async function POST({ locals, request }) {
    if (!locals.user || locals.user.role !== 'admin') {
        throw error(403, 'Admin access required');
    }

    const { email } = await request.json().catch(() => ({}));

    // Generate unique token
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

    await locals.db.prepare(`
        INSERT INTO invitations (invited_by, token, email) VALUES (?, ?, ?)
    `).bind(locals.user.id, token, email || null).run();

    return json({ token, email });
}

export async function GET({ locals }) {
    if (!locals.user || locals.user.role !== 'admin') {
        throw error(403, 'Admin access required');
    }

    const { results } = await locals.db.prepare(`
        SELECT i.id, i.token, i.email, i.created_at, i.accepted_at, i.used, u.username as invited_by
        FROM invitations i
        JOIN users u ON i.invited_by = u.id
        ORDER BY i.created_at DESC
    `).all();

    return json(results);
}
