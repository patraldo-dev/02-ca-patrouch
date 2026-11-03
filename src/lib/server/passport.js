// @ts-nocheck
// passport.js — patrouch.ca's half of the AmbientX Passport link.
//
// The flow: the signed-in patrouch member enters a link CODE they minted
// at ambientx.dev (sign in → POST /api/passport/mint). This server
// redeems it at the site's /api/passport/confirm with the shared
// connector key — the key lives in the Workers secret store
// (PASSPORT_CONNECTOR_KEY), never in the browser. On success both
// platforms know the mapping; XP flows from both sides into one ledger.
//
// 18+ note: both platforms are adult communities by policy (2026-10-19);
// the Passport carries no age data — each side keeps its own gate.

import { env } from 'cloudflare:workers';

const site = () => env.PASSPORT_SITE || 'https://ambientx.dev';

export async function passportFetch(path, init = {}) {
	return fetch(`${site()}${path}`, {
		...init,
		headers: {
			'authorization': `Bearer ${env.PASSPORT_CONNECTOR_KEY}`,
			'content-type': 'application/json',
			...(init.headers || {}),
		},
	});
}

/** Redeem a user-entered code for the signed-in member. */
export async function linkAmbientX(db, userId, username, code) {
	const r = await passportFetch('/api/passport/confirm', {
		method: 'POST',
		body: JSON.stringify({
			code: String(code || '').trim().toUpperCase(),
			platform: 'patrouch',
			platform_user_id: String(userId),
			platform_username: String(username || '').slice(0, 128),
		}),
	});
	const out = await r.json().catch(() => ({}));
	if (!r.ok) return { ok: false, error: out.error || `passport-${r.status}` };
	return { ok: true, passport: out.passport };
}

/** The member's Passport (rank + xp), via the connector door. */
export async function passportStatus(db, userId) {
	const r = await passportFetch(`/api/passport/status?platform=patrouch&platform_user_id=${encodeURIComponent(userId)}`);
	const out = await r.json().catch(() => ({}));
	return out;   // { linked: false } | { linked: true, passport }
}

/** Report a patrouch XP event (e.g. a published writing). */
export async function passportXp(userId, event, meta = null, amount) {
	const body = { event, platform: 'patrouch', platform_user_id: String(userId), meta };
	if (amount) body.amount = amount;
	const r = await passportFetch('/api/passport/xp', { method: 'POST', body: JSON.stringify(body) });
	return r.ok ? await r.json().catch(() => ({})) : null;   // soft-fail: writing never blocks on the Passport
}
