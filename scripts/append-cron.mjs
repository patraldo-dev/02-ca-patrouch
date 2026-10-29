// Append a `scheduled` handler to the adapter-generated _worker.js so
// Cloudflare cron triggers reach the app's own cron routes.
//
// Mechanism (same law as append-do-exports.mjs): runs AFTER `vite build`
// in the wrangler build command. The handler self-fetches the route with
// the CRON_SECRET bearer — the route's own auth stays the single gate.
//
// Route list lives here (one per line): the AmbientX Passport bridge
// export (Phase 2: patrouch's top human writings → ambientx review queue).
const CRON_ROUTES = ['/api/passport/bridge/export'];

import fs from 'node:fs';
import path from 'node:path';

const appDir = process.argv[2] || '.';
const workerPath = path.join(appDir, '.svelte-kit', 'cloudflare', '_worker.js');
let src;
try {
	src = fs.readFileSync(workerPath, 'utf8');
} catch {
	console.error('append-cron: _worker.js not found — run vite build first');
	process.exit(1);
}
if (src.includes('export async function scheduled')) {
	console.log('append-cron: scheduled handler already present — skipping');
	process.exit(0);
}
const routes = JSON.stringify(CRON_ROUTES);
src += `

// ── Appended by scripts/append-cron.mjs (cron triggers → app routes) ──
export async function scheduled(event, env, ctx) {
	const routes = ${routes};
	ctx.waitUntil((async () => {
		for (const route of routes) {
			try {
				const origin = env.PATROUCH_BASE_URL || 'https://patrouch.ca';
				const r = await fetch(origin + route, {
					method: 'POST',
					headers: { authorization: 'Bearer ' + (env.CRON_SECRET || '') },
				});
				console.log('[cron]', route, '→', r.status);
			} catch (e) {
				console.error('[cron]', route, 'failed:', e?.message);
			}
		}
	})());
}
`;
fs.writeFileSync(workerPath, src);
console.log('append-cron: scheduled handler appended for', CRON_ROUTES.join(', '));
