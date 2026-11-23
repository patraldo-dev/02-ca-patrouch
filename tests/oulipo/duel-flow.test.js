// Server flow tests: node --test tests/oulipo/
// The whole duel runs against in-memory SQLite and a scripted AI binding.
// Where the behaviour is meant to match, fr, en and es go through the same
// scenario (SCENES in ./helpers.js).
import test from 'node:test';
import assert from 'node:assert/strict';

import { analyze } from '../../src/lib/oulipo/engine.js';
import { DUEL } from '../../src/lib/oulipo/duel-rules.js';
import {
    DuelError,
    duelDay,
    getBoard,
    lockDuel,
    prepareDuel,
    readDraft,
    readPrompt,
    readRound,
    rewriteDuel,
    roundView
} from '../../src/lib/server/oulipo-duel.js';
import { runRewrite } from '../../src/lib/server/oulipo-sappho.js';
import { SAPPHO_DUEL_PERSONAS, SAPPHO_MODEL, SAPPHO_PERSONAS, SAPPHO_REWRITE } from '../../src/lib/server/sappho-persona.js';
import { getToday } from '../../src/lib/server/writing-stats.js';
import { addDraft, addProfile, addPrompt, addUser, fakeAi, SCENES, SqliteD1 } from './helpers.js';

const DAY = '2026-11-23';
const keysOf = (story, lang) => analyze(story, lang).types.map((type) => type.key);

async function setup(lang = 'es', scene = SCENES.es) {
    const db = new SqliteD1();
    await addUser(db, 'player');
    await addPrompt(db, DAY, lang, 'The prompt of the day');
    await addDraft(db, DAY, lang, scene.draft);
    return db;
}

const lock = (db, overrides = {}) =>
    lockDuel(db, fakeAi(), {
        userId: 'player',
        locale: 'es',
        day: DAY,
        story: SCENES.es.story,
        ropes: keysOf(SCENES.es.story, 'es'),
        ...overrides
    });

async function rejectsCode(promise, status, code) {
    await assert.rejects(promise, (error) => {
        assert.ok(error instanceof DuelError, `expected DuelError, got ${error}`);
        assert.equal(error.status, status);
        assert.equal(error.code, code);
        return true;
    });
}

const wordsAt = (text, spans) => spans.map((span) => text.slice(span.start, span.end));

// ── The hidden draft ───────────────────────────────────────────────────

test('prepare writes one hidden draft per language and day and never returns it', async () => {
    const db = new SqliteD1();
    const ai = fakeAi(['A prompt about rain.', 'Her hidden piece, about rain.']);
    const first = await prepareDuel(db, ai, 'es', DAY);
    assert.equal(first.prompt.text, 'A prompt about rain.');
    assert.equal(typeof first.prompt.id, 'string');
    assert.equal(first.draftReady, true);
    assert.deepEqual(Object.keys(first).sort(), ['draftReady', 'prompt']);
    assert.ok(!JSON.stringify(first).includes('hidden piece'), 'the draft must not leak before locking');

    const second = await prepareDuel(db, ai, 'es', DAY);
    assert.deepEqual(second, first);
    assert.equal(ai.calls.length, 2, 'an existing draft is not written again');
    assert.equal(db.rows('SELECT COUNT(*) AS n FROM oulipo_duel_drafts')[0].n, 1);

    // The same day in another language is another draft.
    await prepareDuel(db, fakeAi(['A prompt.', 'Su pieza oculta.']), 'fr', DAY);
    assert.equal(db.rows('SELECT COUNT(*) AS n FROM oulipo_duel_drafts')[0].n, 2);
    assert.equal((await readDraft(db, 'es', DAY)).content, 'Her hidden piece, about rain.');
});

test('prepare asks Sappho with her own voice and the community prompt', async () => {
    const db = new SqliteD1();
    const ai = fakeAi(['Write about a door left open.', '  Her piece for the prompt.  ']);
    await prepareDuel(db, ai, 'fr', DAY);
    assert.equal(ai.calls[0].model, '@cf/mistralai/mistral-small-3.1-24b-instruct', 'the prompt generator');
    assert.equal(ai.calls[1].model, SAPPHO_MODEL);
    assert.equal(ai.calls[1].input.max_tokens, DUEL.maxDraftTokens);
    assert.equal(ai.calls[1].input.messages[0].content, SAPPHO_DUEL_PERSONAS.fr);
    assert.equal(
        ai.calls[1].input.messages[1].content,
        'Prompt: Write about a door left open.\n\nWrite your response:'
    );
    assert.equal((await readDraft(db, 'fr', DAY)).content, 'Her piece for the prompt.', 'trimmed');
    assert.equal((await readPrompt(db, DAY, 'fr')).prompt_text, 'Write about a door left open.');
});

