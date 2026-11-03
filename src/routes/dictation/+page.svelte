<!-- src/routes/dictation/+page.svelte — Dictée: listen, write, correct.
     Follows the classic protocol: (1) whole text at normal pace for meaning,
     (2) phrase by phrase, slowly, repeatable, (3) final whole reading, then
     correction with a word-level diff. Speech via browser speechSynthesis.
     Two input modes: on screen (typed) or on paper (photograph → OCR →
     review the transcription → correct). Handwritten attempts get an
     approximate red-ink overlay on the photo and every attempt is saved
     for the progress card. -->
<script>
    import { browser } from '$app/env';
    import { onMount, onDestroy } from 'svelte';
    import { t } from '#lib/i18n/index.js';

    let { data } = $props();

    const TTS_LANG = { es: 'es-ES', fr: 'fr-FR', en: 'en-US' };
    const PHASE = { intro: 0, dictation: 1, corrected: 2, review: 3 };

    let phase = $state(PHASE.intro);
    let phraseIdx = $state(0);
    let rate = $state(0.75);
    let autoRepeat = $state(true);
    let speaking = $state(false);
    let userText = $state('');
    let ttsOk = $state(true);
    let voices = $state([]);
    let voiceURI = $state('');

    // ── input mode + paper flow ──
    let inputMode = $state('typed');        // 'typed' | 'paper'
    let paperKeep = $state(true);           // keep the photo as a manuscript
    let paperUrl = $state(null);            // object URL of the photographed page
    let manuscriptUrl = $state(null);       // CF Images URL when kept
    let ocrText = $state('');
    let ocrBusy = $state(false);
    let ocrError = $state('');
    let saveState = $state('');             // '' | 'saving' | 'saved'
    let fileInput = $state(null);

    // ── progress (attempts + aggregates), refreshed after each save ──
    let progress = $state({ attempts: data.attempts || [], stats: data.stats || null });

    const phrases = data.phrases || [];
    const original = phrases.join(' ');
    const originalWordCount = original.split(/\s+/).filter(Boolean).length;
    const ttsLang = TTS_LANG[data.writing?.locale || data.serverLocale] || 'es-ES';

    const result = $derived(phase === PHASE.corrected || phase === PHASE.review ? diffWords(original, userText) : null);

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
        const r = diffWords(original, userText);
        phase = PHASE.corrected;
        saveAttempt(r);
    }

    function correctFromReview() {
        userText = ocrText;
        correct();
    }

    function retry() {
        phase = PHASE.dictation;
        userText = '';
        ocrText = '';
        ocrError = '';
        phraseIdx = 0;
    }

    function resetPaper() {
        if (paperUrl) URL.revokeObjectURL(paperUrl);
        paperUrl = null;
        manuscriptUrl = null;
        ocrText = '';
        ocrError = '';
    }

    // ── paper flow: photograph → OCR (existing handwriting endpoint) ──
    async function onPaperPick(e) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
            ocrError = $t('dictation.ocr_error');
            return;
        }
        ocrBusy = true;
        ocrError = '';
        try {
            if (paperUrl) URL.revokeObjectURL(paperUrl);
            paperUrl = URL.createObjectURL(file);
            const fd = new FormData();
            fd.append('image', file);
            fd.append('keep', String(paperKeep));
            const res = await fetch('/api/write/handwriting', { method: 'POST', body: fd });
            const d = await res.json().catch(() => ({}));
            if (!res.ok || !d.text) {
                ocrError = $t('dictation.ocr_error');
            } else {
                ocrText = d.text;
                manuscriptUrl = d.manuscriptUrl || null;
                phase = PHASE.review;
            }
        } catch {
            ocrError = $t('dictation.ocr_error');
        }
        ocrBusy = false;
    }

    // ── persist the attempt + refresh progress ──
    async function saveAttempt(r) {
        saveState = 'saving';
        try {
            const res = await fetch('/api/dictation/attempt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    writingId: data.writing?.id || null,
                    locale: data.writing?.locale || data.serverLocale,
                    mode: inputMode === 'paper' ? 'handwritten' : 'typed',
                    accuracy: r.accuracy,
                    faults: r.missing,
                    extras: r.extra,
                    wordCount: originalWordCount,
                    manuscriptUrl
                })
            });
            if (res.ok) {
                saveState = 'saved';
                const g = await fetch('/api/dictation/attempt');
                if (g.ok) {
                    const d = await g.json();
                    progress = { attempts: d.attempts || [], stats: d.stats || null };
                }
            } else {
                saveState = '';
            }
        } catch {
            saveState = '';
        }
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

    // ── Phase C: approximate red-ink overlay on the photographed page ──
    // Client-side canvas analysis, no external service: adaptive-threshold
    // the ink, find letter blobs, cluster them into lines and words, then
    // map the diff verdicts onto word positions and draw red boxes around
    // errors. Approximate by design — the typed diff below stays canonical.
    let photoEl = $state(null);
    let overlayCanvas = $state(null);
    let imgLoaded = $state(false);
    let overlayReady = $state(false);
    let overlayFailed = $state(false);

    function median(arr) {
        if (!arr.length) return 0;
        const s = [...arr].sort((a, b) => a - b);
        return s[s.length >> 1];
    }

    $effect(() => {
        if (phase !== PHASE.corrected || inputMode !== 'paper') return;
        if (!imgLoaded || !photoEl || !overlayCanvas || !result) return;
        drawOverlay(photoEl, overlayCanvas, result.marks);
    });

    function drawOverlay(img, canvas, marks) {
        try {
            overlayReady = false;
            overlayFailed = false;
            const MAXW = 1200;
            const scale = Math.min(1, MAXW / (img.naturalWidth || 1));
            const W = Math.max(1, Math.round(img.naturalWidth * scale));
            const H = Math.max(1, Math.round(img.naturalHeight * scale));
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, W, H);
            const px = ctx.getImageData(0, 0, W, H).data;

            // luminance
            const lum = new Uint8Array(W * H);
            for (let p = 0, q = 0; p < px.length; p += 4, q++) {
                lum[q] = (px[p] * 0.299 + px[p + 1] * 0.587 + px[p + 2] * 0.114) | 0;
            }

            // integral image → adaptive threshold (tolerates page shadows)
            const IW = W + 1;
            const integ = new Float64Array(IW * (H + 1));
            for (let y = 0; y < H; y++) {
                let rowSum = 0;
                for (let x = 0; x < W; x++) {
                    rowSum += lum[y * W + x];
                    integ[(y + 1) * IW + (x + 1)] = integ[y * IW + (x + 1)] + rowSum;
                }
            }
            const half = Math.max(8, Math.round(W / 48));
            const ink = new Uint8Array(W * H);
            for (let y = 0; y < H; y++) {
                const y0 = Math.max(0, y - half), y1 = Math.min(H - 1, y + half);
                for (let x = 0; x < W; x++) {
                    const x0 = Math.max(0, x - half), x1 = Math.min(W - 1, x + half);
                    const area = (x1 - x0 + 1) * (y1 - y0 + 1);
                    const sum =
                        integ[(y1 + 1) * IW + (x1 + 1)] -
                        integ[y0 * IW + (x1 + 1)] -
                        integ[(y1 + 1) * IW + x0] +
                        integ[y0 * IW + x0];
                    if (lum[y * W + x] < sum / area - 12) ink[y * W + x] = 1;
                }
            }

            // connected components (8-connectivity, iterative flood)
            const seen = new Uint8Array(W * H);
            const comps = [];
            const stack = [];
            const minArea = Math.max(9, Math.round((W * H) / 250000));
            for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                    const s0 = y * W + x;
                    if (!ink[s0] || seen[s0]) continue;
                    stack.length = 0;
                    stack.push(s0);
                    seen[s0] = 1;
                    let x0 = x, x1 = x, y0 = y, y1 = y, area = 0;
                    while (stack.length) {
                        const c = stack.pop();
                        const cx = c % W, cy = (c / W) | 0;
                        area++;
                        if (cx < x0) x0 = cx;
                        if (cx > x1) x1 = cx;
                        if (cy < y0) y0 = cy;
                        if (cy > y1) y1 = cy;
                        for (let dy = -1; dy <= 1; dy++) {
                            const ny = cy + dy;
                            if (ny < 0 || ny >= H) continue;
                            for (let dx = -1; dx <= 1; dx++) {
                                const nx = cx + dx;
                                if (nx < 0 || nx >= W) continue;
                                const nn = ny * W + nx;
                                if (ink[nn] && !seen[nn]) {
                                    seen[nn] = 1;
                                    stack.push(nn);
                                }
                            }
                        }
                    }
                    if (area < minArea) continue;
                    // drop page-wide shadow bands / photo borders
                    if (x1 - x0 > W * 0.85 || y1 - y0 > H * 0.5) continue;
                    comps.push({ x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, area });
                }
            }
            if (!comps.length) {
                overlayFailed = true;
                return;
            }

            const medH = median(comps.map((c) => c.h));

            // cluster into lines — big letter bodies anchor lines first so
            // accents and dots above letters join their word's line
            const byArea = [...comps].sort((a, b) => b.area - a.area);
            const lines = [];
            for (const c of byArea) {
                let best = null, bestGap = Infinity;
                for (const L of lines) {
                    const gap = Math.max(L.y0 - c.y1, c.y0 - L.y1);
                    if (gap < bestGap) {
                        bestGap = gap;
                        best = L;
                    }
                }
                if (best && bestGap < 0.5 * medH) {
                    best.comps.push(c);
                    best.y0 = Math.min(best.y0, c.y0);
                    best.y1 = Math.max(best.y1, c.y1);
                } else {
                    lines.push({ comps: [c], y0: c.y0, y1: c.y1 });
                }
            }

            // merge letters into word blobs by horizontal gap
            for (const L of lines) {
                L.comps.sort((a, b) => a.x0 - b.x0);
                const medCW = median(L.comps.map((c) => c.w));
                const gapLimit = Math.max(medCW * 0.85, medH * 0.35);
                const blobs = [];
                for (const c of L.comps) {
                    const last = blobs[blobs.length - 1];
                    if (last && c.x0 - last.x1 <= gapLimit) {
                        last.x1 = Math.max(last.x1, c.x1);
                        last.y0 = Math.min(last.y0, c.y0);
                        last.y1 = Math.max(last.y1, c.y1);
                    } else {
                        blobs.push({ x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1 });
                    }
                }
                L.blobs = blobs;
            }
            lines.sort((a, b) => a.y0 - b.y0);

            const allBlobCount = lines.reduce((acc, L) => acc + L.blobs.length, 0);
            if (!allBlobCount) {
                overlayFailed = true;
                return;
            }

            // distribute the user's words across lines proportionally to
            // each line's word-blob count, then box the wrong ones
            const userMarks = marks.filter((m) => m.u != null);
            const n = userMarks.length;
            ctx.lineWidth = Math.max(2, W / 420);
            ctx.strokeStyle = 'rgba(235, 110, 100, 0.95)';
            ctx.fillStyle = 'rgba(235, 110, 100, 0.12)';
            const pad = Math.max(2, W / 500);
            const radius = Math.max(4, W / 220);
            let wi = 0;
            for (const L of lines) {
                if (wi >= n) break;
                const take = Math.min(n - wi, Math.max(1, Math.round((L.blobs.length / allBlobCount) * n)));
                const words = userMarks.slice(wi, wi + take);
                wi += take;
                const lb = L.blobs;
                for (let k = 0; k < words.length; k++) {
                    if (words[k].ok) continue;
                    let box;
                    if (lb.length === take && lb[k]) {
                        box = lb[k];
                    } else {
                        const frac = (k + 0.5) / take;
                        const lx0 = lb[0].x0, lx1 = lb[lb.length - 1].x1;
                        const cxp = lx0 + frac * (lx1 - lx0);
                        const w = Math.max(medH * 1.4, (lx1 - lx0) / take);
                        box = { x0: cxp - w / 2, x1: cxp + w / 2, y0: L.y0, y1: L.y1 };
                    }
                    const bx = box.x0 - pad, by = box.y0 - pad;
                    const bw = box.x1 - box.x0 + pad * 2, bh = box.y1 - box.y0 + pad * 2;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, radius);
                    else ctx.rect(bx, by, bw, bh);
                    ctx.fill();
                    ctx.stroke();
                }
            }
            overlayReady = true;
        } catch (e) {
            console.error('[dictation] overlay failed:', e);
            overlayFailed = true;
        }
    }

    // ── progress chart (last 30 attempts, oldest → newest) ──
    const chartPoints = $derived(
        (progress.attempts || []).slice(0, 30).reverse()
    );

    function fmtDate(s) {
        if (!s) return '';
        try {
            return new Date(String(s).replace(' ', 'T') + 'Z').toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch { return s; }
    }

    function fmtDateShort(s) {
        if (!s) return '';
        try {
            return new Date(String(s).replace(' ', 'T') + 'Z').toLocaleDateString(undefined, {
                month: 'short', day: 'numeric'
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

    onDestroy(() => {
        stopSpeaking();
        if (paperUrl) URL.revokeObjectURL(paperUrl);
    });
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
                    <div class="mode-toggle">
                        <button class="mode-btn" class:active={inputMode === 'typed'} onclick={() => (inputMode = 'typed')}>⌨️ {$t('dictation.input_typed')}</button>
                        <button class="mode-btn" class:active={inputMode === 'paper'} onclick={() => (inputMode = 'paper')}>✍️ {$t('dictation.input_paper')}</button>
                    </div>

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

                    {#if inputMode === 'typed'}
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
                    {:else}
                        <p class="paper-hint">📝 {$t('dictation.paper_hint')}</p>
                        {#if ocrError}<p class="ocr-error" role="alert">{ocrError}</p>{/if}
                        <div class="row">
                            <button class="btn" onclick={readFull} disabled={speaking}>🎧 {$t('dictation.reread')}</button>
                            <label class="toggle keep">
                                <input type="checkbox" bind:checked={paperKeep} />
                                {$t('dictation.keep_photo')}
                            </label>
                            <button class="btn primary" onclick={() => fileInput?.click()} disabled={ocrBusy}>
                                {ocrBusy ? $t('dictation.transcribing') : $t('dictation.photograph')}
                            </button>
                        </div>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            hidden
                            bind:this={fileInput}
                            onchange={onPaperPick}
                        />
                    {/if}
                </section>
            {:else if phase === PHASE.review}
                <section class="panel review">
                    <h3>🔍 {$t('dictation.review_title')}</h3>
                    <p class="hint">{$t('dictation.review_hint')}</p>
                    {#if paperUrl}
                        <img class="paper-preview" src={paperUrl} alt={$t('dictation.input_paper')} />
                    {/if}
                    <textarea
                        bind:value={ocrText}
                        rows="10"
                        spellcheck="true"
                        aria-label={$t('dictation.review_title')}
                    ></textarea>
                    <div class="row">
                        <button class="btn" onclick={() => { resetPaper(); phase = PHASE.dictation; }}>↺ {$t('dictation.photograph')}</button>
                        <button class="btn primary" onclick={correctFromReview} disabled={!ocrText.trim()}>✓ {$t('dictation.correct')}</button>
                    </div>
                </section>
            {:else}
                <section class="panel corrected">
                    <div class="score-row">
                        <span class="score big">{result.accuracy}%</span>
                        <span class="stat">{$t('dictation.fautes').replace('{count}', result.missing)}</span>
                        <span class="stat">{$t('dictation.extras').replace('{count}', result.extra)}</span>
                        {#if saveState === 'saved'}<span class="saved">{$t('dictation.saved')}</span>{/if}
                    </div>

                    {#if inputMode === 'paper' && paperUrl}
                        <div class="photo-card">
                            <div class="photo-wrap">
                                <img
                                    bind:this={photoEl}
                                    src={paperUrl}
                                    alt={$t('dictation.input_paper')}
                                    onload={() => (imgLoaded = true)}
                                />
                                <canvas
                                    bind:this={overlayCanvas}
                                    class="overlay"
                                    class:hidden={!overlayReady || overlayFailed}
                                    aria-hidden="true"
                                ></canvas>
                            </div>
                            {#if overlayReady && !overlayFailed}
                                <p class="overlay-note">⚠️ {$t('dictation.overlay_note')}</p>
                            {/if}
                        </div>
                    {/if}

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

        {#if progress.stats && progress.stats.total > 0}
            <section class="panel progress-card">
                <h3>📈 {$t('dictation.stats_title')}</h3>
                <div class="stat-cards">
                    <div class="scard">
                        <span class="sc-value">{progress.stats.total}</span>
                        <span class="sc-label">{$t('dictation.stats_total')}</span>
                    </div>
                    <div class="scard">
                        <span class="sc-value">{progress.stats.avg_accuracy ?? '—'}%</span>
                        <span class="sc-label">{$t('dictation.stats_avg')}</span>
                    </div>
                    <div class="scard">
                        <span class="sc-value">{progress.stats.best_accuracy ?? '—'}%</span>
                        <span class="sc-label">{$t('dictation.stats_best')}</span>
                    </div>
                    <div class="scard">
                        <span class="sc-value">{progress.stats.handwritten || 0}</span>
                        <span class="sc-label">{$t('dictation.stats_handwritten')}</span>
                    </div>
                </div>

                {#if chartPoints.length >= 2}
                    <div class="chart">
                        <svg viewBox="0 0 640 190" role="img" aria-label={$t('dictation.chart_title')}>
                            {#each [25, 50, 75] as gy}
                                <line x1="34" x2="626" y1={10 + (160 * gy) / 100} y2={10 + (160 * gy) / 100} class="grid" />
                                <text x="26" y={14 + (160 * gy) / 100} class="axis">{gy}</text>
                            {/each}
                            <polyline
                                points={chartPoints
                                    .map((a, i) => {
                                        const x = 40 + (i * 580) / (chartPoints.length - 1);
                                        const y = 10 + 160 * (1 - Math.min(100, Math.max(0, a.accuracy)) / 100);
                                        return `${x.toFixed(1)},${y.toFixed(1)}`;
                                    })
                                    .join(' ')}
                                class="trend"
                            />
                            {#each chartPoints as a, i}
                                <circle
                                    cx={40 + (i * 580) / (chartPoints.length - 1)}
                                    cy={10 + 160 * (1 - Math.min(100, Math.max(0, a.accuracy)) / 100)}
                                    r="4"
                                    class={a.mode === 'handwritten' ? 'dot hand' : 'dot'}
                                >
                                    <title>{fmtDateShort(a.created_at)} · {a.accuracy}% · {a.mode === 'handwritten' ? $t('dictation.mode_paper_short') : $t('dictation.mode_typed_short')}</title>
                                </circle>
                            {/each}
                        </svg>
                        <p class="chart-title">{$t('dictation.chart_title')}</p>
                    </div>
                {/if}

                {#if progress.attempts.length}
                    <h4>{$t('dictation.history_title')}</h4>
                    <ul class="history">
                        {#each progress.attempts.slice(0, 8) as a}
                            <li>
                                <span class="h-date">{fmtDateShort(a.created_at)}</span>
                                <span class="h-mode">{a.mode === 'handwritten' ? '✍️' : '⌨️'}</span>
                                <span class="h-acc" class:good={a.accuracy >= 80} class:mid={a.accuracy >= 50 && a.accuracy < 80}>{a.accuracy}%</span>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </section>
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
    .panel + .panel { margin-top: 1.2rem; }
    .protocol { color: var(--muted, #aaa); font-size: 0.88rem; line-height: 1.7; padding-left: 1.2rem; margin: 0; }
    .row { display: flex; gap: 0.7rem; flex-wrap: wrap; align-items: center; }
    .btn { background: none; border: 1px solid var(--border, #3a3f4d); color: inherit; border-radius: 8px; padding: 0.55rem 1rem; font-size: 0.88rem; cursor: pointer; font-family: inherit; }
    .btn:hover:not(:disabled) { border-color: var(--accent, #c9a87c); color: var(--accent, #c9a87c); }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn.primary { background: var(--accent, #c9a87c); border-color: var(--accent, #c9a87c); color: #17130a; font-weight: 600; }
    .btn.primary:hover:not(:disabled) { color: #17130a; filter: brightness(1.05); }
    .btn.small { padding: 0.4rem 0.7rem; font-size: 0.8rem; }
    .mode-toggle { display: flex; gap: 0.6rem; }
    .mode-btn { flex: 1; background: rgba(0,0,0,0.25); border: 1px solid var(--border, #3a3f4d); border-radius: 8px; color: var(--muted, #999); padding: 0.55rem 0.8rem; font-size: 0.88rem; cursor: pointer; font-family: inherit; }
    .mode-btn.active { border-color: var(--accent, #c9a87c); color: var(--accent, #c9a87c); background: rgba(201,168,124,0.08); }
    .paper-hint { color: var(--muted, #aaa); font-size: 0.88rem; margin: 0; }
    .ocr-error { color: #e08d6d; font-size: 0.85rem; margin: 0; }
    .toggle.keep { margin-left: auto; }
    .phrase-bar { display: flex; align-items: center; gap: 0.7rem; }
    .phrase-n { flex: 1; text-align: center; color: var(--muted, #999); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
    .controls { display: flex; gap: 1.4rem; flex-wrap: wrap; align-items: center; color: var(--muted, #aaa); font-size: 0.82rem; }
    .controls label { display: flex; align-items: center; gap: 0.45rem; }
    .toggle input { accent-color: var(--accent, #c9a87c); }
    textarea { width: 100%; background: rgba(0,0,0,0.25); border: 1px solid var(--border, #3a3f4d); border-radius: 10px; color: inherit; font-family: var(--font-body, inherit); font-size: 1.02rem; line-height: 1.6; padding: 0.9rem 1rem; resize: vertical; box-sizing: border-box; }
    textarea:focus { outline: none; border-color: var(--accent, #c9a87c); }
    .review .hint { color: var(--muted, #aaa); font-size: 0.85rem; margin: 0; }
    .review h3 { margin: 0; font-size: 1rem; }
    .paper-preview { width: 100%; border-radius: 10px; border: 1px solid var(--border, #3a3f4d); }
    .score-row { display: flex; align-items: baseline; gap: 1.4rem; flex-wrap: wrap; }
    .score.big { font-size: 2.2rem; font-weight: 700; color: var(--accent, #c9a87c); }
    .stat { color: var(--muted, #aaa); font-size: 0.9rem; }
    .saved { color: #8fc0ab; font-size: 0.85rem; }
    .corrected h3 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted, #999); margin: 0.4rem 0 0.3rem; }
    .photo-card { display: grid; gap: 0.4rem; }
    .photo-wrap { position: relative; }
    .photo-wrap img { width: 100%; border-radius: 10px; border: 1px solid var(--border, #3a3f4d); display: block; }
    .photo-wrap canvas.overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .photo-wrap canvas.overlay.hidden { display: none; }
    .overlay-note { color: var(--muted, #999); font-size: 0.78rem; margin: 0; }
    .diff { line-height: 1.9; font-size: 1rem; margin: 0 0 0.6rem; }
    .w { padding: 0 1px; border-radius: 3px; }
    .w.ok { color: var(--text, #eee); }
    .w.bad { color: #e08d6d; background: rgba(224,141,109,0.14); text-decoration: line-through; }
    .w.missing { color: #8fc0ab; background: rgba(143,192,171,0.14); text-decoration: underline dotted; }

    .progress-card h3 { margin: 0; font-size: 1rem; }
    .progress-card h4 { margin: 0.8rem 0 0.3rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted, #999); }
    .stat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 0.7rem; }
    .scard { background: rgba(0,0,0,0.25); border: 1px solid var(--border, #333); border-radius: 10px; padding: 0.7rem 0.8rem; display: flex; flex-direction: column; gap: 0.15rem; }
    .sc-value { font-size: 1.3rem; font-weight: 700; color: var(--accent, #c9a87c); font-variant-numeric: tabular-nums; }
    .sc-label { color: var(--muted, #999); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .chart svg { width: 100%; height: auto; }
    .chart .grid { stroke: var(--border, #333); stroke-width: 1; }
    .chart .axis { fill: var(--muted, #777); font-size: 10px; }
    .chart .trend { fill: none; stroke: var(--accent, #c9a87c); stroke-width: 2; stroke-linejoin: round; }
    .chart .dot { fill: var(--bg, #14171f); stroke: var(--accent, #c9a87c); stroke-width: 2; }
    .chart .dot.hand { fill: var(--accent, #c9a87c); }
    .chart-title { text-align: center; color: var(--muted, #999); font-size: 0.78rem; margin: 0.3rem 0 0; }
    .history { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.3rem; }
    .history li { display: flex; align-items: center; gap: 0.8rem; padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--border, #2a2e39); font-size: 0.85rem; }
    .history li:last-child { border-bottom: none; }
    .h-date { color: var(--muted, #999); flex: 1; }
    .h-mode { font-size: 0.9rem; }
    .h-acc { font-variant-numeric: tabular-nums; font-weight: 600; color: #e08d6d; }
    .h-acc.good { color: #8fc0ab; }
    .h-acc.mid { color: #d9b96c; }
</style>
