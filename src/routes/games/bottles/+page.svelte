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
    let formContentType = $state('short_story');
    let saving = $state(false);
    let launching = $state(null);
    let toastMsg = $state('');

    const contentTypes = ['short_story', 'poem', 'screenplay', 'video', 'song', 'lyrics', 'audiobook', 'fanzine', 'illustrated_book'];

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
                    content_type: formContentType
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

    // Open a beached bottle
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
                openedBottle = await res.json();
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

    function contentTypeLabel(type) {
        const key = 'bottles.type.' + (type || 'short_story');
        const label = get(t)(key);
        return label !== key ? label : type;
    }

    function formatDate(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString(get(t)('_meta.locale') || 'es', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
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

    // Stats
    let totalLaunched = $derived(data.bottles.filter(b => b.status === 'launched' || b.status === 'sailing' || b.status === 'beached' || b.status === 'found').length);
    let totalBeached = $derived(data.bottles.filter(b => b.status === 'beached').length);
    let totalFound = $derived(data.bottles.filter(b => b.status === 'found').length);

    // Map
    let mapEl = $state(null);
    let mapInstance = $state(null);

    onMount(async () => {
        if (!browser) return;

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

            const author = bottle.display_name || bottle.username || '?';
            marker.bindPopup(`
                <div style="color:#09090b;font-family:Inter,sans-serif;min-width:160px">
                    <strong style="font-family:Playfair Display,serif">${bottle.title || '🫙'}</strong><br>
                    <span style="font-size:0.85em">${author}</span><br>
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

    <!-- Stats -->
    <div class="stats-bar">
        <div class="stat-item">
            <span class="stat-num">{totalLaunched}</span>
            <span class="stat-label">{$t('bottles.total_launched')}</span>
        </div>
        <div class="stat-item">
            <span class="stat-num">{totalBeached}</span>
            <span class="stat-label">{$t('bottles.total_beached')}</span>
        </div>
        <div class="stat-item">
            <span class="stat-num">{totalFound}</span>
            <span class="stat-label">{$t('bottles.total_found')}</span>
        </div>
    </div>

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
                    <textarea bind:value={formContent} lang={data.serverLocale || 'en'} spellcheck="true" placeholder={$t('bottles.content')} rows="4"></textarea>
                    <div class="form-row">
                        <select bind:value={formContentType}>
                            {#each contentTypes as ct}
                                <option value={ct}>{contentTypeLabel(ct)}</option>
                            {/each}
                        </select>
                    </div>
                    <p class="seal-notice">🔒 {$t('bottles.seal_notice')}</p>
                    <button class="btn btn-accent" onclick={saveBottle} disabled={saving}>
                        {saving ? '...' : $t('bottles.save')}
                    </button>
                </div>
            {/if}

            {#if myBottles.length}
                <div class="bottles-table-wrap">
                    <table class="bottles-table">
                        <thead>
                            <tr>
                                <th>{$t('bottles.title')}</th>
                                <th>{$t('bottles.content_type')}</th>
                                <th>{$t('bottles.status.launched')}</th>
                                <th>Lat/Lng</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each myBottles as bottle}
                                <tr>
                                    <td class="td-title">{bottle.title || $t('bottles.untitled')}</td>
                                    <td><span class="type-tag">{contentTypeLabel(bottle.content_type)}</span></td>
                                    <td class="td-date">{formatDate(bottle.launched_at)}</td>
                                    <td class="td-coords">{bottle.current_lat ? formatCoords(bottle.current_lat, bottle.current_lon) : '—'}</td>
                                    <td class="td-action">
                                        {#if bottle.status === 'preparing'}
                                            <button class="btn btn-sm btn-accent" onclick={() => launchBottle(bottle.id)} disabled={launching === bottle.id}>
                                                {launching === bottle.id ? '...' : $t('bottles.launch')}
                                            </button>
                                        {:else}
                                            <span class={statusClass(bottle.status)}>{statusLabel(bottle.status)}</span>
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
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
                    <div class="beached-icon">{bottle.status === 'found' ? '📬' : '🫙'}</div>
                    <div class="beached-info">
                        <strong>{bottle.display_name || bottle.username || 'Anónimo'}</strong>
                        <div class="beached-meta">
                            <span class="type-tag">{contentTypeLabel(bottle.content_type)}</span>
                            {#if bottle.launched_at}
                                <span class="meta-sep">·</span>
                                <span>{formatDate(bottle.launched_at)}</span>
                                <span class="meta-sep">·</span>
                                <span>{formatCoords(bottle.launch_lat, bottle.launch_lon)}</span>
                            {/if}
                            {#if bottle.current_lat}
                                <span class="meta-sep">→</span>
                                <span>{formatCoords(bottle.current_lat, bottle.current_lon)}</span>
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
                        <div class="revealed-header"><span>📬</span><span>{$t('bottles.already_opened')}</span></div>
                        <div class="revealed-text">{bottle.content}</div>
                    </div>
                {/if}
            {/each}
        </div>
    {/if}
</section>

<style>
    .bottles-page { max-width: 900px; margin: 0 auto; padding: 3rem 1.5rem 6rem; }
    .page-title { font-family: var(--font-heading); font-size: 3rem; color: var(--fg); margin-bottom: 0.5rem; }
    .page-subtitle { color: var(--muted); font-size: 1.1rem; margin-bottom: 2rem; font-style: italic; }
    .section { margin-bottom: 3rem; }
    .section h2 { font-family: var(--font-heading); font-size: 1.5rem; color: var(--accent); margin-bottom: 1rem; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .section-header h2 { margin-bottom: 0; }

    /* Stats bar */
    .stats-bar { display: flex; gap: 2rem; margin-bottom: 2.5rem; padding: 1.25rem; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
    .stat-item { text-align: center; flex: 1; }
    .stat-num { display: block; font-family: var(--font-heading); font-size: 2rem; color: var(--accent); font-weight: 700; }
    .stat-label { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }

    /* Form */
    .form-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .form-card input, .form-card textarea, .form-card select { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.6rem 0.8rem; color: var(--fg); font-family: var(--font-body); font-size: 0.95rem; }
    .form-row { display: flex; gap: 0.75rem; }
    .form-row select { flex: 1; }
    .seal-notice { font-size: 0.85rem; color: var(--muted); font-style: italic; }

    /* Buttons */
    .btn { background: var(--accent); color: var(--bg); border: none; border-radius: 8px; padding: 0.6rem 1.2rem; font-family: var(--font-body); font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.85; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sm { font-size: 0.8rem; padding: 0.35rem 0.8rem; }
    .btn-accent { background: var(--accent); color: var(--bg); }

    /* Table */
    .bottles-table-wrap { overflow-x: auto; }
    .bottles-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .bottles-table th { text-align: left; padding: 0.6rem 0.75rem; color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    .bottles-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border); vertical-align: middle; color: var(--fg); }
    .td-title { font-weight: 500; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .td-date { white-space: nowrap; color: var(--muted); font-size: 0.85rem; }
    .td-coords { white-space: nowrap; color: var(--muted); font-size: 0.85rem; font-family: monospace; }
    .td-action { white-space: nowrap; }
    .type-tag { display: inline-block; padding: 0.15rem 0.5rem; background: rgba(201,168,124,0.1); color: var(--accent); border-radius: 4px; font-size: 0.75rem; font-weight: 500; }

    /* Status badges */
    .status-badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 99px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .status-preparing { background: #1a1a2e; color: #888; }
    .status-launched { background: #1a2e1a; color: #4ade80; }
    .status-sailing { background: #1a2e2e; color: #22d3ee; }
    .status-beached { background: #2e2a1a; color: #f59e0b; }
    .status-found { background: #2e1a2e; color: #c084fc; }
    .status-sunk { background: #2e1a1a; color: #ef4444; }

    /* Map */
    .map-container { height: 450px; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }

    /* Beached items */
    .beached-item { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .beached-icon { font-size: 2rem; flex-shrink: 0; }
    .beached-info { flex: 1; min-width: 0; }
    .beached-info strong { color: var(--accent); display: block; margin-bottom: 0.3rem; }
    .beached-meta { display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: var(--muted); flex-wrap: wrap; }
    .meta-sep { color: var(--border); }

    /* Revealed content */
    .revealed-content { background: var(--surface); border: 1px solid var(--accent); border-radius: 10px; padding: 1.25rem; margin-bottom: 0.75rem; animation: revealFade 0.5s ease; }
    .already-opened { border-color: var(--border); }
    .revealed-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--accent); font-weight: 600; }
    .revealed-icon { font-size: 1.2rem; }
    .revealed-text { font-style: italic; line-height: 1.7; color: var(--fg); white-space: pre-wrap; }
    @keyframes revealFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    /* Toast */
    .toast { position: fixed; top: 1.5rem; right: 1.5rem; background: var(--accent); color: var(--bg); padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; z-index: 9999; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 640px) {
        .stats-bar { gap: 1rem; padding: 1rem; }
        .stat-num { font-size: 1.5rem; }
        .beached-item { flex-wrap: wrap; }
    }
</style>
