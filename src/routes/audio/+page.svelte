<!-- src/routes/audio/+page.svelte -->
<script>
    import { t, locale, getLocale } from '$lib/i18n';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    let { data } = $props();

    if (!data.user) {
        goto('/login');
    }

    let text = $state('');
    let selectedLocale = $state(getLocale());
    let voiceId = $state('pNInz6obpgDQGcFmaJgB');

    onMount(() => {
        if (browser) {
            const saved = sessionStorage.getItem('tts_text');
            if (saved) {
                text = saved;
                sessionStorage.removeItem('tts_text');
            }
        }
    });
    let provider = $state('cloudflare');
    $effect(() => {
        showCfKeySetup = provider === 'cloudflare' && !hasCfKey;
        showKeySetup = provider === 'elevenlabs' && !hasKey;
        showHfKeySetup = provider === 'kokoro' && !hasHfKey;
        if (provider === 'cloudflare') voiceId = 'default';
        else if (provider === 'kokoro') voiceId = 'af_heart';
        else voiceId = 'pNInz6obpgDQGcFmaJgB';
    });
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
    let hasCfKey = $state(false);
    let showCfKeySetup = $state(false);
    let cfApiKeyInput = $state('');
    let cfAccountIdInput = $state('');
    let hasHfKey = $state(false);
    let showHfKeySetup = $state(false);
    let hfApiKeyInput = $state('');
    let cfKeyLoading = $state(false);
    let cfKeyError = $state('');
    let cfKeySuccess = $state(false);
    let checkingKey = $state(true);

    const elevenlabsVoices = [
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (EN)' },
        { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (PL)' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (ES)' },
        { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (EN)' },
        { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (EN)' },
        { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (EN)' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (EN)' },
        { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Sam (EN)' },
    ];

    const cfVoices = [
        { id: 'default', name: 'Default' },
    ];

    const kokoroVoices = [
        { id: 'af_heart', name: 'Heart (EN)' },
        { id: 'af_bella', name: 'Bella (EN)' },
        { id: 'af_nicole', name: 'Nicole (EN)' },
        { id: 'af_sarah', name: 'Sarah (EN)' },
        { id: 'af_nova', name: 'Nova (EN)' },
        { id: 'af_sky', name: 'Sky (EN)' },
        { id: 'af_alloy', name: 'Alloy (EN)' },
        { id: 'am_adam', name: 'Adam (EN)' },
        { id: 'am_michael', name: 'Michael (EN)' },
        { id: 'am_fenrir', name: 'Fenrir (EN)' },
        { id: 'bf_emma', name: 'Emma (UK)' },
        { id: 'bf_isabella', name: 'Isabella (UK)' },
        { id: 'bm_george', name: 'George (UK)' },
        { id: 'bm_lewis', name: 'Lewis (UK)' },
    ];

    let voices = $derived(provider === 'kokoro' ? kokoroVoices : provider === 'elevenlabs' ? elevenlabsVoices : cfVoices);

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

    async function checkCfKey() {
        try {
            const res = await fetch('/api/tts/cf-api-key');
            const data = await res.json();
            hasCfKey = data.hasKey;
            if (provider === 'cloudflare' && !data.hasKey) showCfKeySetup = true;
        } catch (e) { /* ignore */ }
    }
    checkCfKey();

    async function checkHfKey() {
        try {
            const res = await fetch('/api/tts/deepinfra-api-key');
            const data = await res.json();
            hasHfKey = data.hasKey;
            if (provider === 'kokoro' && !data.hasKey) showHfKeySetup = true;
        } catch (e) { /* ignore */ }
    }
    checkHfKey();

    async function saveCfApiKey() {
        cfKeyError = '';
        cfKeySuccess = false;
        cfKeyLoading = true;
        try {
            const res = await fetch('/api/tts/cf-api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: cfApiKeyInput, accountId: cfAccountIdInput })
            });
            const data = await res.json();
            if (res.ok) {
                hasCfKey = true;
                showCfKeySetup = false;
                cfApiKeyInput = '';
                cfAccountIdInput = '';
                cfKeySuccess = true;
                setTimeout(() => cfKeySuccess = false, 3000);
            } else {
                cfKeyError = data.error || 'Failed to save';
            }
        } catch (e) {
            cfKeyError = 'Network error';
        } finally {
            cfKeyLoading = false;
        }
    }

    async function removeCfApiKey() {
        try {
            await fetch('/api/tts/cf-api-key', { method: 'DELETE' });
            hasCfKey = false;
            showCfKeySetup = true;
        } catch (e) { /* ignore */ }
    }

    async function saveHfApiKey() {
        if (!hfApiKeyInput.trim()) return;
        try {
            const res = await fetch('/api/tts/deepinfra-api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: hfApiKeyInput.trim() })
            });
            if (res.ok) {
                hasHfKey = true;
                showHfKeySetup = false;
                hfApiKeyInput = '';
                showToast('HF API key saved!');
            }
        } catch (e) { error = 'Failed to save HF key'; }
    }

    async function removeHfApiKey() {
        try {
            await fetch('/api/tts/deepinfra-api-key', { method: 'DELETE' });
            hasHfKey = false;
            showHfKeySetup = true;
        } catch (e) { /* ignore */ }
    }

    function handleAiDevelop() {
        sessionStorage.setItem('refine_text', text);
        goto('/refine');
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
                } else if (data.error === 'no_cf_key') {
                    showCfKeySetup = true;
                    error = 'CF key required';
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

    let showCopyToast = $state(false);
    function showToast(msg) {
        error = '';
        showCopyToast = true;
        setTimeout(() => showCopyToast = false, 2500);
    }

    function downloadAudio() {
        if (!audioUrl) return;
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `patrouch-audio-${Date.now()}.mp3`;
        a.click();
        showToast('Downloaded!');
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

        {#if cfKeySuccess}
            <div class="key-success">CF API key saved</div>
        {/if}

        {#if showCfKeySetup}
            <div class="key-setup">
                <h2>Cloudflare Workers AI</h2>
                <p>Requires a Cloudflare paid plan. Enter your CF API token and Account ID.</p>
                <div class="key-form" style="flex-direction:column;gap:0.5rem;">
                    <input type="text" bind:value={cfAccountIdInput} placeholder="CF Account ID" disabled={cfKeyLoading} />
                    <input type="password" bind:value={cfApiKeyInput} placeholder="CF API Token" disabled={cfKeyLoading} />
                    <button onclick={saveCfApiKey} disabled={cfKeyLoading || cfApiKeyInput.length < 10 || cfAccountIdInput.length < 10}>
                        {cfKeyLoading ? 'Saving...' : 'Save'}
                    </button>
                </div>
                {#if cfKeyError}
                    <p class="key-error">{cfKeyError}</p>
                {/if}
            </div>
        {/if}

        {#if showHfKeySetup}
            <div class="key-setup">
                <h2>Kokoro TTS (DeepInfra)</h2>
                <p>Enter your DeepInfra API key (requires card at deepinfra.com).</p>
                <div class="key-form" style="flex-direction:column;gap:0.5rem;">
                    <input type="password" bind:value={hfApiKeyInput} placeholder="DeepInfra API Key" disabled={isLoading} />
                    <button onclick={saveHfApiKey} disabled={isLoading || hfApiKeyInput.length < 10}>
                        {$t('audio.key_save') || 'Save'}
                    </button>
                </div>
            </div>
        {/if}

        {#if hasHfKey && !showHfKeySetup && provider === 'kokoro'}
            <div class="key-status">
                <span>HF: configured</span>
                <button onclick={removeHfApiKey}>{$t('audio.key_change')}</button>
            </div>
        {/if}

        <div class="audio-form">
            <div class="row">
                <div class="field">
                    <label>{$t('audio.provider')}</label>
                    <select bind:value={provider} disabled={isLoading}>
                        <option value="elevenlabs">ElevenLabs</option>
                        <option value="kokoro">Kokoro</option>
                        <option value="cloudflare">{$t("audio.provider_free_limited")}</option>
                    </select>
                </div>
                <div class="field">
                    <label>{$t('audio.voice')}</label>
                    <select bind:value={voiceId} disabled={isLoading}>
                        {#each voices as v}
                            <option value={v.id}>{v.name}</option>
                        {/each}
                    </select>
                </div>
            </div>

            <div class="field full" style="position:relative;">
                <label>{$t('audio.text_label')}</label>
                <textarea
                    bind:value={text}
                    lang={data.serverLocale || 'en'}
                    spellcheck="true"
                    placeholder={$t('audio.placeholder')}
                    rows="14"
                    disabled={isLoading || isAiLoading}
                ></textarea>
                <button class="copy-inline" onclick={() => { navigator.clipboard.writeText(text); showToast('Copied!'); }} title="{$t('audio.copy')}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                </button>
                <div class="textarea-footer">
                    <span class="char-count">{text.length} / 5000 {$t('audio.chars') || 'characters'}</span>
                </div>
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
                    <button onclick={handleAiDevelop} disabled={isLoading || text.length < 50}>
                        {$t('audio.develop_btn')}
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
                <button onclick={() => { audioUrl = ''; audioBlob = null; }} class="btn-secondary" style="margin-left:0.5rem;">{$t('audio.delete') || 'Delete'}</button>
            </div>
        {/if}

        {#if hasKey && !showKeySetup}
            <div class="key-status">
                <span>Key: {keyPreview}</span>
                <button onclick={removeApiKey}>{$t('audio.key_change')}</button>
            </div>
        {/if}
        {#if provider === 'cloudflare'}
        <div class="key-status">
            <span>{hasCfKey ? 'CF: configured' : 'CF: not configured'}</span>
            <button onclick={() => { hasCfKey ? removeCfApiKey() : (showCfKeySetup = true); }}>{$t('audio.key_change')}</button>
        </div>
        {/if}
    </div>
    {#if showCopyToast}
        <div class="toast">{showCopyToast === true ? '✓' : showCopyToast}</div>
    {/if}
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
