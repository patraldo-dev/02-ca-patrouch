// src/routes/api/invite/[token]/+server.js
import { json, error, redirect } from '@sveltejs/kit';

export async function GET({ locals, params }) {
    if (!locals.user) {
        throw redirect(302, '/login');
    }

    const { results } = await locals.db.prepare(`
        SELECT * FROM invitations WHERE token = ? AND used = 0
    `).bind(params.token).all();

    if (results.length === 0) {
        throw error(404, 'Invitation not found or already used');
    }

    const invitation = results[0];
    const now = Math.floor(Date.now() / 1000);

    // Upgrade user role
    await locals.db.prepare('UPDATE users SET role = ? WHERE id = ?').bind(invitation.role || 'member', locals.user.id).run();

    // Mark invitation as used
    await locals.db.prepare(`
        UPDATE invitations SET used = 1, accepted_at = ? WHERE id = ?
    `).bind(now, invitation.id).run();

    return json({ success: true, role: invitation.role || 'member' });
}
