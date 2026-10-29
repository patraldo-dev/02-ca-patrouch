// POST /api/passport/bridge/export — push the top recent HUMAN writings
// (public, published, not AI-assisted, longest first as the engagement
// proxy for now) into ambientx's operator review queue. CRON_SECRET or
// admin-session gated; soft-fail everywhere (export never throws).
import { json } from '@sveltejs/kit';
import { passportFetch } from '#lib/server/passport.js';
import { env } from 'cloudflare:workers';

export async function POST({ request, locals }) {
	const user = locals?.user;
	const cronOk = (() => {
		const key = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
		return !!(key && env.CRON_SECRET && key === env.CRON_SECRET);
	})();
	const adminOk = !!(user && user.role === 'admin');
	if (!cronOk && !adminOk) return json({ error: 'forbidden' }, { status: 403 });

	const rows = await env.DB_book.prepare(`
		SELECT w.title, w.content, w.locale, w.word_count, u.username AS author
		FROM writings w JOIN users u ON u.id = w.user_id
		WHERE w.status = 'published' AND w.visibility = 'public' AND w.ai_assisted = 0
		ORDER BY w.created_at DESC LIMIT 10
	`).all();

	const items = (rows.results || []).map((r) => ({
		platform: 'patrouch',
		kind: 'writing',
		title: r.title,
		author: r.author,
		body: r.content,
		meta: { locale: r.locale, words: r.word_count },
	}));
	if (!items.length) return json({ ok: true, queued: 0 });

	const r = await passportFetch('/api/passport/bridge/submit', {
		method: 'POST',
		body: JSON.stringify({ items }),
	});
	const out = await r.json().catch(() => ({}));
	return json({ ok: r.ok, sent: items.length, response: out }, { status: r.ok ? 200 : 502 });
}
