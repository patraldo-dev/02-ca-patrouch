<!-- src/routes/refine/+page.svelte -->
<script>
    import { t, getLocale } from '$lib/i18n';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

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
    let toast = $state('');
    let toastTimeout = $state(null);

    function showToast(msg) {
        toast = msg;
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast = '', 2500);
    }

    onMount(() => {
        if (browser) {
            const saved = sessionStorage.getItem('refine_text');
            if (saved) {
                text = saved;
                sessionStorage.removeItem('refine_text');
            }
        }
    });

    async function loadHistory() {
        try {
            const res = await fetch('/api/refine?limit=20');
            const data = await res.json();
            history = data.refinements || [];
        } catch (err) {
            console.error('Failed to load history');
        }
    }

    async function handleRefine() {
        error = '';
        currentResult = null;

        if (text.trim().length < 50) {
            error = $t('refine.error_short');
            return;
        }

        isLoading = true;
        try {
            const res = await fetch('/api/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, locale })
            });

            const data = await res.json();

            if (res.ok) {
                currentResult = { ...data, originalText: text };
                loadHistory();
            } else {
                error = data.error || $t('refine.error_generic');
            }
        } catch (err) {
            error = $t('refine.error_generic');
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
            `Patrouch — AI Text Refinement`,
            `Date: ${new Date(currentResult.created_at).toLocaleString()}`,
            `Locale: ${currentResult.locale}`,
            ``,
            `--- Original ---`,
            currentResult.originalText,
            ``,
            `--- Refined ---`,
            currentResult.refinedText
        ].join('\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `patrouch-refined-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        showToast($t('refine.download'));
    }

    async function copyResult() {
        if (!currentResult) return;
        await navigator.clipboard.writeText(currentResult.refinedText);
        showToast($t('refine.copied'));
    }

    async function shareResult() {
        if (!currentResult) return;
        const shareText = currentResult.refinedText.slice(0, 500);
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Patrouch — Refined Text', text: shareText });
            } catch (err) { /* user cancelled */ }
        } else {
            await navigator.clipboard.writeText(shareText);
            showToast($t('refine.copied'));
        }
    }

    async function deleteRefinement(id) {
        await fetch('/api/refine', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        history = history.filter(h => h.id !== id);
        if (currentResult?.id === id) currentResult = null;
    }

    function viewRefinement(r) {
        currentResult = r;
        expandedHistoryId = r.id;
        showHistory = false;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    $effect(() => { loadHistory(); });
</script>

<main class="refine-page">
    <div class="container">
        <div class="page-header">
            <h1>{$t('refine.title')}</h1>
            <button class="btn-ghost" onclick={() => showHistory = !showHistory}>
                {$t('refine.history')} ({history.length})
            </button>
        </div>
        <p class="refine-desc">{$t('refine.description')}</p>

        {#if toast}
            <div class="toast">{toast}</div>
        {/if}

        {#if showHistory}
            <div class="history-section">
                <h2>{$t('refine.history_title')}</h2>
                {#if history.length === 0}
                    <p class="history-empty">{$t('refine.history_empty')}</p>
                {:else}
                    <div class="history-list">
                        {#each history as r}
                            <div class="history-item">
                                <div class="history-meta">
                                    <span class="history-date">{new Date(r.created_at).toLocaleDateString()}</span>
                                    <span class="history-locale">{r.locale.toUpperCase()}</span>
                                </div>
                                <p class="history-preview">{r.text_preview}</p>
                                <div class="history-actions">
                                    <button class="btn-small" onclick={() => viewRefinement(r)}>{$t('refine.view')}</button>
                                    <button class="btn-small btn-danger" onclick={() => deleteRefinement(r.id)}>{$t('refine.delete')}</button>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
                <button class="btn-ghost" onclick={() => showHistory = false}>{$t('refine.back_to_form')}</button>
            </div>
        {:else if !currentResult}
            <form onsubmit={(e) => { e.preventDefault(); handleRefine(); }} class="refine-form">
                <div class="field">
                    <label for="locale">{$t('refine.locale_label')}</label>
                    <select id="locale" bind:value={locale} disabled={isLoading}>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                    </select>
                </div>

                <div class="field full">
                    <label for="text">{$t('refine.title')}</label>
                    <textarea
                        id="text"
                        bind:value={text}
                        placeholder={$t('refine.placeholder')}
                        rows="16"
                        disabled={isLoading}
                    ></textarea>
                    <div class="textarea-footer">
                        <span class="char-count">{text.length} {$t('refine.characters')}</span>
                    </div>
                </div>

                <p class="privacy-note">🔒 {$t('refine.privacy_note')}</p>

                {#if error}
                    <p class="error">{error}</p>
                {/if}

                <button type="submit" disabled={isLoading}>
                    {isLoading ? $t('refine.refining') : $t('refine.submit')}
                </button>
            </form>
        {:else}
            <div class="result-section">
                <div class="result-header">
                    <div>
                        <h2>{$t('refine.result_title')}</h2>
                        <span class="result-date">{new Date(currentResult.created_at).toLocaleString()}</span>
                    </div>
                    <div class="result-header-actions">
                        <button class="btn-icon" onclick={copyResult} title={$t('refine.copy')}>📋</button>
                    </div>
                </div>

                <div class="diff-view">
                    <div class="diff-column">
                        <h3 class="diff-label">{$t('refine.original')}</h3>
                        <div class="diff-content">{currentResult.originalText}</div>
                    </div>
                    <div class="diff-divider">→</div>
                    <div class="diff-column">
                        <h3 class="diff-label refined-label">{$t('refine.refined')}</h3>
                        <div class="diff-content">{currentResult.refinedText}</div>
                    </div>
                </div>

                <div class="result-actions">
                    <button onclick={downloadResult} class="btn-secondary">{$t('refine.download')}</button>
                    <button onclick={copyResult} class="btn-secondary">{$t('refine.copy')}</button>
                    <button onclick={shareResult} class="btn-secondary">{$t('refine.share')}</button>
                    <button onclick={reset} class="btn-secondary">{$t('refine.back_to_form')}</button>
                </div>
            </div>
        {/if}
    </div>
</main>

<style>
    .refine-page {
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

    .refine-desc {
        color: var(--text-dim);
        font-size: 0.95rem;
        line-height: 1.6;
        margin: 0 0 2rem;
    }

    .toast {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 0.75rem 1.25rem;
        border-radius: 8px;
        font-size: 0.85rem;
        z-index: 1000;
        background: rgba(201, 168, 124, 0.15);
        color: var(--accent);
        border: 1px solid rgba(201, 168, 124, 0.3);
        backdrop-filter: blur(10px);
        animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
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

    .refine-form {
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

    .textarea-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 0.25rem;
    }

    .char-count {
        font-size: 0.75rem;
        color: var(--text-dim);
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

    .history-date { font-size: 0.8rem; color: var(--text-dim); }

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

    .result-date { font-size: 0.8rem; color: var(--text-dim); }

    .diff-view {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .diff-divider {
        display: flex;
        align-items: center;
        color: var(--text-dim);
        font-size: 1.2rem;
    }

    .diff-label {
        font-family: var(--font-heading);
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-dim);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 0 0 0.75rem;
    }

    .refined-label { color: var(--accent); }

    .diff-content {
        font-size: 0.9rem;
        line-height: 1.7;
        color: var(--text);
        white-space: pre-wrap;
        max-height: 500px;
        overflow-y: auto;
        padding: 1rem;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 6px;
    }

    .result-actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    @media (max-width: 640px) {
        .refine-form { grid-template-columns: 1fr; }
        .refine-page { padding: 2rem 1rem 3rem; }
        .result-actions { flex-direction: column; }
        .diff-view {
            grid-template-columns: 1fr;
        }
        .diff-divider {
            justify-content: center;
            padding: 0.5rem 0;
        }
    }
</style>
