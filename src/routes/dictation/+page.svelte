<!-- src/routes/dictation/+page.svelte — Dictée: listen, write, correct.
     Follows the classic protocol: (1) whole text at normal pace for meaning,
     (2) phrase by phrase, slowly, repeatable, (3) final whole reading, then
     correction with a word-level diff. Speech via browser speechSynthesis. -->
<script>
    import { browser } from '$app/env';
    import { onMount, onDestroy } from 'svelte';
    import { t } from '#lib/i18n/index.js';

    let { data } = $props();

    const TTS_LANG = { es: 'es-ES', fr: 'fr-FR', en: 'en-US' };
    const PHASE = { intro: 0, dictation: 1, corrected: 2 };

    let phase = $state(PHASE.intro);
    let phraseIdx = $state(0);
    let rate = $state(0.75);
    let autoRepeat = $state(true);
    let speaking = $state(false);
    let userText = $state('');
    let ttsOk = $state(true);
    let voices = $state([]);
    let voiceURI = $state('');

    const phrases = data.phrases || [];
    const original = phrases.join(' ');
    const ttsLang = TTS_LANG[data.writing?.locale || data.serverLocale] || 'es-ES';

    const result = $derived(phase === PHASE.corrected ? diffWords(original, userText) : null);

    // ── speech engine ──
    function pickVoice() {
        const base = ttsLang.slice(0, 2);
        const matching = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(base));
        if (!matching.length) return null;
        return matching.find((v) => v.voiceURI === voiceURI) || matching[0];
    }

    function speak(text, speakRate, onDone) {
        if (!browser || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = pickVoice();
        if (v) u.voice = v;
        u.lang = ttsLang;
        u.rate = speakRate;
        u.onend = () => { speaking = false; onDone?.(); };
        u.onerror = () => { speaking = false; };
        speaking = true;
        window.speechSynthesis.speak(u);
    }

    function stopSpeaking() {
        if (browser && 'speechSynthesis' in window) window.speechSynthesis.cancel();
        speaking = false;
    }

    // Phase 1 & 3: the whole extract, unhurried.
    function readFull() {
        speak(original, 0.95);
    }

    // Phase 2: current phrase, slowly — repeated twice when autoRepeat is on
    // (the classroom standard: each group of words is read 2–3 times).
    function sayPhrase(i = phraseIdx, remaining = autoRepeat ? 2 : 1) {
        if (i < 0 || i >= phrases.length) return;
        phraseIdx = i;
        speak(phrases[i], rate, () => {
            if (remaining > 1) setTimeout(() => sayPhrase(i, remaining - 1), 700);
        });
    }

    function nextPhrase() {
        stopSpeaking();
        if (phraseIdx < phrases.length - 1) sayPhrase(phraseIdx + 1);
    }
    function prevPhrase() {
        stopSpeaking();
        if (phraseIdx > 0) sayPhrase(phraseIdx - 1);
    }

    function startDictation() {
        phase = PHASE.dictation;
        userText = '';
        phraseIdx = 0;
        sayPhrase(0);
    }

    function correct() {
        stopSpeaking();
        phase = PHASE.corrected;
    }

    function retry() {
        phase = PHASE.dictation;
        userText = '';
        phraseIdx = 0;
    }

    // ── correction: word-level LCS diff ──
    function diffWords(origText, userTyped) {
        const norm = (t) =>
            String(t || '')
                .normalize('NFC')
                .replace(/[’‘]/g, "'")
                .replace(/[“”]/g, '"')
                .replace(/\s+/g, ' ')
                .trim();
        const A = norm(origText).split(' ').filter(Boolean);
        const B = norm(userTyped).split(' ').filter(Boolean);
        const n = A.length, m = B.length;
        const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
        for (let i = n - 1; i >= 0; i--)
            for (let j = m - 1; j >= 0; j--)
                dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        const marks = [];
        let i = 0, j = 0;
        while (i < n && j < m) {
            if (A[i] === B[j]) { marks.push({ o: A[i], u: B[j], ok: true }); i++; j++; }
            else if (dp[i + 1][j] >= dp[i][j + 1]) { marks.push({ o: A[i], u: null, ok: false }); i++; }
            else { marks.push({ o: null, u: B[j], ok: false }); j++; }
        }
        while (i < n) marks.push({ o: A[i++], u: null, ok: false });
        while (j < m) marks.push({ o: null, u: B[j++], ok: false });
        const missing = marks.filter((x) => !x.ok && x.o).length;
        const extra = marks.filter((x) => !x.ok && x.u).length;
        const accuracy = n ? Math.max(0, Math.round((100 * (n - missing)) / n)) : 100;
        return { marks, missing, extra, accuracy };
    }

    function fmtDate(s) {
        if (!s) return '';
        try {
            return new Date(String(s).replace(' ', 'T') + 'Z').toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch { return s; }
    }

    onMount(() => {
        if (!browser) return;
        if (!('speechSynthesis' in window)) { ttsOk = false; return; }
        const load = () => {
            voices = window.speechSynthesis.getVoices();
            const base = ttsLang.slice(0, 2);
            const match = voices.find((v) => v.lang?.toLowerCase().startsWith(base));
            if (match) voiceURI = match.voiceURI;
        };
        load();
        window.speechSynthesis.onvoiceschanged = load;
    });

    onDestroy(stopSpeaking);
</script>

<svelte:head><title>{$t('dictation.title')} · Patrouch</title></svelte:head>

<div class="dictee-page">
    <a href="/write" class="back">← {$t('common.nav.write')}</a>
    <header>
        <h1>✦ {$t('dictation.title')}</h1>
        <p class="subtitle">{$t('dictation.subtitle')}</p>
    </header>

    {#if !data.writing}
        <div class="empty">{$t('dictation.no_text')}</div>
    {:else}
        <div class="source-card">
            <div class="source-meta">
                <span class="chip">Sappho · {data.writing.locale.toUpperCase()}</span>
                <span class="date">{fmtDate(data.writing.created_at)}</span>
            </div>
            <h2>{data.writing.title}</h2>
            <p class="note">
                {$t('dictation.words').replace('{count}', data.wordCount)}
                {#if data.truncated}{$t('dictation.extract_note')}{/if}
            </p>
        </div>

        {#if !ttsOk}
            <div class="warning">{$t('dictation.tts_unsupported')}</div>
        {:else}
            {#if phase === PHASE.intro}
                <section class="panel">
                    <ol class="protocol">
                        <li>{$t('dictation.step1')}</li>
                        <li>{$t('dictation.step2')}</li>
                        <li>{$t('dictation.step3')}</li>
                    </ol>
                    <div class="row">
                        <button class="btn" onclick={readFull} disabled={speaking}>▶ {$t('dictation.listen_full')}</button>
                        <button class="btn primary" onclick={startDictation}>{$t('dictation.start')}</button>
                    </div>
                </section>
            {:else if phase === PHASE.dictation}
                <section class="panel player">
                    <div class="phrase-bar">
                        <button class="btn small" onclick={prevPhrase} disabled={phraseIdx === 0 || speaking}>⏮</button>
                        <button class="btn small" onclick={() => sayPhrase(phraseIdx)} disabled={speaking}>🔁 {$t('dictation.repeat')}</button>
                        <span class="phrase-n">{$t('dictation.phrase_n').replace('{n}', phraseIdx + 1).replace('{total}', phrases.length)}</span>
                        <button class="btn small" onclick={nextPhrase} disabled={phraseIdx >= phrases.length - 1 || speaking}>⏭</button>
                    </div>
                    <div class="controls">
                        <label>
                            🐢 {$t('dictation.rate')}
                            <input type="range" min="0.5" max="1" step="0.05" bind:value={rate} />
                            <span>{rate.toFixed(2)}×</span>
                        </label>
                        <label class="toggle">
                            <input type="checkbox" bind:checked={autoRepeat} />
                            {$t('dictation.autorepeat')}
                        </label>
                    </div>

                    <textarea
                        bind:value={userText}
                        spellcheck="false"
                        autocapitalize="off"
                        autocomplete="off"
                        rows="10"
                        placeholder={$t('dictation.write_here')}
                        aria-label={$t('dictation.write_here')}
                    ></textarea>

                    <div class="row">
                        <button class="btn" onclick={readFull} disabled={speaking}>🎧 {$t('dictation.reread')}</button>
                        <button class="btn primary" onclick={correct} disabled={!userText.trim()}>✓ {$t('dictation.correct')}</button>
                    </div>
                </section>
            {:else}
                <section class="panel corrected">
                    <div class="score-row">
                        <span class="score big">{result.accuracy}%</span>
                        <span class="stat">{$t('dictation.fautes').replace('{count}', result.missing)}</span>
                        <span class="stat">{$t('dictation.extras').replace('{count}', result.extra)}</span>
                    </div>

                    <h3>{$t('dictation.your_text')}</h3>
                    <p class="diff">
                        {#each result.marks as mark, k}
                            {#if mark.ok}<span class="w ok">{mark.u}</span>
                            {:else if mark.u}<span class="w bad" title={mark.o || ''}>{mark.u}</span>
                            {/if}
                        {/each}
                    </p>

                    <h3>{$t('dictation.original')}</h3>
                    <p class="diff">
                        {#each result.marks as mark, k}
                            {#if mark.ok}<span class="w ok">{mark.o}</span>
                            {:else if mark.o}<span class="w missing" title={mark.u || ''}>{mark.o}</span>
                            {/if}
                        {/each}
                    </p>

                    <div class="row">
                        <button class="btn" onclick={retry}>↺ {$t('dictation.try_again')}</button>
                        <button class="btn" onclick={() => { phase = PHASE.intro; }}>{$t('dictation.back_to_start')}</button>
                    </div>
                </section>
            {/if}
        {/if}
    {/if}
</div>

<style>
    .dictee-page { max-width: 46rem; margin: 0 auto; padding: 1.5rem 1rem 4rem; }
    .back { color: var(--muted, #999); font-size: 0.85rem; text-decoration: none; }
    header h1 { font-size: 1.7rem; margin: 0.6rem 0 0.2rem; }
    .subtitle { color: var(--muted, #999); font-size: 0.92rem; margin: 0 0 1.2rem; }
    .source-card { background: var(--surface, #1b1e27); border: 1px solid var(--border, #333); border-radius: 12px; padding: 1rem 1.2rem; margin-bottom: 1.2rem; }
    .source-meta { display: flex; gap: 0.8rem; align-items: center; margin-bottom: 0.4rem; }
    .chip { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent, #c9a87c); border: 1px solid var(--accent, #c9a87c); border-radius: 999px; padding: 0.15rem 0.6rem; }
    .date { color: var(--muted, #999); font-size: 0.8rem; }
    .source-card h2 { font-size: 1.05rem; font-weight: 500; margin: 0 0 0.3rem; }
    .note { color: var(--muted, #999); font-size: 0.8rem; margin: 0; }
    .empty, .warning { padding: 2rem 1rem; text-align: center; color: var(--muted, #999); background: var(--surface, #1b1e27); border-radius: 12px; }
    .warning { color: #e08d6d; }
    .panel { background: var(--surface, #1b1e27); border: 1px solid var(--border, #333); border-radius: 12px; padding: 1.2rem; display: grid; gap: 1rem; }
    .protocol { color: var(--muted, #aaa); font-size: 0.88rem; line-height: 1.7; padding-left: 1.2rem; margin: 0; }
    .row { display: flex; gap: 0.7rem; flex-wrap: wrap; }
    .btn { background: none; border: 1px solid var(--border, #3a3f4d); color: inherit; border-radius: 8px; padding: 0.55rem 1rem; font-size: 0.88rem; cursor: pointer; font-family: inherit; }
    .btn:hover:not(:disabled) { border-color: var(--accent, #c9a87c); color: var(--accent, #c9a87c); }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn.primary { background: var(--accent, #c9a87c); border-color: var(--accent, #c9a87c); color: #17130a; font-weight: 600; }
    .btn.primary:hover:not(:disabled) { color: #17130a; filter: brightness(1.05); }
    .btn.small { padding: 0.4rem 0.7rem; font-size: 0.8rem; }
    .phrase-bar { display: flex; align-items: center; gap: 0.7rem; }
    .phrase-n { flex: 1; text-align: center; color: var(--muted, #999); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
    .controls { display: flex; gap: 1.4rem; flex-wrap: wrap; align-items: center; color: var(--muted, #aaa); font-size: 0.82rem; }
    .controls label { display: flex; align-items: center; gap: 0.45rem; }
    .toggle input { accent-color: var(--accent, #c9a87c); }
    textarea { width: 100%; background: rgba(0,0,0,0.25); border: 1px solid var(--border, #3a3f4d); border-radius: 10px; color: inherit; font-family: var(--font-body, inherit); font-size: 1.02rem; line-height: 1.6; padding: 0.9rem 1rem; resize: vertical; }
    textarea:focus { outline: none; border-color: var(--accent, #c9a87c); }
    .score-row { display: flex; align-items: baseline; gap: 1.4rem; }
    .score.big { font-size: 2.2rem; font-weight: 700; color: var(--accent, #c9a87c); }
    .stat { color: var(--muted, #aaa); font-size: 0.9rem; }
    .corrected h3 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted, #999); margin: 0.4rem 0 0.3rem; }
    .diff { line-height: 1.9; font-size: 1rem; margin: 0 0 0.6rem; }
    .w { padding: 0 1px; border-radius: 3px; }
    .w.ok { color: var(--text, #eee); }
    .w.bad { color: #e08d6d; background: rgba(224,141,109,0.14); text-decoration: line-through; }
    .w.missing { color: #8fc0ab; background: rgba(143,192,171,0.14); text-decoration: underline dotted; }
</style>