test('three players arriving at once still get one draft', async () => {
    const db = new SqliteD1();
    const ai = fakeAi([
        'Prompt one.', 'Piece one.', 'Prompt two.', 'Piece two.', 'Prompt three.', 'Piece three.'
    ]);
    const results = await Promise.all([prepareDuel(db, ai, 'en', DAY), prepareDuel(db, ai, 'en', DAY), prepareDuel(db, ai, 'en', DAY)]);
    assert.equal(db.rows('SELECT COUNT(*) AS n FROM oulipo_duel_drafts')[0].n, 1);
    assert.equal(db.rows('SELECT COUNT(*) AS n FROM oulipo_duel_rounds')[0].n, 0);
    assert.equal(new Set(results.map((result) => result.prompt.text)).size, 1);
    assert.ok(results.every((result) => result.draftReady));
});

test('prepare fails cleanly when Sappho cannot write', async () => {
    const db = new SqliteD1();
    await addPrompt(db, DAY, 'es', 'Prompt.');
    await rejectsCode(prepareDuel(db, fakeAi(['']), 'es', DAY), 503, 'draft_failed');
    await rejectsCode(prepareDuel(db, fakeAi([new Error('gateway down')]), 'es', DAY), 503, 'draft_failed');
    await rejectsCode(prepareDuel(db, null, 'es', DAY), 503, 'no_engine');
    await rejectsCode(prepareDuel(db, fakeAi(['x']), 'de', DAY), 400, 'bad_language');
    assert.equal(db.rows('SELECT COUNT(*) AS n FROM oulipo_duel_drafts')[0].n, 0);
});

// ── Locking ────────────────────────────────────────────────────────────

test('lock and rewrite run the same way in fr, en and es', async () => {
    for (const [lang, scene] of Object.entries(SCENES)) {
        const db = new SqliteD1();
        await addUser(db, `player-${lang}`);
        await addDraft(db, DAY, lang, scene.draft);
        const view = await lockDuel(db, fakeAi(), {
            userId: `player-${lang}`,
            locale: lang,
            day: DAY,
            story: scene.story,
            ropes: scene.ropes
        });
        assert.equal(view.locale, lang);
        assert.equal(view.policy.verbs, 'strict', lang);
        // lighthouse / gulls / lamp / father and their equivalents: three are in the draft, the gulls are not.
        assert.deepEqual(
            view.ropes.map((rope) => rope.hit),
            [true, false, true, true],
            lang
        );
        assert.equal(view.hits, 3, lang);
        assert.equal(view.misses, 1, lang);
        assert.equal(view.score, 2, lang);
        assert.equal(view.ropeCount, 4, lang);
        assert.equal(view.draft.text, scene.draft, lang);
        assert.ok(view.draft.spans.length >= 3 && view.draft.spans.length <= 6, `${lang}: ${view.draft.spans.length}`);
        assert.deepEqual(view.rewrite, { status: 'pending', attempts: 0, violations: [], text: '', spans: [] }, lang);
        assert.equal(view.tier, 0, lang);

        const ai = fakeAi([scene.rewrite]);
        const after = await rewriteDuel(db, ai, { userId: `player-${lang}`, day: DAY });
        assert.equal(after.rewrite.status, 'clean', lang);
        assert.equal(after.rewrite.attempts, 1, lang);
        assert.equal(after.rewrite.text, scene.rewrite, lang);
        assert.deepEqual(after.rewrite.spans, [], lang);
        assert.equal(ai.calls.length, 1, lang);
        assert.equal(ai.calls[0].input.messages[0].content.startsWith(SAPPHO_DUEL_PERSONAS[lang]), true, lang);
        assert.ok(ai.calls[0].input.messages[1].content.includes(scene.draft), `${lang}: the piece travels with the request`);
    }
});

