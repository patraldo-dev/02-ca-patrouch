// tests/oulipo/live/worker.js
// A throwaway Worker with a single binding, Workers AI (wrangler.jsonc next
// to this file has nothing else: no database, no KV, no R2, no routes).
//
// It runs the duel's real draft and rewrite code on the fixture scene and
// reports what the model actually did:
//
//   GET  /drafts?lang=es&n=5   several hidden drafts, each scored against
//                              the fixture piece under both verb policies
//   POST /rewrites?lang=es     she rewrites a given draft without the
//                              fixture piece's words (all of them, and ten)
//
// Start it with `npm run sample:live`; never deploy it.
import { FIXTURES } from '../fixtures.js';
import { analyze, defaultPolicy, judge } from '../../../src/lib/oulipo/engine.js';
import { generateDraft, rewritePass } from '../../../src/lib/server/oulipo-sappho.js';

const LANGS = ['es', 'en', 'fr'];
const MAX_DRAFTS = 8;
const REWRITE_PASSES = 4;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname === '/') return new Response('oulipo duel: live sample harness');
        const lang = url.searchParams.get('lang');
        const scene = FIXTURES[lang];
        if (!LANGS.includes(lang) || !scene) {
            return Response.json({ error: 'lang must be one of ' + LANGS.join(', ') }, { status: 400 });
        }

        // Time every call to the model, and keep what it cost.
        const calls = [];
        const ai = {
            run: async (model, input) => {
                const started = Date.now();
                const response = await env.AI.run(model, input);
                calls.push({
                    ms: Date.now() - started,
                    promptWords: input.messages.map((message) => message.content).join(' ').split(/\s+/).length,
                    answerWords: typeof response?.response === 'string' ? response.response.trim().split(/\s+/).length : 0,
                    usage: response?.usage ?? null
                });
                return response;
            }
        };

        if (url.pathname === '/drafts') {
            const n = Math.max(1, Math.min(MAX_DRAFTS, Number(url.searchParams.get('n')) || 1));
            const drafts = [];
            for (let i = 0; i < n; i++) {
                const text = await generateDraft(ai, lang, scene.prompt);
                drafts.push({ text, ...score(scene.human, text, lang), ms: calls.at(-1).ms });
            }
            return Response.json({ lang, prompt: scene.prompt, drafts, calls });
        }

        if (url.pathname === '/rewrites' && request.method === 'POST') {
            const { draft } = await request.json();
            if (typeof draft !== 'string' || !draft.trim()) return Response.json({ error: 'draft required' }, { status: 400 });
            const policy = defaultPolicy(lang);
            const human = analyze(scene.human, lang, policy);
            const hers = new Map(analyze(draft, lang, policy).types.map((type) => [type.key, type]));
            const formsOf = (keys) =>
                [...new Set(keys.flatMap((key) => [
                    ...Object.keys(human.types.find((type) => type.key === key).forms),
                    ...Object.keys(hers.get(key)?.forms ?? [])
                ]))];
            const top = [...human.types].sort((a, b) => b.count - a.count || a.first - b.first).slice(0, 10).map((type) => type.key);

            // The duel's own rhythm: one pass per request, each told what got
            // through the last one, keeping the best, up to the pass limit.
            const rewrite = async (keys) => {
                const forbidden = formsOf(keys);
                let best = null;
                let slipped = [];
                let passes = 0;
                for (let pass = 1; pass <= REWRITE_PASSES; pass++) {
                    passes = pass;
                    const attempt = await rewritePass(ai, lang, draft, forbidden, { policy, slipped, bannedKeys: keys });
                    if (attempt.content && (!best || attempt.violations.length < best.violations.length)) best = attempt;
                    if (attempt.content && !attempt.violations.length) break;
                    if (attempt.content) slipped = attempt.violations;
                }
                return { sent: keys.length, forbidden: forbidden.length, passes, content: best?.content ?? '', violations: best?.violations ?? [] };
            };
            return Response.json({
                lang,
                draft,
                rewriteAll: await rewrite(human.types.map((type) => type.key)),
                rewriteTop10: await rewrite(top),
                calls
            });
        }

        return new Response('not found', { status: 404 });
    }
};

/** How much of the human piece a draft uses, under both verb policies. */
function score(human, draft, lang) {
    const under = (policy) => {
        const keys = analyze(human, lang, policy).types.map((type) => type.key);
        const verdict = judge(human, draft, lang, policy, keys);
        return { sent: keys.length, bites: verdict.bites, muzzlePct: verdict.muzzlePct };
    };
    return { words: draft.trim().split(/\s+/).length, strict: under(defaultPolicy(lang)), families: under({ verbs: 'families' }) };
}
