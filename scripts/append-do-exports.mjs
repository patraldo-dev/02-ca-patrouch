// Append Durable Object class exports to the adapter-generated _worker.js.
//
// Why: adapter-cloudflare 8's _worker.js template exports ONLY the default
// handler — there is no DO support, and the old sveltekit-cloudflare-do vite
// plugin no longer fires under the vite 8 / rolldown pipeline (its exports
// silently vanish from the built bundle; wrangler then fails with
// "depends on the following Durable Objects, which are not exported").
// src/worker.js re-exports don't survive adapter 8 either (tested).
//
// Mechanism: run AFTER `vite build` in each app's wrangler build command.
// Wrangler bundles _worker.js with esbuild, so appended relative imports
// resolve and the named exports surface in the deployed worker.
//
// Usage (from the monorepo root, as wired into apps/<app>/wrangler.jsonc):
//   node ../../scripts/append-do-exports.mjs . WorldRoom=src/do/world-room.js
// Only genuinely-local classes belong here; cross-worker bindings
// (script_name in wrangler.jsonc) must NOT be exported.
import fs from 'node:fs';
import path from 'node:path';

const [appDir = '.', ...pairs] = process.argv.slice(2);
if (!pairs.length) {
	console.error('usage: append-do-exports.mjs <appDir> Class=path [Class=path ...]');
	process.exit(1);
}

const workerPath = path.join(appDir, '.svelte-kit', 'cloudflare', '_worker.js');
let src;
try {
	src = fs.readFileSync(workerPath, 'utf8');
} catch {
	console.error(`append-do-exports: ${workerPath} not found — did the vite build run?`);
	process.exit(1);
}

const additions = [];
for (const pair of pairs) {
	const eq = pair.indexOf('=');
	const cls = pair.slice(0, eq);
	const rel = pair.slice(eq + 1);
	if (!cls || !rel) {
		console.error(`append-do-exports: bad pair "${pair}" (want Class=src/do/file.js)`);
		process.exit(1);
	}
	if (new RegExp(`export\\s*\\{[^}]*\\b${cls}\\b[^}]*\\}`).test(src)) continue;
	additions.push(`export { ${cls} } from '../../${rel}';`);
}

if (!additions.length) {
	console.log('append-do-exports: all exports already present');
	process.exit(0);
}

fs.appendFileSync(
	workerPath,
	`\n// Durable Object exports — added by scripts/append-do-exports.mjs\n` +
		`// (adapter-cloudflare 8 has no DO support; see file header)\n` +
		additions.join('\n') +
		'\n'
);
console.log(`append-do-exports: appended ${additions.length} export(s): ${additions.map((a) => a.slice(9, a.indexOf('}'))).join(', ')}`);
