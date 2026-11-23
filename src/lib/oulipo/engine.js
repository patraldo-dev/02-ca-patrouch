// src/lib/oulipo/engine.js
/**
 * The duel's word engine — pure and isomorphic.
 *
 * The player's browser lists the words a story can send, and the Worker
 * re-derives that list before scoring. Both must split and fold words
 * identically, so nothing here may lean on the runtime's ICU data
 * (Intl.Segmenter and locale-aware tools differ between browsers and
 * workerd). Every rule is explicit, per language, and unit-tested.
 *
 * fr, en and es are equals: each has one config of the same shape
 * (./langs/<code>.js), and every function below works on any of them.
 *
 * A config provides:
 *   minWordLength   content words shorter than this never count
 *   apostrophe      'split' (a boundary on both sides) or 'english'
 *   foldChars       optional 1:1+ character folds applied to the folded form
 *   functionSet     words that never count (closed classes + auxiliaries)
 *   verbs           this language's default verb policy
 *   verbFamilyMap   form → key, used by the optional 'families' policy
 *   fold(form)      plural and gender folding; returns a new key or null
 *   tiers           share-of-vocabulary thresholds for the tier names
 */

import EN from './langs/en.js';
import ES from './langs/es.js';
import FR from './langs/fr.js';

export const CONFIGS = Object.freeze({ en: EN, es: ES, fr: FR });
export const LANGS = Object.freeze(['en', 'es', 'fr']);
export const VERB_POLICIES = Object.freeze(['strict', 'families']);

