#!/usr/bin/env node
// Live sample run: node tests/oulipo/live/run.mjs [drafts-per-language]   (npm run sample:live)
//
// Starts the harness Worker locally (tests/oulipo/live/worker.js) and asks
// the real model, for each language, for a few hidden drafts and for
// rewrites of one of them without the fixture piece's words. Prints what
// the model did, and saves the drafts next to this file so the parity
// harness can score real pieces:
//
//   npm run test:parity        → rows marked "live draft"
//
// Calls Workers AI on the signed-in Cloudflare account: about eight short
// generations per language. Touches no database and deploys nothing.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const LANGS = ['es', 'en', 'fr'];
const N = Math.max(1, Math.min(8, Number(process.argv[2]) || 4));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const seconds = (ms) => `${(ms / 1000).toFixed(0)}s`;
const pct = (part, whole) => (whole ? (100 * part) / whole : 0);
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const spread = (values) => (values.length > 1 ? `${Math.min(...values).toFixed(0)}–${Math.max(...values).toFixed(0)}` : values[0].toFixed(0));

// Start wrangler by process, so it can be stopped by process too.
const wrangler = spawn(
    process.execPath,
    [
        join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
        'dev',
        '--config', join(here, 'wrangler.jsonc'),
        '--port', String(PORT),
        '--ip', '127.0.0.1'
    ],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }
);
let log = '';
wrangler.stdout.on('data', (chunk) => (log += chunk));
wrangler.stderr.on('data', (chunk) => (log += chunk));

const stop = async () => {
    if (wrangler.exitCode !== null) return;
    wrangler.kill('SIGTERM');
    for (let i = 0; i < 40 && wrangler.exitCode === null; i++) await sleep(250);
    if (wrangler.exitCode === null) wrangler.kill('SIGKILL');
};

try {
    let up = false;
    for (let i = 0; i < 160 && !up; i++) {
        if (wrangler.exitCode !== null) break;
        try {
            const response = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(3000) });
            up = response.status === 200 && (await response.text()).includes('live sample harness');
        } catch {
            /* not up yet */
        }
        if (!up) await sleep(500);
    }
    if (!up) {
        console.error('The harness Worker did not start. wrangler said:\n' + log.slice(-1500));
        process.exitCode = 1;
    } else {
        const saved = { generated: new Date().toISOString(), draftsPerLanguage: N };
        const summary = [];
        for (const lang of LANGS) {
            process.stdout.write(`${lang}: ${N} hidden drafts… `);
            const drawn = await (await fetch(`${BASE}/drafts?lang=${lang}&n=${N}`)).json();
            if (!drawn.drafts) {
                console.log(`failed: ${JSON.stringify(drawn).slice(0, 200)}`);
                process.exitCode = 1;
                continue;
            }
            process.stdout.write('and her rewrites… ');
            const rewrites = await (
                await fetch(`${BASE}/rewrites?lang=${lang}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ draft: drawn.drafts[0].text })
                })
            ).json();
            if (!rewrites.rewriteAll) {
                console.log(`failed: ${JSON.stringify(rewrites).slice(0, 200)}`);
                process.exitCode = 1;
                continue;
            }
            saved[lang] = { prompt: drawn.prompt, ...rewrites, drafts: drawn.drafts };
            const calls = [...drawn.calls, ...rewrites.calls];

            console.log('');
            const bites = (key) => drawn.drafts.map((draft) => pct(draft[key].bites, draft[key].sent));
            const muzzle = (key) => drawn.drafts.map((draft) => draft[key].muzzlePct);
            console.log(`  draft length         ${spread(drawn.drafts.map((draft) => draft.words))} words`);
            console.log(`  words sent           ${drawn.drafts[0].strict.sent} of the human piece`);
            console.log(`  bite rate, strict    ${mean(bites('strict')).toFixed(0)}% of the words sent (${spread(bites('strict'))}%)`);
            console.log(`  bite rate, families  ${mean(bites('families')).toFixed(0)}% (${spread(bites('families'))}%)`);
            console.log(`  muzzle, strict       ${mean(muzzle('strict')).toFixed(0)}% of her draft forbidden (${spread(muzzle('strict'))}%)`);
            console.log(`  muzzle, families     ${mean(muzzle('families')).toFixed(0)}% (${spread(muzzle('families'))}%)`);
            for (const [label, run] of [['rewrite, all    ', rewrites.rewriteAll], ['rewrite, top 10', rewrites.rewriteTop10]]) {
                console.log(`  ${label}     ${run.forbidden} words forbidden → ${run.passes} pass(es), ${run.violations.length} left${run.violations.length ? `: ${run.violations.slice(0, 8).join(', ')}` : ''}`);
            }
            console.log(`  model calls          ${calls.length}, slowest ${seconds(Math.max(...calls.map((call) => call.ms)))}, whole run ${seconds(calls.reduce((sum, call) => sum + call.ms, 0))}`);
            summary.push({ lang, strict: mean(bites('strict')), families: mean(bites('families')), muzzle: mean(muzzle('strict')) });
        }
        writeFileSync(join(here, 'drafts.json'), JSON.stringify(saved, null, 2) + '\n');
        if (summary.length === LANGS.length) {
            console.log('\nParity at a glance (mean over the drafts; bite rate = share of the human piece the draft also uses):');
            for (const { lang, strict, families, muzzle } of summary) {
                console.log(`  ${lang}   bite ${strict.toFixed(0).padStart(3)}% strict / ${families.toFixed(0).padStart(3)}% families   muzzle ${muzzle.toFixed(0).padStart(3)}%`);
            }
        }
        console.log('\nSaved to tests/oulipo/live/drafts.json — "npm run test:parity" scores the fixture pieces against these drafts.');
    }
} finally {
    await stop();
}
