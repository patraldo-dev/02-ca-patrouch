<script>
    import { onMount, onDestroy } from 'svelte';
    import { haversineDistance, calculateBearing, relativeBearing, CAPTURE_RADIUS_M, GPS_ACCURACY_THRESHOLD } from '$lib/geo.js';

    // Props — botellas vienen del server load, NO se fetchean aquí
    let { bottles = [], onCapture } = $props();

    // State
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

    // Computed markers
    let markers = $derived(
        bottles.map(b => {
            if (!userPos || !b.current_lat || !b.current_lon) return { ...b, visible: false };
            const dist = haversineDistance(userPos.lat, userPos.lon, b.current_lat, b.current_lon);
            const bearing = calculateBearing(userPos.lat, userPos.lon, b.current_lat, b.current_lon);
            const rel = relativeBearing(heading, bearing);
            const fov = 60;
            const xPercent = 50 + (rel / fov) * 100;
            return {
                ...b,
                dist,
                bearing,
                rel,
                xPercent,
                visible: Math.abs(rel) < fov && !b.found_by,
                inRange: dist < CAPTURE_RADIUS_M,
                opacity: Math.min(1, Math.max(0.2, 1 - dist / 300)),
            };
        })
    );

    let nearestInRange = $derived(markers.find(m => m.inRange && !m.found_by) ?? null);
    let gpsReady = $derived(!showAccuracyWarning && gpsAccuracy !== null);

    // ── Permissions ─────────────────────────────────────────────────────────

    async function requestOrientationPermission() {
        if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
            try {
                const result = await DeviceOrientationEvent.requestPermission();
                if (result !== 'granted') {
                    error = 'Se necesita permiso de orientación para la brújula AR.';
                    return false;
                }
            } catch (e) {
                error = `Permiso de orientación fallido: ${e.message}`;
                return false;
            }
        }
        return true;
    }

    async function startCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            });
            videoEl.srcObject = stream;
            await videoEl.play();
            cameraActive = true;
        } catch (e) {
            error = `Cámara no disponible: ${e.message}`;
        }
    }

    function startOrientation() {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
    }

    function startGPS() {
        navigator.geolocation.watchPosition(
            (pos) => {
                gpsAccuracy = Math.round(pos.coords.accuracy);
                if (pos.coords.accuracy > GPS_ACCURACY_THRESHOLD) {
                    showAccuracyWarning = true;
                } else {
                    showAccuracyWarning = false;
                }
                userPos = { lat: pos.coords.latitude, lon: pos.coords.longitude };
            },
            (err) => { error = `GPS error: ${err.message}`; },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
    }

    // ── Sensors ────────────────────────────────────────────────────────────

    function handleOrientation(e) {
        if (e.absolute && e.alpha !== null) {
            heading = (360 - e.alpha) % 360;
            headingAccuracy = e.webkitCompassAccuracy ?? null;
        } else if (e.webkitCompassHeading !== undefined) {
            heading = e.webkitCompassHeading;
            headingAccuracy = e.webkitCompassAccuracy;
        }
    }

    // ── Capture ────────────────────────────────────────────────────────────

    async function captureBottle(bottle) {
        if (capturing || !userPos || !gpsReady) return;
        capturing = bottle.id;
        try {
            const res = await fetch('/api/bottlequest/physical', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bottle_id: bottle.id,
                    lat: userPos.lat,
                    lon: userPos.lon,
                }),
            });
            const result = await res.json();
            if (result.success) {
                if (onCapture) onCapture(result);
            } else if (result.error?.includes('Too far') || result.error?.includes('lejos')) {
                alert(`${result.error} (${Math.round(result.distance)}m)`);
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (e) {
            alert(`Error de red: ${e.message}`);
        } finally {
            capturing = null;
        }
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────

    async function activate() {
        error = null;
        const orientOk = await requestOrientationPermission();
        if (!orientOk) return;
        await startCamera();
        if (!cameraActive) return;
        startOrientation();
        startGPS();
    }

    function deactivate() {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            stream = null;
        }
        if (videoEl) videoEl.srcObject = null;
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
        window.removeEventListener('deviceorientation', handleOrientation, true);
        cameraActive = false;
        showAccuracyWarning = false;
        gpsAccuracy = null;
        userPos = null;
    }

    onDestroy(deactivate);
</script>

