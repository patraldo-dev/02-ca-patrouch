<!-- src/routes/writings/[id]/edit/+page.svelte -->
<script>
    import { t, getLocale } from '$lib/i18n';
    import { goto } from '$app/navigation';
    import { marked } from 'marked';
    import { browser } from '$app/environment';

    let { data } = $props();
    let title = $state(data.writing.title);
    let content = $state(data.writing.content);
    let isPublished = $state(data.writing.status === 'published');
    let visibility = $state(data.writing.visibility || 'public');
    let wordCount = $state(data.writing.word_count || 0);
    let showPreview = $state(false);
    let previewHtml = $state('');
    let saving = $state(false);
    let toast = $state(null);
    let toastTimer = null;

    function showToast(type, message) {
        toast = { type, message };
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toast = null; }, 4000);
    }

    $effect(() => {
        const text = content || '';
        wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        if (showPreview && browser) {
            previewHtml = marked.parse(text, { async: false });
        }
    });

    function togglePreview() {
        showPreview = !showPreview;
        if (showPreview && browser) {
            previewHtml = marked.parse(content || '', { async: false });
        }
    }

    function formatDate(d) {
        if (!d) return '';
        const s = d.replace(' ', 'T');
        const localeCode = getLocale() || 'en-US';
        return new Date(s).toLocaleDateString(localeCode, {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    async function save(status = 'draft') {
        if (saving) return;
        saving = true;
        try {
            const res = await fetch(`/api/writings/${data.writing.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, visibility, status })
            });
            const result = await res.json();
            if (result.error) {
                showToast('error', result.error);
            } else {
                wordCount = result.wordCount;
                if (status === 'published') {
                    showToast('success', isPublished ? 'Republished!' : 'Published!');
                    setTimeout(() => goto('/writings/' + data.writing.id), 800);
                } else {
                    showToast('success', 'Draft saved');
                }
            }
        } catch {
            showToast('error', 'Save failed');
        } finally {
            saving = false;
        }
    }

    function backToWriting() { goto('/writings/' + data.writing.id); }
</script>

<div class="edit-page">
    <div class="edit-header">
        <button class="back-link" onclick={backToWriting}>← {$t('write.editor.back')}</button>
        <div class="edit-meta">
            {#if data.writing.prompt_text}
                <span class="from-prompt">{$t('write.view.from_prompt')}</span>
            {/if}
            <span class="edit-date">{formatDate(data.writing.created_at)}</span>
            <span class="word-count">{wordCount.toLocaleString()} words</span>
        </div>
    </div>

    <div class="editor-field">
        <label for="edit-title">Title</label>
        <input id="edit-title" type="text" bind:value={title} required placeholder="Give your piece a title..." />
    </div>

    <div class="editor-toolbar">
        <button type="button" class="toolbar-btn" onclick={togglePreview}>
            {showPreview ? '✏️ Edit' : '👁 Preview'}
        </button>
        <div class="toolbar-spacer"></div>
        <span class="visibility-label">{$t('write.editor.visibility')}:</span>
        <select bind:value={visibility}>
            <option value="public">{$t('write.editor.public')}</option>
            <option value="private">{$t('write.editor.private')}</option>
        </select>
    </div>

    <div class="editor-body">
        {#if showPreview}
            <div class="preview-pane">
                <div class="preview-content">
                    {@html previewHtml}
                </div>
            </div>
        {:else}
            <textarea
                bind:value={content}
                placeholder={$t("write.start_placeholder")}
                class="editor-textarea"
            ></textarea>
        {/if}
    </div>

    <div class="editor-actions">
        {#if toast}
            <div class="toast" class:success={toast.type === 'success'} class:error={toast.type === 'error'}>
                {toast.message}
            </div>
        {/if}
        <button onclick={() => save('draft')} class="btn-save" disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Draft'}
        </button>
        <button onclick={() => save('published')} class="btn-publish" disabled={saving}>
            🚀 {isPublished ? 'Republish' : 'Publish'}
        </button>
    </div>
</div>

<style>
    .edit-page { max-width: 820px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
    .edit-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.5rem; }
    .back-link { background: none; border: none; color: var(--accent, #c9a87c); font-family: var(--font-body); font-size: 0.9rem; cursor: pointer; padding: 0.25rem 0; }
    .edit-meta { display: flex; align-items: center; gap: 1rem; font-size: 0.8rem; color: var(--text-dim, #a1a1aa); }
    .from-prompt { background: rgba(201,168,124,0.15); color: var(--accent, #c9a87c); padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; }
    .word-count { font-variant-numeric: tabular-nums; }

    .toast { padding: 0.75rem 1rem; border-radius: var(--radius, 8px); margin-bottom: 1rem; font-size: 0.9rem; }
    .toast.success { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; }
    .toast.error { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); color: #f87171; }

    .editor-field label { display: block; color: var(--text); font-size: 0.85rem; margin-bottom: 0.4rem; }
    .editor-field input {
        width: 100%; padding: 0.6rem 0.75rem; background: var(--surface, #141417);
        border: 2px solid var(--border, rgba(255,255,255,0.1)); border-radius: var(--radius, 8px);
        color: var(--text); font-family: var(--font-heading, 'Playfair Display', serif);
        font-size: 1.25rem; outline: none; transition: border-color 0.2s; box-sizing: border-box;
    }
    .editor-field input:focus { border-color: var(--accent, #c9a87c); }

    .editor-toolbar { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .toolbar-btn { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; color: var(--text); padding: 0.4rem 0.8rem; font-size: 0.8rem; cursor: pointer; font-family: var(--font-body); }
    .toolbar-btn:hover { border-color: var(--accent); }
    .toolbar-spacer { flex: 1; }
    .visibility-label { font-size: 0.8rem; color: var(--text-dim); }
    .editor-toolbar select { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; color: var(--text); padding: 0.35rem 0.5rem; font-size: 0.8rem; cursor: pointer; }

    .editor-body { min-height: 400px; background: var(--surface); border: 2px solid var(--border); border-radius: var(--radius, 8px); overflow: hidden; }
    .editor-textarea {
        width: 100%; min-height: 400px; padding: 1.25rem; background: transparent; border: none;
        color: var(--text); font-family: var(--font-body); font-size: 1rem;
        line-height: 1.8; resize: vertical; outline: none; box-sizing: border-box;
    }
    .preview-pane { padding: 1.25rem; max-height: 600px; overflow-y: auto; }
    .preview-content { color: var(--text); line-height: 1.8; font-size: 1rem; }
    .preview-content :global(h1), .preview-content :global(h2), .preview-content :global(h3) { font-family: var(--font-heading, 'Playfair Display', serif); color: var(--text); margin: 1.5rem 0 0.75rem; }
    .preview-content :global(h1) { font-size: 1.5rem; }
    .preview-content :global(h2) { font-size: 1.25rem; }
    .preview-content :global(p) { margin-bottom: 1rem; }
    .preview-content :global(em) { color: var(--accent, #c9a87c); }
    .preview-content :global(blockquote) { border-left: 3px solid var(--accent, #c9a87c); padding-left: 1rem; margin: 1rem 0; color: var(--text-dim); font-style: italic; }
    .preview-content :global(strong) { color: var(--text); }
    .preview-content :global(a) { color: var(--accent, #c9a87c); }

    .editor-actions { display: flex; gap: 0.75rem; justify-content: flex-end; padding-top: 0.5rem; position: relative; }
    .toast { position: absolute; bottom: 100%; right: 0; margin-bottom: 0.5rem; padding: 0.5rem 1rem; border-radius: var(--radius, 8px); font-size: 0.85rem; white-space: nowrap; }
    .toast.success { background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; }
    .toast.error { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3); color: #f87171; }
    .btn-save, .btn-publish { padding: 0.6rem 1.25rem; border: none; border-radius: var(--radius, 8px); font-family: var(--font-body); font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    .btn-save { background: rgba(255,255,255,0.08); color: var(--text); border: 1px solid var(--border); }
    .btn-save:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
    .btn-publish { background: var(--accent, #c9a87c); color: var(--bg); }
    .btn-publish:hover:not(:disabled) { opacity: 0.9; }
    .btn-save:disabled, .btn-publish:disabled { opacity: 0.5; cursor: not-allowed; }

    @media (max-width: 768px) {
        .edit-header { flex-direction: column; align-items: flex-start; }
        .editor-actions { flex-direction: column; }
        .btn-save, .btn-publish { width: 100%; text-align: center; }
    }
</style>