test('lock reveals the draft with every sent word marked at its position', async () => {
    const db = await setup();
    const view = await lock(db, { ropes: ['guardiana', 'padre'] });
    assert.deepEqual(wordsAt(view.draft.text, view.draft.spans), ['guardiana', 'padre']);
    assert.deepEqual(
        view.ropes.map((rope) => ({ key: rope.key, forms: rope.forms, draftForms: rope.draftForms })),
        [
            { key: 'guardiana', forms: ['guardiana'], draftForms: ['guardiana'] },
            { key: 'padre', forms: ['padre'], draftForms: ['padre'] }
        ]
    );
    const stored = await readRound(db, 'player', DAY);
    assert.equal(stored.story, SCENES.es.story);
    assert.equal(stored.policy, '{"verbs":"strict"}');
    assert.equal(stored.rewrite_status, 'pending');
    assert.deepEqual(JSON.parse(stored.ropes).map((rope) => rope.key), ['guardiana', 'padre']);
    assert.equal(roundView(stored, await readDraft(db, 'es', DAY)).id, view.id);
});

test('lock refuses stories outside the limits', async () => {
    const db = await setup();
    const words = (n) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(' ');
    await rejectsCode(lock(db, { story: '' }), 400, 'story_missing');
    await rejectsCode(lock(db, { story: '   ' }), 400, 'story_missing');
    await rejectsCode(lock(db, { story: null }), 400, 'story_missing');
    await rejectsCode(lock(db, { story: words(DUEL.minStoryWords - 1) }), 400, 'story_too_short');
    await rejectsCode(lock(db, { story: words(DUEL.maxStoryWords + 1) }), 400, 'story_too_long');
    await rejectsCode(lock(db, { story: 'a'.repeat(DUEL.maxStoryChars + 1) }), 400, 'story_too_long');
    assert.equal(db.rows('SELECT COUNT(*) AS n FROM oulipo_duel_rounds')[0].n, 0);
});

test('lock accepts a story exactly at the limits', async () => {
    const db = await setup();
    await addUser(db, 'other');
    const filler = (n) => Array.from({ length: n }, () => 'palabra').join(' ');
    const shortest = await lock(db, { story: `guardiana padre ${filler(DUEL.minStoryWords - 2)}`, ropes: ['padre'] });
    assert.equal(shortest.story.split(' ').length, DUEL.minStoryWords);
    const longest = await lockDuel(db, fakeAi(), {
        userId: 'other',
        locale: 'es',
        day: DAY,
        story: `padre ${filler(DUEL.maxStoryWords - 1)}`,
        ropes: ['padre']
    });
    assert.equal(longest.story.split(' ').length, DUEL.maxStoryWords);
    assert.equal(db.rows('SELECT COUNT(*) AS n FROM oulipo_duel_rounds')[0].n, 2);
});

test('lock re-checks every rope against the story on the server', async () => {
    const db = await setup();
    await rejectsCode(lock(db, { ropes: [] }), 400, 'ropes_missing');
    await rejectsCode(lock(db, { ropes: 'padre' }), 400, 'ropes_missing');
    await rejectsCode(lock(db, { ropes: ['the'] }), 400, 'rope_not_in_story'); // a function word
    await rejectsCode(lock(db, { ropes: ['mar'] }), 400, 'rope_not_in_story'); // under four letters
    await rejectsCode(lock(db, { ropes: ['gaviotas'] }), 400, 'rope_not_in_story'); // a surface form, not its key
    await rejectsCode(lock(db, { ropes: ['miraba'] }), 400, 'rope_not_in_story'); // only in the draft
    await rejectsCode(lock(db, { ropes: ['GUARDIANA'] }), 400, 'rope_not_in_story'); // never folded by the client
    await rejectsCode(lock(db, { ropes: ['padre', 7, null, ''] }), 400, 'rope_not_in_story');
    await rejectsCode(lock(db, { ropes: ["padre' OR 1=1 --"] }), 400, 'rope_not_in_story');
    assert.equal(db.rows('SELECT COUNT(*) AS n FROM oulipo_duel_rounds')[0].n, 0);
});

