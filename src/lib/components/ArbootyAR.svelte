<script>
    let { player, bottles = [] } = $props();

    // Camera
    let videoEl;
    let stream = $state(null);
    let arActive = $state(false);

    // Sensors
    let heading = $state(0);       // compass heading in degrees
    let myLat = $state(null);
    let myLon = $state(null);
    let accuracy = $state(null);
    let watching = $state(false);

    // Computed bottle bearings
    let bottleMarkers = $derived(
        bottles.map(b => {
            if (!myLat || !myLon || !b.current_lat || !b.current_lon) return null;
            const bearing = calcBearing(myLat, myLon, b.current_lat, b.current_lon);
            const distance = haversine(myLat, myLon, b.current_lat, b.current_lon);
            const relAngle = ((bearing - heading) % 360 + 540) % 360 - 180; // -180 to 180
            return { ...b, bearing, distance, relAngle, captured: !!b.found_by };
        }).filter(Boolean)
    );

    async function startAR() {
        try {
            // Camera
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            if (videoEl) videoEl.srcObject = stream;
            arActive = true;

            // Geolocation
            if ('geolocation' in navigator) {
                watching = true;
                navigator.geolocation.watchPosition(
                    pos => { myLat = pos.coords.latitude; myLon = pos.coords.longitude; accuracy = pos.coords.accuracy; },
                    () => {},
                    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
                );
            }

            // Device orientation (compass)
            if ('DeviceOrientationEvent' in window) {
                // iOS 13+ requires permission
                if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                    try { await DeviceOrientationEvent.requestPermission(); } catch (e) { console.warn('Compass permission denied'); }
                }
                window.addEventListener('deviceorientation', handleOrientation);
            }
        } catch (e) {
            console.error('AR start error:', e);
            arActive = false;
        }
    }

    function stopAR() {
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        if (videoEl) videoEl.srcObject = null;
        arActive = false;
        watching = false;
        window.removeEventListener('deviceorientation', handleOrientation);
    }

    function handleOrientation(e) {
        // webkitCompassHeading for iOS, alpha for Android (absolute)
        if (e.webkitCompassHeading !== undefined) {
            heading = e.webkitCompassHeading;
        } else if (e.absolute && e.alpha !== null) {
            heading = (360 - e.alpha) % 360;
        }
    }

    function calcBearing(lat1, lon1, lat2, lon2) {
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
        const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
                  Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
        return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
    }

    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000; // meters
    }

    function markerStyle(relAngle, distance, captured) {
        if (Math.abs(relAngle) > 60) return 'display:none;';
        const left = 50 + (relAngle / 60) * 45; // 5% to 95%
        const opacity = captured ? 0.4 : Math.max(0.4, 1 - distance / 2000);
        const scale = distance < 50 ? 1.3 : distance < 200 ? 1.1 : 0.9;
        const yOffset = Math.abs(relAngle) > 40 ? 65 : Math.abs(relAngle) > 20 ? 55 : 40;
        return `left:${left}%;top:${yOffset}%;opacity:${opacity};transform:scale(${scale});`;
    }

    $effect(() => { return () => stopAR(); });
</script>

