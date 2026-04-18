<script>
    import { onMount } from 'svelte';
    import { t } from '$lib/i18n';
    import { get } from 'svelte/store';
    import { browser } from '$app/environment';
    import { invalidateAll } from '$app/navigation';

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

    // Expandable row
    let expandedBottle = $state(null);

    function toggleExpand(bottleId) {
        expandedBottle = expandedBottle === bottleId ? null : bottleId;
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
        return new Date(iso).toLocaleDateString(data.serverLocale || 'es', {
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

        const L = (await import('leaflet')).default;
        // Load Leaflet CSS dynamically to avoid global style conflicts
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);

        mapInstance = L.map(mapEl, {
            center: [15, -115],
            zoom: 4,
            zoomControl: true,
            attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
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
            const catLabel = contentTypeLabel(bottle.content_type);
            const launchDate = bottle.launched_at ? formatDate(bottle.launched_at) : '';
            const launchCoords = bottle.launch_lat ? formatCoords(bottle.launch_lat, bottle.launch_lon) : '';
            const currentCoords = bottle.current_lat ? formatCoords(bottle.current_lat, bottle.current_lon) : '';
            const dist = bottle.distance_km ? bottle.distance_km.toFixed(0) + ' km' : '';
            marker.bindPopup(`
                <div style="color:#09090b;font-family:Inter,sans-serif;min-width:200px">
                    <strong style="font-family:Playfair Display,serif;font-size:1.05em">${bottle.title || '🍾'}</strong><br>
                    <div style="font-size:0.85em;margin-top:4px;color:#555">
                        <div><b>${author}</b> · <span style="background:#f0ebe3;padding:1px 6px;border-radius:4px;font-size:0.8em;color:#7a6538">${catLabel}</span></div>
                        ${launchDate ? `<div style="margin-top:3px">📅 ${launchDate}</div>` : ''}
                        ${launchCoords ? `<div>📍 ${launchCoords}</div>` : ''}
                        ${currentCoords && currentCoords !== launchCoords ? `<div>➜ ${currentCoords}</div>` : ''}
                        ${dist ? `<div>📏 ${dist}</div>` : ''}
                        <div style="margin-top:3px;text-transform:capitalize;font-weight:600;color:#333">${bottle.status}</div>
                    </div>
                </div>
            `);
        }

        const launchedBottles = data.bottles.filter(b => b.current_lat);
        // Player markers
        const playerPts = [];
        for (const player of (data.players || [])) {
            playerPts.push([player.lat, player.lon]);
            const icon = L.divIcon({
                className: 'player-marker',
                html: `<div style="background:${player.team_color || '#c9a87c'};color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${player.team_id === 'team-alpha' ? '🧭' : '🐧'}</div>`,
                iconSize: [30, 30], iconAnchor: [15, 15]
            });
            const pm = L.marker([player.lat, player.lon], { icon }).addTo(mapInstance);
            pm.bindPopup(`<div style="color:#09090b;font-family:Inter,sans-serif"><strong>${player.display_name || player.username}</strong><br><span style="color:#555;font-size:0.85em"><b>${player.team_name || ''}</b><br>📍 ${player.port_name || ''}</span></div>`);
            pm.bindTooltip(player.display_name || player.username, {
                permanent: true, direction: 'top', offset: [0, -14], className: 'player-label'
            });
        }

        const allPts = [...launchedBottles.map(b => [b.current_lat, b.current_lon]), ...playerPts];
        if (allPts.length) {
            mapInstance.fitBounds(L.latLngBounds(allPts).pad(0.3));
        }
    });

    onMount(loadMyBottles);
</script>

<svelte:head>
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
                                <tr class="tr-clickable" onclick={() => toggleExpand(bottle.id)}>
                                    <td class="td-title">{bottle.title || $t('bottles.untitled')}</td>
                                    <td><span class="type-tag">{contentTypeLabel(bottle.content_type)}</span></td>
                                    <td class="td-date">{formatDate(bottle.launched_at)}</td>
                                    <td class="td-coords">{bottle.current_lat ? formatCoords(bottle.current_lat, bottle.current_lon) : '—'}</td>
                                    <td class="td-action">
                                        {#if bottle.status === 'preparing'}
                                            <button class="btn btn-sm btn-accent" onclick={(e) => { e.stopPropagation(); launchBottle(bottle.id); }} disabled={launching === bottle.id}>
                                                {launching === bottle.id ? '...' : $t('bottles.launch')}
                                            </button>
                                        {:else}
                                            <span class={statusClass(bottle.status)}>{statusLabel(bottle.status)}</span>
                                            {#if bottle.current_lat && mapInstance}
                                                <button class="btn btn-sm btn-zoom" onclick={(e) => { e.stopPropagation(); mapInstance.flyTo([bottle.current_lat, bottle.current_lon], 8, { duration: 1 }); }} title="Zoom to bottle">📍</button>
                                            {/if}
                                        {/if}
                                    </td>
                                </tr>
                                {#if expandedBottle === bottle.id}
                                <tr class="tr-detail">
                                    <td colspan="5">
                                        <div class="detail-grid">
                                            <div class="detail-item">
                                                <span class="detail-label">ID</span>
                                                <span class="detail-value mono">{bottle.id.substring(0, 8)}…</span>
                                            </div>
                                            <div class="detail-item">
                                                <span class="detail-label">{$t('bottles.content_type')}</span>
                                                <span class="detail-value">{contentTypeLabel(bottle.content_type)}</span>
                                            </div>
                                            {#if bottle.launched_at}
                                            <div class="detail-item">
                                                <span class="detail-label">{$t('bottles.launched_on')}</span>
                                                <span class="detail-value">{formatDate(bottle.launched_at)}</span>
                                            </div>
                                            {/if}
                                            {#if bottle.launch_lat}
                                            <div class="detail-item">
                                                <span class="detail-label">📍 {$t('bottles.map_title')}</span>
                                                <span class="detail-value mono">{formatCoords(bottle.launch_lat, bottle.launch_lon)}</span>
                                            </div>
                                            {/if}
                                            {#if bottle.current_lat && (bottle.current_lat !== bottle.launch_lat || bottle.current_lon !== bottle.launch_lon)}
                                            <div class="detail-item">
                                                <span class="detail-label">➜ {$t('bottles.map_title')}</span>
                                                <span class="detail-value mono">{formatCoords(bottle.current_lat, bottle.current_lon)}</span>
                                            </div>
                                            {/if}
                                            {#if bottle.distance_km}
                                            <div class="detail-item">
                                                <span class="detail-label">📏</span>
                                                <span class="detail-value">{bottle.distance_km.toFixed(1)} km</span>
                                            </div>
                                            {/if}
                                            <div class="detail-item">
                                                <span class="detail-label">Status</span>
                                                <span class="detail-value"><span class={statusClass(bottle.status)}>{statusLabel(bottle.status)}</span></span>
                                            </div>
                                            {#if bottle.content && !bottle.content_hidden}
                                            <div class="detail-item detail-full">
                                                <span class="detail-label">Message</span>
                                                <div class="detail-preview">{bottle.content}</div>
                                            </div>
                                            {/if}
                                        </div>
                                    </td>
                                </tr>
                                {/if}
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
                    <div class="beached-icon">{bottle.status === 'found' ? '📬' : '🍾'}</div>
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
    .btn-zoom { background: none; border: 1px solid var(--border); color: var(--fg); cursor: pointer; border-radius: 6px; padding: 0.25rem 0.5rem; font-size: 0.9rem; margin-left: 0.4rem; vertical-align: middle; }
    .btn-zoom:hover { border-color: var(--accent); color: var(--accent); }

    /* Table */
    .bottles-table-wrap { overflow-x: auto; }
    .bottles-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .bottles-table th { text-align: left; padding: 0.6rem 0.75rem; color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    .bottles-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border); vertical-align: middle; color: var(--fg); }
    .tr-clickable { cursor: pointer; transition: background 0.15s; }
    .tr-clickable:hover { background: rgba(201,168,124,0.05); }
    .tr-detail td { padding: 0; border-bottom: 1px solid var(--border); }
    .detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; padding: 1rem 0.75rem; }
    .detail-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .detail-item.detail-full { grid-column: 1 / -1; }
    .detail-label { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .detail-value { font-size: 0.9rem; color: var(--fg); }
    .detail-value.mono { font-family: monospace; font-size: 0.82rem; }
    .detail-preview { font-style: italic; font-size: 0.85rem; color: var(--text-dim); white-space: pre-wrap; max-height: 80px; overflow-y: auto; padding: 0.5rem; background: var(--bg); border-radius: 6px; border-left: 3px solid var(--accent); }
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
    .toast { position: fixed; top: 1.5rem; right: 1.5rem; background: var(--accent); color: var(--bg); padding: 0.6rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; z-index: 9999; animation: fadeIn 0.3s ease; max-width: 85vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

    @media (max-width: 640px) {
        .stats-bar { gap: 1rem; padding: 1rem; }
        .stat-num { font-size: 1.5rem; }
        .beached-item { flex-wrap: wrap; }
    }
</style>
