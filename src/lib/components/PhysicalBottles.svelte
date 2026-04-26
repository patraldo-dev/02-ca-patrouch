<script>
    import { onMount, onDestroy } from 'svelte';
    import { t } from '$lib/i18n';

    let { player, onCapture, data } = $props();

    let physicalBottles = $state([]);
    let playerPos = $state(null);
    let nearbyBottle = $state(null);
    let wasNearby = false;
    let capturing = $state(false);
    let capturedContent = $state(null);
    let locating = $state(false);
    let locateError = $state(null);
    let watching = $state(false);
    let watchId = null;
    let mapRef = null;
    let leafletMap = null;
    let L = null;
    let playerMarker = null;
    let captureRadiusCircle = null;

    const CAPTURE_RADIUS = 50; // meters

    onMount(async () => {
        if (!player) return;

        // Load physical bottles
        try {
            const res = await fetch('/api/bottlequest/physical');
            const json = await res.json();
            physicalBottles = json.bottles || [];
        } catch {}

        // Init Leaflet
        L = (await import('leaflet')).default;
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);

        leafletMap = L.map(mapRef, {
            center: [20.65, -105.23],
            zoom: 14,
            zoomControl: false,
            attributionControl: false
        });

        L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 18
        }).addTo(leafletMap);
        L.control.attribution({ prefix: false }).addAttribution('© OpenStreetMap © CartoDB').addTo(leafletMap);

        // Add physical bottle markers
        for (const bottle of physicalBottles) {
            const icon = L.divIcon({
                className: 'physical-bottle-marker',
                html: `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));animation:bottleBob 3s ease-in-out infinite;">🏴‍☠️</div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });
            const marker = L.marker([bottle.current_lat, bottle.current_lon], { icon }).addTo(leafletMap);
            const clueNum = bottle.id.includes('001') ? '1' : bottle.id.includes('002') ? '2' : bottle.id.includes('003') ? '3' : bottle.id.includes('004') ? '4' : '5';
            marker.bindPopup(`<div style="font-family:Inter,sans-serif;min-width:180px;color:#09090b"><strong>🏴‍☠️ Pista ${clueNum}</strong><br><span style="font-size:0.85em;color:#555">${bottle.title}</span></div>`);
            marker.bottleId = bottle.id;
        }

        // Fit bounds if bottles exist
        if (physicalBottles.length > 0) {
            const bounds = L.latLngBounds(physicalBottles.map(b => [b.current_lat, b.current_lon]));
            leafletMap.fitBounds(bounds.pad(0.3));
        }
    });

    function locateMe() {
        if (!navigator.geolocation) {
            locateError = 'Geolocation not supported';
            return;
        }
        locating = true;
        locateError = null;
        navigator.geolocation.getCurrentPosition(
            pos => {
                locating = false;
                playerPos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                addPlayerMarker();
                checkProximity();
                if (leafletMap) leafletMap.flyTo([playerPos.lat, playerPos.lon], 16, { duration: 1.2 });
                // Start watching
                if (!watching) startWatching();
            },
            err => {
                locating = false;
                locateError = err.message || 'Location denied';
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    function startWatching() {
        watching = true;
        watchId = navigator.geolocation.watchPosition(
            pos => {
                playerPos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                addPlayerMarker();
                checkProximity();
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 5000 }
        );
    }

    function addPlayerMarker() {
        if (!L || !leafletMap || !playerPos) return;
        if (playerMarker) {
            playerMarker.setLatLng([playerPos.lat, playerPos.lon]);
            return;
        }
        const icon = L.divIcon({
            className: 'player-gps-marker',
            html: `<div style="width:20px;height:20px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 0 rgba(59,130,246,0.5);animation:pulse 2s infinite;"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        playerMarker = L.marker([playerPos.lat, playerPos.lon], { icon, zIndexOffset: 1000 }).addTo(leafletMap);
    }

    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function checkProximity() {
        if (!playerPos) return;
        let closest = null;
        let closestDist = Infinity;
        for (const bottle of physicalBottles) {
            if (bottle.found_by) continue;
            const d = haversine(playerPos.lat, playerPos.lon, bottle.current_lat, bottle.current_lon);
            if (d < closestDist) { closestDist = d; closest = bottle; }
        }
        nearbyBottle = closestDist <= CAPTURE_RADIUS ? closest : null;

        // Vibrate when entering proximity
        if (nearbyBottle && !wasNearby) {
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
        wasNearby = !!nearbyBottle;

        // Update capture radius circle
        if (captureRadiusCircle) { leafletMap.removeLayer(captureRadiusCircle); captureRadiusCircle = null; }
        if (nearbyBottle && leafletMap) {
            captureRadiusCircle = L.circle([nearbyBottle.current_lat, nearbyBottle.current_lon], {
                radius: CAPTURE_RADIUS,
                color: '#3b82f6',
                fillColor: '#3b82f680',
                fillOpacity: 0.2,
                weight: 2,
                dashArray: '6 4'
            }).addTo(leafletMap);
        }
    }

    async function captureBottle() {
        if (!nearbyBottle || capturing) return;
        capturing = true;
        try {
            const res = await fetch('/api/bottlequest/physical', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bottle_id: nearbyBottle.id })
            });
            const result = await res.json();
            if (result.success) {
                capturedContent = { bottle: result.bottle, reward: result.reward };
                // Update local state
                physicalBottles = physicalBottles.map(b =>
                    b.id === nearbyBottle.id ? { ...b, found_by: result.bottle.found_by, found_at: result.bottle.found_at } : b
                );
                nearbyBottle = null;
                if (onCapture) onCapture(result);
            } else {
                capturedContent = { error: result.error || 'No se pudo capturar' };
            }
        } catch {
            capturedContent = { error: 'Error de red' };
        }
        capturing = false;
    }

    function closeCaptureModal() {
        capturedContent = null;
    }

    function showOnMap(bottle) {
        if (leafletMap) {
            leafletMap.flyTo([bottle.current_lat, bottle.current_lon], 17, { duration: 1 });
        }
    }

    onDestroy(() => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    });
