<script>
    // HandwritingImport — photograph/scan a handwritten page, let Workers AI
    // transcribe it, then REVIEW both fields before they land in the editor:
    // the title is suggested from the first line and the transcription is
    // fully editable. A paste path welcomes text already extracted on the
    // phone (Samsung Gallery/Scan, Google Lens, iOS Notes) — phone scans are
    // the ideal input for our OCR too. Optionally keep the image as a
    // facsimile attached to the writing (it's kept only when the review is
    // confirmed, not cancelled).
    import { t } from '#lib/i18n/index.js';

    let { onImport, onManuscript } = $props();

    let fileInput = $state(null);
    let busy = $state(false);
    let error = $state('');
    let attach = $state(false);

    // review card state — open after OCR (photo path) or immediately (paste path)
    let review = $state(null); // { title, text }
    let pendingManuscripts = []; // kept page URLs, in order
    let pages = 0;

    // First meaningful line becomes the suggested title; long lines are cut
    // at a word boundary. Handwritten pieces rarely carry a real heading, so
    // this is deliberately a suggestion the writer edits.
    function suggestTitle(text) {
        const lines = String(text || '').split('\n').map((s) => s.trim());
        const first = lines.find((l) => l && !/^\[?\?\]?$/.test(l) && l !== '[?]') || '';
        const clean = first.replace(/^#+\s*/, '').replace(/[.]$/, '');
        if (!clean) return '';
        if (clean.length <= 60) return clean;
        const words = clean.split(/\s+/);
        const out = [];
        for (const w of words) {
            if ((out.join(' ') + ' ' + w).trim().length > 57) break;
            out.push(w);
        }
        return (out.join(' ') || clean.slice(0, 57)) + '…';
    }

    function startPaste() {
        error = '';
        pendingManuscripts = [];
        pages = 0;
        review = { title: '', text: '' };
    }

    // Multi-page: each picked file (picker allows several, or "add page"
    // reopens it) is transcribed separately and appended to the review text.
    async function handleFile(e) {
        const files = [...(e.target.files || [])];
        e.target.value = '';
        if (!files.length || busy) return;
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                error = $t('handwriting.error_format');
                continue;
            }
            busy = true;
            error = '';
            try {
                const fd = new FormData();
                fd.append('image', file);
                fd.append('keep', attach ? 'true' : 'false');
                const res = await fetch('/api/write/handwriting', { method: 'POST', body: fd });
                const d = await res.json();
                if (!res.ok) {
                    error = d.error || $t('handwriting.error_generic');
                } else if (!d.text) {
                    error = $t('handwriting.error_generic');
                } else {
                    if (d.manuscriptUrl) pendingManuscripts.push(d.manuscriptUrl);
                    if (!review) {
                        review = { title: suggestTitle(d.text), text: d.text.trim() };
                        pages = 1;
                    } else {
                        review = {
                            title: review.title || suggestTitle(d.text),
                            text: (review.text ? review.text + '\n\n' : '') + d.text.trim()
                        };
                        pages += 1;
                    }
                }
            } catch {
                error = $t('handwriting.error_generic');
            }
            busy = false;
        }
    }

    function confirmReview() {
        if (!review) return;
        onImport?.({ title: (review.title || '').trim(), text: (review.text || '').trim() });
        if (pendingManuscripts.length === 1) onManuscript?.(pendingManuscripts[0]);
        else if (pendingManuscripts.length > 1) onManuscript?.(JSON.stringify(pendingManuscripts));
        pendingManuscripts = [];
        review = null;
    }

    function cancelReview() {
        pendingManuscripts = [];
        pages = 0;
        review = null;
    }
</script>