test('lock is once per player per day, in any language', async () => {
    const db = await setup('es');
    await addDraft(db, DAY, 'en', SCENES.en.draft);
    const first = await lock(db);
    await rejectsCode(lock(db), 409, 'already_locked');
    await rejectsCode(
        lockDuel(db, fakeAi(), { userId: 'player', locale: 'en', day: DAY, story: SCENES.en.story, ropes: ['lamp'] }),
        409,
        'already_locked'
    );
    // Another player, or another day, is another duel.
    await addUser(db, 'other');
    await lockDuel(db, fakeAi(), { userId: 'other', locale: 'es', day: DAY, story: SCENES.es.story, ropes: ['padre'] });
    await addDraft(db, '2026-11-24', 'es', SCENES.es.draft);
    await lockDuel(db, fakeAi(), { userId: 'player', locale: 'es', day: '2026-11-24', story: SCENES.es.story, ropes: ['padre'] });
    assert.equal(db.rows('SELECT COUNT(*) AS n FROM oulipo_duel_rounds')[0].n, 3);
    assert.equal((await readRound(db, 'player', DAY)).id, first.id);
});

test('lock does not score when the draft cannot be written', async () => {
    const db = new SqliteD1();
    await addUser(db, 'player');
    await addPrompt(db, DAY, 'es', 'Prompt.');
    await rejectsCode(lock(db), 503, 'draft_failed');
    assert.equal(db.rows('SELECT COUNT(*) AS n FROM oulipo_duel_rounds')[0].n, 0);
});

test('the duel shares the writers day', () => {
    assert.equal(duelDay(), getToday());
    assert.match(duelDay(), /^\d{4}-\d{2}-\d{2}$/);
});

// ── The rewrite ────────────────────────────────────────────────────────

const settled = (view) => view.rewrite.status === 'clean' || view.rewrite.status === 'escaped';

/** Ask for the rewrite until it settles. Returns every answer, in order. */
async function rewriteUntilSettled(db, ai) {
    const views = [];
    for (let request = 0; request < 12; request++) {
        const view = await rewriteDuel(db, ai, { userId: 'player', day: DAY });
        views.push(view);
        if (settled(view)) return views;
    }
    throw new Error('the rewrite never settled');
}

test('the rewrite forbids every sent word, hits and misses alike', async () => {
    const db = await setup();
    await lock(db, { ropes: ['guardiana', 'gaviota', 'padre'] });
    const ai = fakeAi(['Miraba el faro desde la torre.']);
    const view = await rewriteDuel(db, ai, { userId: 'player', day: DAY });
    assert.equal(ai.calls.length, 1);
    assert.equal(ai.calls[0].model, SAPPHO_MODEL);
    assert.equal(ai.calls[0].input.max_tokens, DUEL.maxRewriteTokens);
    const [system, task] = ai.calls[0].input.messages.map((message) => message.content);
    assert.ok(system.startsWith(SAPPHO_DUEL_PERSONAS.es), 'her own voice carries the rule');
    assert.ok(system.includes('guardiana, gaviotas, padre'));
    assert.ok(task.includes(SCENES.es.draft), 'she rewrites her own piece');
    assert.ok(task.includes('guardiana, gaviotas, padre'), 'misses are forbidden too');
    assert.deepEqual(view.rewrite, {
        status: 'clean',
        attempts: 1,
        violations: [],
        text: 'Miraba el faro desde la torre.',
        spans: []
    });
    const stored = await readRound(db, 'player', DAY);
    assert.equal(stored.rewrite_status, 'clean');
    assert.equal(stored.rewrite_attempts, 1);
    assert.equal(stored.rewrite_slipped, null);
});

