<!-- src/routes/oulipo/duel/+page.svelte
     The solitaire duel. Sappho has written a hidden piece for today's
     prompt; the player writes one, sends some of its words against hers,
     and scores the ones her draft used. One duel a day. -->
<script>
    import { onMount } from 'svelte';
    import { t } from '#lib/i18n/index.js';
    import { analyze, countWords, defaultPolicy } from '#lib/oulipo/engine.js';
    import { DUEL } from '#lib/oulipo/duel-rules.js';

    /** @typedef {import('#lib/oulipo/types.js').Span} Span */
    /** @typedef {import('#lib/oulipo/types.js').RoundView} RoundView */
    /** @typedef {{ text: string, hit: boolean }} Part */
    /** @typedef {'unavailable' | 'signin' | 'preparing' | 'write' | 'locked'} Stage */
    /** @typedef {'' | 'prepare' | 'lock' | 'rewrite'} Busy */

    let { data } = $props();

    // The page is rendered per visit, so reading the loader's answer once,
    // to start from, is exactly the intent.
    // svelte-ignore state_referenced_locally
    const start = {
        locale: data.locale,
        stage: /** @type {Stage} */ (
            data.unavailable
                ? 'unavailable'
                : data.round
                  ? 'locked'
                  : !data.signedIn
                    ? 'signin'
                    : data.prompt && data.draftReady
                      ? 'write'
                      : 'preparing'
        ),
        prompt: data.prompt?.text ?? '',
        round: /** @type {RoundView | null} */ (data.round ?? null),
        board: data.board ?? []
    };

    const lang = start.locale;
    const policy = defaultPolicy(lang);

    /** Fill {name} placeholders in an already translated string.
     *  @param {string} text @param {Record<string, string | number>} values */
    const fill = (text, values) =>
        Object.entries(values).reduce(
            (out, [name, value]) => out.split(`{${name}}`).join(String(value)),
            text
        );

    const HERE = '/oulipo/duel';
    const LOGIN = `/login?redirect=${encodeURIComponent(HERE)}`;
    const SIGNUP = `/signup?redirect=${encodeURIComponent(HERE)}`;

    /** What the server's error codes mean to a player. @type {Record<string, string>} */
    const ERROR_KEYS = {
        story_missing: 'duel.too_short',
        story_too_short: 'duel.too_short',
        story_too_long: 'duel.too_long',
        rope_not_in_story: 'duel.rope_bad',
        ropes_missing: 'duel.rope_bad',
        already_locked: 'duel.already_locked',
        draft_failed: 'duel.prepare_failed',
        no_engine: 'duel.prepare_failed',
        rewrite_failed: 'duel.rewrite_failed'
    };

    let stage = $state(start.stage);
    let prompt = $state(start.prompt);
    let story = $state('');
    /** Rope keys, in the order they will be sent. */
    let chosen = $state(/** @type {string[]} */ ([]));
    let target = $state(0);
    let round = $state(start.round);
    let board = $state(start.board);
    let busy = $state(/** @type {Busy} */ (''));
    /** i18n key of the last message shown. */
    let notice = $state('');
    /** Passes Sappho has made so far, while the rewrite is still going. */
    let pass = $state(0);
    let pollTimer = $state(/** @type {number | undefined} */ (undefined));

    const candidates = $derived(analyze(story, lang, policy).types);
    const wordCount = $derived(countWords(story));
    const storyFits = $derived(wordCount >= DUEL.minStoryWords && wordCount <= DUEL.maxStoryWords);
    const chosenSet = $derived(new Set(chosen));
    const rewriteStatus = $derived(round?.rewrite.status ?? 'pending');

    // Words the player took back out of the story cannot stay sent.
    $effect(() => {
        const alive = new Set(candidates.map((type) => type.key));
        const kept = chosen.filter((key) => alive.has(key));
        if (kept.length !== chosen.length) {
            chosen = kept;
            target = kept.length;
        }
    });

    /**
     * Call one of the duel's endpoints: a POST when a body is given, a GET
     * otherwise. A request that cannot be made or answered at all comes
     * back as a failure, never as a thrown error.
     * @param {string} path
     * @param {unknown} [body]
     * @returns {Promise<{ ok: boolean, payload: any }>}
     */
    async function call(path, body) {
        const hasBody = body !== undefined;
        try {
            const response = await fetch(`/api/oulipo/duel/${path}`, {
                method: hasBody ? 'POST' : 'GET',
                headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
                body: hasBody ? JSON.stringify(body) : undefined
            });
            let payload = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }
            return { ok: response.ok, payload };
        } catch {
            return { ok: false, payload: null };
        }
    }

    async function prepare() {
        busy = 'prepare';
        notice = '';
        const { ok, payload } = await call('prepare', {});
        busy = '';
        if (ok && payload?.prompt?.text && payload?.draftReady) {
            prompt = payload.prompt.text;
            stage = 'write';
        } else {
            notice = 'duel.prepare_failed';
        }
    }

    /** The slider sends the first `count` words of the piece. @param {number} count */
    function sendFirst(count) {
        target = count;
        chosen = candidates.slice(0, count).map((type) => type.key);
    }

    /** @param {string} key */
    function toggle(key) {
        chosen = chosen.includes(key) ? chosen.filter((other) => other !== key) : [...chosen, key];
        target = chosen.length;
    }

    async function lock() {
        busy = 'lock';
        notice = '';
        const { ok, payload } = await call('lock', { story, ropes: chosen });
        busy = '';
        if (ok && payload?.draft) {
            round = /** @type {RoundView} */ (payload);
            stage = 'locked';
            rewrite();
            loadBoard();
        } else {
            notice = ERROR_KEYS[payload?.error] ?? 'duel.error';
        }
    }

    /**
     * Ask for the rewrite until it settles. Each request is one pass of
     * Sappho's; the page asks again a moment after an unfinished answer.
     * Bounded, so a round that never settles cannot keep a tab busy forever.
     * @param {number} tries
     */
    async function rewrite(tries = 0) {
        busy = 'rewrite';
        notice = '';
        const { ok, payload } = await call('rewrite', {});
        if (ok && payload?.draft) {
            round = /** @type {RoundView} */ (payload);
            pass = round.rewrite.attempts;
            const status = round.rewrite.status;
            if (status === 'clean' || status === 'escaped') {
                busy = '';
                return;
            }
            if (tries < 30) {
                pollTimer = window.setTimeout(() => rewrite(tries + 1), 1500);
                return;
            }
        }
        // A request that failed or never finished is the card's to explain:
        // it says the rewrite did not come through, and offers to ask again.
        busy = '';
        pass = 0;
    }

    async function loadBoard() {
        const { ok, payload } = await call('board');
        if (ok) board = payload.board ?? [];
    }

    /**
     * Split a text into plain and marked parts, at the server's positions.
     * @param {string} text @param {Span[]} spans @returns {Part[]}
     */
    function segments(text, spans) {
        /** @type {Part[]} */
        const parts = [];
        /** @param {number} start @param {number} end @param {boolean} hit */
        const push = (start, end, hit) => {
            if (end > start) parts.push({ text: text.slice(start, end), hit });
        };
        let at = 0;
        for (const span of spans) {
            push(at, span.start, false);
            push(span.start, span.end, true);
            at = span.end;
        }
        push(at, text.length, false);
        return parts;
    }

    async function share() {
        if (!round) return;
        const marks = round.ropes.map((rope) => (rope.bite ? '🟢' : '🔴')).join('');
        const text = [
            `${$t('duel.title')} · ${round.date}`,
            marks,
            `🟢 ${round.bites}  🔴 ${round.misses}  ⛔ ${round.muzzlePct}%`,
            `${location.origin}${HERE}`
        ].join('\n');
        try {
            await navigator.clipboard.writeText(text);
            notice = 'duel.copied';
        } catch {
            notice = 'duel.copy_failed';
        }
    }

    onMount(() => {
        if (stage === 'preparing') prepare();
        // Back to a duel whose rewrite is still being asked for elsewhere.
        else if (stage === 'locked' && rewriteStatus !== 'clean' && rewriteStatus !== 'escaped') rewrite();
        return () => window.clearTimeout(pollTimer);
    });
