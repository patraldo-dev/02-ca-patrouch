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
    let provider = $state('elevenlabs');
    let useAiDevelop = $state(false);
    let audioUrl = $state('');
    let isLoading = $state(false);
    let isAiLoading = $state(false);
    let error = $state('');
    let hasKey = $state(false);
    let keyPreview = $state(null);
    let showKeySetup = $state(false);
    let apiKeyInput = $state('');
    let keyLoading = $state(false);
    let keyError = $state('');
    let keySuccess = $state(false);
    let checkingKey = $state(true);

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

    // Check if user has an API key on mount
    async function checkKey() {
        try {
            const res = await fetch('/api/tts/api-key');
            const data = await res.json();
            hasKey = data.hasKey;
            keyPreview = data.preview;
            showKeySetup = !data.hasKey;
        } catch (e) { /* ignore */ }
        checkingKey = false;
    }
    checkKey();

    async function saveApiKey() {
        keyError = '';
        keySuccess = false;
        keyLoading = true;
        try {
            const res = await fetch('/api/tts/api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: apiKeyInput })
            });
            const data = await res.json();
            if (res.ok) {
                hasKey = true;
                keyPreview = '••••';
                showKeySetup = false;
                apiKeyInput = '';
                keySuccess = true;
                setTimeout(() => keySuccess = false, 3000);
            } else {
                keyError = data.error || 'Failed to save API key';
            }
        } catch (e) {
            keyError = 'Network error';
        } finally {
            keyLoading = false;
        }
    }

    async function removeApiKey() {
        try {
            await fetch('/api/tts/api-key', { method: 'DELETE' });
            hasKey = false;
            keyPreview = null;
            showKeySetup = true;
        } catch (e) { /* ignore */ }
    }

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
                body: JSON.stringify({ text, voiceId, provider })
            });
            const data = await res.json();
            if (res.ok) {
                audioUrl = `data:audio/${data.format};base64,${data.audio}`;
            } else {
                if (data.error === 'no_api_key') {
                    showKeySetup = true;
                    error = $t('audio.key_required');
                } else {
                    error = data.error || 'Audio generation failed';
                }
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

        {#if keySuccess}
            <div class="key-success">{$t('audio.key_saved')}</div>
        {/if}

        {#if showKeySetup}
            <div class="key-setup">
                <h2>{$t('audio.key_title')}</h2>
                <p>{$t('audio.key_desc')}</p>
                <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener">{$t('audio.key_link')}</a>
                <div class="key-form">
                    <input
                        type="password"
                        bind:value={apiKeyInput}
                        placeholder={$t('audio.key_placeholder')}
                        disabled={keyLoading}
                    />
                    <button onclick={saveApiKey} disabled={keyLoading || apiKeyInput.length < 10}>
                        {keyLoading ? $t('audio.key_saving') : $t('audio.key_save')}
                    </button>
                </div>
                {#if keyError}
                    <p class="key-error">{keyError}</p>
                {/if}
            </div>
        {/if}

        <div class="audio-form">
            <div class="row">
                <div class="field">
                    <label>{$t('audio.provider')}</label>
                    <select bind:value={provider} disabled={isLoading}>
                        <option value="elevenlabs">ElevenLabs</option>
                        <option value="cloudflare">Cloudflare (coming soon)</option>
                    </select>
                </div>
                {#if provider === 'elevenlabs'}
                <div class="field">
                    <label>{$t('audio.voice')}</label>
                    <select bind:value={voiceId} disabled={isLoading}>
                        {#each voices as v}
                            <option value={v.id}>{v.name}</option>
                        {/each}
                    </select>
                </div>
                {/if}
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

        {#if hasKey && !showKeySetup}
            <div class="key-status">
                <span>Key: {keyPreview}</span>
                <button onclick={removeApiKey}>{$t('audio.key_change')}</button>
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

    .key-setup {
        padding: 1.5rem;
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: 12px;
        margin-bottom: 1.5rem;
    }

    .key-setup h2 {
        font-family: var(--font-heading);
        font-size: 1.3rem;
        font-weight: 400;
        color: var(--text);
        margin: 0 0 0.5rem;
    }

    .key-setup p {
        color: var(--text-dim);
        font-size: 0.9rem;
        line-height: 1.5;
        margin: 0 0 0.75rem;
    }

    .key-setup a {
        color: var(--accent);
        font-size: 0.9rem;
        text-decoration: none;
        display: inline-block;
        margin-bottom: 1rem;
    }

    .key-setup a:hover { text-decoration: underline; }

    .key-form {
        display: flex;
        gap: 0.75rem;
    }

    .key-form input {
        flex: 1;
        padding: 0.6rem 0.75rem;
        background: var(--bg);
        border: 2px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        font-family: var(--font-body);
        font-size: 0.9rem;
    }

    .key-form input:focus {
        outline: none;
        border-color: var(--accent);
    }

    .key-form button {
        padding: 0.6rem 1.5rem;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
    }

    .key-error { color: #ef4444; font-size: 0.85rem; margin: 0.5rem 0 0; }
    .key-success {
        padding: 0.75rem 1rem;
        background: rgba(34, 197, 94, 0.1);
        border: 1px solid rgba(34, 197, 94, 0.3);
        border-radius: 8px;
        color: #22c55e;
        font-size: 0.9rem;
        margin-bottom: 1rem;
    }

    .key-status {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-top: 1.5rem;
        font-size: 0.8rem;
        color: var(--text-dim);
    }

    .key-status button {
        padding: 0.3rem 0.75rem;
        background: transparent;
        color: var(--text-dim);
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 0.8rem;
        cursor: pointer;
    }

    .key-status button:hover {
        border-color: var(--text-dim);
    }
</style>