test('every pass is a whole request, one pass per request, and progress is kept between them', async () => {
    const db = await setup();
    await lock(db, { ropes: ['guardiana', 'gaviota', 'padre'] });
    const ai = fakeAi([
        'La guardiana miraba el faro.', // keeps a forbidden word
        'Otra vez la guardiana.', // and again
        'Miraba el faro desde la torre.' // clean
    ]);
    const ask = () => rewriteDuel(db, ai, { userId: 'player', day: DAY });

    const first = await ask();
    assert.equal(ai.calls.length, 1, 'a request is one pass');
    assert.equal(first.rewrite.status, 'pending', 'not finished');
    assert.equal(first.rewrite.attempts, 1);
    assert.equal(first.rewrite.text, 'La guardiana miraba el faro.', 'the best so far is kept');
    let stored = await readRound(db, 'player', DAY);
    assert.equal(stored.rewrite_status, 'pending', 'the pen is given back between passes');
    assert.equal(stored.rewrite_slipped, '["guardiana"]');

    const second = await ask();
    assert.equal(ai.calls.length, 2);
    assert.equal(second.rewrite.status, 'pending');
    assert.equal(second.rewrite.attempts, 2);
    const third = await ask();
    assert.equal(third.rewrite.status, 'clean');
    assert.equal(third.rewrite.attempts, 3);
    assert.equal(third.rewrite.text, 'Miraba el faro desde la torre.');
    stored = await readRound(db, 'player', DAY);
    assert.equal(stored.rewrite_attempts, 3);
    assert.equal(stored.rewrite_slipped, null);

    // Each pass stands on its own: the piece, the whole list, and from the
    // second pass on the words that got through the last time.
    for (const [index, call] of ai.calls.entries()) {
        assert.equal(call.input.messages.length, 2, `pass ${index + 1}: system and user, no history`);
        const [system, task] = call.input.messages.map((message) => message.content);
        assert.ok(system.includes('guardiana, gaviotas, padre'), `pass ${index + 1}: the rule lists every word`);
        assert.ok(task.includes(SCENES.es.draft), `pass ${index + 1}: the piece travels with the request`);
        assert.ok(task.includes('guardiana, gaviotas, padre'), `pass ${index + 1}: the task lists every word`);
        assert.equal(task.includes('intento anterior'), index > 0, `pass ${index + 1}: only a retry mentions the last one`);
    }
    assert.ok(ai.calls[1].input.messages[1].content.includes('guardiana'), 'the retry names what got through');
    assert.equal((await ask()).rewrite.status, 'clean', 'a settled rewrite is simply returned');
    assert.equal(ai.calls.length, 3, 'and costs no further pass');
});

test('a pass that follows a closed tab picks up where the last one stopped', async () => {
    const db = await setup();
    await lock(db, { ropes: ['guardiana', 'padre'] });
    await rewriteDuel(db, fakeAi(['La guardiana llamó a su padre.']), { userId: 'player', day: DAY });
    // Nothing is held in memory between requests: a new one reads the round.
    const later = fakeAi(['La guardiana esperó.', 'Miraba el faro.']);
    await rewriteDuel(db, later, { userId: 'player', day: DAY });
    const note = later.calls[0].input.messages[1].content;
    assert.ok(note.includes(SCENES.es.draft) && note.includes('guardiana, padre'), 'still a whole request');
    assert.ok(note.includes('guardiana') && note.includes('padre') && note.includes('intento anterior'), 'and told what slipped before');
    const views = await rewriteUntilSettled(db, later);
    assert.equal(views.at(-1).rewrite.attempts, 3);
});

test('the rewrite catches another form of a sent word', async () => {
    const db = new SqliteD1();
    await addUser(db, 'player');
    await addDraft(db, DAY, 'es', 'Una casa en la colina.');
    await lockDuel(db, fakeAi(), {
        userId: 'player',
        locale: 'es',
        day: DAY,
        story: `Mi casa tiene tejas rojas ${'palabra '.repeat(DUEL.minStoryWords).trim()}`,
        ropes: ['casa']
    });
    const ai = fakeAi(['Vi unas casas.', 'Vi una colina.']);
    const views = await rewriteUntilSettled(db, ai);
    assert.equal(ai.calls.length, 2, 'the plural was caught and retried');
    assert.ok(ai.calls[1].input.messages[1].content.includes('casas'));
    assert.deepEqual(
        views.map((view) => [view.rewrite.status, view.rewrite.attempts]),
        [['pending', 1], ['clean', 2]]
    );
    assert.equal(views.at(-1).rewrite.text, 'Vi una colina.');
});

