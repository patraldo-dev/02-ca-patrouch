<script>
    import { onMount } from 'svelte';
    import { t, get } from '$lib/i18n';
    import { browser } from '$app/environment';
    import L from 'leaflet';

    let { data } = $props();

    // Form state
    let showForm = $state(false);
    let formTitle = $state('');
    let formContent = $state('');
    let formContentType = $state('message');
    let formBottleType = $state('glass');
    let saving = $state(false);
    let launching = $state(null);
    let message = $state('');

    // User's bottles
    let myBottles = $state([]);

    async function loadMyBottles() {
        try {
            const res = await fetch('/api/bottles?user_id=' + (data.user?.id || '') + '&status=preparing');
            const r = await res.json();
            // Also get all user bottles for the list
            const allRes = await fetch('/api/bottles?user_id=' + (data.user?.id || ''));
            myBottles = await allRes.json();
        } catch {}
    }

    async function saveBottle() {
        if (!formContent.trim() || saving) return;
        saving = true;
        try {
            const res = await fetch('/api/bottles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: formContent,
                    title: formTitle,
                    content_type: formContentType,
                    bottle_type: formBottleType
                })
            });
            if (res.ok) {
                formContent = '';
                formTitle = '';
                showForm = false;
                message = get(t)('bottles.saved');
                loadMyBottles();
                setTimeout(() => message = '', 3000);
            }
        } catch {}
        saving = false;
    }

    async function launchBottle(bottleId) {
        launching = bottleId;
        try {
            const res = await fetch('/api/bottles/' + bottleId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'launched' })
            });
            if (res.ok) {
                message = get(t)('bottles.launched');
                loadMyBottles();
                setTimeout(() => location.reload(), 1500);
            }
        } catch {}
        launching = null;
    }

    let revealedBottle = $state(null);
    function openBottle(bottle) {
        revealedBottle = revealedBottle === bottle.id ? null : bottle.id;
    }

    function statusClass(s) {
        return 'status-badge status-' + (s || 'unknown');
    }

    // Map
    let mapEl = $state(null);
    let mapInstance = $state(null);

    onMount(async () => {
        if (!browser || !data.bottles.length) return;

        mapInstance = L.map(mapEl, {
            center: [15, -115],
            zoom: 4,
            zoomControl: true,
            attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 18
        }).addTo(mapInstance);

        L.control.attribution({ prefix: false }).addAttribution('© OpenStreetMap © CartoDB').addTo(mapInstance);

        for (const bottle of data.bottles) {
            if (!bottle.current_lat || !bottle.current_lon) continue;

            // Trail
            if (bottle.positions?.length > 1) {
                const coords = bottle.positions.map(p => [p.lat, p.lon]);
                L.polyline(coords, { color: '#c9a87c', weight: 2, opacity: 0.4 }).addTo(mapInstance);
            }

            // Marker
            const marker = L.circleMarker([bottle.current_lat, bottle.current_lon], {
                radius: 8,
                fillColor: bottle.status === 'beached' ? '#e74c3c' : '#c9a87c',
                fillOpacity: 0.9,
                color: '#fff',
                weight: 2
            }).addTo(mapInstance);

            marker.bindPopup(`
                <div style="color:#09090b;font-family:Inter,sans-serif;min-width:150px">
                    <strong style="font-family:Playfair Display,serif">${bottle.title || '🫙'}</strong><br>
                    <span style="text-transform:capitalize;font-size:0.85em">${bottle.status}</span><br>
                    <span style="color:#666">${(bottle.distance_km || 0).toFixed(1)} km</span>
                </div>
            `);
        }

        // Fit bounds if bottles exist
        const launchedBottles = data.bottles.filter(b => b.current_lat);
        if (launchedBottles.length) {
            const bounds = L.latLngBounds(launchedBottles.map(b => [b.current_lat, b.current_lon]));
            mapInstance.fitBounds(bounds.pad(0.3));
        }
    });

    onMount(loadMyBottles);
</script>

<svelte:head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <title>{$t('games.find_the_bottle')} — Patrouch</title>
</svelte:head>