</script>

<svelte:head>
    <title>{$t('duel.title')} — Patrouch</title>
</svelte:head>

<div class="duel-page ambient-glow">
    <header class="head">
        <h1>{$t('duel.title')}</h1>
        <p class="tagline">{$t('duel.tagline')}</p>
    </header>

    <p class="notice" aria-live="polite">
        {notice ? fill($t(notice), { n: notice === 'duel.too_long' ? DUEL.maxStoryWords : DUEL.minStoryWords }) : ''}
    </p>

    {#if stage === 'unavailable'}
        <section class="glass-surface card"><p>{$t('duel.unavailable')}</p></section>
    {:else if stage === 'signin'}
        <section class="glass-surface card center">
            <p>{$t('duel.signin')}</p>
            <div class="row">
                <a class="btn-primary" href={LOGIN}>{$t('common.nav.login')}</a>
                <a class="btn-secondary" href={SIGNUP}>{$t('common.nav.signup')}</a>
            </div>
        </section>
    {:else if stage === 'preparing'}
        <section class="glass-surface card center">
            {#if busy === 'prepare'}
                <p class="waiting"><span class="dot" aria-hidden="true"></span>{$t('duel.preparing')}</p>
            {:else}
                <button class="btn-primary" type="button" onclick={prepare}>{$t('duel.retry')}</button>
            {/if}
        </section>
    {:else if stage === 'write'}
        <section class="glass-surface card">
            <h2>{$t('duel.prompt_label')}</h2>
            <p class="prompt">{prompt}</p>
        </section>

        <section class="glass-surface card">
            <ol class="rules">
                <li>{$t('duel.rule_1')}</li>
                <li>{$t('duel.rule_2')}</li>
                <li>{$t('duel.rule_3')}</li>
            </ol>
            <p class="note">{$t('duel.note')}</p>
        </section>

        <section class="glass-surface card">
            <h2>{$t('duel.story_label')}</h2>
            <textarea
                bind:value={story}
                maxlength={DUEL.maxStoryChars}
                rows="9"
                placeholder={$t('duel.placeholder')}
                disabled={busy !== ''}
            ></textarea>
            <p class="count" class:off={!storyFits}>
                {#if wordCount < DUEL.minStoryWords}
                    {fill($t('duel.too_short'), { n: DUEL.minStoryWords })}
                {:else if wordCount > DUEL.maxStoryWords}
                    {fill($t('duel.too_long'), { n: DUEL.maxStoryWords })}
                {:else}
                    {fill($t('duel.words'), { n: wordCount })}
                {/if}
            </p>
        </section>

        {#if candidates.length}
            <section class="glass-surface card">
                <h2>{$t('duel.choose_title')}</h2>
                <p class="note">{$t('duel.choose_body')}</p>
                <input
                    class="slider"
                    type="range"
                    min="0"
                    max={candidates.length}
                    value={target}
                    oninput={(event) => sendFirst(Number(event.currentTarget.value))}
                    aria-label={$t('duel.choose_title')}
                    disabled={busy !== ''}
                />
                <div class="row wrap">
                    <span class="count">{fill($t('duel.ropes_count'), { n: chosen.length, total: candidates.length })}</span>
                    <button class="btn-secondary small" type="button" onclick={() => sendFirst(candidates.length)} disabled={busy !== '' || target === candidates.length}>
                        {$t('duel.send_all')}
                    </button>
                    <button class="btn-secondary small" type="button" onclick={() => sendFirst(0)} disabled={busy !== '' || target === 0}>
                        {$t('duel.clear')}
                    </button>
                </div>
                <div class="chips">
                    {#each candidates as type (type.key)}
                        <button
                            class="chip"
                            class:on={chosenSet.has(type.key)}
                            type="button"
                            aria-pressed={chosenSet.has(type.key)}
                            disabled={busy !== ''}
                            title={type.count > 1 ? `×${type.count}` : ''}
                            onclick={() => toggle(type.key)}
                        >{type.display}</button>
                    {/each}
                </div>
                <div class="row">
                    <button class="btn-primary" type="button" onclick={lock} disabled={busy !== '' || !storyFits || chosen.length < DUEL.minRopes}>
                        {busy === 'lock' ? '…' : $t('duel.lock')}
                    </button>
                    <span class="note">{$t('duel.lock_hint')}</span>
                </div>
            </section>
        {/if}
    {:else if stage === 'locked' && round}
        <section class="glass-surface card">
            <p class="locked">{$t('duel.locked_notice')}</p>
            <dl class="tiles">
                <div class="tile score">
                    <dt>{$t('duel.score')}</dt>
                    <dd>{round.score > 0 ? '+' : ''}{round.score}</dd>
                </div>
                <div class="tile">
                    <dt>{$t('duel.bites')}</dt>
                    <dd class="bite">{round.bites}</dd>
                </div>
                <div class="tile">
                    <dt>{$t('duel.misses')}</dt>
                    <dd class="miss">{round.misses}</dd>
                </div>
                <div class="tile">
                    <dt>{$t('duel.muzzle')}</dt>
                    <dd>{round.muzzlePct}%</dd>
                </div>
            </dl>
            <p class="caption">
                {round.muzzlePct > 0
                    ? fill($t('duel.muzzle_line'), { pct: round.muzzlePct })
                    : $t('duel.muzzle_none')}
            </p>
            <p class="caption">{fill($t('duel.sent_line'), { tier: $t(`duel.tier.${round.tier}`) })}</p>
            <div class="row">
                <button class="btn-secondary small" type="button" onclick={share}>{$t('duel.share')}</button>
            </div>
            <h3>{$t('duel.your_words')}</h3>
            <div class="chips">
                {#each round.ropes as rope (rope.key)}
                    <span class="chip static" class:bite={rope.bite} class:miss={!rope.bite}>{rope.forms[0]}</span>
                {/each}
            </div>
        </section>

        <section class="glass-surface card">
            <h2>{$t('duel.she_wrote')}</h2>
            <p class="note">{$t('duel.she_wrote_note')}</p>
            <p class="piece">{#each segments(round.draft.text, round.draft.spans) as part, i (i)}{#if part.hit}<mark class="bite">{part.text}</mark>{:else}{part.text}{/if}{/each}</p>
        </section>

        <section class="glass-surface card">
            {#if rewriteStatus === 'clean' || rewriteStatus === 'escaped'}
                <h2>{$t('duel.rewrite_title')}</h2>
                {#if rewriteStatus === 'clean'}
                    <p class="note">{$t('duel.clean')}</p>
                {:else}
                    <p class="note">{$t('duel.escaped')}</p>
                    <div class="chips tight">
                        {#each round.rewrite.violations as word (word)}<span class="chip static miss">{word}</span>{/each}
                    </div>
                {/if}
                {#if round.rewrite.attempts > 1}
                    <p class="note muted">{fill($t('duel.attempts'), { n: round.rewrite.attempts })}</p>
                {/if}
                <p class="piece">{#each segments(round.rewrite.text, round.rewrite.spans) as part, i (i)}{#if part.hit}<mark class="miss">{part.text}</mark>{:else}{part.text}{/if}{/each}</p>
            {:else if busy === 'rewrite'}
                <p class="waiting">
                    <span class="dot" aria-hidden="true"></span>
                    {pass > 0
                        ? fill($t('duel.rewrite_pass'), { n: pass, total: DUEL.rewriteAttempts })
                        : $t('duel.rewriting')}
                </p>
            {:else}
                <p>{$t('duel.rewrite_failed')}</p>
                <button class="btn-primary" type="button" onclick={() => rewrite()}>{$t('duel.ask_rewrite')}</button>
            {/if}
        </section>
    {/if}

    {#if stage === 'locked' && round}
        <section class="glass-surface card">
            <h2>{$t('duel.board_title')}</h2>
            {#if board.length === 0}
                <p class="note">{$t('duel.board_empty')}</p>
            {:else}
                <ol class="board">
                    {#each board as row, i (row.id)}
                        <li class:mine={row.mine}>
                            <span class="rank">{i + 1}</span>
                            <span class="name">
                                {row.name ?? '·'}
                                {#if row.mine}<small> · {$t('duel.you')}</small>{/if}
                            </span>
                            <span class="marks">🟢 {row.bites} · 🔴 {row.misses}</span>
                            <span class="pts">{row.score > 0 ? '+' : ''}{row.score}</span>
                        </li>
                    {/each}
                </ol>
            {/if}
        </section>
    {/if}
</div>

<style>
    /* Bites and misses need a colour of their own in both themes. */
    .duel-page {
        --bite: #2f7d5b;
        --bite-bg: rgba(47, 125, 91, 0.14);
        --miss: #a33a48;
        --miss-bg: rgba(163, 58, 72, 0.12);
        max-width: 760px;
        margin: 0 auto;
        padding: 2.5rem 1.25rem 4rem;
    }
    :global(html[data-theme='dark']) .duel-page {
        --bite: #7fd1a8;
        --bite-bg: rgba(127, 209, 168, 0.16);
        --miss: #f0959f;
        --miss-bg: rgba(240, 149, 159, 0.16);
    }

    .head {
        margin-bottom: 2rem;
    }
    h1 {
        font-family: var(--font-display);
        font-size: clamp(2.4rem, 8vw, 3.6rem);
        line-height: 1;
        font-weight: 900;
        color: var(--signature);
        margin: 0 0 0.75rem;
    }
    .tagline {
        color: var(--text-dim);
        font-size: 1.02rem;
        line-height: 1.6;
    }
    h2 {
        font-family: var(--font-heading);
        font-weight: 400;
        font-size: 1.3rem;
        color: var(--text);
        margin: 0 0 0.75rem;
    }
    h3 {
        font-family: var(--font-heading);
        font-weight: 600;
        font-size: 1.02rem;
        color: var(--text);
        margin: 1.5rem 0 0.5rem;
    }

    .card {
        padding: 1.75rem;
        margin-bottom: 1.5rem;
    }
    .card.center {
        text-align: center;
        padding: 2.5rem 1.75rem;
    }
    .prompt {
        font-family: var(--font-heading);
        font-size: 1.25rem;
        line-height: 1.45;
        color: var(--text);
    }
    .note {
        color: var(--text-dim);
        font-size: 0.9rem;
        line-height: 1.6;
    }
    .rules {
        margin: 0 0 0.75rem 1.25rem;
        color: var(--text);
        line-height: 1.7;
        font-size: 0.98rem;
    }
    .rules li + li {
        margin-top: 0.35rem;
    }
    .notice {
        min-height: 1.5rem;
        margin: 0 0 1rem;
        color: var(--miss);
        font-size: 0.92rem;
        line-height: 1.5;
        text-align: center;
    }

    textarea {
        width: 100%;
        resize: vertical;
        min-height: 12rem;
        line-height: 1.7;
        font-size: 1.02rem;
    }
    .count {
        color: var(--accent);
        font-size: 0.88rem;
        font-weight: 600;
        margin-top: 0.6rem;
    }
    .count.off {
        color: var(--text-muted);
        font-weight: 400;
    }

    .row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        margin-top: 1rem;
    }
    .card.center .row {
        justify-content: center;
    }
    .btn-secondary.small {
        padding: 0.45rem 1rem;
        font-size: 0.88rem;
    }
    .btn-primary:disabled,
    .btn-secondary:disabled,
    .chip:disabled,
    .slider:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        transform: none;
    }

    .slider {
        width: 100%;
        padding: 0;
        height: 1.75rem;
        background: transparent;
        border: none;
        accent-color: var(--accent);
        cursor: pointer;
    }

    .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 1.25rem;
    }
    .chip {
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--surface);
        color: var(--text-dim);
        font-family: inherit;
        font-size: 0.95rem;
        padding: 0.35rem 0.85rem;
        cursor: pointer;
        transition:
            background 0.15s,
            border-color 0.15s,
            color 0.15s;
    }
    .chip:hover:not(:disabled, .static) {
        border-color: var(--accent);
        color: var(--text);
    }
    .chip.on {
        background: var(--accent-bg);
        border-color: var(--accent);
        color: var(--text);
        font-weight: 600;
    }
    .chip.static {
        cursor: default;
    }
    .chip.bite {
        background: var(--bite-bg);
        border-color: var(--bite);
        color: var(--bite);
        font-weight: 600;
    }
    .chip.miss {
        background: var(--miss-bg);
        border-color: var(--miss);
        color: var(--miss);
        text-decoration: line-through;
    }

    .locked {
        color: var(--accent);
        font-size: 0.9rem;
        font-weight: 600;
        margin-bottom: 1rem;
    }
    .caption {
        color: var(--text);
        font-size: 0.95rem;
        line-height: 1.55;
        margin-top: 0.75rem;
    }
    .note.muted {
        color: var(--text-muted);
        font-size: 0.85rem;
        margin-top: 0.5rem;
    }
    .chips.tight {
        margin-top: 0.6rem;
        gap: 0.4rem;
    }
    .chips.tight .chip {
        font-size: 0.88rem;
        padding: 0.25rem 0.7rem;
    }
    .tiles {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0.75rem;
        margin: 0;
    }
    .tile {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.75rem 0.5rem;
        text-align: center;
    }
    .tile dt {
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--text-muted);
    }
    .tile dd {
        font-family: var(--font-display);
        font-size: 1.6rem;
        font-weight: 900;
        color: var(--text);
        margin-top: 0.15rem;
    }
    .tile.score dd {
        color: var(--signature);
    }
    .bite {
        color: var(--bite);
    }
    .miss {
        color: var(--miss);
    }

    .piece {
        white-space: pre-wrap;
        line-height: 1.8;
        font-size: 1.02rem;
        color: var(--text);
        overflow-wrap: anywhere;
    }
    mark {
        background: var(--bite-bg);
        color: var(--bite);
        border-radius: 3px;
        padding: 0 0.1em;
        font-weight: 600;
    }
    mark.miss {
        background: var(--miss-bg);
        color: var(--miss);
    }

    .waiting {
        display: flex;
        gap: 0.6rem;
        align-items: center;
        justify-content: center;
        color: var(--text-dim);
        font-style: italic;
    }
    .dot {
        width: 0.6rem;
        height: 0.6rem;
        border-radius: 50%;
        background: var(--accent);
        animation: breathe 1.2s ease-in-out infinite;
    }
    @keyframes breathe {
        0%,
        100% {
            opacity: 0.25;
        }
        50% {
            opacity: 1;
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .dot {
            animation: none;
        }
    }

    .board {
        list-style: none;
        margin: 0;
    }
    .board li {
        display: grid;
        grid-template-columns: 1.6rem 1fr auto auto;
        gap: 0.75rem;
        align-items: baseline;
        padding: 0.5rem 0.5rem;
        border-bottom: 1px solid var(--border);
        color: var(--text-dim);
        font-size: 0.95rem;
    }
    .board li:last-child {
        border-bottom: none;
    }
    .board li.mine {
        background: var(--accent-bg);
        border-radius: var(--radius);
        color: var(--text);
        font-weight: 600;
    }
    .rank {
        color: var(--text-muted);
        font-size: 0.85rem;
    }
    .name {
        overflow-wrap: anywhere;
    }
    .marks {
        font-size: 0.82rem;
    }
    .pts {
        font-family: var(--font-display);
        font-weight: 700;
        color: var(--signature);
    }

    @media (max-width: 520px) {
        .tiles {
            grid-template-columns: repeat(2, 1fr);
        }
        .card {
            padding: 1.4rem 1.15rem;
        }
    }
</style>
