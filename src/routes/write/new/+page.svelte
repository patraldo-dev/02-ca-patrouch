<!-- src/routes/write/new/+page.svelte -->
<script>
    import { t } from '$lib/i18n';
    import { goto } from '$app/navigation';

    let { data } = $props();

    let title = $state('');
    let content = $state('');
    let visibility = $state('public');
    let aiAssisted = $state(false);
    let saving = $state(false);
    let saved = $state(false);
    let error = $state('');

    let wordCount = $derived(content.trim() ? content.trim().split(/\s+/).length : 0);

    function catLabel(key) {
        return `write.category.${key}`;
    }

    async function handleSave(publish) {
        if (!title.trim() || !content.trim()) return;
        saving = true;
        error = '';
        try {
            const res = await fetch('/api/writings/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    content: content.trim(),
                    promptId: data.prompt?.id || null,
                    aiAssisted,
                    visibility,
                    status: publish ? 'published' : 'draft'
                })
            });
            if (res.ok) {
                saved = true;
                error = '';
            } else {
                const d = await res.json();
                error = d.error || 'Failed to save';
            }
        } catch {
            error = 'Network error';
        }
        saving = false;
    }
</script>

<div class="editor-page">
    <button class="back-link" onclick={() => goto('/write')}>{$t('write.editor.back')}</button>

    <h1 class="editor-heading">{$t('write.editor.heading')}</h1>

    {#if data.prompt}
        <div class="prompt-context">
            <span class="prompt-tag">{$t('write.editor.from_prompt')}</span>
            <p class="prompt-text">{data.prompt.prompt_text}</p>
            <span class="prompt-cat">{$t(catLabel(data.prompt.category))}</span>
        </div>
    {/if}

    {#if error}
        <div class="form-error">{error}</div>
    {/if}

    {#if saved}
        <div class="save-toast">
            <span>✓</span> {$t('write.editor.saved')}
            <button class="back-link-inline" onclick={() => goto('/write')}>{$t('write.editor.view_dashboard')}</button>
        </div>
    {/if}

    <div class="editor-field">
        <label>{$t('write.editor.title')}</label>
        <input type="text" bind:value={title} placeholder={$t('write.editor.title_placeholder')} required />
    </div>

    <div class="editor-field full">
        <label>{$t('write.editor.content')} <span class="word-count">{wordCount} {$t('write.editor.words')}</span></label>
        <div style="position:relative;">
            <textarea bind:value={content} placeholder={$t('write.editor.content_placeholder')} rows="16" required></textarea>
            <button class="copy-inline" onclick={() => navigator.clipboard.writeText(content)} title="Copy">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            </button>
        </div>
    </div>

    <div class="editor-options">
        <div class="option-group">
            <label>{$t('write.editor.visibility')}</label>
            <select bind:value={visibility}>
                <option value="private">{$t('write.editor.private')}</option>
                <option value="public">{$t('write.editor.public')}</option>
            </select>
        </div>
        <label class="toggle-label">
            <input type="checkbox" bind:checked={aiAssisted} />
            <span>{$t('write.editor.ai_assisted')}</span>
        </label>
    </div>

    <div class="editor-actions">
        <button class="btn-glass" onclick={() => handleSave(false)} disabled={saving || !title.trim() || !content.trim()}>
            {saving ? $t('write.editor.saving') : $t('write.editor.save_draft')}
        </button>
        <button class="btn-accent" onclick={() => handleSave(true)} disabled={saving || !title.trim() || !content.trim()}>
            {$t('write.editor.publish')}
        </button>
    </div>
</div>

<style>
    .editor-page {
        max-width: 780px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
    }
    .back-link {
        background: none;
        border: none;
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.85rem;
        cursor: pointer;
        padding: 0;
    }
    .back-link:hover { color: var(--accent); }
    .editor-heading {
        font-family: var(--font-heading);
        font-size: 1.8rem;
        font-weight: 300;
        color: var(--text);
        margin: 1rem 0 1.5rem;
    }
    .prompt-context {
        background: var(--surface);
        border: 1px solid var(--border);
        border-left: 3px solid var(--accent);
        border-radius: 8px;
        padding: 1.25rem 1.5rem;
        margin-bottom: 2rem;
    }
    .prompt-tag {
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
    }
    .prompt-text {
        font-family: var(--font-heading);
        font-size: 1.05rem;
        font-weight: 300;
        color: var(--text-dim);
        margin: 0.5rem 0;
        line-height: 1.5;
    }
    .prompt-cat {
        font-size: 0.75rem;
        color: var(--text-dim);
    }
    .form-error {
        color: #f87171;
        font-size: 0.85rem;
        margin-bottom: 1rem;
    }
    .save-toast {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: rgba(34,197,94,0.1);
        border: 1px solid rgba(34,197,94,0.3);
        border-radius: 8px;
        color: #4ade80;
        font-size: 0.9rem;
        margin-bottom: 1rem;
    }
    .back-link-inline {
        margin-left: auto;
        background: none;
        border: none;
        color: var(--accent);
        font-family: var(--font-body);
        font-size: 0.85rem;
        cursor: pointer;
        font-weight: 600;
    }
    .editor-field {
        margin-bottom: 1.5rem;
    }
    .editor-field.full {
        margin-bottom: 2rem;
    }
    .editor-field label {
        display: block;
        color: var(--text);
        font-size: 0.85rem;
        margin-bottom: 0.4rem;
    }
    .word-count {
        color: var(--text-dim);
        font-size: 0.8rem;
    }
    .editor-field input[type="text"],
    .editor-field textarea,
    .editor-field select {
        width: 100%;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        font-family: var(--font-body);
        font-size: 0.95rem;
        padding: 0.75rem 1rem;
        box-sizing: border-box;
    }
    .editor-field input:focus,
    .editor-field textarea:focus,
    .editor-field select:focus {
        outline: none;
        border-color: var(--accent);
    }
    .editor-field textarea {
        resize: vertical;
        min-height: 300px;
        line-height: 1.7;
    }
    .editor-field input::placeholder,
    .editor-field textarea::placeholder {
        color: var(--text-dim);
    }
    .editor-options {
        display: flex;
        align-items: center;
        gap: 2rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
    }
    .option-group label {
        display: block;
        color: var(--text);
        font-size: 0.85rem;
        margin-bottom: 0.4rem;
    }
    .toggle-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        color: var(--text-dim);
        font-size: 0.85rem;
    }
    .toggle-label input[type="checkbox"] {
        accent-color: var(--accent);
        width: 16px;
        height: 16px;
    }
    .editor-actions {
        display: flex;
        gap: 0.75rem;
    }
    .btn-glass {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.9rem;
        padding: 0.65rem 1.5rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .btn-glass:hover { border-color: var(--accent); color: var(--accent); }
    .btn-glass:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-accent {
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: 8px;
        font-family: var(--font-body);
        font-size: 0.9rem;
        font-weight: 600;
        padding: 0.65rem 1.5rem;
        cursor: pointer;
    }
    .btn-accent:hover { opacity: 0.85; }
    .btn-accent:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
