<!-- src/routes/audio/+page.svelte -->
<script>
    import { t } from '$lib/i18n';
    import { goto } from '$app/navigation';

    let { data } = $props();

    if (!data.user) {
        goto('/login');
    }

    let text = $state('');
    let locale = $state('en');
    let voiceId = $state('pNInz6obpgDQGcFmaJgB');
    let useAiDevelop = $state(false);
    let audioUrl = $state('');
    let isLoading = $state(false);
    let isAiLoading = $state(false);
    let error = $state('');

    const voices = [
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam' },
        { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella' },
        { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni' },
        { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli' },
        { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold' },
        { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Sam' },
    ];

    async function handleAiDevelop() {
        error = '';
        isAiLoading = true;
        try {
            const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, locale })
            });
            const data = await res.json();
            if (res.ok) {
                text = data.evaluation;
            } else {
                error = data.error || 'AI development failed';
            }
        } catch (err) {
            error = 'Network error';
        } finally {
            isAiLoading = false;
        }
    }

    async function handleGenerate() {
        error = '';
        audioUrl = '';
        isLoading = true;
        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voiceId })
            });
            const data = await res.json();
            if (res.ok) {
                audioUrl = `data:audio/mp3;base64,${data.audio}`;
            } else {
                error = data.error || 'Audio generation failed';
            }
        } catch (err) {
            error = 'Network error';
        } finally {
            isLoading = false;
        }
    }

    function downloadAudio() {
        if (!audioUrl) return;
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `patrouch-audio-${Date.now()}.mp3`;
        a.click();
    }
</script>

<main class="audio-page">
    <div class="container">
        <h1>{$t('audio.title')}</h1>
        <p class="audio-desc">{$t('audio.description')}</p>

        <div class="audio-form">
            <div class="row">
                <div class="field">
                    <label>{$t('audio.voice')}</label>
                    <select bind:value={voiceId} disabled={isLoading}>
                        {#each voices as v}
                            <option value={v.id}>{v.name}</option>
                        {/each}
                    </select>
                </div>
                <div class="field">
                    <label>{$t('audio.locale')}</label>
                    <select bind:value={locale} disabled={isLoading}>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                    </select>
                </div>
            </div>

            <div class="field full">
                <label>{$t('audio.text_label')}</label>
                <textarea
                    bind:value={text}
                    placeholder={$t('audio.placeholder')}
                    rows="14"
                    disabled={isLoading || isAiLoading}
                ></textarea>
                <span class="char-count">{text.length} / 5000</span>
            </div>

            <div class="options-row">
                <label class="toggle">
                    <input type="checkbox" bind:checked={useAiDevelop} />
                    <span>{$t('audio.ai_develop')}</span>
                </label>
            </div>

            <p class="privacy-note">🔒 {$t('audio.privacy')}</p>

            {#if error}
                <p class="error">{error}</p>
            {/if}

            <div class="actions">
                {#if useAiDevelop}
                    <button onclick={handleAiDevelop} disabled={isLoading || isAiLoading || text.length < 50}>
                        {isAiLoading ? $t('audio.developing') : $t('audio.develop_btn')}
                    </button>
                {/if}
                <button class="btn-primary" onclick={handleGenerate} disabled={isLoading || isAiLoading || text.length < 10}>
                    {isLoading ? $t('audio.generating') : $t('audio.generate_btn')}
                </button>
            </div>
        </div>

        {#if audioUrl}
            <div class="player-section">
                <h2>{$t('audio.result')}</h2>
                <audio controls src={audioUrl}></audio>
                <button onclick={downloadAudio} class="btn-secondary">{$t('audio.download')}</button>
            </div>
        {/if}
    </div>
</main>

<style>
    .audio-page {
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

    .audio-desc {
        color: var(--text-dim);
        font-size: 0.95rem;
        line-height: 1.6;
        margin: 0 0 2rem;
    }

    .audio-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .field.full { /* no grid needed */ }

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
        min-height: 250px;
        box-sizing: border-box;
    }

    textarea:focus, select:focus {
        outline: none;
        border-color: var(--accent);
    }

    .char-count {
        font-size: 0.75rem;
        color: var(--text-dim);
        text-align: right;
        margin-top: 0.25rem;
    }

    .options-row {
        display: flex;
        align-items: center;
    }

    .toggle {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-size: 0.9rem;
        color: var(--text);
    }

    .toggle input[type="checkbox"] {
        width: auto;
        accent-color: var(--accent);
    }

    .privacy-note {
        font-size: 0.8rem;
        color: var(--text-dim);
        margin: 0;
    }

    .error {
        color: #ef4444;
        font-size: 0.9rem;
        margin: 0;
    }

    .actions {
        display: flex;
        gap: 1rem;
    }

    .btn-primary {
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

    button:hover:not(:disabled) { opacity: 0.85; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    button:not(.btn-primary):not(.btn-secondary) {
        padding: 0.75rem 1.5rem;
        background: var(--surface);
        color: var(--text);
        border: 2px solid var(--border);
        border-radius: 8px;
        font-family: var(--font-body);
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
    }

    .player-section {
        margin-top: 2rem;
        padding: 2rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
    }

    .player-section h2 {
        font-family: var(--font-heading);
        font-size: 1.3rem;
        font-weight: 400;
        color: var(--accent);
        margin: 0 0 1.5rem;
    }

    audio {
        width: 100%;
        margin-bottom: 1rem;
        border-radius: 8px;
    }

    .btn-secondary {
        padding: 0.7rem 1.5rem;
        background: transparent;
        color: var(--accent);
        border: 2px solid var(--accent);
        border-radius: 8px;
        font-family: var(--font-body);
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-secondary:hover {
        background: var(--accent);
        color: var(--bg);
    }

    @media (max-width: 640px) {
        .row { grid-template-columns: 1fr; }
        .actions { flex-direction: column; }
        .audio-page { padding: 2rem 1rem 3rem; }
    }
</style>
