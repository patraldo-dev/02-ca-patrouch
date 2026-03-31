<script>
    let { data } = $props();
    import { enhance } from '$app/forms';

    let formData = {
        title: $state(''),
        content: $state(''),
        visibility: $state('private'),
        aiAssisted: $state(false)
    };

    let wordCount = $derived(formData.content.trim() ? formData.content.trim().split(/\s+/).length : 0);
    let saving = $state(false);

    const categoryLabels = {
        fiction: 'Fiction', poetry: 'Poetry', memoir: 'Memoir', 'sci-fi': 'Sci-Fi',
        mystery: 'Mystery', romance: 'Romance', fantasy: 'Fantasy', 'creative non-fiction': 'Creative Non-Fiction'
    };
</script>

<div class="editor-page">
    <a href="/write" class="back-link">← Back to Dashboard</a>

    <h1 class="editor-heading">New Writing</h1>

    {#if data.prompt}
        <div class="prompt-context">
            <span class="prompt-tag">Writing from prompt</span>
            <p class="prompt-text">{data.prompt.prompt_text}</p>
            <span class="prompt-cat">{categoryLabels[data.prompt.category] || data.prompt.category}</span>
        </div>
    {/if}

    <form method="POST" use:enhance={() => { saving = true; return async () => { saving = false; }; }}>
        <input type="hidden" name="promptId" value={data.prompt?.id || ''} />

        <div class="editor-field">
            <label for="title">Title</label>
            <input id="title" name="title" type="text" bind:value={formData.title} placeholder="Give your piece a title…" required />
        </div>

        <div class="editor-field full">
            <label for="content">Content <span class="word-count">{wordCount} words</span></label>
            <textarea id="content" name="content" bind:value={formData.content} placeholder="Start writing…" rows="16" required></textarea>
        </div>

        <div class="editor-options">
            <div class="option-group">
                <label>Visibility</label>
                <select name="visibility" bind:value={formData.visibility}>
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                </select>
            </div>

            <label class="toggle-label">
                <input type="checkbox" name="aiAssisted" bind:checked={formData.aiAssisted} />
                <span>AI Assisted</span>
            </label>
        </div>

        <div class="editor-actions">
            <button type="submit" formaction="/write/new?/draft" class="btn-glass" disabled={saving}>
                Save Draft
            </button>
            <button type="submit" formaction="/write/new?/publish" class="btn-accent" disabled={saving}>
                Publish
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
