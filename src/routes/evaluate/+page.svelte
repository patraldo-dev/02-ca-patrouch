<!-- src/routes/evaluate/+page.svelte -->
<script>
    import { t } from '$lib/i18n';
    import { getLocale } from '$lib/i18n';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    let { data } = $props();

    if (!data.user) {
        goto('/login');
    }

    let text = $state('');
    let locale = $state(getLocale());
    let result = $state('');
    let error = $state('');
    let isLoading = $state(false);

    async function handleEvaluate() {
        error = '';
        result = '';

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
                result = data.evaluation;
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
        result = '';
        error = '';
    }
</script>

<main class="evaluate-page">
    <div class="container">
        <h1>{$t('evaluate.title')}</h1>
        <p class="evaluate-desc">{$t('evaluate.description')}</p>

        {#if !result}
            <form onsubmit={(e) => { e.preventDefault(); handleEvaluate(); }} class="evaluate-form">
                <div class="field">
                    <label for="locale">{$t('evaluate.locale_label')}</label>
                    <select id="locale" bind:value={locale} disabled={isLoading}>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                    </select>
                </div>

                <div class="field full">
                    <label for="text">{$t('evaluate.title')}</label>
                    <textarea
                        id="text"
                        bind:value={text}
                        placeholder={$t('evaluate.placeholder')}
                        rows="16"
                        disabled={isLoading}
                    ></textarea>
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
                <h2>{$t('evaluate.result_title')}</h2>
                <div class="result-body">
                    {#each result.split('\n') as line}
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
                <button onclick={reset} class="btn-secondary">{$t('evaluate.try_again')}</button>
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

    h1 {
        font-family: var(--font-heading);
        font-size: 1.8rem;
        font-weight: 400;
        color: var(--text);
        margin: 0 0 0.5rem;
    }

    .evaluate-desc {
        color: var(--text-dim);
        font-size: 0.95rem;
        line-height: 1.6;
        margin: 0 0 2rem;
    }

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

    .field.full {
        grid-column: 1 / -1;
    }

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
        grid-column: 1 / -1;
        padding: 0.75rem 2rem;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: 8px;
        font-family: var(--font-body);
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }

    button:hover { opacity: 0.85; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-secondary {
        background: transparent;
        color: var(--accent);
        border: 2px solid var(--accent);
        margin-top: 2rem;
    }

    .btn-secondary:hover {
        background: var(--accent);
        color: var(--bg);
        opacity: 1;
    }

    /* Results */
    .result-section {
        padding: 2rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
    }

    .result-section h2 {
        font-family: var(--font-heading);
        font-size: 1.3rem;
        font-weight: 400;
        color: var(--accent);
        margin: 0 0 1.5rem;
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

    .result-line strong {
        color: var(--text);
    }

    @media (max-width: 640px) {
        .evaluate-form {
            grid-template-columns: 1fr;
        }

        .evaluate-page {
            padding: 2rem 1rem 3rem;
        }
    }
</style>