test('the rewrite keeps the best pass and reports what escaped', async () => {
    const db = await setup();
    await lock(db, { ropes: ['guardiana', 'padre', 'gaviota'] });
    const ai = fakeAi([
        'La guardiana, su padre y las gaviotas.', // three left
        'La guardiana llamó a su padre.', // two left
        'Las gaviotas cruzaron el cielo.', // one left
        'El padre miró las gaviotas y la guardiana.' // three again
    ]);
    const views = await rewriteUntilSettled(db, ai);
    assert.equal(ai.calls.length, DUEL.rewriteAttempts, 'one call per request, up to the limit');
    assert.deepEqual(
        views.map((view) => view.rewrite.status),
        ['pending', 'pending', 'pending', 'escaped']
    );
    const last = views.at(-1).rewrite;
    assert.equal(last.attempts, 4);
    assert.equal(last.text, 'Las gaviotas cruzaron el cielo.');
    assert.deepEqual(last.violations, ['gaviotas']);
    assert.deepEqual(wordsAt(last.text, last.spans), ['gaviotas']);
    assert.equal((await readRound(db, 'player', DAY)).rewrite_violations, '["gaviotas"]');
    assert.equal((await readRound(db, 'player', DAY)).rewrite_slipped, null);
});

test('a silent engine never uses up a pass, and the player can ask again', async () => {
    const db = await setup();
    await lock(db, { ropes: ['padre'] });
    const original = console.error;
    console.error = () => {};
    try {
        // Four requests, one call each: empty, a thrown error, empty, blank.
        const ai = fakeAi(['', new Error('gateway down'), '', '   ']);
        for (let request = 0; request < 4; request++) {
            await rejectsCode(rewriteDuel(db, ai, { userId: 'player', day: DAY }), 503, 'rewrite_failed');
            assert.equal(ai.calls.length, request + 1, 'a request is one call, never a loop');
            const stored = await readRound(db, 'player', DAY);
            assert.equal(stored.rewrite_status, 'pending', 'the round is not held');
            assert.equal(stored.rewrite_attempts, 0, 'and no pass was spent');
        }
    } finally {
        console.error = original;
    }
    const view = await rewriteDuel(db, fakeAi([SCENES.es.rewrite]), { userId: 'player', day: DAY });
    assert.deepEqual([view.rewrite.status, view.rewrite.attempts], ['clean', 1]);
});

test('an empty pass after a real one counts as a pass and keeps what she wrote', async () => {
    const db = await setup();
    await lock(db, { ropes: ['guardiana', 'padre'] });
    const original = console.error;
    console.error = () => {};
    try {
        const ai = fakeAi(['La guardiana miraba el faro.', '', 'Miraba el faro.']);
        const ask = () => rewriteDuel(db, ai, { userId: 'player', day: DAY });
        const first = await ask();
        const second = await ask();
        assert.deepEqual([first.rewrite.attempts, second.rewrite.attempts], [1, 2]);
        assert.equal(second.rewrite.text, 'La guardiana miraba el faro.', 'the best so far is kept through the empty pass');
        assert.equal((await readRound(db, 'player', DAY)).rewrite_slipped, '["guardiana"]', 'and so is what the next pass must avoid');
        const third = await ask();
        assert.deepEqual([third.rewrite.status, third.rewrite.attempts], ['clean', 3]);
    } finally {
        console.error = original;
    }
});

test('runRewrite works without a database and stops at the first clean pass', async () => {
    const ai = fakeAi(['A prose piece.', 'Clean now.', 'Never asked.']);
    const outcome = await runRewrite(ai, 'en', 'A piece of prose.', ['prose'], {
        policy: { verbs: 'strict' },
        bannedKeys: ['prose']
    });
    assert.deepEqual(outcome, { content: 'Clean now.', violations: [], attempts: 2 });
    assert.equal(ai.calls.length, 2, 'the third answer is never requested');
    const [system, task] = ai.calls[0].input.messages.map((message) => message.content);
    assert.ok(system.startsWith(SAPPHO_DUEL_PERSONAS.en), 'her own voice carries the rule');
    assert.ok(system.includes('prose'));
    assert.ok(task.includes('A piece of prose.') && task.includes('prose'));
    const retry = ai.calls[1].input.messages[1].content;
    assert.ok(retry.includes('A piece of prose.') && retry.includes('previous attempt'), 'a retry is a whole request too');
    // One script per language, with the same three parts.
    for (const lang of ['en', 'es', 'fr']) {
        assert.deepEqual(Object.keys(SAPPHO_REWRITE[lang]), ['rule', 'task', 'retryNote'], lang);
    }
});

