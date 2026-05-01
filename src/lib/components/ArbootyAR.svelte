<script>
    import { onMount, onDestroy } from 'svelte';
    import { haversineDistance, calculateBearing, relativeBearing, CAPTURE_RADIUS_M, GPS_ACCURACY_THRESHOLD } from '$lib/geo.js';

    let { bottles = [], onCapture, player } = $props();

    let videoEl;
    let stream = $state(null);
    let error = $state(null);

    let heading = $state(0);
    let headingAccuracy = $state(null);
    let userPos = $state(null);
    let gpsAccuracy = $state(null);
    let showAccuracyWarning = $state(false);

    let cameraActive = $state(false);
    let capturing = $state(null);

    // WebSocket
    let ws = $state(null);
    let nearbyPlayers = $state([]);
    let onlineCount = $state(0);
    let proximityEvents = $state([]);
    let locationInterval = null;
    const WS_URL = 'wss://booty-chat-worker.chef-tech.workers.dev/chat/ws';

    // Sort markers: nearest first, only show top 3
    let allMarkers = $derived(
        bottles.map(b => {
            if (!userPos || !b.current_lat || !b.current_lon) return { ...b, visible: false, dist: Infinity };
            const dist = haversineDistance(userPos.lat, userPos.lon, b.current_lat, b.current_lon);
            const bearing = calculateBearing(userPos.lat, userPos.lon, b.current_lat, b.current_lon);
            const rel = relativeBearing(heading, bearing);
            const fov = 60;
            return {
                ...b, dist, bearing, rel,
                xPercent: Math.round(50 + (rel / fov) * 100),
                visible: Math.abs(rel) < fov && !b.found_by,
                inRange: dist < CAPTURE_RADIUS_M,
            };
        })
    );

    let markers = $derived(
        allMarkers.filter(b => b.visible).sort((a, b) => a.dist - b.dist).slice(0, 3)
    );

    let nearest = $derived(markers[0] || null);
    let gpsReady = $derived(!showAccuracyWarning && gpsAccuracy !== null);

    // ── Camera ────────────────────────────────────────────────────────────

    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            if (videoEl) { videoEl.srcObject = stream; await videoEl.play(); }
            cameraActive = true;
        } catch (e) {
            error = `Cámara no disponible: ${e.message}`;
        }
    }

    function stopCamera() {
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        if (videoEl) videoEl.srcObject = null;
        cameraActive = false;
    }

    // ── Permissions ───────────────────────────────────────────────────────

    async function requestOrientationPermission() {
        if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
            try {
                const result = await DeviceOrientationEvent.requestPermission();
                if (result !== 'granted') { error = 'Permiso de orientación denegado.'; return false; }
            } catch (e) { error = `Error: ${e.message}`; return false; }
        }
        return true;
    }

    // ── Sensors ────────────────────────────────────────────────────────────

    function startOrientation() {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
    }

    function handleOrientation(e) {
        if (e.absolute && e.alpha !== null) {
            heading = (360 - e.alpha) % 360;
            headingAccuracy = e.webkitCompassAccuracy ?? null;
        } else if (e.webkitCompassHeading !== undefined) {
            heading = e.webkitCompassHeading;
            headingAccuracy = e.webkitCompassAccuracy;
        }
    }

    function startGPS() {
        navigator.geolocation.watchPosition(
            (pos) => {
                gpsAccuracy = Math.round(pos.coords.accuracy);
                showAccuracyWarning = pos.coords.accuracy > GPS_ACCURACY_THRESHOLD;
                userPos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            },
            (err) => { error = `GPS error: ${err.message}`; },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
    }

    // ── Capture ────────────────────────────────────────────────────────────

    async function captureBottle(bottle) {
        if (capturing || !userPos || !gpsReady) return;
        capturing = bottle.id;
        try {
            const res = await fetch('/api/bottlequest/physical', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bottle_id: bottle.id, lat: userPos.lat, lon: userPos.lon }),
            });
            const result = await res.json();
            if (result.success) { if (onCapture) onCapture(result); }
            else { alert(result.error || 'Error'); }
        } catch (e) { alert(`Error: ${e.message}`); }
        finally { capturing = null; }
    }

    // ── WebSocket ──────────────────────────────────────────────────────────

    function connectWS() {
        const username = player?.username || 'anonymous';
        const displayName = player?.display_name || username;
        try {
            ws = new WebSocket(`${WS_URL}?username=${encodeURIComponent(username)}&display_name=${encodeURIComponent(displayName)}`);
            ws.onopen = () => {
                locationInterval = setInterval(() => {
                    if (ws?.readyState === WebSocket.OPEN && userPos && gpsReady) {
                        ws.send(JSON.stringify({ type: 'location', lat: userPos.lat, lon: userPos.lon }));
                    }
                }, 5000);
            };
            ws.onmessage = (e) => { try { handleWSMessage(JSON.parse(e.data)); } catch {} };
            ws.onclose = () => { ws = null; };
            ws.onerror = () => { ws = null; };
        } catch (e) { console.warn('WS failed:', e.message); }
    }

    function handleWSMessage(msg) {
        if (msg.type === 'proximity') {
            proximityEvents = [...proximityEvents.slice(-4), { ...msg, id: crypto.randomUUID(), ts: Date.now() }];
            setTimeout(() => { proximityEvents = proximityEvents.filter(e => Date.now() - e.ts < 8000); }, 8000);
        }
        if (msg.type === 'online') { nearbyPlayers = (msg.players || []).filter(p => p.hasLocation); onlineCount = msg.count || 0; }
        if (msg.type === 'online_update') { onlineCount = msg.count || 0; }
    }

    function disconnectWS() {
        if (locationInterval) { clearInterval(locationInterval); locationInterval = null; }
        if (ws) { ws.close(); ws = null; }
        nearbyPlayers = []; onlineCount = 0; proximityEvents = [];
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────

    async function activate() {
        error = null;
        if (!(await requestOrientationPermission())) return;
        await startCamera();
        if (!cameraActive) return;
        startOrientation();
        startGPS();
        connectWS();
    }

    function deactivate() {
        disconnectWS();
        stopCamera();
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
        window.removeEventListener('deviceorientation', handleOrientation, true);
        showAccuracyWarning = false; gpsAccuracy = null; userPos = null;
    }

    onDestroy(deactivate);

    // ── Helpers ────────────────────────────────────────────────────────────

    function distLabel(m) {
        return m.dist < 1000 ? `${Math.round(m.dist)}m` : `${(m.dist / 1000).toFixed(1)}km`;
    }

    function isNearest(m) {
        return nearest && m.id === nearest.id;
    }
</script>

<div class="ar-root">
    <video bind:this={videoEl} autoplay playsinline muted class="ar-video"></video>

    {#if !cameraActive && !error}
        <div class="ar-overlay">
            <div class="ar-start">
                <div class="ar-icon">🏴‍☠️🔭</div>
                <p class="ar-title">Modo AR</p>
                <p class="ar-desc">Usa la cámara para encontrar botellas</p>
                <button class="start-btn" onclick={activate}>📸 Activar Cámara AR</button>
                <p class="ar-note">Requiere GPS + brújula + cámara trasera</p>
            </div>
        </div>
    {/if}

    {#if error}
        <div class="ar-overlay">
            <div class="ar-start">
                <span class="ar-error-text">⚠️ {error}</span>
                <button class="start-btn" onclick={activate}>Reintentar</button>
            </div>
        </div>
    {/if}

    {#if cameraActive}
        <!-- Compass -->
        <div class="ar-hud-top">
            <div class="compass-strip">
                {#each ['N','NE','E','SE','S','SO','O','NO','N'] as dir, i}
                    <span class="compass-dir" style="left: {((i * 45 - heading + 720) % 360) / 360 * 200 - 50}%">{dir}</span>
                {/each}
                <div class="compass-center-line"></div>
            </div>
            <div class="ar-status">
                <span class:warn={showAccuracyWarning} class:good={!showAccuracyWarning && gpsAccuracy !== null}>
                    📍 {gpsAccuracy !== null ? `±${gpsAccuracy}m` : 'GPS...'}
                </span>
                <span class:warn={headingAccuracy > 15}>🧭 {Math.round(heading)}°</span>
            </div>
        </div>

        <!-- Markers — max 3, nearest is highlighted -->
        {#each markers as m (m.id)}
            <div class="ar-marker {isNearest(m) ? 'nearest' : 'far'}" style="left: {m.xPercent}%; top: {isNearest(m) ? 28 : 38}%;">
                <svg viewBox="0 0 48 48" class="marker-svg {m.inRange ? 'pulse' : ''}">
                    {#if m.inRange}
                        <circle cx="24" cy="24" r="22" fill="rgba(239,68,68,0.2)" stroke="#ef4444" stroke-width="2.5"/>
                        <text x="24" y="30" text-anchor="middle" font-size="24">🍾</text>
                    {:else if isNearest(m)}
                        <circle cx="24" cy="24" r="22" fill="rgba(201,168,124,0.15)" stroke="#c9a87c" stroke-width="2.5"/>
                        <text x="24" y="30" text-anchor="middle" font-size="22">🏴‍☠️</text>
                    {:else}
                        <circle cx="24" cy="24" r="20" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
                        <text x="24" y="30" text-anchor="middle" font-size="20" opacity="0.7">🏴‍☠️</text>
                    {/if}
                </svg>
                <div class="marker-info {isNearest(m) ? 'info-nearest' : 'info-far'}">
                    <span class="marker-name">{m.title || 'Botella'}</span>
                    <span class="marker-dist">{distLabel(m)}</span>
                </div>
                {#if m.inRange}
                    <button class="capture-btn {gpsReady ? '' : 'disabled'}" disabled={!!capturing || !gpsReady} onclick={() => captureBottle(m)}>
                        {capturing === m.id ? '...' : gpsReady ? '¡Capturar!' : 'GPS...'}
                    </button>
                {/if}
            </div>
        {/each}

        {#if showAccuracyWarning}
            <div class="accuracy-warn">⚠️ GPS impreciso (±{gpsAccuracy}m) — cielo abierto</div>
        {/if}

        <div class="ar-hud-bottom">
            <span class="hud-badge">👥 {onlineCount}</span>
            {#if nearbyPlayers.length > 0}
                <span class="hud-badge hud-nearby">🎯 {nearbyPlayers.length} cerca</span>
            {/if}
        </div>

        {#each proximityEvents as evt (evt.id)}
            <div class="proximity-toast {evt.event === 'enter' ? 'enter' : 'leave'}">
                {evt.event === 'enter' ? '🟢' : '🔴'} {evt.message}
            </div>
        {/each}

        {#if markers.length === 0}
            <div class="no-bottles">Gira para buscar botellas 🧭</div>
        {/if}

        <button class="ar-close" onclick={deactivate}>✕</button>
    {/if}
</div>

<style>
    .ar-root {
        position: relative;
        width: 100%;
        height: 100svh;
        background: #000;
        overflow: hidden;
        border-radius: var(--radius);
    }

    .ar-video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 0;
    }

    .ar-overlay {
        position: absolute;
        inset: 0;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.88);
        backdrop-filter: blur(8px);
    }

    .ar-start {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        color: #fff;
        text-align: center;
        padding: 2rem;
    }

    .ar-icon { font-size: 3rem; }
    .ar-title { font-family: Playfair Display, serif; font-size: 1.5rem; margin: 0; }
    .ar-desc { color: rgba(255,255,255,0.7); font-size: 0.9rem; margin: 0; }
    .ar-note { color: rgba(255,255,255,0.4); font-size: 0.75rem; margin: 0; }
    .ar-error-text { color: #fbbf24; font-size: 0.9rem; }

    .start-btn {
        font-size: 1.1rem;
        padding: 0.9rem 2rem;
        border-radius: 9999px;
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.4);
        color: #fff;
        cursor: pointer;
    }

    /* HUD */
    .ar-hud-top {
        position: absolute;
        top: 0; left: 0; right: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.5rem;
        background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
        z-index: 10;
    }

    .compass-strip {
        position: relative;
        height: 28px;
        overflow: hidden;
    }

    .compass-dir {
        position: absolute;
        transform: translateX(-50%);
        color: rgba(255,255,255,0.6);
        font-size: 11px;
        font-weight: 700;
    }

    .compass-center-line {
        position: absolute;
        left: 50%;
        top: 0; bottom: 0;
        width: 2px;
        background: var(--accent, #c9a87c);
        transform: translateX(-50%);
    }

    .ar-status {
        display: flex;
        gap: 1rem;
        font-size: 12px;
        color: rgba(255,255,255,0.9);
        font-weight: 500;
    }
    .ar-status .warn { color: #fbbf24; }
    .ar-status .good { color: #22c55e; }

    /* Markers */
    .ar-marker {
        position: absolute;
        width: 110px;
        margin-left: -55px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        pointer-events: none;
        will-change: left;
        z-index: 5;
        -webkit-font-smoothing: antialiased;
    }

    .marker-svg {
        width: 56px;
        height: 56px;
        filter: drop-shadow(0 2px 8px rgba(0,0,0,0.8));
    }

    .ar-marker.far .marker-svg { width: 40px; height: 40px; }
    .ar-marker.far { opacity: 0.55; top: 42% !important; }

    .marker-svg.pulse {
        animation: pulse 1.2s ease-in-out infinite;
    }

    .marker-info {
        border-radius: 8px;
        padding: 4px 10px;
        text-align: center;
        min-width: 70px;
    }

    .info-nearest {
        background: rgba(0,0,0,0.9);
        border: 1.5px solid rgba(201,168,124,0.5);
    }

    .info-far {
        background: rgba(0,0,0,0.7);
    }

    .marker-name {
        display: block;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.2;
        text-shadow: 0 1px 4px rgba(0,0,0,1);
    }

    .marker-dist {
        display: block;
        color: #c9a87c;
        font-size: 11px;
        font-weight: 700;
        text-shadow: 0 1px 3px rgba(0,0,0,1);
    }

    .capture-btn {
        pointer-events: all;
        background: #ef4444;
        color: #fff;
        border: none;
        border-radius: 9999px;
        padding: 6px 16px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(239,68,68,0.5);
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }

    .capture-btn:disabled, .capture-btn.disabled {
        opacity: 0.4;
        background: #555;
        box-shadow: none;
    }

    .accuracy-warn {
        position: absolute;
        bottom: 5rem;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(245,158,11,0.95);
        color: #000;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 12px;
        z-index: 10;
        white-space: nowrap;
    }

    .no-bottles {
        position: absolute;
        bottom: 35%;
        width: 100%;
        text-align: center;
        color: rgba(255,255,255,0.5);
        font-size: 15px;
        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
    }

    .ar-close {
        position: absolute;
        top: 52px;
        right: 8px;
        z-index: 20;
        background: rgba(0,0,0,0.5);
        color: #fff;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        font-size: 1.1rem;
        cursor: pointer;
    }

    .ar-hud-bottom {
        position: absolute;
        bottom: 1rem;
        left: 0; right: 0;
        display: flex;
        justify-content: center;
        gap: 0.75rem;
        z-index: 10;
    }

    .hud-badge {
        background: rgba(0,0,0,0.65);
        color: rgba(255,255,255,0.9);
        padding: 4px 12px;
        border-radius: 99px;
        font-size: 12px;
        font-weight: 500;
    }
    .hud-nearby { color: #22c55e; }

    .proximity-toast {
        position: absolute;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.85);
        color: #fff;
        padding: 8px 16px;
        border-radius: 10px;
        font-size: 13px;
        z-index: 15;
        animation: slideIn 0.3s ease-out;
        white-space: nowrap;
    }
    .proximity-toast.enter { border-left: 3px solid #22c55e; }
    .proximity-toast.leave { border-left: 3px solid #ef4444; }

    @keyframes slideIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
    }
</style>
