// POST /api/passport/link { code } — the signed-in member redeems an
// AmbientX link code. Requires session (locals.user set by hooks).
import { json } from '@sveltejs/kit';
import { linkAmbientX } from '#lib/server/passport.js';

export async function POST({ request, locals }) {
	const user = locals?.user;
	if (!user) return json({ error: 'sign-in-required' }, { status: 401 });
	let body = {};
	try { body = await request.json(); } catch {}
	if (!body.code) return json({ error: 'code-required' }, { status: 400 });
	const result = await linkAmbientX(locals.db, user.id, user.username, String(body.code).slice(0, 16));
	return json(result, { status: result.ok ? 200 : 400 });
}
