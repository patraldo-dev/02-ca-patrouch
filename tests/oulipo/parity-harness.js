#!/usr/bin/env node
// Parity harness: node tests/oulipo/parity-harness.js
//
// Runs the same scene through the engine in fr, en and es and prints, per
// language, how much of a human piece can actually be sent as ropes and how
// much of a narrator's piece it would forbid. Read it to judge whether the
// three languages feel equally hard — never to compare raw word counts.
//
// Two sources for the narrator's piece:
//   - the hand-written "ai" fixture (always available);
//   - tests/oulipo/live/drafts.json, which `npm run sample:live` writes from
//     the real model — those rows are marked "live".
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONFIGS, LANGS, analyze, judge, tokenize } from '../../src/lib/oulipo/engine.js';
import { FIXTURES } from './fixtures.js';

const here = dirname(fileURLToPath(import.meta.url));
const livePath = join(here, 'live', 'drafts.json');
const live = existsSync(livePath) ? JSON.parse(readFileSync(livePath, 'utf8')) : null;

const pct = (part, whole) => (whole ? `${((100 * part) / whole).toFixed(0).padStart(3)}%` : '  —');

function compare(human, draft, lang, policy) {
    const h = analyze(human, lang, policy);
    const d = analyze(draft, lang, policy);
    // Sending every word of the human piece: how many hit, how much is forbidden.
    const everything = judge(human, draft, lang, policy, h.types.map((type) => type.key));
    return { h, d, hits: everything.hits, muzzle: everything.muzzlePct };
}

function verbShare(text, lang) {
    const strict = tokenize(text, lang, { verbs: 'strict' }).filter((tok) => tok.content);
    const families = tokenize(text, lang, { verbs: 'families' }).filter((tok) => tok.content);
    let moved = 0;
    for (let i = 0; i < strict.length; i++) if (strict[i].key !== families[i].key) moved++;
    return [moved, strict.length];
}

function row(label, human, draft, lang) {
    const strict = compare(human, draft, lang, { verbs: 'strict' });
    const families = compare(human, draft, lang, { verbs: 'families' });
    const [verbs, content] = verbShare(draft, lang);
    return [
        label.padEnd(17),
        `${String(strict.h.totalTokens).padStart(3)}/${String(strict.d.totalTokens).padStart(3)}`,
        `${pct(strict.h.functionTokens, strict.h.totalTokens)}/${pct(strict.d.functionTokens, strict.d.totalTokens)}`,
        `${pct(strict.h.shortTokens, strict.h.totalTokens)}/${pct(strict.d.shortTokens, strict.d.totalTokens)}`,
        `${String(strict.h.vocabSize).padStart(3)}/${String(strict.d.vocabSize).padStart(3)}`,
        `${pct(strict.hits, strict.h.vocabSize)} /${pct(families.hits, families.h.vocabSize)}`,
        `${String(strict.muzzle).padStart(3)}%/${String(families.muzzle).padStart(3)}%`,
        pct(verbs, content)
    ];
}

const header = [
    'piece', 'words', 'fn-share', 'short', 'types', 'hit', 'muzzle', 'verb-fam'
];

console.log('Parity harness — one scene, three languages (human / narrator)');
console.log('  words      letter runs in the human piece / in the narrator piece');
console.log('  fn-share   share of runs that are function words and never count');
console.log('  short      share of runs under 4 letters that are not function words');
console.log('  types      distinct word families available to send / in the draft');
console.log('  hit       share of the human families the draft also uses, strict / families');
console.log('  muzzle     share of the draft forbidden if the human sends everything, strict / families');
console.log('  verb-fam   share of the draft that the families policy folds into an irregular verb');
console.log('');
console.log(header.map((cell, i) => (i === 0 ? cell.padEnd(17) : cell.padStart(13))).join(''));

for (const lang of LANGS) {
    const { human, ai } = FIXTURES[lang];
    console.log(row(`${lang} fixture`, human, ai, lang).join(''));
    // Real drafts, when a live sample run has left any: one row each, so
    // the spread between drafts of the same language stays visible.
    for (const [index, sample] of (live?.[lang]?.drafts ?? []).entries()) {
        console.log(row(`${lang} live ${index + 1}`, human, sample.text, lang).join(''));
    }
}

console.log('');
console.log('Default verb policy per language:');
for (const lang of LANGS) {
    const cfg = CONFIGS[lang];
    const families = new Set(cfg.verbFamilyMap.values()).size;
    console.log(`  ${lang}: ${cfg.verbs} — ${families} irregular verb families, ${cfg.functionSet.size} function words`);
}
