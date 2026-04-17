<script>
    import { onMount } from 'svelte';
    import { t } from '$lib/i18n';
    import { get } from 'svelte/store';
    import { browser } from '$app/environment';
    import { invalidateAll } from '$app/navigation';
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
    let toastMsg = $state('');

    // User's bottles
    let myBottles = $state([]);

    async function loadMyBottles() {
        try {
            const res = await fetch('/api/bottles?user_id=' + (data.user?.id || ''));
            myBottles = await res.json();
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
                toastMsg = get(t)('bottles.saved');
                loadMyBottles();
                setTimeout(() => toastMsg = '', 3000);
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
                toastMsg = get(t)('bottles.launched');
                loadMyBottles();
                setTimeout(() => location.reload(), 1500);
            }
        } catch {}
        launching = null;
    }

    // Open a beached bottle (reveal sealed message)
    let openingId = $state(null);
    let openedBottle = $state(null);

    async function openBottle(bottle) {
        openingId = bottle.id;
        try {
            const res = await fetch('/api/bottles/' + bottle.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'open' })
            });
            if (res.ok) {
                const opened = await res.json();
                openedBottle = opened;
                toastMsg = get(t)('bottles.opened');
                invalidateAll();
                setTimeout(() => toastMsg = '', 3000);
            }
        } catch {}
        openingId = null;
    }

    function statusClass(s) {
        return 'status-badge status-' + (s || 'unknown');
    }

    function statusLabel(s) {
        return get(t)('bottles.status.' + (s || 'unknown'));
    }

    function bottleTypeLabel(type) {
        return get(t)('bottles.bottle.' + (type || 'glass'));
    }

    function formatDate(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString(get(t)('_meta.locale') || 'es', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    function formatCoords(lat, lon) {
        if (lat == null || lon == null) return '';
        return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
    }

    function driftDays(launchedAt) {
        if (!launchedAt) return '';
        const days = Math.floor((Date.now() - new Date(launchedAt).getTime()) / 86400000);
        return days + (days === 1 ? ' día' : ' días');
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

            if (bottle.positions?.length > 1) {
                const coords = bottle.positions.map(p => [p.lat, p.lon]);
                L.polyline(coords, { color: '#c9a87c', weight: 2, opacity: 0.4 }).addTo(mapInstance);
            }

            const marker = L.circleMarker([bottle.current_lat, bottle.current_lon], {
                radius: 8,
                fillColor: bottle.status === 'beached' ? '#f59e0b' : bottle.status === 'found' ? '#c084fc' : '#c9a87c',
                fillOpacity: 0.9,
                color: '#fff',
                weight: 2
            }).addTo(mapInstance);

            marker.bindPopup(`
                <div style="color:#09090b;font-family:Inter,sans-serif;min-width:160px">
                    <strong style="font-family:Playfair Display,serif">${bottle.title || '🫙'}</strong><br>
                    <span style="text-transform:capitalize;font-size:0.85em">${bottle.status}</span>
                    ${bottle.distance_km ? `<br><span style="color:#666">${bottle.distance_km.toFixed(1)} km</span>` : ''}
                </div>
            `);
        }

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

    {#if toastMsg}
        <div class="toast">{toastMsg}</div>
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
                    <p class="seal-notice">🔒 {$t('bottles.seal_notice')}</p>
                    <button class="btn btn-accent" onclick={saveBottle} disabled={saving}>
                        {saving ? '...' : $t('bottles.save')}
                    </button>
                </div>
            {/if}

            {#if myBottles.length}
                <div class="bottles-list">
                    {#each myBottles as bottle}
                        <div class="bottle-item">
                            <div class="bottle-item-main">
                                <span class="bottle-emoji">🫙</span>
                                <div class="bottle-item-info">
                                    <span class="bottle-title">{bottle.title || $t('bottles.untitled')}</span>
                                    <div class="bottle-meta">
                                        <span class={statusClass(bottle.status)}>{statusLabel(bottle.status)}</span>
                                        <span class="meta-sep">·</span>
                                        <span>{bottleTypeLabel(bottle.bottle_type)}</span>
                                        {#if bottle.launched_at}
                                            <span class="meta-sep">·</span>
                                            <span>{formatDate(bottle.launched_at)}</span>
                                            <span class="meta-sep">·</span>
                                            <span>{formatCoords(bottle.current_lat, bottle.current_lon)}</span>
                                        {/if}
                                    </div>
                                </div>
                            </div>
                            {#if bottle.status === 'preparing'}
                                <button class="btn btn-sm btn-accent" onclick={() => launchBottle(bottle.id)} disabled={launching === bottle.id}>
                                    {launching === bottle.id ? '...' : $t('bottles.launch')}
                                </button>
                            {/if}
                            {#if bottle.content && !bottle.content_hidden}
                                <div class="owner-preview">{bottle.content}</div>
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

    <!-- Beached / Found bottles (public) -->
    {#if data.bottles.filter(b => b.status === 'beached' || b.status === 'found').length}
        <div class="section">
            <h2>{$t('bottles.washed_up')}</h2>
            {#each data.bottles.filter(b => b.status === 'beached' || b.status === 'found') as bottle}
                <div class="beached-item">
                    <div class="beached-icon">
                        {bottle.status === 'found' ? '📬' : '🫙'}
                    </div>
                    <div class="beached-info">
                        <strong>{bottle.display_name || bottle.username || 'Anónimo'}</strong>
                        <div class="beached-meta">
                            <span>{bottleTypeLabel(bottle.bottle_type)}</span>
                            {#if bottle.launched_at}
                                <span class="meta-sep">·</span>
                                <span>{$t('bottles.launched_on')}: {formatDate(bottle.launched_at)}</span>
                                <span class="meta-sep">·</span>
                                <span>{formatCoords(bottle.launch_lat, bottle.launch_lon)}</span>
                            {/if}
                            {#if bottle.current_lat}
                                <span class="meta-sep">→</span>
                                <span>{formatCoords(bottle.current_lat, bottle.current_lon)}</span>
                            {/if}
                            {#if bottle.launched_at}
                                <span class="meta-sep">·</span>
                                <span>{driftDays(bottle.launched_at)}</span>
                            {/if}
                            {#if bottle.distance_km}
                                <span class="meta-sep">·</span>
                                <span>{bottle.distance_km.toFixed(0)} km</span>
                            {/if}
                        </div>
                        <span class={statusClass(bottle.status)}>{statusLabel(bottle.status)}</span>
                    </div>
                    {#if bottle.status === 'beached' && !bottle.opened_by}
                        <button class="btn btn-sm btn-accent" onclick={() => openBottle(bottle)} disabled={openingId === bottle.id}>
                            {openingId === bottle.id ? '...' : $t('bottles.open_btn')}
                        </button>
                    {/if}
                </div>
                <!-- Revealed content -->
                {#if openedBottle?.id === bottle.id && openedBottle.content}
                    <div class="revealed-content">
                        <div class="revealed-header">
                            <span class="revealed-icon">🔓</span>
                            <span>{$t('bottles.message_revealed')}</span>
                        </div>
                        <div class="revealed-text">{openedBottle.content}</div>
                    </div>
                {/if}
                {#if bottle.status === 'found' && bottle.content && !bottle.content_hidden}
                    <div class="revealed-content already-opened">
                        <div class="revealed-header">
                            <span>📬</span>
                            <span>{$t('bottles.already_opened')}</span>
                        </div>
                        <div class="revealed-text">{bottle.content}</div>
                    </div>
                {/if}
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
    .section { margin-bottom: 3rem; }
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
    .form-row { display: flex; gap: 0.75rem; }
    .form-row select { flex: 1; }
    .seal-notice {
        font-size: 0.85rem;
        color: var(--muted);
        font-style: italic;
    }
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
    .btn-sm { font-size: 0.8rem; padding: 0.35rem 0.8rem; }
    .btn-accent { background: var(--accent); color: var(--bg); }
    .bottles-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .bottle-item {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 1rem;
    }
    .bottle-item-main { display: flex; align-items: center; gap: 0.75rem; }
    .bottle-emoji { font-size: 1.5rem; flex-shrink: 0; }
    .bottle-item-info { flex: 1; min-width: 0; }
    .bottle-title {
        display: block;
        font-weight: 500;
        color: var(--fg);
        margin-bottom: 0.25rem;
    }
    .bottle-meta {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.8rem;
        color: var(--muted);
        flex-wrap: wrap;
    }
    .meta-sep { color: var(--border); }
    .owner-preview {
        margin-top: 0.75rem;
        padding: 0.75rem;
        background: var(--bg);
        border-radius: 8px;
        font-size: 0.9rem;
        color: var(--text-dim);
        font-style: italic;
        white-space: pre-wrap;
        border-left: 3px solid var(--accent);
    }
    .status-badge {
        font-size: 0.7rem;
        padding: 0.15rem 0.5rem;
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
        padding: 1.25rem;
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .beached-icon { font-size: 2rem; flex-shrink: 0; }
    .beached-info { flex: 1; min-width: 0; }
    .beached-info strong { color: var(--accent); display: block; margin-bottom: 0.3rem; }
    .beached-meta {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.82rem;
        color: var(--muted);
        flex-wrap: wrap;
    }
    .revealed-content {
        background: var(--surface);
        border: 1px solid var(--accent);
        border-radius: 10px;
        padding: 1.25rem;
        margin-bottom: 0.75rem;
        animation: revealFade 0.5s ease;
    }
    .already-opened { border-color: var(--border); }
    .revealed-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
        font-size: 0.85rem;
        color: var(--accent);
        font-weight: 600;
    }
    .revealed-icon { font-size: 1.2rem; }
    .revealed-text {
        font-style: italic;
        line-height: 1.7;
        color: var(--fg);
        white-space: pre-wrap;
    }
    @keyframes revealFade {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
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
    @media (max-width: 640px) {
        .beached-item { flex-wrap: wrap; }
        .beached-meta { font-size: 0.75rem; }
        .bottle-meta { font-size: 0.75rem; }
    }
</style>