<section class="bottles-page">
    <h1 class="page-title">{$t('games.find_the_bottle')}</h1>
    <p class="page-subtitle">{$t('games.find_the_bottle_desc')}</p>

    {#if message}
        <div class="toast">{message}</div>
    {/if}

    <!-- My Bottles -->
    {#if data.user}
        <div class="section">
            <div class="section-header">
                <h2>{$t('bottles.my_bottles')}</h2>
                <button class="btn btn-accent" onclick={() => showForm = !showForm}>{$t('bottles.create')}</button>
            </div>

            {#if showForm}
                <div class="form-card">
                    <input type="text" bind:value={formTitle} placeholder={$t('bottles.title')} />
                    <textarea bind:value={formContent} placeholder={$t('bottles.content')} rows="4"></textarea>
                    <div class="form-row">
                        <select bind:value={formContentType}>
                            <option value="story">{$t('bottles.type.story')}</option>
                            <option value="poem">{$t('bottles.type.poem')}</option>
                            <option value="script">{$t('bottles.type.script')}</option>
                            <option value="message">{$t('bottles.type.message')}</option>
                        </select>
                        <select bind:value={formBottleType}>
                            <option value="glass">{$t('bottles.bottle.glass')}</option>
                            <option value="plastic">{$t('bottles.bottle.plastic')}</option>
                            <option value="cork">{$t('bottles.bottle.cork')}</option>
                        </select>
                    </div>
                    <button class="btn btn-accent" onclick={saveBottle} disabled={saving}>
                        {saving ? '...' : $t('bottles.save')}
                    </button>
                </div>
            {/if}

            {#if myBottles.length}
                <div class="bottles-list">
                    {#each myBottles as bottle}
                        <div class="bottle-item">
                            <span class="bottle-title">{bottle.title || '🫙'}</span>
                            <span class={statusClass(bottle.status)}>{$t('bottles.status.' + bottle.status)}</span>
                            {#if bottle.status === 'preparing'}
                                <button class="btn btn-sm" onclick={() => launchBottle(bottle.id)} disabled={launching === bottle.id}>
                                    {launching === bottle.id ? '...' : $t('bottles.launch')}
                                </button>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}

    <!-- Ocean Map -->
    <div class="section">
        <h2>{$t('bottles.map_title')}</h2>
        <div class="map-container" bind:this={mapEl}></div>
    </div>

    <!-- Beached bottles -->
    {#if data.bottles.some(b => b.status === 'beached')}
        <div class="section">
            <h2>{$t('bottles.open_bottle')}</h2>
            {#each data.bottles.filter(b => b.status === 'beached') as bottle}
                <div class="beached-item">
                    <span>🫙</span>
                    <div>
                        <strong>{bottle.title || 'Unknown'}</strong>
                        <small class="muted">— {(bottle.distance_km || 0).toFixed(0)} km {$t('bottles.distance').replace('{km}', '')}</small>
                    </div>
                    <button class="btn btn-sm" onclick={() => openBottle(bottle)}>
                        {revealedBottle === bottle.id ? '✕' : $t('bottles.open_bottle')}
                    </button>
                    {#if revealedBottle === bottle.id}
                        <div class="revealed-content">{bottle.content}</div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</section>

<style>
    .bottles-page {
        max-width: 900px;
        margin: 0 auto;
        padding: 3rem 1.5rem 6rem;
    }
    .page-title {
        font-family: var(--font-heading);
        font-size: 3rem;
        color: var(--fg);
        margin-bottom: 0.5rem;
    }
    .page-subtitle {
        color: var(--muted);
        font-size: 1.1rem;
        margin-bottom: 2.5rem;
        font-style: italic;
    }
    .section {
        margin-bottom: 3rem;
    }
    .section h2 {
        font-family: var(--font-heading);
        font-size: 1.5rem;
        color: var(--accent);
        margin-bottom: 1rem;
    }
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    .section-header h2 { margin-bottom: 0; }
    .form-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }
    .form-card input, .form-card textarea, .form-card select {
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0.6rem 0.8rem;
        color: var(--fg);
        font-family: var(--font-body);
        font-size: 0.95rem;
    }
    .form-row {
        display: flex;
        gap: 0.75rem;
    }
    .form-row select { flex: 1; }
    .btn {
        background: var(--accent);
        color: var(--bg);
        border: none;
        border-radius: 8px;
        padding: 0.6rem 1.2rem;
        font-family: var(--font-body);
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.85; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sm {
        font-size: 0.8rem;
        padding: 0.35rem 0.8rem;
    }
    .bottles-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .bottle-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 1rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
    }
    .bottle-title {
        flex: 1;
        font-weight: 500;
    }
    .status-badge {
        font-size: 0.75rem;
        padding: 0.2rem 0.6rem;
        border-radius: 99px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .status-preparing { background: #1a1a2e; color: #888; }
    .status-launched { background: #1a2e1a; color: #4ade80; }
    .status-sailing { background: #1a2e2e; color: #22d3ee; }
    .status-beached { background: #2e2a1a; color: #f59e0b; }
    .status-found { background: #2e1a2e; color: #c084fc; }
    .status-sunk { background: #2e1a1a; color: #ef4444; }
    .map-container {
        height: 450px;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid var(--border);
    }
    .beached-item {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 1rem;
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
    }
    .beached-item strong { color: var(--accent); }
    .muted { color: var(--muted); }
    .revealed-content {
        width: 100%;
        margin-top: 0.75rem;
        padding: 1rem;
        background: var(--bg);
        border-radius: 8px;
        font-style: italic;
        line-height: 1.6;
        color: var(--fg);
        white-space: pre-wrap;
    }
    .toast {
        position: fixed;
        top: 1.5rem;
        right: 1.5rem;
        background: var(--accent);
        color: var(--bg);
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        z-index: 9999;
        animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>