test('the rewrite happens once however many tabs ask', async () => {
    const db = await setup();
    await lock(db, { ropes: ['padre'] });
    const lines = ['Otra versión del texto.', 'Otra más, sin nada.', 'Una tercera.'];
    const answers = lines.map((line) => fakeAi([line]));
    const quick = { pause: async () => {} };
    const views = await Promise.all(
        answers.map((ai) => rewriteDuel(db, ai, { userId: 'player', day: DAY, ...quick }))
    );
    // Exactly one tab made the pass; the others were told where things stand.
    const holder = answers.findIndex((ai) => ai.calls.length > 0);
    assert.ok(holder >= 0 && answers.filter((ai) => ai.calls.length > 0).length === 1, 'only one tab generates');
    for (const view of views) assert.ok(settled(view) || view.rewrite.status === 'writing', view.rewrite.status);
    assert.equal(views[holder].rewrite.text, lines[holder], 'whoever held the pen wrote it');
    // Afterwards the answer is read back, with no engine needed at all.
    const after = await rewriteDuel(db, null, { userId: 'player', day: DAY });
    assert.equal(after.rewrite.status, 'clean');
    assert.equal(after.rewrite.text, lines[holder]);
});

test('a request that loses the claim reports where things stand, and a hung claim can be taken over', async () => {
    const db = await setup();
    await lock(db, { ropes: ['padre'] });
    // A round left claimed by a request that died a minute ago is still the holder's...
    await db
        .prepare("UPDATE oulipo_duel_rounds SET rewrite_status = 'writing', updated_at = datetime('now', '-1 minute') WHERE user_id = 'player'")
        .bind()
        .run();
    const loser = await rewriteDuel(db, fakeAi(['Never used.']), { userId: 'player', day: DAY, pause: async () => {} });
    assert.equal(loser.rewrite.status, 'writing', 'still being written by someone else');
    assert.equal(loser.rewrite.text, '');
    // ...but a claim older than five minutes may be taken over.
    await db
        .prepare("UPDATE oulipo_duel_rounds SET updated_at = datetime('now', '-6 minutes') WHERE user_id = 'player'")
        .bind()
        .run();
    const taker = await rewriteDuel(db, fakeAi([SCENES.es.rewrite]), { userId: 'player', day: DAY });
    assert.equal(taker.rewrite.status, 'clean');
    assert.equal(taker.rewrite.text, SCENES.es.rewrite);
});

test('a broken engine never leaves a round claimed', async () => {
    const db = await setup();
    await lock(db, { ropes: ['padre'] });
    await rejectsCode(rewriteDuel(db, null, { userId: 'player', day: DAY }), 503, 'no_engine');
    assert.equal((await readRound(db, 'player', DAY)).rewrite_status, 'pending');
    const view = await rewriteDuel(db, fakeAi([SCENES.es.rewrite]), { userId: 'player', day: DAY });
    assert.equal(view.rewrite.status, 'clean');
});

test('a rewrite needs a locked duel', async () => {
    const db = new SqliteD1();
    await addUser(db, 'player');
    await rejectsCode(rewriteDuel(db, fakeAi(), { userId: 'player', day: DAY }), 404, 'no_round');
});

// ── Sappho's voice ─────────────────────────────────────────────────────

test("the duel asks Sappho for a shorter piece without touching her daily voice", () => {
    const starts = { en: 'Keep it between', es: 'Manténla entre', fr: 'Garde-la entre' };
    /** The persona without its sentence about length. */
    const voiceOnly = (persona, start) => {
        const at = persona.indexOf(start);
        assert.ok(at > 0, `no length sentence at "${start}"`);
        return persona.slice(0, at) + persona.slice(persona.indexOf('. ', at) + 1);
    };
    for (const [lang, start] of Object.entries(starts)) {
        const daily = SAPPHO_PERSONAS[lang];
        const duel = SAPPHO_DUEL_PERSONAS[lang];
        assert.match(daily, /250/, `${lang}: the daily length is the one she has always been given`);
        assert.match(duel, /180/, `${lang}: the duel asks for less`);
        assert.ok(!duel.includes('250'), lang);
        assert.equal(voiceOnly(duel, start), voiceOnly(daily, start), `${lang}: the same voice either way`);
    }
});

// ── The day's board ────────────────────────────────────────────────────

