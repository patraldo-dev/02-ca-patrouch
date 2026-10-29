<script>
    // HandwritingImport — photograph/scan a handwritten page, let Workers AI
    // transcribe it into the editor. Optionally keep the image as a facsimile
    // attached to the writing (Phase 3). Heavy-cursive users get the Lens tip
    // (Phase 2, deliberately zero-build).
    import { t } from '#lib/i18n/index.js';
    import { browser } from '$app/env';

    let { onText, onManuscript } = $props();

    let fileInput = $state(null);
    let busy = $state(false);
    let error = $state('');
    let attach = $state(false);

    async function handleFile(e) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || busy) return;
        if (!file.type.startsWith('image/')) {
            error = $t('handwriting.error_format');
            return;
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
            } else {
                if (d.text) onText?.(d.text.trim() + '\n\n');
                if (d.manuscriptUrl) onManuscript?.(d.manuscriptUrl);
                error = d.warning || '';
            }
        } catch {
            error = $t('handwriting.error_generic');
        }
        busy = false;
    }
</script>

<div class="handwriting">
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
    <label class="hw-attach" title={$t('handwriting.attach_hint')}>
        <input type="checkbox" bind:checked={attach} />
        {$t('handwriting.attach')}
    </label>
    <input
        bind:this={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onchange={handleFile}
        hidden
    />
    {#if error}
        <div class="hw-error" role="alert">{error}</div>
    {/if}
    <div class="hw-tip">{$t('handwriting.tip')}</div>
</div>

<style>
    .handwriting { display: inline-flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; }
    .hw-btn {
        display: inline-flex; align-items: center; gap: 0.4rem;
        background: none; border: 1px solid var(--border, #3a3f4d); border-radius: var(--radius, 8px);
        color: var(--text-dim, #aaa); padding: 0.45rem 0.7rem; font-size: 0.8rem;
        font-family: inherit; cursor: pointer; transition: all 0.2s;
    }
    .hw-btn:hover:not(:disabled) { border-color: var(--accent, #c9a87c); color: var(--accent, #c9a87c); }
    .hw-btn:disabled { opacity: 0.55; cursor: wait; }
    .hw-spinner {
        width: 0.75rem; height: 0.75rem; border-radius: 50%;
        border: 2px solid var(--border, #3a3f4d); border-top-color: var(--accent, #c9a87c);
        animation: hw-spin 0.8s linear infinite;
    }
    @keyframes hw-spin { to { transform: rotate(360deg); } }
    .hw-attach { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: var(--text-dim, #999); cursor: pointer; }
    .hw-attach input { accent-color: var(--accent, #c9a87c); }
    .hw-error { width: 100%; color: #e08d6d; font-size: 0.78rem; }
    .hw-tip { width: 100%; color: var(--text-muted, #777); font-size: 0.72rem; }
</style>
