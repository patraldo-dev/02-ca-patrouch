<!-- src/routes/evaluate/+page.svelte -->
<script>
    import { t } from '$lib/i18n';
    import { getLocale } from '$lib/i18n';
    import { goto } from '$app/navigation';

    let { data } = $props();

    if (!data.user) {
        goto('/login');
    }

    let text = $state('');
    let locale = $state(getLocale());
    let currentResult = $state(null);
    let error = $state('');
    let isLoading = $state(false);
    let history = $state([]);
    let showHistory = $state(false);
    let expandedHistoryId = $state(null);

    async function loadHistory() {
        try {
            const res = await fetch('/api/evaluate?limit=20');
            const data = await res.json();
            history = data.evaluations || [];
        } catch (err) {
            console.error('Failed to load history');
        }
    }

    async function handleEvaluate() {
        error = '';
        currentResult = null;

        if (text.trim().length < 50) {
            error = $t('evaluate.error_short');
            return;
        }

        isLoading = true;
        try {
            const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, locale })
            });

            const data = await res.json();

            if (res.ok) {
                currentResult = data;
                loadHistory();
            } else {
                error = data.error || $t('evaluate.error_generic');
            }
        } catch (err) {
            error = $t('evaluate.error_generic');
        } finally {
            isLoading = false;
        }
    }

    function reset() {
        text = '';
        currentResult = null;
        error = '';
    }

    function downloadResult() {
        if (!currentResult) return;
        const content = [
            `Patrouch — AI Writing Evaluation`,
            `Date: ${new Date(currentResult.created_at).toLocaleString()}`,
            `Model: ${currentResult.model}`,
            `Locale: ${currentResult.locale}`,
            ``,
            `--- Text Preview ---`,
            `${currentResult.text_preview || ''}`,
            ``,
            `--- Evaluation ---`,
            currentResult.evaluation
        ].join('\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `patrouch-evaluation-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function shareResult() {
        if (!currentResult) return;
        const shareText = `AI Writing Evaluation — Patrouch\n\n${currentResult.evaluation.slice(0, 500)}`;
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Patrouch Evaluation', text: shareText });
            } catch (err) { /* user cancelled */ }
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareText);
        }
    }

    async function deleteEvaluation(id) {
        await fetch('/api/evaluate', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        history = history.filter(h => h.id !== id);
        if (currentResult?.id === id) currentResult = null;
    }

    function viewEvaluation(ev) {
        currentResult = ev;
        expandedHistoryId = ev.id;
        showHistory = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Load history on mount
    $effect(() => { loadHistory(); });
</script>

<main class="evaluate-page">
    <div class="container">
        <div class="page-header">
            <h1>{$t('evaluate.title')}</h1>
            <button class="btn-ghost" onclick={() => showHistory = !showHistory}>
                {$t('evaluate.history')} ({history.length})
            </button>
        </div>
        <p class="evaluate-desc">{$t('evaluate.description')}</p>

        {#if showHistory}
            <div class="history-section">
                <h2>{$t('evaluate.history_title')}</h2>
                {#if history.length === 0}
                    <p class="history-empty">{$t('evaluate.history_empty')}</p>
                {:else}
                    <div class="history-list">
                        {#each history as ev}
                            <div class="history-item" class:expanded={expandedHistoryId === ev.id}>
                                <div class="history-meta">
                                    <span class="history-date">{new Date(ev.created_at).toLocaleDateString()}</span>
                                    <span class="history-locale">{ev.locale.toUpperCase()}</span>
                                </div>
                                <p class="history-preview">{ev.text_preview}</p>
                                <div class="history-actions">
                                    <button class="btn-small" onclick={() => viewEvaluation(ev)}>{$t('evaluate.view')}</button>
                                    <button class="btn-small btn-danger" onclick={() => deleteEvaluation(ev.id)}>{$t('evaluate.delete')}</button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
                <button class="btn-ghost" onclick={() => showHistory = false}>{$t('evaluate.back_to_form')}</button>
            </div>
        {:else if !currentResult}
            <form onsubmit={(e) => { e.preventDefault(); handleEvaluate(); }} class="evaluate-form">
                <div class="field">
                    <label for="locale">{$t('evaluate.locale_label')}</label>
                    <select id="locale" bind:value={locale} disabled={isLoading}>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                    </select>
                </div>

                <div class="field full" style="position:relative;">
                    <label for="text">{$t('evaluate.title')}</label>
                    <textarea
                        id="text"
                        bind:value={text}
                        placeholder={$t('evaluate.placeholder')}
                        rows="16"
                        disabled={isLoading}
                    ></textarea>
                    <button class="copy-inline" onclick={() => navigator.clipboard.writeText(text)} title="{$t('audio.copy')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                    <div class="textarea-footer">
                        <span class="char-count">{text.length} {$t('evaluate.words') || 'chars'}</span>
                    </div>
                </div>

                <p class="privacy-note">🔒 {$t('evaluate.privacy_note')}</p>

                {#if error}
                    <p class="error">{error}</p>
                {/if}

                <button type="submit" disabled={isLoading}>
                    {isLoading ? $t('evaluate.evaluating') : $t('evaluate.submit')}
                </button>
            </form>
        {:else}
            <div class="result-section">
                <div class="result-header">
                    <div>
                        <h2>{$t('evaluate.result_title')}</h2>
                        <span class="result-date">{new Date(currentResult.created_at).toLocaleString()}</span>
                    </div>
                    <button class="btn-icon" onclick={async () => { await navigator.clipboard.writeText(currentResult.evaluation); }} title="Copy">📋</button>
                </div>
                <div class="result-body">
                    {#each currentResult.evaluation.split('\n') as line}
                        {#if line.trim() === ''}
                            <br />
                        {:else if line.startsWith('###')}
                            <h3>{line.replace('###', '').trim()}</h3>
                        {:else if line.startsWith('##')}
                            <h2>{line.replace('##', '').trim()}</h2>
                        {:else if line.startsWith('#')}
                            <h1>{line.replace('#', '').trim()}</h1>
                        {:else if line.startsWith('**') && line.endsWith('**')}
                            <strong>{line.replace(/\*\*/g, '')}</strong><br />
                        {:else if line.startsWith('- ') || line.startsWith('* ')}
                            <div class="result-line">• {line.slice(2)}</div>
                        {:else if /^\d+\./.test(line.trim())}
                            <div class="result-line">{line.trim()}</div>
                        {:else}
                            <div class="result-line">{line}</div>
                        {/if}
                    {/each}
                </div>
                <div class="result-actions">
                    <button onclick={downloadResult} class="btn-secondary">{$t('evaluate.download')}</button>
                    <button onclick={shareResult} class="btn-secondary">{$t('evaluate.share')}</button>
                    <button onclick={reset} class="btn-secondary">{$t('evaluate.try_again')}</button>
                </div>
            </div>
        {/if}
    </div>
</main>

<style>
    .evaluate-page {
        max-width: 800px;
        margin: 0 auto;
        padding: 3rem 1.5rem 4rem;
    }

    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.5rem;
    }

    h1 {
        font-family: var(--font-heading);
        font-size: 1.8rem;
        font-weight: 400;
        color: var(--text);
        margin: 0;
    }

    .evaluate-desc {
        color: var(--text-dim);
        font-size: 0.95rem;
        line-height: 1.6;
        margin: 0 0 2rem;
    }

    .btn-ghost {
        background: none;
        border: 1px solid var(--border);
        color: var(--text-dim);
        padding: 0.4rem 0.8rem;
        border-radius: 6px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

    .btn-small {
        background: var(--surface);
        border: 1px solid var(--border);
        color: var(--text);
        padding: 0.3rem 0.7rem;
        border-radius: 4px;
        font-size: 0.8rem;
        cursor: pointer;
    }
    .btn-small:hover { border-color: var(--accent); }
    .btn-danger { color: #ef4444; }
    .btn-danger:hover { border-color: #ef4444; }

    .evaluate-form {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: 1.5rem;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .field.full { grid-column: 1 / -1; }

    .field label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-dim);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    select {
        padding: 0.6rem 0.75rem;
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        font-family: var(--font-body);
        font-size: 0.9rem;
    }

    textarea {
        width: 100%;
        padding: 0.75rem;
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        font-family: var(--font-body);
        font-size: 0.95rem;
        line-height: 1.6;
        resize: vertical;
        min-height: 300px;
        box-sizing: border-box;
    }

    textarea:focus, select:focus {
        outline: none;
        border-color: var(--accent);
    }

    .privacy-note {
        grid-column: 1 / -1;
        font-size: 0.8rem;
        color: var(--text-dim);
        margin: 0;
    }

    .error {
        grid-column: 1 / -1;
        color: #ef4444;
        font-size: 0.9rem;
        margin: 0;
    }

    button[type="submit"], .btn-secondary {
        padding: 0.7rem 1.5rem;
        border-radius: 8px;
        font-family: var(--font-body);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }

    button:hover { opacity: 0.85; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    button[type="submit"] {
        grid-column: 1 / -1;
        background: var(--accent);
        color: var(--bg);
        border: none;
    }

    .btn-secondary {
        background: transparent;
        color: var(--accent);
        border: 2px solid var(--accent);
    }

    .btn-secondary:hover {
        background: var(--accent);
        color: var(--bg);
        opacity: 1;
    }

    /* History */
    .history-section h2 {
        font-family: var(--font-heading);
        font-size: 1.3rem;
        font-weight: 400;
        color: var(--text);
        margin: 0 0 1rem;
    }

    .history-empty {
        color: var(--text-dim);
        font-size: 0.9rem;
    }

    .history-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }

    .history-item {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 1rem;
    }

    .history-meta {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
    }

    .history-date {
        font-size: 0.8rem;
        color: var(--text-dim);
    }

    .history-locale {
        font-size: 0.7rem;
        padding: 0.15rem 0.4rem;
        background: var(--accent-bg, rgba(201,168,124,0.15));
        color: var(--accent);
        border-radius: 4px;
        font-weight: 600;
    }

    .history-preview {
        font-size: 0.85rem;
        color: var(--text-dim);
        margin: 0 0 0.75rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .history-actions {
        display: flex;
        gap: 0.5rem;
    }

    /* Results */
    .result-section {
        padding: 2rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
    }

    .result-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 1.5rem;
    }

    .result-header > div { display: flex; flex-direction: column; gap: 0.25rem; }

    .btn-icon {
        background: none;
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 0.4rem 0.6rem;
        cursor: pointer;
        font-size: 1rem;
        transition: border-color 0.2s;
    }
    .btn-icon:hover { border-color: var(--accent); }

    .result-section h2 {
        font-family: var(--font-heading);
        font-size: 1.3rem;
        font-weight: 400;
        color: var(--accent);
        margin: 0;
    }

    .result-date {
        font-size: 0.8rem;
        color: var(--text-dim);
    }

    .result-body h3 {
        font-size: 1rem;
        color: var(--accent);
        margin: 1.2rem 0 0.3rem;
    }

    .result-line {
        color: var(--text);
        line-height: 1.7;
        font-size: 0.95rem;
    }

    .result-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 2rem;
        flex-wrap: wrap;
    }

    @media (max-width: 640px) {
        .evaluate-form { grid-template-columns: 1fr; }
        .evaluate-page { padding: 2rem 1rem 3rem; }
        .result-actions { flex-direction: column; }
    }
</style>
