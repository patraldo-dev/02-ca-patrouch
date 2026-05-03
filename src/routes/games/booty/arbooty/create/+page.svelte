<script>
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

    let { data } = $props();

    let title = $state('');
    let content = $state('');
    let gpsLat = $state(null);
    let gpsLon = $state(null);
    let gpsAccuracy = $state(null);
    let gpsStatus = $state('pending'); // pending | acquiring | ready | error
    let submitting = $state(false);
    let success = $state(null);
    let errorMsg = $state('');
    let generating = $state(false);
    let challenge = $state('');

    let mode = $derived($page.url.searchParams.get('mode') || 'fiesta');

    function startGPS() {
        if (!navigator.geolocation) {
            gpsStatus = 'error';
            errorMsg = 'GPS no disponible en este navegador';
            return;
        }
        gpsStatus = 'acquiring';
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                gpsLat = pos.coords.latitude;
                gpsLon = pos.coords.longitude;
                gpsAccuracy = Math.round(pos.coords.accuracy);
                gpsStatus = 'ready';
            },
            (err) => {
                gpsStatus = 'error';
                errorMsg = `GPS: ${err.message}`;
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            errorMsg = 'Título y mensaje son obligatorios';
            return;
        }
        if (!gpsLat || !gpsLon) {
            errorMsg = 'Necesitas compartir tu ubicación GPS';
            return;
        }

        submitting = true;
        errorMsg = '';
        try {
            const res = await fetch('/api/bottlequest/physical/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    content: content.trim(),
                    challenge: challenge.trim() || null,
                    lat: gpsLat,
                    lon: gpsLon,
                    mode
                })
            });
            const result = await res.json();
            if (result.success) {
                success = result.bottle;
            } else {
                errorMsg = result.error || 'Error al crear';
            }
        } catch (err) {
            errorMsg = `Error de conexión: ${err.message}`;
        }
        submitting = false;
    }

    function createAnother() {
        title = '';
        content = '';
        success = null;
    }

    async function generateWithAI() {
        if (generating) return;
        generating = true;
        errorMsg = '';
        try {
            const res = await fetch('/api/bottlequest/physical/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode,
                    theme: title || (mode === 'fiesta' ? 'cumpleaños' : 'botella')
                })
            });
            const result = await res.json();
            if (result.title) title = result.title;
            if (result.content) content = result.content;
            if (result.challenge) challenge = result.challenge;
        } catch (err) {
            errorMsg = `Error IA: ${err.message}`;
        }
        generating = false;
    }
</script>

<svelte:head>
    <title>{mode === 'fiesta' ? '🎁 Crear Mensaje — Fiesta' : '🏴‍☠️ Crear Botella — Arbooty'} — patrouch.ca</title>
</svelte:head>