<div class="handwriting">
    {#if review}
        <div class="hw-review">
            <div class="hw-review-head">
                <span class="hw-review-title">🔍 {$t('handwriting.review_title')}</span>
                <button class="hw-cancel" onclick={cancelReview} aria-label="×">×</button>
            </div>
            <p class="hw-review-hint">{$t('handwriting.review_hint')}</p>
            <label class="hw-field-label" for="hw-title">{$t('handwriting.title_label')}</label>
            <input id="hw-title" class="hw-title-input" type="text" bind:value={review.title} maxlength="120" />
            <label class="hw-field-label" for="hw-text">{$t('handwriting.text_label')}</label>
            <textarea id="hw-text" class="hw-text-input" bind:value={review.text} rows="8" spellcheck="true"></textarea>
            {#if pages > 1}
                <span class="hw-pages">📄 {pages}</span>
            {/if}
            <div class="hw-review-actions">
                <button class="hw-btn" onclick={() => fileInput?.click()} disabled={busy}>
                    {#if busy}
                        <span class="hw-spinner" aria-hidden="true"></span> {$t('handwriting.busy')}
                    {:else}
                        ➕ {$t('handwriting.add_page')}
                    {/if}
                </button>
                <button class="hw-btn primary" onclick={confirmReview} disabled={!review.text.trim()}>
                    ✓ {$t('handwriting.use')}
                </button>
            </div>
        </div>
    {:else}
        <button
            class="hw-btn"
            onclick={() => fileInput?.click()}
            disabled={busy}
            aria-label={$t('handwriting.import')}
            title={$t('handwriting.import')}
        >
            {#if busy}
                <span class="hw-spinner" aria-hidden="true"></span> {$t('handwriting.busy')}
            {:else}
                ✍️ {$t('handwriting.import')}
            {/if}
        </button>
        <button class="hw-btn" onclick={startPaste} title={$t('handwriting.paste_hint')}>
            📋 {$t('handwriting.paste')}
        </button>
        <label class="hw-attach" title={$t('handwriting.attach_hint')}>
            <input type="checkbox" bind:checked={attach} />
            {$t('handwriting.attach')}
        </label>
    {/if}
    <input
        bind:this={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onchange={handleFile}
        hidden
    />
    {#if error}
        <div class="hw-error" role="alert">{error}</div>
    {/if}
    <div class="hw-tip">{$t('handwriting.tip')}</div>
</div>

<style>
    .handwriting { display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; }
    .hw-btn {
        display: inline-flex; align-items: center; gap: 0.4rem;
        background: none; border: 1px solid var(--border, #3a3f4d); border-radius: var(--radius, 8px);
        color: var(--text-dim, #aaa); padding: 0.45rem 0.7rem; font-size: 0.8rem;
        font-family: inherit; cursor: pointer; transition: all 0.2s;
    }
    .hw-btn:hover:not(:disabled) { border-color: var(--accent, #a8bdb3); color: var(--accent, #a8bdb3); }
    .hw-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .hw-btn.primary { background: var(--accent, #a8bdb3); border-color: var(--accent, #a8bdb3); color: #17130a; font-weight: 600; }
    .hw-btn.primary:hover:not(:disabled) { color: #17130a; filter: brightness(1.05); }
    .hw-spinner {
        width: 0.75rem; height: 0.75rem; border-radius: 50%;
        border: 2px solid var(--border, #3a3f4d); border-top-color: var(--accent, #a8bdb3);
        animation: hw-spin 0.8s linear infinite;
    }
    @keyframes hw-spin { to { transform: rotate(360deg); } }
    .hw-attach { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: var(--text-dim, #999); cursor: pointer; }
    .hw-attach input { accent-color: var(--accent, #a8bdb3); }
    .hw-error { width: 100%; color: #e08d6d; font-size: 0.78rem; }
    .hw-tip { width: 100%; color: var(--text-muted, #777); font-size: 0.72rem; }
    .hw-review {
        width: 100%; display: grid; gap: 0.45rem;
        background: rgba(0,0,0,0.25); border: 1px solid var(--border, #3a3f4d);
        border-radius: 10px; padding: 0.9rem 1rem;
    }
    .hw-review-head { display: flex; align-items: center; justify-content: space-between; }
    .hw-review-title { font-size: 0.88rem; font-weight: 600; color: var(--text-dim, #ccc); }
    .hw-cancel { background: none; border: none; color: var(--text-muted, #888); font-size: 1.1rem; cursor: pointer; padding: 0.1rem 0.3rem; line-height: 1; }
    .hw-cancel:hover { color: var(--text, #eee); }
    .hw-review-hint { margin: 0; color: var(--text-muted, #999); font-size: 0.78rem; }
    .hw-field-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted, #888); }
    .hw-title-input, .hw-text-input {
        width: 100%; box-sizing: border-box;
        background: rgba(0,0,0,0.3); border: 1px solid var(--border, #3a3f4d); border-radius: 8px;
        color: inherit; font-family: var(--font-body, inherit); font-size: 0.92rem;
        padding: 0.55rem 0.7rem;
    }
    .hw-title-input { font-size: 1rem; }
    .hw-text-input { line-height: 1.6; resize: vertical; min-height: 9rem; }
    .hw-title-input:focus, .hw-text-input:focus { outline: none; border-color: var(--accent, #a8bdb3); }
    .hw-review-actions { display: flex; gap: 0.6rem; justify-content: flex-end; flex-wrap: wrap; }
    .hw-pages { font-size: 0.75rem; color: var(--text-muted, #888); align-self: center; margin-right: auto; }
</style>