// Straight, curly and modified letter apostrophes all normalize to '.
const APOSTROPHE = /['\u2018\u2019\u02BC`]/g;
// A run of letters, optionally with apostrophe-bound letters after it.
const WORD = /[\p{L}]+(?:'[\p{L}]+)*/gu;

export function isLang(value) {
    return typeof value === 'string' && Object.hasOwn(CONFIGS, value);
}

function configFor(lang) {
    if (!isLang(lang)) throw new Error(`oulipo/engine: unsupported language "${lang}"`);
    return CONFIGS[lang];
}

/** The verb policy a language starts with. */
export function defaultPolicy(lang) {
    return { verbs: configFor(lang).verbs };
}

function resolvePolicy(lang, policy) {
    const cfg = configFor(lang);
    const verbs =
        policy && VERB_POLICIES.includes(policy.verbs) ? policy.verbs : cfg.verbs;
    return { cfg, verbs, verbMap: verbs === 'families' ? cfg.verbFamilyMap : null };
}

/**
 * One key per word family. Verb families are matched on the surface form
 * first (French plural folding would otherwise blunt them: vais → vai), and
 * once more on the folded form (querida → querido → querer).
 */
function foldForm(form, cfg, verbMap) {
    const direct = verbMap?.get(form);
    if (direct) return direct;
    const folded = cfg.fold(form) ?? form;
    const family = verbMap?.get(folded);
    if (family) return family;
    // A content word never lands on a function word (French "faute" must
    // not become "faut"): it keeps a key of its own.
    return folded !== form && cfg.functionSet.has(folded) ? form : folded;
}

function foldedForm(part, cfg) {
    const lower = part.toLowerCase();
    if (!cfg.foldChars) return lower;
    let out = '';
    for (const ch of lower) out += cfg.foldChars[ch] ?? ch;
    return out;
}

/**
 * Every letter run of the text, with its position. Offsets index the
 * NFC-normalized text with ASCII apostrophes, so a caller can highlight
 * words without re-finding them.
 */
export function tokenize(text, lang, policy) {
    const { cfg, verbMap } = resolvePolicy(lang, policy);
    const norm = String(text ?? '').normalize('NFC').replace(APOSTROPHE, "'");
    const out = [];
    let line = 1;
    let seen = 0;
    for (const m of norm.matchAll(WORD)) {
        const start = m.index;
        line += (norm.slice(seen, start).match(/\n/g) ?? []).length;
        seen = start;

        const parts = m[0].split("'");
        let offset = start;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const next = offset + part.length + 1;
            if (part) {
                const form = foldedForm(part, cfg);
                // In English, n't marks the word before it (don't → do),
                // and every other apostrophe suffix is a function word
                // of its own ('s, 're, 've, 'll, 'm, 'd).
                const fn =
                    form.length === 1 ||
                    cfg.functionSet.has(form) ||
                    (cfg.apostrophe === 'english' && (i > 0 || parts[i + 1] === 't'));
                const content = !fn && form.length >= cfg.minWordLength;
                out.push({
                    form,
                    key: content ? foldForm(form, cfg, verbMap) : form,
                    fn,
                    content,
                    start: offset,
                    end: offset + part.length,
                    line
                });
            }
            offset = next;
        }
    }
    return out;
}

function displayForm(forms) {
    let best = null;
    for (const form of Object.keys(forms)) {
        if (!best || forms[form] > forms[best]) best = form;
    }
    return best;
}

/**
 * The content words of a text, one entry per word family.
 * `display` is the surface form used most often; `count` is how many
 * times the family appears.
 */
export function analyze(text, lang, policy) {
    const { verbs } = resolvePolicy(lang, policy);
    const types = new Map();
    let contentTokens = 0;
    let functionTokens = 0;
    let shortTokens = 0;
    const toks = tokenize(text, lang, policy);
    for (const tok of toks) {
        if (!tok.content) {
            if (tok.fn) functionTokens++;
            else shortTokens++;
            continue;
        }
        contentTokens++;
        let type = types.get(tok.key);
        if (!type) types.set(tok.key, (type = { forms: {}, count: 0 }));
        type.forms[tok.form] = (type.forms[tok.form] || 0) + 1;
        type.count++;
    }
    const list = [...types].map(([key, type], first) => ({
        key,
        display: displayForm(type.forms),
        forms: type.forms,
        count: type.count,
        first
    }));
    return {
        lang,
        verbs,
        types: list,
        vocabSize: list.length,
        contentTokens,
        functionTokens,
        shortTokens,
        totalTokens: toks.length
    };
}

/** Share of a vocabulary that was sent, as a tier from 0 to tiers.length. */
export function tierFor(lang, sent, vocabSize) {
    const { cfg } = resolvePolicy(lang, null);
    const share = vocabSize ? sent / vocabSize : 0;
    let tier = 0;
    for (const threshold of cfg.tiers) if (share >= threshold) tier++;
    return tier;
}

/** Positions of the text's content words whose key is in `keys`. */
export function markText(text, keys, lang, policy) {
    const wanted = keys instanceof Set ? keys : new Set(keys);
    const spans = [];
    for (const tok of tokenize(text, lang, policy)) {
        if (tok.content && wanted.has(tok.key)) {
            spans.push({ key: tok.key, form: tok.form, start: tok.start, end: tok.end, line: tok.line });
        }
    }
    return spans;
}

/** Content words of `text` whose key is in `bannedKeys`. */
export function findViolations(text, bannedKeys, lang, policy) {
    return markText(text, bannedKeys, lang, policy).map((span) => ({
        word: span.form,
        key: span.key,
        line: span.line,
        start: span.start,
        end: span.end
    }));
}

/**
 * Score a locked duel.
 *  - Every rope must be a content word of the player's story.
 *  - A rope is a bite when the hidden draft used the same family.
 *  - The muzzle is the share of the draft's content tokens now forbidden.
 * `ropeKeys` may repeat; duplicates are scored once.
 */
export function judge(story, draft, lang, policy, ropeKeys) {
    const storyAnalysis = analyze(story, lang, policy);
    const draftAnalysis = analyze(draft, lang, policy);
    const storyTypes = new Map(storyAnalysis.types.map((type) => [type.key, type]));
    const draftTypes = new Map(draftAnalysis.types.map((type) => [type.key, type]));

    const ropes = [];
    const invalid = [];
    const seen = new Set();
    for (const raw of Array.isArray(ropeKeys) ? ropeKeys : []) {
        const key = typeof raw === 'string' ? raw : '';
        if (!key || !storyTypes.has(key)) {
            invalid.push(key);
            continue;
        }
        if (seen.has(key)) continue;
        seen.add(key);
        const hit = draftTypes.get(key);
        ropes.push({
            key,
            forms: Object.keys(storyTypes.get(key).forms),
            bite: Boolean(hit),
            draftCount: hit ? hit.count : 0,
            draftForms: hit ? Object.keys(hit.forms) : []
        });
    }

    let bites = 0;
    let bittenTokens = 0;
    for (const rope of ropes) {
        if (rope.bite) {
            bites++;
            bittenTokens += rope.draftCount;
        }
    }
    const misses = ropes.length - bites;
    return {
        ropes,
        invalid,
        bites,
        misses,
        score: bites - misses,
        muzzlePct: draftAnalysis.contentTokens
            ? Math.round((100 * bittenTokens) / draftAnalysis.contentTokens)
            : 0,
        draftTokens: draftAnalysis.contentTokens,
        draftTypes: draftAnalysis.vocabSize,
        storyTypes: storyAnalysis.vocabSize,
        storyTokens: storyAnalysis.contentTokens
    };
}

/** Whitespace-separated word count, the way a writer counts. */
export function countWords(text) {
    const found = String(text ?? '').match(/\S+/g);
    return found ? found.length : 0;
}

/** Why one word counts (or not) and what key it gets — for tests and tools. */
export function explain(form, lang, policy) {
    const { verbs } = resolvePolicy(lang, policy);
    const [tok] = tokenize(form, lang, policy);
    return {
        word: form,
        form: tok?.form ?? null,
        key: tok ? tok.key : null,
        fn: Boolean(tok?.fn),
        content: Boolean(tok?.content),
        verbs
    };
}