</script>

<!-- Styles -->
<svelte:head>
    {@html `
    <style>
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
            70% { box-shadow: 0 0 0 15px rgba(59,130,246,0); }
            100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
        @keyframes bottleBob {
            0%, 100% { transform: translateY(0) rotate(-5deg); }
            50% { transform: translateY(-4px) rotate(5deg); }
        }
        @keyframes revealContent {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
    `}
</svelte:head>

<div class="physical-container">
    <!-- Locate button overlay -->
    <button class="locate-btn" onclick={locateMe} disabled={locating}>
        {locating ? '📡...' : '📍 Localízame'}
    </button>

    {#if locateError}
        <div class="locate-error">{locateError}</div>
    {/if}

    <!-- Map -->
    <div bind:this={mapRef} class="physical-map"></div>

    <!-- Bottle list sidebar -->
    {#if physicalBottles.length > 0}
        <div class="bottle-list">
            <h3>🏴‍☠️ Botellas Físicas — PV</h3>
            {#each physicalBottles as bottle, i}
                <button class="bottle-item" onclick={() => showOnMap(bottle)} class:found={bottle.found_by}>
                    <span class="bottle-num">{i + 1}</span>
                    <span class="bottle-info">
                        <strong>{bottle.title}</strong>
                        {#if bottle.found_by}
                            <span class="found-tag">✅ Capturada</span>
                        {:else}
                            <span class="available-tag">🔍 Disponible</span>
                        {/if}
                    </span>
                </button>
            {/each}
        </div>
    {/if}

    <!-- Capture prompt -->
    {#if nearbyBottle}
        <div class="capture-prompt" transition:fade>
            <div class="capture-prompt-inner">
                <span>🏴‍☠️ ¡Botella cerca!</span>
                <strong>{nearbyBottle.title}</strong>
                <button class="capture-btn" onclick={captureBottle} disabled={capturing}>
                    {capturing ? '🏴‍☠️ Capturando...' : '🏴‍☠️ ¡Capturar!'}
                </button>
            </div>
        </div>
    {/if}

    <!-- Capture result modal -->
    {#if capturedContent}
        <div class="capture-modal-overlay" onclick={closeCaptureModal}>
            <div class="capture-modal" onclick={(e) => e.stopPropagation()} style="animation: revealContent 0.5s ease-out;">
                {#if capturedContent.error}
                    <p>{capturedContent.error}</p>
                {:else}
                    <h2>🏴‍☠️ {capturedContent.bottle.title}</h2>
                    <pre class="clue-content">{capturedContent.bottle.content}</pre>
                    {#if capturedContent.reward}
                        <div class="reward">
                            ⛽ +{capturedContent.reward.fuel} Combustible · 🏆 +{capturedContent.reward.points} Puntos
                        </div>
                    {/if}
                {/if}
                <button class="close-btn" onclick={closeCaptureModal}>Cerrar</button>
            </div>
        </div>
    {/if}
</div>

<style>
    .physical-container { position: relative; }
    .physical-map { width: 100%; height: 500px; border-radius: 12px; border: 2px solid #c9a87c; }
    .locate-btn {
        position: absolute; top: 10px; left: 10px; z-index: 1000;
        background: #1c1917; color: #fff; border: 2px solid #c9a87c;
        padding: 8px 16px; border-radius: 8px; cursor: pointer;
        font-family: Inter, sans-serif; font-size: 0.85rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .locate-btn:hover { background: #c9a87c; color: #1c1917; }
    .locate-btn:disabled { opacity: 0.6; cursor: wait; }
    .locate-error {
        position: absolute; top: 50px; left: 10px; z-index: 1000;
        background: #fef2f2; color: #dc2626; padding: 6px 12px;
        border-radius: 6px; font-size: 0.8rem;
    }
    .bottle-list {
        margin-top: 16px; padding: 16px; background: #faf7f2;
        border-radius: 12px; border: 1px solid #e7e5e4;
    }
    .bottle-list h3 { margin: 0 0 12px; font-family: Playfair Display, serif; font-size: 1.1rem; }
    .bottle-item {
        display: flex; align-items: center; gap: 10px; padding: 8px 12px;
        width: 100%; border: 1px solid #e7e5e4; border-radius: 8px;
        background: #fff; cursor: pointer; text-align: left; margin-bottom: 6px;
        font-family: Inter, sans-serif;
    }
    .bottle-item:hover { border-color: #c9a87c; }
    .bottle-item.found { opacity: 0.6; }
    .bottle-num {
        background: #1c1917; color: #c9a87c; width: 28px; height: 28px;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 0.85rem; flex-shrink: 0;
    }
    .bottle-info { display: flex; flex-direction: column; }
    .bottle-info strong { font-size: 0.85rem; color: #09090b; }
    .found-tag, .available-tag { font-size: 0.75rem; }
    .capture-prompt {
        position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 1000;
    }
    .capture-prompt-inner {
        background: #1c1917; color: #fff; padding: 14px 24px; border-radius: 12px;
        text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        border: 2px solid #c9a87c; display: flex; flex-direction: column; gap: 6px;
    }
    .capture-btn {
        background: #c9a87c; color: #1c1917; border: none; padding: 10px 24px;
        border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 1rem;
    }
    .capture-btn:hover { background: #dbb896; }
    .capture-btn:disabled { opacity: 0.6; cursor: wait; }
    .capture-modal-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 2000;
        display: flex; align-items: center; justify-content: center; padding: 20px;
    }
    .capture-modal {
        background: #faf7f2; color: #09090b; padding: 32px; border-radius: 16px;
        max-width: 500px; width: 100%; max-height: 80vh; overflow-y: auto;
        border: 2px solid #c9a87c; box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    }
    .capture-modal h2 { text-align: center; margin: 0 0 16px; font-family: Playfair Display, serif; }
    .clue-content {
        white-space: pre-wrap; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;
        line-height: 1.5; background: #1c1917; color: #f0ebe3; padding: 16px;
        border-radius: 8px; margin: 0 0 16px; overflow-x: auto;
    }
    .reward {
        text-align: center; padding: 12px; background: #ecfdf5; border-radius: 8px;
        font-weight: 600; color: #166534; font-size: 0.95rem;
    }
    .close-btn {
        display: block; width: 100%; padding: 10px; background: #1c1917; color: #fff;
        border: none; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 12px;
    }
    .close-btn:hover { background: #44403c; }
</style>