{#if !arActive}
    <div class="ar-start-screen">
        <div class="ar-icon">🏴‍☠️🔭</div>
        <p class="ar-title">Modo AR</p>
        <p class="ar-desc">Usa la cámara para encontrar botellas cerca de ti</p>
        <button class="ar-btn" onclick={startAR}>
            📷 Activar Cámara AR
        </button>
        <p class="ar-note">Requiere GPS + cámara trasera</p>
    </div>
{:else}
    <div class="ar-container">
        <video bind:this={videoEl} autoplay playsinline muted class="ar-video"></video>

        <!-- Compass HUD -->
        <div class="ar-hud">
            <div class="compass-bar">
                <div class="compass-needle" style="transform:translateX(-50%) rotate({heading}deg)">▲</div>
                <div class="compass-labels">
                    <span style="position:absolute;left:5%">N</span>
                    <span style="position:absolute;left:25%">NE</span>
                    <span style="position:absolute;left:45%">E</span>
                    <span style="position:absolute;left:65%">SE</span>
                    <span style="position:absolute;left:85%">S</span>
                </div>
            </div>
            <div class="hud-info">
                <span class="hud-gps">📍 {accuracy ? (accuracy < 30 ? 'GPS Bueno' : accuracy < 100 ? 'GPS Medio' : 'GPS Bajo') : 'Buscando GPS...'}</span>
            </div>
        </div>

        <!-- Bottle markers -->
        {#each bottleMarkers as bottle (bottle.id)}
            <div class="ar-marker" style={markerStyle(bottle.relAngle, bottle.distance, bottle.captured)}>
                <div class="marker-pin {bottle.captured ? 'captured' : bottle.distance < 50 ? 'near' : ''}">
                    {#if bottle.captured}
                        ✅
                    {:else if bottle.distance < 50}
                        🍾
                    {:else}
                        🏴‍☠️
                    {/if}
                </div>
                <div class="marker-label">
                    {bottle.title || 'Botella'}
                    <span class="marker-dist">{bottle.distance < 1000 ? Math.round(bottle.distance) + 'm' : (bottle.distance / 1000).toFixed(1) + 'km'}</span>
                </div>
                {#if bottle.distance < 50 && !bottle.captured}
                    <div class="marker-action">¡Capturar!</div>
                {/if}
            </div>
        {/each}

        <!-- Close button -->
        <button class="ar-close" onclick={stopAR}>✕</button>
    </div>
{/if}

<style>
    .ar-start-screen {
        text-align: center;
        padding: 2rem 1rem;
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        margin-bottom: 2rem;
    }
    .ar-icon { font-size: 3rem; margin-bottom: 1rem; }
    .ar-title { font-family: Playfair Display, serif; font-size: 1.5rem; color: var(--text); margin-bottom: 0.5rem; }
    .ar-desc { color: var(--text-dim); font-size: 0.9rem; margin-bottom: 1.5rem; }
    .ar-btn {
        padding: 1rem 2.5rem;
        background: var(--accent);
        color: var(--bg);
        font-weight: 700;
        font-size: 1.1rem;
        border: none;
        border-radius: var(--radius);
        cursor: pointer;
        transition: opacity 0.2s;
    }
    .ar-btn:hover { opacity: 0.85; }
    .ar-note { color: var(--text-dim); font-size: 0.75rem; margin-top: 1rem; }

    .ar-container {
        position: relative;
        width: 100%;
        height: 70vh;
        min-height: 400px;
        border-radius: var(--radius);
        overflow: hidden;
        background: #000;
        margin-bottom: 2rem;
    }
    .ar-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .ar-hud {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10;
        pointer-events: none;
    }
    .compass-bar {
        position: relative;
        height: 36px;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        border-bottom: 1px solid rgba(201, 168, 124, 0.3);
    }
    .compass-needle {
        position: absolute;
        top: 0;
        left: 50%;
        width: 2px;
        height: 100%;
        color: var(--accent);
        font-size: 18px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        transform-origin: bottom center;
    }
    .compass-labels {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        transform: translateY(-50%);
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.7rem;
        font-weight: 600;
        text-align: center;
    }
    .hud-info {
        display: flex;
        justify-content: center;
        padding: 4px 0;
    }
    .hud-gps {
        background: rgba(0, 0, 0, 0.6);
        padding: 2px 10px;
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.7rem;
    }

    .ar-marker {
        position: absolute;
        transform: translateX(-50%);
        text-align: center;
        z-index: 5;
        pointer-events: none;
        transition: left 0.3s ease-out, opacity 0.3s;
    }
    .marker-pin {
        font-size: 2rem;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
        animation: markerFloat 2s ease-in-out infinite;
    }
    .marker-pin.near { animation: markerPulse 1s ease-in-out infinite; }
    .marker-pin.captured { animation: none; }
    .marker-label {
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        color: #fff;
        padding: 3px 8px;
        border-radius: 8px;
        font-size: 0.7rem;
        white-space: nowrap;
        margin-top: 2px;
    }
    .marker-dist {
        color: var(--accent);
        font-weight: 600;
        margin-left: 4px;
    }
    .marker-action {
        background: var(--accent);
        color: var(--bg);
        font-weight: 700;
        font-size: 0.8rem;
        padding: 4px 12px;
        border-radius: 12px;
        margin-top: 4px;
        animation: markerPulse 1s ease-in-out infinite;
    }

    .ar-close {
        position: absolute;
        top: 44px;
        right: 8px;
        z-index: 20;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        font-size: 1.1rem;
        cursor: pointer;
        backdrop-filter: blur(4px);
    }

    @keyframes markerFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
    }
    @keyframes markerPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
    }
</style>