<section class="create-page">
    <a href="/games/booty/arbooty?mode={mode}" class="back-link">← Volver</a>

    <h1 class="page-title">
        {mode === 'fiesta' ? '🎁 Esconde un Mensaje' : '🏴‍☠️ Lanza una Botella'}
    </h1>
    <p class="page-desc">
        {mode === 'fiesta' ? 'Escribe un mensaje y déjalo en tu ubicación para que otros lo encuentren' : 'Escribe tu mensaje en una botella y lánzala al mundo'}
    </p>

    {#if !success}
        <form onsubmit={handleSubmit} class="create-form">
            <div class="form-group">
                <label for="title">Título</label>
                <input id="title" type="text" bind:value={title} placeholder="Ej: Feliz Cumpleaños Victor 🎂" maxlength="100" required />
            </div>

            <div class="form-group">
                <label for="content">Mensaje</label>
                <textarea id="content" bind:value={content} placeholder="Escribe tu mensaje aquí..." rows="5" maxlength="2000" required></textarea>
                <div class="textarea-actions">
                    <span class="char-count">{content.length}/2000</span>
                    <button type="button" class="ai-btn" onclick={generateWithAI} disabled={generating}>
                        {generating ? '✨ Generando...' : '🤖 Generar con IA'}
                    </button>
                </div>
            </div>

            <div class="form-group">
                <label for="challenge">🎯 Reto <span class="optional">(opcional)</span></label>
                <textarea id="challenge" bind:value={challenge} placeholder="Ej: Canta el coro de tu canción favorita" rows="2" maxlength="500"></textarea>
            </div>

            <div class="form-group gps-group">
                <label>📍 Ubicación GPS</label>
                {#if gpsStatus === 'ready'}
                    <div class="gps-ready">
                        <span class="gps-coords">{gpsLat.toFixed(6)}, {gpsLon.toFixed(6)}</span>
                        <span class="gps-acc">±{gpsAccuracy}m</span>
                        <button type="button" class="gps-refresh" onclick={startGPS}>🔄</button>
                    </div>
                {:else if gpsStatus === 'acquiring'}
                    <div class="gps-loading">Buscando GPS...</div>
                {:else if gpsStatus === 'error'}
                    <div class="gps-error">{errorMsg}</div>
                {:else}
                    <button type="button" class="gps-btn" onclick={startGPS}>
                        📍 Compartir Ubicación
                    </button>
                {/if}
            </div>

            {#if errorMsg && gpsStatus !== 'error'}
                <div class="error-msg">{errorMsg}</div>
            {/if}

            <button type="submit" class="submit-btn" disabled={submitting || gpsStatus !== 'ready'}>
                {submitting ? 'Creando...' : mode === 'fiesta' ? '🎁 Esconder Mensaje' : '🏴‍☠️ Lanzar Botella'}
            </button>
        </form>
    {:else}
        <div class="success-card">
            <div class="success-icon">🎉</div>
            <h2>¡Mensaje escondido!</h2>
            <p class="success-title">{success.title}</p>
            <p class="success-coords">📍 {success.lat.toFixed(6)}, {success.lon.toFixed(6)}</p>
            <p class="success-note">Otros jugadores podrán encontrarlo con la cámara AR</p>
            <div class="success-actions">
                <button class="btn-primary" onclick={createAnother}>✍️ Crear Otro</button>
                <a href="/games/booty/arbooty?mode={mode}" class="btn-secondary">🔭 Ir al AR</a>
            </div>
        </div>
    {/if}
</section>

<style>
    .create-page {
        max-width: 600px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }
    .back-link {
        display: inline-block;
        color: var(--accent);
        text-decoration: none;
        margin-bottom: 1rem;
        font-size: 0.9rem;
    }
    .back-link:hover { text-decoration: underline; }
    .page-title {
        font-family: Playfair Display, serif;
        font-size: 1.8rem;
        color: var(--text);
        margin-bottom: 0.5rem;
    }
    .optional { color: var(--text-dim); font-weight: 400; font-size: 0.8rem; }
    .page-desc {
        color: var(--text-dim);
        font-size: 0.95rem;
        margin-bottom: 2rem;
    }
    .create-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }
    .form-group label {
        display: block;
        color: var(--text);
        font-weight: 600;
        font-size: 0.9rem;
        margin-bottom: 0.4rem;
    }
    .form-group input,
    .form-group textarea {
        width: 100%;
        padding: 0.7rem;
        background: var(--surface);
        color: var(--text);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: var(--radius);
        font-size: 1rem;
        font-family: inherit;
    }
    .form-group input:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: var(--accent);
    }
    .form-group textarea { resize: vertical; }
    .char-count {
        display: block;
        text-align: right;
        font-size: 0.8rem;
        color: var(--text-dim);
        margin-top: 0.25rem;
    }
    .textarea-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.25rem;
    }
    .ai-btn {
        background: none;
        border: 1px solid rgba(201,168,124,0.4);
        color: #c9a87c;
        border-radius: 6px;
        padding: 4px 12px;
        font-size: 0.85rem;
        cursor: pointer;
    }
    .ai-btn:hover { background: rgba(201,168,124,0.1); }
    .ai-btn:disabled { opacity: 0.5; }
    .gps-group {
        background: var(--surface);
        padding: 1rem;
        border-radius: var(--radius);
        border: 1px solid rgba(255,255,255,0.1);
    }
    .gps-ready {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    .gps-coords {
        color: var(--text);
        font-family: monospace;
        font-size: 0.9rem;
    }
    .gps-acc {
        color: var(--text-dim);
        font-size: 0.8rem;
    }
    .gps-refresh {
        background: none;
        border: 1px solid rgba(255,255,255,0.2);
        color: var(--text);
        border-radius: 6px;
        padding: 4px 8px;
        cursor: pointer;
    }
    .gps-loading { color: var(--text-dim); font-size: 0.9rem; }
    .gps-error { color: #ef4444; font-size: 0.9rem; }
    .gps-btn {
        width: 100%;
        padding: 0.6rem;
        background: rgba(255,255,255,0.05);
        border: 1px dashed rgba(255,255,255,0.3);
        color: var(--text-dim);
        border-radius: var(--radius);
        cursor: pointer;
        font-size: 0.95rem;
    }
    .gps-btn:hover { border-color: var(--accent); color: var(--accent); }
    .error-msg {
        color: #ef4444;
        font-size: 0.9rem;
        padding: 0.5rem;
    }
    .submit-btn {
        padding: 0.9rem;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: var(--radius);
        font-size: 1.05rem;
        font-weight: 700;
        cursor: pointer;
    }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .success-card {
        text-align: center;
        padding: 2rem;
        background: var(--surface);
        border-radius: 12px;
        border: 1px solid rgba(201,168,124,0.3);
    }
    .success-icon { font-size: 3rem; margin-bottom: 0.5rem; }
    .success-card h2 {
        font-family: Playfair Display, serif;
        color: var(--accent);
        font-size: 1.4rem;
        margin-bottom: 1rem;
    }
    .success-title { color: var(--text); font-weight: 600; margin-bottom: 0.5rem; }
    .success-coords {
        color: var(--text-dim);
        font-family: monospace;
        font-size: 0.85rem;
        margin-bottom: 0.5rem;
    }
    .success-note { color: var(--text-dim); font-size: 0.9rem; margin-bottom: 1.5rem; }
    .success-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
        flex-wrap: wrap;
    }
    .btn-primary {
        padding: 0.7rem 1.5rem;
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: var(--radius);
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
    }
    .btn-secondary {
        padding: 0.7rem 1.5rem;
        background: transparent;
        color: var(--accent);
        border: 1px solid var(--accent);
        border-radius: var(--radius);
        font-weight: 600;
        text-decoration: none;
    }
</style>
