// GET /api/passport/status — the member's Passport (rank/xp/links).
import { json } from '@sveltejs/kit';
import { passportStatus } from '#lib/server/passport.js';

export async function GET({ locals }) {
	const user = locals?.user;
	if (!user) return json({ error: 'sign-in-required' }, { status: 401 });
	return json(await passportStatus(locals.db, user.id));
}
