<script>
    let { data } = $props();
    import { enhance } from '$app/forms';
    import { t } from '$lib/i18n';

    let title = $state('');
    let content = $state('');
    let visibility = $state('private');
    let aiAssisted = $state(false);

    let wordCount = $derived(content.trim() ? content.trim().split(/\s+/).length : 0);
    let saving = $state(false);
    let saved = $state(false);

    function catLabel(key) {
        return $t('write.category.' + key) || key;
    }
</script>

<div class="editor-page">
    <a href="/write" class="back-link">{$t('write.editor.back')}</a>

    <h1 class="editor-heading">{$t('write.editor.heading')}</h1>

    {#if data.prompt}
        <div class="prompt-context">
            <span class="prompt-tag">{$t('write.editor.from_prompt')}</span>
            <p class="prompt-text">{data.prompt.prompt_text}</p>
            <span class="prompt-cat">{catLabel(data.prompt.category)}</span>
        </div>
    {/if}

    <form method="POST" use:enhance={() => { saving = true; saved = false; return async ({ result }) => { saving = false; if (result.type === 'success') saved = true; }; }}>
        <input type="hidden" name="promptId" value={data.prompt?.id || ''} />

        <div class="editor-field">
            <label for="title">{$t('write.editor.title')}</label>
            <input id="title" name="title" type="text" bind:value={title} placeholder={$t('write.editor.title_placeholder')} required />
        </div>

        <div class="editor-field full">
            <label for="content">{$t('write.editor.content')} <span class="word-count">{wordCount} {$t('write.editor.words')}</span></label>
            <textarea id="content" name="content" bind:value={content} placeholder={$t('write.editor.content_placeholder')} rows="16" required></textarea>
        </div>

        <div class="editor-options">
            <div class="option-group">
                <label>{$t('write.editor.visibility')}</label>
                <select name="visibility" bind:value={visibility}>
                    <option value="private">{$t('write.editor.private')}</option>
                    <option value="public">{$t('write.editor.public')}</option>
                </select>
            </div>

            <label class="toggle-label">
                <input type="checkbox" name="aiAssisted" bind:checked={aiAssisted} />
                <span>{$t('write.editor.ai_assisted')}</span>
            </label>
        </div>

        {#if saved}
            <div class="save-toast">
                <span>✓</span> {$t('write.editor.saved')}
                <a href="/write" class="back-link-inline">{$t('write.editor.view_dashboard')}</a>
            </div>
        {/if}

        <div class="editor-actions">
            <button type="submit" formaction="/write/new?/draft" class="btn-glass" disabled={saving}>
                {saving ? $t('write.editor.saving') : $t('write.editor.save_draft')}
            </button>
            <button type="submit" formaction="/write/new?/publish" class="btn-accent" disabled={saving}>
                {$t('write.editor.publish')}
            </button>
        </div>
    </form>
</div>

<style>
    .editor-page {
        max-width: 780px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
    }

    .back-link {
        color: var(--text-muted);
        text-decoration: none;
        font-size: 0.85rem;
        transition: color 0.2s;
    }

    .back-link:hover { color: var(--accent); }

    .editor-heading {
        font-family: var(--font-heading);
        font-size: 1.8rem;
        font-weight: 300;
        color: var(--text);
        margin: 1rem 0 1.5rem;
    }

    /* Prompt Context */
    .prompt-context {
        background: var(--surface);
        border: 1px solid var(--border);
        border-left: 3px solid var(--accent);
        border-radius: var(--radius);
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
        color: var(--text-muted);
    }

    /* Fields */
    .editor-field {
        margin-bottom: 1.5rem;
    }

    .editor-field.full {
        margin-bottom: 2rem;
    }

    .editor-field label {
        display: block;
        font-size: 0.8rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
    }

    .word-count {
        color: var(--text-muted);
        font-weight: 400;
        text-transform: none;
        letter-spacing: 0;
    }

    .editor-field input[type="text"],
    .editor-field textarea,
    .editor-field select {
        width: 100%;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.75rem 1rem;
        color: var(--text);
        font-family: var(--font-body);
        font-size: 0.95rem;
        transition: border-color 0.2s;
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

    .editor-field select {
        cursor: pointer;
        appearance: auto;
    }

    .editor-field input::placeholder,
    .editor-field textarea::placeholder {
        color: var(--text-muted);
    }

    /* Options */
    .editor-options {
        display: flex;
        align-items: center;
        gap: 2rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
    }

    .option-group label {
        display: block;
        font-size: 0.8rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--text-muted);
        margin-bottom: 0.5rem;
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

    /* Actions */
    .save-toast {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(34, 197, 94, 0.15);
        border: 1px solid rgba(34, 197, 94, 0.3);
        border-radius: 8px;
        color: #86efac;
        font-size: 14px;
        margin-bottom: 16px;
    }

    .save-toast .back-link-inline {
        margin-left: auto;
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
        font-size: 13px;
    }

    .save-toast .back-link-inline:hover {
        text-decoration: underline;
    }

    .editor-actions {
        display: flex;
        gap: 0.75rem;
    }

    .btn-glass {
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 0.65rem 1.5rem;
        color: var(--text-dim);
        font-family: var(--font-body);
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-glass:hover { border-color: var(--accent); color: var(--accent); }
    .btn-glass:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-accent {
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: var(--radius);
        padding: 0.65rem 1.5rem;
        font-family: var(--font-body);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }

    .btn-accent:hover { background: var(--accent-hover); }
    .btn-accent:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