<!-- AR Overlay -->
<div class="ar-root">
    {#if error}
        <div class="ar-start">
            <span class="ar-error-text">⚠️ {error}</span>
            <button class="start-btn" onclick={activate}>Reintentar</button>
        </div>
    {:else if !cameraActive}
        <div class="ar-start">
            <div class="ar-icon">🏴‍☠️🔭</div>
            <p class="ar-title">Modo AR</p>
            <p class="ar-desc">Usa la cámara para encontrar botellas cerca de ti</p>
            <button class="start-btn" onclick={activate}>📸 Activar Cámara AR</button>
            <p class="ar-note">Requiere GPS + brújula + cámara trasera</p>
        </div>
    {:else}
        <!-- Camera feed -->
        <video bind:this={videoEl} autoplay playsinline muted class="ar-video"></video>

        <!-- HUD top bar -->
        <div class="ar-hud-top">
            <!-- Compass strip — cardinals scroll with heading -->
            <div class="compass-strip">
                {#each ['N','NE','E','SE','S','SO','O','NO','N'] as dir, i}
                    <span
                        class="compass-dir"
                        style="left: {((i * 45 - heading + 720) % 360) / 360 * 200 - 50}%"
                    >{dir}</span>
                {/each}
                <div class="compass-center-line"></div>
            </div>

            <!-- Status badges -->
            <div class="ar-status">
                <span class:warn={showAccuracyWarning} class:good={!showAccuracyWarning && gpsAccuracy !== null}>
                    📍 {gpsAccuracy !== null ? `±${gpsAccuracy}m` : 'GPS...'}
                </span>
                <span class:warn={headingAccuracy > 15}>
                    🧭 {Math.round(heading)}°
                    {headingAccuracy !== null ? `±${headingAccuracy}°` : ''}
                </span>
            </div>
        </div>

        <!-- Bottle markers -->
        {#each markers as m (m.id)}
            {#if m.visible}
                <div
                    class="bottle-marker"
                    class:in-range={m.inRange}
                    style="left: {m.xPercent}%; opacity: {m.opacity};"
                >
                    <div class="bottle-icon">🍾</div>
                    <div class="bottle-dist">
                        {m.dist < 1000 ? `${Math.round(m.dist)}m` : `${(m.dist / 1000).toFixed(1)}km`}
                    </div>
                    {#if m.inRange}
                        <button
                            class="capture-btn {gpsReady ? '' : 'disabled'}"
                            disabled={!!capturing || !gpsReady}
                            onclick={() => captureBottle(m)}
                        >
                            {capturing === m.id ? '...' : gpsReady ? '¡Capturar!' : 'GPS impreciso'}
                        </button>
                    {/if}
                </div>
            {/if}
        {/each}

        <!-- Accuracy warning -->
        {#if showAccuracyWarning}
            <div class="accuracy-warn">
                GPS poco preciso (±{gpsAccuracy}m) — muévete a cielo abierto
            </div>
        {/if}

        <!-- No bottles in view -->
        {#if markers.every(m => !m.visible)}
            <div class="no-bottles">Gira para buscar botellas 🧭</div>
        {/if}

        <!-- Close button -->
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
    }

    .ar-start {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
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
        backdrop-filter: blur(8px);
        cursor: pointer;
        transition: background 0.2s;
    }
    .start-btn:hover { background: rgba(255,255,255,0.25); }

    /* HUD */
    .ar-hud-top {
        position: absolute;
        top: 0; left: 0; right: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.5rem;
        background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
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
        font-weight: 600;
        letter-spacing: 0.05em;
        top: 0;
    }

    .compass-center-line {
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--accent, #c9a87c);
        transform: translateX(-50%);
    }

    .ar-status {
        display: flex;
        gap: 1rem;
        font-size: 11px;
        color: rgba(255,255,255,0.85);
    }

    .ar-status .warn { color: #fbbf24; }
    .ar-status .good { color: #22c55e; }

    /* Bottle markers */
    .bottle-marker {
        position: absolute;
        top: 35%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        pointer-events: none;
        transition: opacity 0.3s;
        z-index: 5;
    }

    .bottle-marker.in-range .bottle-icon {
        animation: pulse 1s ease-in-out infinite;
        filter: drop-shadow(0 0 8px #ef4444);
    }

    .bottle-icon { font-size: 2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)); }

    .bottle-dist {
        background: rgba(0,0,0,0.55);
        color: #fff;
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 99px;
        backdrop-filter: blur(4px);
    }

    .capture-btn {
        pointer-events: all;
        background: #ef4444;
        color: #fff;
        border: none;
        border-radius: 9999px;
        padding: 6px 14px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 4px;
    }

    .capture-btn:disabled,
    .capture-btn.disabled {
        opacity: 0.5;
        background: #666;
        animation: none;
    }

    .accuracy-warn {
        position: absolute;
        bottom: 5rem;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(245,158,11,0.9);
        color: #000;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 12px;
        text-align: center;
        white-space: nowrap;
        z-index: 10;
    }

    .no-bottles {
        position: absolute;
        bottom: 40%;
        width: 100%;
        text-align: center;
        color: rgba(255,255,255,0.5);
        font-size: 14px;
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
        backdrop-filter: blur(4px);
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }
</style>