test('the board ranks by score, hides private names and honours the scoreboard opt-out', async () => {
    const db = new SqliteD1();
    for (const id of ['ana', 'boca', 'rio', 'shy']) await addUser(db, id, { username: id, showProfile: id === 'shy' ? 0 : 1 });
    await addProfile(db, 'ana', { displayName: 'Pluma' });
    await addProfile(db, 'boca', { scoreboard: 0 });
    await addDraft(db, DAY, 'es', SCENES.es.draft);
    // ana: 3 hits, 1 miss (+2). boca: one hit (+1). rio: one miss (−1). shy: one hit (+1).
    const play = (id, ropes) =>
        lockDuel(db, fakeAi(), { userId: id, locale: 'es', day: DAY, story: SCENES.es.story, ropes });
    await play('ana', SCENES.es.ropes);
    await play('boca', ['guardiana']);
    await play('rio', ['gaviota']);
    await play('shy', ['padre']);

    const board = await getBoard(db, 'es', DAY, { userId: 'ana' });
    // boca (+1) asked not to be shown on scoreboards; shy asked for a private profile.
    assert.deepEqual(
        board.map((row) => [row.name, row.score, row.mine]),
        [['Pluma', 2, true], [null, 1, false], ['rio', -1, false]]
    );
    assert.deepEqual((await getBoard(db, 'es', DAY)).map((row) => row.mine), [false, false, false]);
    assert.ok(!JSON.stringify(board).includes('boca'), 'an opt-out is an opt-out');
    assert.deepEqual(board[0], {
        id: board[0].id,
        mine: true,
        name: 'Pluma',
        score: 2,
        muzzlePct: board[0].muzzlePct,
        hits: 3,
        misses: 1,
        ropeCount: 4
    });
    // Ties go to the deeper muzzle; the board is per language and per day.
    assert.deepEqual(await getBoard(db, 'fr', DAY), []);
    assert.deepEqual(await getBoard(db, 'es', '2026-11-24'), []);
    assert.deepEqual(await getBoard(db, 'de', DAY), []);
});

test('a board that cannot be read is empty rather than indiscreet', async () => {
    const db = new SqliteD1();
    db.db.exec('DROP TABLE profiles');
    await addUser(db, 'ana');
    await addDraft(db, DAY, 'es', SCENES.es.draft);
    await lockDuel(db, fakeAi(), { userId: 'ana', locale: 'es', day: DAY, story: SCENES.es.story, ropes: ['padre'] });
    const original = console.error;
    console.error = () => {};
    try {
        assert.deepEqual(await getBoard(db, 'es', DAY), []);
    } finally {
        console.error = original;
    }
});

test('a request that loses the claim is told the winner answer, and a hung claim can be taken over', async () => {
    const db = await setup();
    await lock(db, { ropes: ['padre'] });
    // A round left claimed by a request that died a minute ago is still the winner's...
    await db.prepare("UPDATE oulipo_duel_rounds SET rewrite_status = 'writing', updated_at = datetime('now', '-1 minute') WHERE user_id = 'player'").bind().run();
    const loser = await rewriteDuel(db, fakeAi(['Never used.']), {
        userId: 'player',
        day: DAY,
        pause: async () => {},
        waitRounds: 3
    });
    assert.equal(loser.rewrite.status, 'writing', 'still being written by someone else');
    assert.equal(loser.rewrite.text, '');
    assert.equal(db.rows('SELECT rewrite_violations FROM oulipo_duel_rounds')[0].rewrite_violations, null);
    // ...but a claim older than five minutes may be taken over.
    await db.prepare("UPDATE oulipo_duel_rounds SET updated_at = datetime('now', '-6 minutes') WHERE user_id = 'player'").bind().run();
    const taker = await rewriteDuel(db, fakeAi([SCENES.es.rewrite]), { userId: 'player', day: DAY });
    assert.equal(taker.rewrite.status, 'clean');
    assert.equal(taker.rewrite.text, SCENES.es.rewrite);
});

test('a broken engine never leaves a round claimed', async () => {
    const db = await setup();
    await lock(db, { ropes: ['padre'] });
    await rejectsCode(rewriteDuel(db, null, { userId: 'player', day: DAY }), 503, 'no_engine');
    assert.equal((await readRound(db, 'player', DAY)).rewrite_status, 'pending');
    const view = await rewriteDuel(db, fakeAi([SCENES.es.rewrite]), { userId: 'player', day: DAY });
    assert.equal(view.rewrite.status, 'clean');
});
