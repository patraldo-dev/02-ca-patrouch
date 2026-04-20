<script>
    import { onMount } from 'svelte';
    import { t } from '$lib/i18n';
    import { get } from 'svelte/store';
    import { browser } from '$app/environment';
    import { invalidateAll } from '$app/navigation';
    import { sounds } from '$lib/sounds.js';

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

    // Detail visibility toggles
    let showDetails = $state({
        author: true, type: true, launched: true, ago: true,
        from: true, now: true, distance: true, speed: true,
        status: true, driftLog: true
    });
    let showMenu = $state(false);

    // Transfer state
    let transferTarget = $state(null);
    let transferAmount = $state(0);
    let transferNote = $state('');
    let transferMsg = $state('');
    let transferOk = $state(false);
    let transferring = $state(false);
    let transferMax = $state(0);
    let myFuel = $state(0);

    // Move state
    let moveTarget = $state(null);
    let moveSpeed = $state('sail');
    let moveConfirm = $state(false);
    let moveMsg = $state('');
    let moveOk = $state(false);
    let moveCost = $state(null);

    // Betting state
    let oddsBoard = $state([]);
    let myBets = $state([]);
    let bettingBottle = $state(null);
    let betAmount = $state(0);
    let betTarget = $state(null);
    let betMsg = $state('');
    let betOk = $state(false);
    let betting = $state(false);

    // Check-in state
    let checkedIn = $state(false);
    let checkinStreak = $state(0);
    let checkinLoading = $state(false);

    // Keywords
    let kwInfoOpen = $state(false);
    let poisonWords = $state([]);
    let recentMatches = $state([]);

    // Map
    let mapEl = $state(null);
    let mapInstance = $state(null);

    // Expandable row
    let expandedBottle = $state(null);
    let openingId = $state(null);
    let openedBottle = $state(null);

    // --- Derived ---
    let totalLaunched = $derived(data.bottles.filter(b => b.status === 'launched' || b.status === 'sailing' || b.status === 'beached' || b.status === 'found').length);
    let totalBeached = $derived(data.bottles.filter(b => b.status === 'beached').length);
    let totalFound = $derived(data.bottles.filter(b => b.status === 'found').length);

    let playersWithDist = $derived(
        (data.players || []).map(p => {
            let nearestBottle = null;
            let nearestDist = Infinity;
            for (const b of data.bottles || []) {
                if (b.current_lat && b.current_lon) {
                    const d = haversine(p.lat, p.lon, b.current_lat, b.current_lon);
                    if (d < nearestDist) { nearestDist = d; nearestBottle = b; }
                }
            }
            return { ...p, nearestBottle, nearestDist: nearestDist === Infinity ? null : nearestDist };
        })
    );

    // --- Functions ---
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
                body: JSON.stringify({ content: formContent, title: formTitle, content_type: formContentType })
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

    function toggleExpand(bottleId) {
        expandedBottle = expandedBottle === bottleId ? null : bottleId;
    }

    // Transfer
    async function openTransfer(target) {
        transferTarget = target;
        transferAmount = 0;
        transferNote = '';
        transferMsg = '';
        transferring = false;
        const me = data.players?.find(p => p.user_id && p.type === 'human');
        myFuel = me?.fuel || 0;
        transferMax = Math.floor(myFuel * 0.5);
    }

    async function sendTransfer() {
        if (!transferTarget || !transferAmount) return;
        transferring = true;
        transferMsg = '';
        try {
            const res = await fetch('/api/bottlequest/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ to_player_id: transferTarget.id, amount: transferAmount, note: transferNote })
            });
            const d = await res.json();
            if (res.ok) {
                transferMsg = `✅ ${d.message}`;
                transferOk = true;
                sounds.transfer_sent();
                myFuel = d.remaining_fuel;
                transferMax = d.daily_max - d.daily_used;
                transferAmount = 0;
            } else {
                transferMsg = d.error;
                transferOk = false;
            }
        } catch {
            transferMsg = 'Connection error';
            transferOk = false;
        }
        transferring = false;
    }

    // Move
    async function executeMove() {
        if (!moveTarget) return;
        moveConfirm = true;
        moveMsg = '';
        try {
            const res = await fetch('/api/bottlequest/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ target_lat: moveTarget.lat, target_lon: moveTarget.lon, speed: moveSpeed })
            });
            const d = await res.json();
            if (res.ok) {
                moveOk = true;
                if (d.captured) {
                    moveMsg = `🏴‍☠️ ${d.captured.title} captured! +${d.captured.bonus} ⛽`;
                    sounds.bottle_captured();
                } else {
                    moveMsg = `✅ Moved! (${d.cost} ⛽)`;
                    sounds.move_complete();
                }
                moveCost = d.cost_breakdown;
                setTimeout(() => { moveTarget = null; moveCost = null; location.reload(); }, 1500);
            } else if (res.status === 402) {
                moveMsg = `⛽ ${d.error}`;
                moveOk = false;
                moveCost = d.cost_breakdown;
            } else {
                moveMsg = d.error;
                moveOk = false;
            }
        } catch {
            moveMsg = 'Connection error';
            moveOk = false;
        }
        moveConfirm = false;
    }

    // Check-in
    async function loadCheckin() {
        try {
            const res = await fetch('/api/bottlequest/checkin', { credentials: 'include' });
            const d = await res.json();
            checkedIn = d.checkedIn;
            checkinStreak = d.streak || 0;
        } catch {}
    }

    async function doCheckin() {
        if (checkedIn || checkinLoading) return;
        checkinLoading = true;
        try {
            const res = await fetch('/api/bottlequest/checkin', { method: 'POST', credentials: 'include' });
            const d = await res.json();
            if (d.success) {
                checkedIn = true;
                checkinStreak++;
                sounds.bet_won();
            }
        } catch {}
        checkinLoading = false;
    }

    // Betting
    async function loadBets() {
        try {
            const res = await fetch('/api/bottlequest/bets', { credentials: 'include' });
            if (res.ok) {
                const d = await res.json();
                oddsBoard = d.oddsBoard || [];
                myBets = d.myBets || [];
            }
        } catch {}
    }

    async function placeBet() {
        if (!bettingBottle || !betTarget || !betAmount) return;
        betting = true;
        betMsg = '';
        try {
            const res = await fetch('/api/bottlequest/bets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ bottle_id: bettingBottle.bottle_id, bet_on_player_id: betTarget.player_id, amount: betAmount })
            });
            const d = await res.json();
            if (res.ok) {
                betMsg = `✅ ${d.message}`;
                betOk = true;
                sounds.bet_placed();
                bettingBottle = null;
                betTarget = null;
                betAmount = 0;
                loadBets();
            } else {
                betMsg = d.error;
                betOk = false;
                sounds.error();
            }
        } catch { betMsg = 'Error'; betOk = false; }
        betting = false;
    }

    // Keywords
    async function loadKeywords() {
        try {
            const res = await fetch('/api/keywords/proposals');
            if (res.ok) {
                const d = await res.json();
                recentMatches = d.matches || [];
                poisonWords = d.poison_words || [];
            }
        } catch {}
    }

    // Map helpers
    function statClick(type) {
        const list = data.bottles.filter(b => type === 'active' ? (b.status === 'launched' || b.status === 'sailing') : b.status === type);
        if (list.length === 0) return;
        if (list.length <= 6 && mapInstance) {
            const bounds = L.latLngBounds(list.map(b => [b.current_lat || b.launch_lat, b.current_lon || b.launch_lon]).filter(p => p[0]));
            mapInstance.fitBounds(bounds, { padding: [40, 40] });
        } else {
            document.querySelector('.bottles-section')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function flyToPlayer(player) {
        if (mapInstance) mapInstance.flyTo([player.lat, player.lon], 6, { duration: 1.5 });
    }

    function flyToBottle(bottle) {
        if (mapInstance && bottle.current_lat) mapInstance.flyTo([bottle.current_lat, bottle.current_lon], 8, { duration: 1.5 });
    }

    // Utility functions
    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function statusClass(s) { return 'status-badge status-' + (s || 'unknown'); }
    function statusLabel(s) { return get(t)('bottles.status.' + (s || 'unknown')); }

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

    function timeAgo(date) {
        if (!date) return '';
        const s = Math.floor((Date.now() - date.getTime()) / 1000);
        if (s < 60) return `${s}s ago`;
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        const d = Math.floor(h / 24);
        return `${d}d ago`;
    }

    function avgSpeed(bottle) {
        const pos = bottle.positions;
        if (!pos || pos.length < 2) return 0;
        let total = 0;
        for (let i = 1; i < pos.length; i++) total += haversine(pos[i - 1].lat, pos[i - 1].lon, pos[i].lat, pos[i].lon);
        const hours = (new Date(pos[pos.length - 1].recorded_at) - new Date(pos[0].recorded_at)) / 3600000;
        return hours > 0 ? total / hours : 0;
    }

    function stepSpeed(prev, curr) {
        const hours = (new Date(curr.recorded_at) - new Date(prev.recorded_at)) / 3600000;
        if (hours <= 0) return '—';
        const dist = haversine(prev.lat, prev.lon, curr.lat, curr.lon);
        return (dist / hours).toFixed(2) + ' km/h';
    }

    // --- onMount ---
    onMount(async () => {
        if (!browser) return;

        loadCheckin();
        loadBets();
        loadKeywords();
        loadMyBottles();

        const L = (await import('leaflet')).default;
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

        // Launch point
        L.circleMarker([20.6528, -105.2306], {
            radius: 10, fillColor: '#ef4444', fillOpacity: 0.8, color: '#fff', weight: 2
        }).addTo(mapInstance).bindPopup(`
            <div style="color:#09090b;font-family:Inter,sans-serif">
                <strong style="font-family:Playfair Display,serif">Malecón, Puerto Vallarta</strong><br>
                <span style="font-size:0.85em">🍾 Launch point</span>
            </div>
        `);

        const launchedBottles = [];
        for (const bottle of data.bottles) {
            if (!bottle.current_lat || !bottle.current_lon) continue;
            launchedBottles.push([bottle.current_lat, bottle.current_lon]);

            const colors = { beached: '#f59e0b', found: '#c084fc', launched: '#ef4444', sailing: '#fca5a5', sunk: '#ef4444' };

            if (bottle.positions?.length > 1) {
                const coords = bottle.positions.map(p => [p.lat, p.lon]);
                L.polyline(coords, { color: '#ef4444', weight: 1.5, opacity: 0.15, dashArray: '4 8' }).addTo(mapInstance);
                const trailLine = L.polyline([], { color: '#ef4444', weight: 2.5, opacity: 0.6 }).addTo(mapInstance);
                const animMarker = L.circleMarker(coords[0], {
                    radius: 8, fillColor: colors[bottle.status] || '#ef4444', fillOpacity: 0.9, color: '#fff', weight: 2
                }).addTo(mapInstance);
                let step = 0;
                const interval = setInterval(() => {
                    step++;
                    if (step >= coords.length) { clearInterval(interval); return; }
                    trailLine.addLatLng(coords[step]);
                    animMarker.setLatLng(coords[step]);
                }, 600);
                const author = bottle.author_name || bottle.display_name || bottle.username || 'Anonymous';
                animMarker.bindPopup(`
                    <div style="color:#09090b;font-family:Inter,sans-serif;min-width:200px">
                        <strong style="font-family:Playfair Display,serif;font-size:1.05em">${bottle.title || '🍾'}</strong><br>
                        <div style="font-size:0.85em;margin-top:4px;color:#555">
                            <div><b>${author}</b> · ${bottle.status}</div>
                            ${bottle.launched_at ? `<div>📅 ${formatDate(bottle.launched_at)}</div>` : ''}
                            ${bottle.launch_lat ? `<div>📍 ${formatCoords(bottle.launch_lat, bottle.launch_lon)}</div>` : ''}
                            ${bottle.current_lat ? `<div>➜ ${formatCoords(bottle.current_lat, bottle.current_lon)}</div>` : ''}
                            ${bottle.distance_km ? `<div>📏 ${bottle.distance_km.toFixed(0)} km</div>` : ''}
                        </div>
                    </div>
                `);
            } else {
                const marker = L.circleMarker([bottle.current_lat, bottle.current_lon], {
                    radius: 10, fillColor: colors[bottle.status] || '#ef4444', fillOpacity: 0.9, color: '#fff', weight: 2
                }).addTo(mapInstance);
                const author = bottle.author_name || bottle.display_name || bottle.username || 'Anonymous';
                marker.bindPopup(`
                    <div style="color:#09090b;font-family:Inter,sans-serif;min-width:200px">
                        <strong style="font-family:Playfair Display,serif;font-size:1.05em">${bottle.title || '🍾'}</strong><br>
                        <div style="font-size:0.85em;margin-top:4px;color:#555">
                            <div><b>${author}</b> · ${bottle.status}</div>
                            ${bottle.launch_lat ? `<div>📍 ${formatCoords(bottle.launch_lat, bottle.launch_lon)}</div>` : ''}
                            ${bottle.distance_km ? `<div>📏 ${bottle.distance_km.toFixed(0)} km</div>` : ''}
                        </div>
                    </div>
                `);
            }
        }

        // Player markers
        const playerPts = [];
        for (const player of (data.players || [])) {
            playerPts.push([player.lat, player.lon]);
            const icon = L.divIcon({
                className: 'player-marker',
                html: `<div style="background:${player.team_color || '#ef4444'};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer">${player.type === 'ai' ? '🤖' : '🧭'}</div>`,
                iconSize: [32, 32], iconAnchor: [16, 16]
            });
            const pm = L.marker([player.lat, player.lon], { icon }).addTo(mapInstance);
            pm.bindPopup(`<div style="color:#09090b;font-family:Inter,sans-serif"><strong>${player.display_name || player.username}</strong><br><span style="color:#555;font-size:0.85em"><b>${player.team_name || ''}</b><br>📍 ${player.port_name || ''}</span></div>`);
            pm.bindTooltip(player.display_name || player.username, {
                permanent: true, direction: 'top', offset: [0, -16], className: 'player-label'
            });
        }

        const allPts = [...launchedBottles, ...playerPts];
        if (allPts.length) mapInstance.fitBounds(L.latLngBounds(allPts).pad(0.3));

        // Click to move
        mapInstance.on('click', (e) => {
            if (moveConfirm) return;
            moveTarget = { lat: e.latlng.lat, lon: e.latlng.lng };
            moveSpeed = 'sail';
        });
    });
</script>

<svelte:head>
    <title>{$t('games.find_the_bottle')} — Patrouch</title>
</svelte:head>

<div class="bottlequest-theme">

<!-- Ticker Tape -->
<div class="ticker-tape" role="status" aria-label="Market prices">
    <div class="ticker-content">
        <span class="ticker-item">
            ⛽ BRENT <span class="ticker-value">{data.market?.brent_price?.toFixed(2) || '73.00'}</span>
            <span class="ticker-change" class:ticker-up={data.market?.brent_change > 0} class:ticker-down={data.market?.brent_change < 0}>
                {data.market?.brent_change > 0 ? '▲' : data.market?.brent_change < 0 ? '▼' : '—'}
            </span>
        </span>
        <span class="ticker-divider">│</span>
        <span class="ticker-item">
            🏦 FED <span class="ticker-value">{data.market?.fed_rate?.toFixed(2) || '5.25'}%</span>
            <span class="ticker-change" class:ticker-up={data.market?.fed_change > 0} class:ticker-down={data.market?.fed_change < 0}>
                {data.market?.fed_change > 0 ? '▲' : data.market?.fed_change < 0 ? '▼' : '—'}
            </span>
        </span>
        <span class="ticker-divider">│</span>
        <span class="ticker-item">
            🚢 <span class="ticker-value">{data.market?.cost_per_km?.toFixed(2) || '0.73'}</span> fuel/km
        </span>
        <span class="ticker-divider">│</span>
        <span class="ticker-item">
            🤖 FEE <span class="ticker-value">{data.market?.fed_rate?.toFixed(2) || '5.25'}%</span>
        </span>
    </div>
</div>

<section class="bottles-page">
    <h1 class="page-title">🍾 {$t('games.find_the_bottle')}</h1>
    <p class="page-subtitle">{$t('games.find_the_bottle_desc')}</p>

    {#if toastMsg}
        <div class="toast">{toastMsg}</div>
    {/if}

    <!-- Stats bar with check-in -->
    <div class="stats-bar">
        <button class="stat-item" onclick={() => statClick('active')} aria-label={$t('stats.active')}>
            <span class="stat-num">{totalLaunched}</span>
            <span class="stat-label">{$t('stats.active')}</span>
        </button>
        <button class="stat-item" onclick={() => statClick('beached')} aria-label={$t('stats.beached')}>
            <span class="stat-num">{totalBeached}</span>
            <span class="stat-label">{$t('stats.beached')}</span>
        </button>
        <button class="stat-item" onclick={() => statClick('found')} aria-label={$t('stats.found')}>
            <span class="stat-num">{totalFound}</span>
            <span class="stat-label">{$t('stats.found')}</span>
        </button>
        <button class="stat-item" style="border-left: 1px solid var(--border);" aria-label={$t('stats.pursuit')}>
            <span class="stat-num">{data.playersInPursuit}</span>
            <span class="stat-label">{$t('stats.pursuit')}</span>
        </button>
        <button class="stat-item stat-checkin" class:stat-checked={checkedIn} onclick={() => doCheckin()} disabled={checkedIn || checkinLoading} aria-label="Check in">
            <span class="stat-num">{checkinStreak > 0 ? checkinStreak + '🔥' : '✋'}</span>
            <span class="stat-label">{checkedIn ? '✓' : $t('stats.checkin')}</span>
        </button>
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
                                                <button class="btn btn-sm btn-zoom" onclick={(e) => { e.stopPropagation(); mapInstance.flyTo([bottle.current_lat, bottle.current_lon], 8, { duration: 1 }); }} title="Zoom">📍</button>
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

    <!-- Players -->
    {#if playersWithDist.length}
        <section class="players-section" aria-labelledby="players-title">
            <h2 class="section-title" id="players-title">{$t('players.title')}</h2>
            <div class="players-grid">
                {#each playersWithDist as player}
                    <button class="player-card" onclick={() => flyToPlayer(player)}>
                        <div class="player-header">
                            <div class="player-avatar" style="background:{player.team_color || '#ef4444'}">
                                {player.team_id === 'team-alpha' ? '🧭' : '🐧'}
                            </div>
                            <div class="player-info">
                                <h3>{player.display_name || player.username} {player.type === 'ai' ? '🤖' : '👤'}</h3>
                                <span class="team-badge" style="background:{player.team_color || '#ef4444'}22;color:{player.team_color || '#ef4444'}">{player.type === 'ai' ? '🤖 AI' : '👤 Human'} · {player.team_name || 'Free Agent'}</span>
                            </div>
                        </div>
                        <div class="player-details">
                            <div class="detail-row"><span>📍 {$t('players.port')}</span><span>{player.port_name || 'Unknown'}</span></div>
                            <div class="detail-row"><span>🌐 {$t('players.position')}</span><span class="mono">{formatCoords(player.lat, player.lon)}</span></div>
                            <div class="detail-row"><span>⭐ {$t('players.points')}</span><span>{player.points || 0}</span></div>
                            <div class="detail-row"><span>⛽ {$t('players.fuel')}</span><span>{player.fuel || 0}</span></div>
                            {#if player.nearestDist !== null}
                                <button class="bottle-link" onclick={(e) => { e.stopPropagation(); flyToBottle(player.nearestBottle); }}>
                                    🍾 {$t('players.nearest')}: {player.nearestDist.toFixed(0)} km
                                </button>
                            {/if}
                        </div>
                    </button>
                {/each}
            </div>
        </section>
    {/if}

    <!-- Scoreboard -->
    <section class="scoreboard-section" aria-labelledby="scoreboard-title">
        <h2 class="section-title" id="scoreboard-title">🏆 {$t('scoreboard.title')}</h2>
        <div class="scoreboard-list" role="list">
            {#each [...data.players].sort((a, b) => (b.points || 0) - (a.points || 0)) as p, i}
                <div class="score-row" role="listitem">
                    <span class="score-rank">{i + 1}</span>
                    <span class="score-type">{p.type === 'ai' ? '🤖' : p.solo ? '👤' : '👥'}</span>
                    <span class="score-name">{p.display_name || p.username}</span>
                    <span class="score-team" style="color:{p.team_color || '#ef4444'}">{p.type === 'human' ? (p.solo ? 'Solo' : p.team_name || '') : p.team_name || ''}</span>
                    <span class="score-pts">⭐ {p.points || 0}</span>
                    <span class="score-fuel">⛽ {p.fuel || 0}</span>
                    {#if p.type === 'human'}
                        <button class="btn-transfer" onclick={() => openTransfer(p)}>→</button>
                    {/if}
                </div>
            {/each}
        </div>
    </section>

    <!-- Betting Odds Board -->
    {#if oddsBoard.length > 0}
    <section class="bets-section" aria-labelledby="bets-title">
        <h2 class="section-title" id="bets-title">📊 {$t('bets.title')}</h2>
        <div class="bets-board">
            {#each oddsBoard as bottle}
                <div class="bets-bottle-row">
                    <div class="bets-bottle-info">
                        <span class="bets-bottle-icon">🍾</span>
                        <span class="bets-bottle-name">{bottle.bottle_title || bottle.bottle_id.slice(0, 8)}</span>
                    </div>
                    <div class="bets-odds-list">
                        {#each bottle.odds.slice(0, 4) as p}
                            <button class="bets-odds-btn" onclick={() => { bettingBottle = bottle; betTarget = p; betAmount = 0; betMsg = ''; }}>
                                <span class="bets-player-name">{p.display_name}{p.type === 'ai' ? ' 🤖' : ' 🧭'}</span>
                                <span class="bets-player-dist">{p.distance_km}km</span>
                                <span class="bets-odds-val">{p.odds.toFixed(1)}×</span>
                            </button>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
        {#if myBets.length > 0}
            <div class="bets-history">
                <h3 class="bets-history-title">{$t('bets.history')}</h3>
                {#each myBets as bet}
                    <div class="bets-history-row">
                        <span class="bets-history-status" class:bets-won={bet.status === 'won'} class:bets-lost={bet.status === 'lost'} class:bets-open={bet.status === 'open'}>
                            {bet.status === 'won' ? '✅' : bet.status === 'lost' ? '❌' : '⏳'}
                        </span>
                        <span class="bets-history-detail">{bet.bet_on_name} — {bet.bottle_title?.slice(0, 20) || bet.bottle_id.slice(0, 8)}</span>
                        <span class="bets-history-amount">{bet.amount} @ {bet.odds.toFixed(1)}×</span>
                    </div>
                {/each}
            </div>
        {/if}
    </section>
    {/if}

    <!-- Keywords teaser -->
    <section class="keywords-section" aria-labelledby="keywords-title">
        <div class="section-header">
            <h2 class="section-title" id="keywords-title">🔑 {$t('keywords.title')}</h2>
        </div>
        <p class="keywords-desc">{$t('keywords.desc')}</p>
        <div class="kw-teaser">
            <p class="kw-teaser-text">{$t('keywords.teaser_text')}</p>
            <div class="kw-teaser-actions">
                <a href="https://patrouch.ca/write" class="btn-teaser" target="_blank" rel="noopener">{$t('keywords.teaser_cta')}</a>
                <button class="btn-info" onclick={() => kwInfoOpen = true}>ℹ️</button>
            </div>
        </div>
        {#if kwInfoOpen}
            <div class="modal-overlay" role="dialog" aria-modal="true" onclick={() => kwInfoOpen = false}>
                <div class="kw-info-modal" onclick={(e) => e.stopPropagation()}>
                    <div class="kw-info-header">
                        <h3>🔑 {$t('keywords.info_title')}</h3>
                        <button class="modal-close" onclick={() => kwInfoOpen = false}>✕</button>
                    </div>
                    <div class="kw-info-body">
                        <div class="kw-info-item"><span class="kw-info-icon">📝</span><p>{$t('keywords.info_contribute')}</p></div>
                        <div class="kw-info-item kw-highlight"><span class="kw-info-icon">⭐</span><p>{$t('keywords.info_double')}</p></div>
                        <div class="kw-info-item"><span class="kw-info-icon">🤝</span><p>{$t('keywords.info_coop')}</p></div>
                        <div class="kw-info-item"><span class="kw-info-icon">🚫</span><p>{$t('keywords.info_no_self')}</p></div>
                        <div class="kw-info-item"><span class="kw-info-icon">📉</span><p>{$t('keywords.info_decay')}</p></div>
                    </div>
                </div>
            </div>
        {/if}
        {#if poisonWords.length > 0}
            <div class="kw-poison">
                <h3 class="kw-pool-label">☠️ {$t('keywords.poison')} ({poisonWords.length})</h3>
                <div class="keywords-grid" role="list">
                    {#each poisonWords as pw}
                        <div class="keyword-pill kw-poison-pill" role="listitem">
                            <span class="kw-word">{pw.word}</span>
                            <span class="kw-badge">+{pw.current_value.toFixed(2)}</span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
        {#if recentMatches.length > 0}
            <div class="kw-recent">
                <h3 class="kw-pool-label">🎯 {$t('keywords.recent_matches')} ({recentMatches.length})</h3>
                {#each recentMatches as m}
                    <div class="match-row">
                        <span class="kw-word">{m.word}</span>
                        <span class="kw-match-info">✓ +{m.current_value?.toFixed(2)} (×{m.match_count}) — {m.writing_title || 'Untitled'}</span>
                        <span class="kw-author">{m.player_type === 'ai' ? '🤖' : '👤'} {m.display_name || m.username}</span>
                    </div>
                {/each}
            </div>
        {/if}
    </section>

    <!-- Beached / Found bottles (public) -->
    {#if data.bottles.filter(b => b.status === 'beached' || b.status === 'found').length}
        <div class="section bottles-section">
            <div class="section-header">
                <h2>{$t('bottles.washed_up')}</h2>
                <button class="btn-columns" onclick={() => showMenu = !showMenu} aria-expanded={showMenu}>
                    ⚙️ {$t('bottles.columns')}
                </button>
            </div>
            {#if showMenu}
                <div class="columns-menu" role="group">
                    {#each Object.entries(showDetails) as [key, val]}
                        <label class="col-toggle">
                            <input type="checkbox" checked={val} onchange={(e) => showDetails[key] = e.target.checked} />
                            <span>{$t('bottles.detail.' + key.replace(/([A-Z])/g, '_$1').toLowerCase())}</span>
                        </label>
                    {/each}
                </div>
            {/if}
            {#each data.bottles.filter(b => b.status === 'beached' || b.status === 'found') as bottle}
                <div class="beached-item">
                    <div class="beached-icon">{bottle.status === 'found' ? '📬' : '🍾'}</div>
                    <div class="beached-info">
                        <strong>{bottle.author_name || bottle.display_name || bottle.username || 'Anónimo'}</strong>
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
                        <div class="revealed-header"><span class="revealed-icon">🔓</span><span>{$t('bottles.message_revealed')}</span></div>
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

</div><!-- /bottlequest-theme -->

<!-- Transfer Modal -->
{#if transferTarget}
    <div class="modal-overlay" role="dialog" aria-modal="true" onclick={() => transferTarget = null}>
        <div class="transfer-modal" onclick={(e) => e.stopPropagation()}>
            <div class="transfer-header">
                <h3>⛽ {$t('transfer.title')}</h3>
                <button class="modal-close" onclick={() => transferTarget = null}>✕</button>
            </div>
            <div class="transfer-body">
                <div class="transfer-recipient">
                    <div class="transfer-avatar">{transferTarget.type === 'ai' ? '🤖' : '👤'}</div>
                    <div class="transfer-recipient-info">
                        <span class="transfer-name">{transferTarget.display_name || transferTarget.username}</span>
                        <span class="transfer-team">{transferTarget.solo ? '👤 Solo' : transferTarget.team_name || 'Free Agent'}</span>
                    </div>
                </div>
                <div class="transfer-amount-section">
                    <label class="transfer-label">{$t('transfer.amount_label')}</label>
                    <div class="transfer-input-row">
                        <input type="number" class="transfer-input" bind:value={transferAmount} min="1" max={transferMax} placeholder="0" />
                        <span class="transfer-unit">⛽ fuel</span>
                    </div>
                    <div class="transfer-meta">
                        <span class="transfer-available">{$t('transfer.available')}: {myFuel} ⛽</span>
                        <span class="transfer-limit">{$t('transfer.daily_limit')}: {transferMax} ⛽</span>
                    </div>
                </div>
                <div class="transfer-note-section">
                    <label class="transfer-label">{$t('transfer.note_label')}</label>
                    <input type="text" class="transfer-note-input" bind:value={transferNote} maxlength="100" placeholder={$t('transfer.note_placeholder')} />
                </div>
                <div class="transfer-preview">
                    <div class="transfer-arrow">↓</div>
                    <div class="transfer-preview-row">
                        <span>You send</span>
                        <span class="transfer-preview-amount">{transferAmount || 0} ⛽</span>
                    </div>
                    <div class="transfer-arrow">↓</div>
                    <div class="transfer-preview-row">
                        <span>{transferTarget.display_name || transferTarget.username} receives</span>
                        <span class="transfer-preview-amount transfer-receive">{transferAmount || 0} ⛽</span>
                    </div>
                    <div class="transfer-fee-row">
                        <span>🤖 Bank fee (3%)</span>
                        <span class="transfer-fee-amount">{transferAmount ? Math.ceil(transferAmount * 0.03) : 0} ⛽</span>
                    </div>
                    <div class="transfer-fee-row">
                        <span>{transferTarget.display_name || transferTarget.username} receives</span>
                        <span class="transfer-receive-final">{transferAmount ? transferAmount - Math.ceil(transferAmount * 0.03) : 0} ⛽</span>
                    </div>
                </div>
                {#if transferMsg}
                    <p class="transfer-msg" class:transfer-success={transferOk} class:transfer-error={!transferOk}>{transferMsg}</p>
                {/if}
                <button class="transfer-btn" onclick={sendTransfer} disabled={transferring || !transferAmount || transferAmount < 1}>
                    {transferring ? '...' : $t('transfer.send_btn')}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Move Modal -->
{#if moveTarget}
    <div class="modal-overlay" role="dialog" aria-modal="true" onclick={() => moveTarget = null}>
        <div class="move-modal" onclick={(e) => e.stopPropagation()}>
            <div class="move-header">
                <h3>🧭 {$t('move.title')}</h3>
                <button class="modal-close" onclick={() => moveTarget = null}>✕</button>
            </div>
            <div class="move-body">
                <div class="move-target">
                    <span class="move-coords">{moveTarget.lat.toFixed(5)}, {moveTarget.lon.toFixed(5)}</span>
                </div>
                <div class="move-speed-section">
                    <label class="move-label">{$t('move.speed_label')}</label>
                    <div class="move-speeds">
                        <button class="move-speed-btn" class:active={moveSpeed === 'drift'} onclick={() => moveSpeed = 'drift'}>
                            🐢 {$t('move.drift')}<br><small>0.5×</small>
                        </button>
                        <button class="move-speed-btn" class:active={moveSpeed === 'sail'} onclick={() => moveSpeed = 'sail'}>
                            ⛵ {$t('move.sail')}<br><small>1×</small>
                        </button>
                        <button class="move-speed-btn" class:active={moveSpeed === 'motor'} onclick={() => moveSpeed = 'motor'}>
                            🏎️ {$t('move.motor')}<br><small>4×</small>
                        </button>
                    </div>
                </div>
                {#if moveCost}
                    <div class="move-cost-preview">
                        <div class="move-cost-row"><span>{$t('move.distance')}</span><span>{moveCost.distKm} km</span></div>
                        <div class="move-cost-row"><span>{$t('move.zone')}</span><span>{moveCost.zoneLabel} ({moveCost.zoneMult}×)</span></div>
                        <div class="move-cost-row"><span>{$t('move.speed_cost')}</span><span>{moveCost.speedMult}×</span></div>
                        <div class="move-cost-row"><span>{$t('move.competition')}</span><span>{moveCost.compLabel} ({moveCost.compMult}×)</span></div>
                        <div class="move-cost-row move-cost-total"><span>{$t('move.total_cost')}</span><span class="move-total-amount">⛽ {moveCost.fuelCost}</span></div>
                    </div>
                {/if}
                {#if moveMsg}
                    <p class="move-msg" class:move-success={moveOk} class:move-error={!moveOk}>{moveMsg}</p>
                {/if}
                <button class="move-btn" onclick={executeMove} disabled={moveConfirm}>
                    {moveConfirm ? '...' : $t('move.go_btn')}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Bet Modal -->
{#if bettingBottle && betTarget}
    <div class="modal-overlay" role="dialog" aria-modal="true" onclick={() => bettingBottle = null}>
        <div class="bet-modal" onclick={(e) => e.stopPropagation()}>
            <div class="bet-header">
                <h3>📊 {$t('bets.title')}</h3>
                <button class="modal-close" onclick={() => bettingBottle = null}>✕</button>
            </div>
            <div class="bet-body">
                <div class="bet-target">
                    <span class="bet-bottle-label">🍾 {bettingBottle.bottle_title || bettingBottle.bottle_id.slice(0, 8)}</span>
                    <span class="bet-on">→ {betTarget.display_name}{betTarget.type === 'ai' ? ' 🤖' : ' 🧭'} ({betTarget.distance_km}km)</span>
                    <span class="bet-odds-display">{betTarget.odds.toFixed(1)}×</span>
                </div>
                <div class="bet-amount-section">
                    <label class="bet-label">{$t('bets.your_bet')}</label>
                    <div class="bet-input-row">
                        <input type="number" class="bet-input" bind:value={betAmount} min="1" placeholder="0" />
                        <span class="bet-unit">⛽ fuel</span>
                    </div>
                    <div class="bet-preview">
                        <div class="bet-preview-row"><span>{$t('bets.odds')}</span><span>{betTarget.odds.toFixed(1)}×</span></div>
                        <div class="bet-preview-row"><span>{$t('bets.potential_win')}</span><span class="bet-win">⛽ {betAmount ? Math.floor(betAmount * betTarget.odds * 0.95) : 0}</span></div>
                        <div class="bet-preview-row"><span>{$t('bets.fee')}</span><span class="bet-fee">⛽ {betAmount ? Math.floor(betAmount * betTarget.odds * 0.05) : 0}</span></div>
                    </div>
                </div>
                {#if betMsg}
                    <p class="bet-msg" class:bet-success={betOk} class:bet-error={!betOk}>{betMsg}</p>
                {/if}
                <button class="bet-btn" onclick={placeBet} disabled={betting || !betAmount || betAmount < 1}>
                    {betting ? '...' : $t('bets.place_bet')}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Lava red theme */
    .bottlequest-theme {
        --accent: #ef4444;
        --accent-dim: rgba(239,68,68,0.15);
        --ocean: #7f1d1d;
    }

    .bottles-page { max-width: 900px; margin: 0 auto; padding: 3rem 1.5rem 6rem; }
    .page-title { font-family: var(--font-heading); font-size: 3rem; color: var(--fg); margin-bottom: 0.5rem; }
    .page-subtitle { color: var(--muted); font-size: 1.1rem; margin-bottom: 0.5rem; font-style: italic; }
    .section { margin-bottom: 3rem; }
    .section h2 { font-family: var(--font-heading); font-size: 1.5rem; color: var(--accent); margin-bottom: 1rem; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .section-header h2 { margin-bottom: 0; }
    .section-title { font-family: var(--font-heading); font-size: 1.5rem; color: var(--accent); margin-bottom: 1.25rem; }

    /* Stats bar */
    .stats-bar { display: flex; gap: 2rem; margin-bottom: 2.5rem; padding: 1.25rem; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
    .stat-item { text-align: center; flex: 1; background: none; border: none; cursor: pointer; font-family: var(--font-body); padding: 0.5rem; border-radius: 8px; transition: background 0.2s; color: var(--fg); }
    .stat-item:hover { background: var(--accent-dim); }
    .stat-num { display: block; font-family: var(--font-heading); font-size: 2rem; color: var(--accent); font-weight: 700; }
    .stat-label { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-checkin { border-left: 1px solid var(--border); }
    .stat-checkin:disabled { cursor: default; }
    .stat-checked .stat-num { color: #4ade80; }

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
    .tr-clickable:hover { background: rgba(239,68,68,0.05); }
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
    .type-tag { display: inline-block; padding: 0.15rem 0.5rem; background: rgba(239,68,68,0.1); color: var(--accent); border-radius: 4px; font-size: 0.75rem; font-weight: 500; }

    /* Status badges */
    .status-badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 99px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .status-preparing { background: #1a1a2e; color: #888; }
    .status-launched { background: #1a2e1a; color: #4ade80; }
    .status-sailing { background: #1a2e2e; color: #22d3ee; }
    .status-beached { background: #2e2a1a; color: #f59e0b; }
    .status-found { background: #2e1a2e; color: #c084fc; }
    .status-sunk { background: #2e1a1a; color: #ef4444; }

    /* Map */
    .map-container { height: 500px; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }

    /* Players */
    .players-section { padding: 2rem 0 1rem; }
    .players-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .player-card {
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius, 12px);
        padding: 1.25rem; text-align: left; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s;
        color: var(--fg); font-family: var(--font-body); font-size: 0.95rem; width: 100%;
    }
    .player-card:hover { border-color: var(--accent); box-shadow: 0 0 20px var(--accent-dim); }
    .player-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .player-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); flex-shrink: 0; }
    .player-info h3 { font-family: var(--font-heading); font-size: 1.05rem; margin: 0 0 0.2rem; }
    .team-badge { font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
    .player-details { padding-top: 0.5rem; border-top: 1px solid var(--border); }
    .player-details .detail-row { display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.82rem; }
    .player-details .detail-row span:first-child { color: var(--muted); }
    .bottle-link { margin-top: 0.5rem; background: var(--accent); color: #fff; border: none; padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-family: var(--font-body); font-weight: 600; width: 100%; text-align: center; }
    .bottle-link:hover { opacity: 0.85; }

    /* Scoreboard */
    .scoreboard-section { padding: 2rem 0 1rem; }
    .scoreboard-list { display: flex; flex-direction: column; gap: 0.35rem; }
    .score-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; background: var(--surface); border-radius: 6px; font-size: 0.88rem; border: 1px solid transparent; transition: border-color 0.2s; }
    .score-row:hover { border-color: var(--border); }
    .score-row:first-child { border-color: var(--accent); background: var(--accent-dim); }
    .score-rank { font-weight: 700; color: var(--muted); width: 1.5rem; text-align: center; font-size: 0.8rem; }
    .score-type { font-size: 1rem; }
    .score-name { flex: 1; font-weight: 600; }
    .score-team { font-size: 0.75rem; color: var(--muted); }
    .score-pts { font-weight: 700; color: var(--accent); }
    .score-fuel { color: var(--muted); font-size: 0.82rem; }
    .btn-transfer { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; color: var(--muted); font-size: 0.85rem; padding: 0.25rem 0.5rem; cursor: pointer; transition: all 0.2s; }
    .btn-transfer:hover { border-color: var(--accent); color: var(--accent); }

    /* Transfer modal */
    .transfer-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg); border: 1px solid var(--border); border-radius: 16px; width: 90%; max-width: 420px; z-index: 10001; overflow: hidden; }
    .transfer-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); }
    .transfer-header h3 { font-family: var(--font-heading); font-size: 1.1rem; margin: 0; color: var(--fg); }
    .transfer-body { padding: 1.5rem; }
    .transfer-recipient { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; padding: 0.75rem; background: var(--surface); border-radius: 10px; }
    .transfer-avatar { font-size: 1.5rem; }
    .transfer-name { font-weight: 600; font-size: 0.95rem; color: var(--fg); }
    .transfer-team { font-size: 0.75rem; color: var(--muted); }
    .transfer-amount-section { margin-bottom: 1.25rem; }
    .transfer-label { display: block; font-size: 0.8rem; color: var(--muted); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .transfer-input-row { display: flex; align-items: baseline; gap: 0.5rem; border: 2px solid var(--border); border-radius: 10px; padding: 0.75rem 1rem; transition: border-color 0.2s; }
    .transfer-input-row:focus-within { border-color: var(--accent); }
    .transfer-input { background: none; border: none; color: var(--fg); font-family: var(--font-body); font-size: 1.5rem; font-weight: 700; width: 100%; outline: none; -moz-appearance: textfield; }
    .transfer-input::-webkit-inner-spin-button { -webkit-appearance: none; }
    .transfer-unit { font-size: 0.9rem; color: var(--muted); white-space: nowrap; }
    .transfer-meta { display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.75rem; color: var(--muted); }
    .transfer-note-section { margin-bottom: 1.25rem; }
    .transfer-note-input { width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem 0.75rem; color: var(--fg); font-family: var(--font-body); font-size: 0.85rem; outline: none; box-sizing: border-box; }
    .transfer-note-input:focus { border-color: var(--accent); }
    .transfer-preview { background: var(--surface); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem; }
    .transfer-arrow { text-align: center; color: var(--muted); font-size: 0.8rem; }
    .transfer-preview-row { display: flex; justify-content: space-between; padding: 0.35rem 0; font-size: 0.88rem; color: var(--fg); }
    .transfer-preview-amount { font-weight: 700; }
    .transfer-receive { color: #4ade80; }
    .transfer-fee-row { display: flex; justify-content: space-between; padding: 0.35rem 0; font-size: 0.82rem; color: var(--muted); border-top: 1px dashed var(--border); margin-top: 0.5rem; }
    .transfer-fee-amount { color: #ef4444; font-weight: 600; }
    .transfer-receive-final { color: #4ade80; font-weight: 700; }
    .transfer-btn { width: 100%; background: var(--accent); color: #fff; border: none; border-radius: 10px; padding: 0.85rem; font-size: 1rem; font-weight: 700; cursor: pointer; font-family: var(--font-body); transition: opacity 0.2s; }
    .transfer-btn:hover:not(:disabled) { opacity: 0.9; }
    .transfer-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .transfer-msg { font-size: 0.82rem; text-align: center; margin-bottom: 0.75rem; }
    .transfer-success { color: #4ade80; }
    .transfer-error { color: #ef4444; }

    /* Move modal */
    .move-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg); border: 1px solid var(--border); border-radius: 16px; width: 90%; max-width: 380px; z-index: 10001; overflow: hidden; }
    .move-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); }
    .move-header h3 { font-family: var(--font-heading); font-size: 1.05rem; margin: 0; color: var(--fg); }
    .move-body { padding: 1.25rem; }
    .move-target { text-align: center; padding: 0.75rem; background: var(--surface); border-radius: 8px; margin-bottom: 1rem; }
    .move-coords { font-family: monospace; font-size: 0.95rem; color: var(--accent); }
    .move-speed-section { margin-bottom: 1rem; }
    .move-label { display: block; font-size: 0.8rem; color: var(--muted); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .move-speeds { display: flex; gap: 0.5rem; }
    .move-speed-btn { flex: 1; background: var(--surface); border: 2px solid var(--border); border-radius: 8px; padding: 0.6rem 0.4rem; cursor: pointer; text-align: center; font-size: 0.85rem; color: var(--fg); font-family: var(--font-body); transition: all 0.2s; }
    .move-speed-btn.active { border-color: var(--accent); background: var(--accent-dim); }
    .move-speed-btn small { color: var(--muted); font-size: 0.75rem; }
    .move-cost-preview { background: var(--surface); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; }
    .move-cost-row { display: flex; justify-content: space-between; font-size: 0.82rem; padding: 0.2rem 0; color: var(--muted); }
    .move-cost-total { font-weight: 700; color: var(--fg); border-top: 1px solid var(--border); padding-top: 0.4rem; margin-top: 0.3rem; }
    .move-total-amount { color: var(--accent); font-size: 1.1rem; }
    .move-msg { font-size: 0.82rem; text-align: center; margin-bottom: 0.5rem; }
    .move-success { color: #4ade80; }
    .move-error { color: #ef4444; }
    .move-btn { width: 100%; background: var(--accent); color: #fff; border: none; border-radius: 10px; padding: 0.75rem; font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: var(--font-body); }
    .move-btn:disabled { opacity: 0.4; }

    /* Betting */
    .bets-section { padding: 2rem 0 1rem; }
    .bets-board { display: flex; flex-direction: column; gap: 1rem; }
    .bets-bottle-row { background: var(--surface); border-radius: 10px; padding: 1rem; border: 1px solid var(--border); }
    .bets-bottle-info { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
    .bets-bottle-icon { font-size: 1.2rem; }
    .bets-bottle-name { font-weight: 600; font-size: 0.9rem; color: var(--fg); }
    .bets-odds-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .bets-odds-btn { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 0.4rem 0.6rem; cursor: pointer; font-family: var(--font-body); font-size: 0.8rem; color: var(--fg); display: flex; align-items: center; gap: 0.4rem; transition: all 0.2s; }
    .bets-odds-btn:hover { border-color: var(--accent); }
    .bets-player-name { font-weight: 600; }
    .bets-player-dist { color: var(--muted); font-size: 0.75rem; }
    .bets-odds-val { color: var(--accent); font-weight: 700; }
    .bets-history { margin-top: 1.5rem; }
    .bets-history-title { font-size: 0.95rem; color: var(--fg); margin-bottom: 0.75rem; }
    .bets-history-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; font-size: 0.82rem; border-bottom: 1px solid var(--border); }
    .bets-history-status { font-size: 0.9rem; }
    .bets-won { color: #4ade80; }
    .bets-lost { color: #ef4444; }
    .bets-open { color: var(--muted); }
    .bets-history-detail { flex: 1; color: var(--muted); }
    .bets-history-amount { color: var(--fg); font-weight: 600; }
    .bet-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg); border: 1px solid var(--border); border-radius: 16px; width: 90%; max-width: 380px; z-index: 10001; overflow: hidden; }
    .bet-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); }
    .bet-header h3 { font-family: var(--font-heading); font-size: 1.05rem; margin: 0; color: var(--fg); }
    .bet-body { padding: 1.25rem; }
    .bet-target { text-align: center; padding: 0.75rem; background: var(--surface); border-radius: 8px; margin-bottom: 1rem; }
    .bet-bottle-label { display: block; font-size: 0.85rem; color: var(--muted); }
    .bet-on { display: block; font-size: 1rem; font-weight: 600; margin: 0.25rem 0; color: var(--fg); }
    .bet-odds-display { font-size: 1.5rem; font-weight: 700; color: var(--accent); }
    .bet-amount-section { margin-bottom: 1rem; }
    .bet-label { display: block; font-size: 0.8rem; color: var(--muted); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .bet-input-row { display: flex; align-items: baseline; gap: 0.5rem; border: 2px solid var(--border); border-radius: 10px; padding: 0.75rem 1rem; }
    .bet-input-row:focus-within { border-color: var(--accent); }
    .bet-input { background: none; border: none; color: var(--fg); font-size: 1.5rem; font-weight: 700; width: 100%; outline: none; font-family: var(--font-body); -moz-appearance: textfield; }
    .bet-input::-webkit-inner-spin-button { -webkit-appearance: none; }
    .bet-unit { color: var(--muted); font-size: 0.9rem; }
    .bet-preview { background: var(--surface); border-radius: 8px; padding: 0.75rem; margin-top: 0.75rem; }
    .bet-preview-row { display: flex; justify-content: space-between; font-size: 0.82rem; padding: 0.2rem 0; color: var(--muted); }
    .bet-win { color: #4ade80; font-weight: 700; }
    .bet-fee { color: #ef4444; }
    .bet-msg { font-size: 0.82rem; text-align: center; margin-bottom: 0.5rem; }
    .bet-success { color: #4ade80; }
    .bet-error { color: #ef4444; }
    .bet-btn { width: 100%; background: var(--accent); color: #fff; border: none; border-radius: 10px; padding: 0.75rem; font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: var(--font-body); }
    .bet-btn:disabled { opacity: 0.4; }

    /* Keywords */
    .keywords-section { padding: 2rem 0 1rem; }
    .keywords-desc { color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem; }
    .kw-teaser-actions { display: flex; justify-content: center; gap: 0.5rem; align-items: center; }
    .btn-info { background: var(--surface); border: 1px solid var(--border); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.9rem; transition: border-color 0.2s; }
    .btn-info:hover { border-color: var(--accent); }
    .kw-info-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: var(--bg); border: 1px solid var(--border); border-radius: 16px; width: 90%; max-width: 440px; z-index: 10001; overflow: hidden; }
    .kw-info-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); }
    .kw-info-header h3 { font-family: var(--font-heading); font-size: 1.1rem; margin: 0; color: var(--fg); }
    .kw-info-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .kw-info-item { display: flex; align-items: flex-start; gap: 0.75rem; }
    .kw-info-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 2px; }
    .kw-info-item p { margin: 0; font-size: 0.88rem; color: var(--muted); line-height: 1.5; }
    .kw-highlight p { color: var(--accent); font-weight: 600; }
    .kw-teaser { background: var(--accent-dim); border: 1px solid var(--border); border-radius: var(--radius, 12px); padding: 1.5rem; text-align: center; margin-bottom: 1rem; }
    .kw-teaser-text { color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem; line-height: 1.6; }
    .btn-teaser { display: inline-block; background: var(--ocean); color: #fff; border: none; border-radius: 8px; padding: 0.6rem 1.25rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; text-decoration: none; font-family: var(--font-body); transition: opacity 0.2s; }
    .btn-teaser:hover { opacity: 0.85; }
    .kw-pool-label { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .keywords-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .keyword-pill { background: var(--accent-dim); border: 1px solid var(--border); border-radius: 20px; padding: 0.35rem 0.75rem; font-size: 0.85rem; color: var(--fg); display: flex; align-items: center; gap: 0.4rem; }
    .kw-word { font-weight: 600; }
    .kw-badge { font-size: 0.72rem; font-weight: 700; color: var(--accent); }
    .kw-poison { margin-top: 1rem; }
    .kw-poison-pill { border-color: #f59e0b44; background: rgba(245,158,11,0.08); }
    .kw-poison-pill .kw-badge { color: #f59e0b; }
    .kw-recent { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border); }
    .match-row { display: flex; justify-content: space-between; align-items: center; padding: 0.35rem 0; font-size: 0.85rem; }
    .kw-match-info { color: var(--muted); font-size: 0.78rem; }
    .kw-author { font-size: 0.7rem; color: var(--muted); }

    /* Columns menu */
    .btn-columns { background: none; border: 1px solid var(--border); border-radius: 6px; padding: 0.35rem 0.75rem; color: var(--muted); cursor: pointer; font-size: 0.82rem; font-family: var(--font-body); transition: color 0.2s, border-color 0.2s; }
    .btn-columns:hover { color: var(--accent); border-color: var(--accent); }
    .columns-menu { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius, 12px); padding: 0.75rem; margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .col-toggle { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--fg); cursor: pointer; }
    .col-toggle input { accent-color: var(--accent); cursor: pointer; }

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
        .players-grid { grid-template-columns: 1fr; }
    }
</style>
