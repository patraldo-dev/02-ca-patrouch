<script>
    import { onMount } from 'svelte';
    import { t } from '$lib/i18n';
    import { browser } from '$app/environment';

    let letter = $state('');
    let senderName = $state('');
    let launchPoint = $state('bahia-banderas');
    let destination = $state('hawaii');
    let simulating = $state(false);
    let result = $state(null);
    let mapInstance = $state(null);
    let mapEl = $state(null);
    let trajectoryLine = null;

    const LAUNCH_POINTS = [
        { id: 'bahia-banderas', label: 'Bahía de Banderas, MX', lat: 20.65, lon: -105.35 },
        { id: 'ensenada', label: 'Ensenada, MX', lat: 31.87, lon: -116.60 },
        { id: 'santa-monica', label: 'Santa Monica, CA', lat: 34.01, lon: -118.50 },
        { id: 'cabo-san-lucas', label: 'Cabo San Lucas, MX', lat: 22.89, lon: -109.92 },
    ];

    const DESTINATIONS = [
        { id: 'hawaii', label: 'Hawaiʻi', lat: 21.31, lon: -157.86 },
        { id: 'galapagos', label: 'Galápagos', lat: -0.74, lon: -90.31 },
        { id: 'tahiti', label: 'Tahití', lat: -17.53, lon: -149.57 },
        { id: 'tokyo', label: 'Tokyo', lat: 35.68, lon: 139.69 },
    ];

    async function simulate() {
        simulating = true;
        try {
            const res = await fetch(`/sejours/cartas-al-mar?launch=${launchPoint}&dest=${destination}`);
            result = await res.json();
            if (mapInstance) drawTrajectory();
        } catch (e) {
            console.error(e);
        }
        simulating = false;
    }

    function drawTrajectory() {
        if (!mapInstance || !result) return;
        const L = leafletLib;
        if (trajectoryLine) mapInstance.removeLayer(trajectoryLine);

        const coords = result.trajectory.map(p => [p.lat, p.lon]);
        trajectoryLine = L.polyline(coords, {
            color: '#c9a87c', weight: 2, opacity: 0.6, dashArray: '6, 4'
        }).addTo(mapInstance);

        // Start marker
        L.circleMarker([result.launch.lat, result.launch.lon], {
            radius: 8, fillColor: '#22c55e', fillOpacity: 0.9, color: '#fff', weight: 2
        }).addTo(mapInstance).bindPopup(`🌊 ${result.launch.name}`);

        // End marker
        L.circleMarker([result.destination.lat, result.destination.lon], {
            radius: 8, fillColor: '#f59e0b', fillOpacity: 0.9, color: '#fff', weight: 2
        }).addTo(mapInstance).bindPopup(`🏝️ ${result.destination.name}`);

        mapInstance.fitBounds(trajectoryLine.getBounds().pad(0.1));
    }

    let leafletLib = null;

    onMount(async () => {
        if (!browser) return;
        const L = (await import('leaflet')).default;
        leafletLib = L;
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);

        mapInstance = L.map(mapEl, {
            center: [20, -130],
            zoom: 3,
            attributionControl: false,
            minZoom: 2,
            maxZoom: 10,
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 10
        }).addTo(mapInstance);

        // Auto-simulate on load
        simulate();
    });
</script>

<svelte:head>
    <title>Cartas al Mar — Travesías | patrouch.ca</title>
</svelte:head>

<div class="travesia-page">
    <div class="travesia-hero">
        <h1>💌 Cartas al Mar</h1>
        <p class="travesia-subtitle">Escribe una carta, lánzala al océano, y sigue su travesía por las corrientes del Pacífico</p>
    </div>

    <div class="travesia-layout">
        <div class="travesia-form">
            <div class="form-group">
                <label>🌊 Punto de lanzamiento</label>
                <select bind:value={launchPoint}>
                    {#each LAUNCH_POINTS as pt}
                    <option value={pt.id}>{pt.label}</option>
                    {/each}
                </select>
            </div>

            <div class="form-group">
                <label>🏝️ Destino</label>
                <select bind:value={destination}>
                    {#each DESTINATIONS as dest}
                    <option value={dest.id}>{dest.label}</option>
                    {/each}
                </select>
            </div>

            <div class="form-group">
                <label>✍️ Tu carta</label>
                <textarea bind:value={letter} placeholder="Mi amor, lanzo esta botella al Pacífico..." rows="4"></textarea>
            </div>

            <div class="form-group">
                <label>👤 Tu nombre (opcional)</label>
                <input type="text" bind:value={senderName} placeholder="Anónimo" />
            </div>

            <button class="btn-launch" onclick={simulate} disabled={simulating}>
                {simulating ? '🌊 Simulando corrientes...' : '🍾 Lanzar al mar'}
            </button>
        </div>

        <div class="travesia-map" bind:this={mapEl}></div>
    </div>

    {#if result}
    <div class="travesia-result">
        <div class="result-stats">
            <div class="stat">
                <span class="stat-value">{result.totalKm} km</span>
                <span class="stat-label">Distancia</span>
            </div>
            <div class="stat">
                <span class="stat-value">{result.estimatedWeeks} semanas</span>
                <span class="stat-label">Travesía estimada</span>
            </div>
            <div class="stat">
                <span class="stat-value">{result.trajectory.length} posiciones</span>
                <span class="stat-label">Puntos de drift</span>
            </div>
            <div class="stat">
                <span class="stat-value">{result.arrived ? '✅' : '🌊'}</span>
                <span class="stat-label">{result.arrived ? '¡Llegó!' : 'En camino'}</span>
            </div>
        </div>
    </div>
    {/if}
</div>

<style>
    .travesia-page {
        max-width: 1100px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }
    .travesia-hero {
        text-align: center;
        margin-bottom: 2rem;
    }
    .travesia-hero h1 {
        font-family: 'Playfair Display', serif;
        font-size: 2.5rem;
        color: var(--accent, #c9a87c);
        margin-bottom: 0.5rem;
    }
    .travesia-subtitle {
        color: var(--muted, #a1a1aa);
        font-size: 1.1rem;
    }
    .travesia-layout {
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: 2rem;
        margin-bottom: 2rem;
    }
    @media (max-width: 768px) {
        .travesia-layout { grid-template-columns: 1fr; }
    }
    .travesia-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }
    .form-group label {
        font-size: 0.85rem;
        color: var(--muted, #a1a1aa);
        font-weight: 600;
    }
    .form-group select, .form-group input, .form-group textarea {
        background: var(--surface, #141417);
        border: 1px solid var(--border, #333);
        border-radius: 8px;
        padding: 0.6rem 0.8rem;
        color: var(--text, #e4e4e7);
        font-size: 0.9rem;
    }
    .form-group textarea {
        resize: vertical;
        min-height: 80px;
    }
    .btn-launch {
        background: var(--accent, #c9a87c);
        color: var(--bg, #09090b);
        border: none;
        border-radius: 8px;
        padding: 0.8rem;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        margin-top: 0.5rem;
    }
    .btn-launch:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .travesia-map {
        height: 400px;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid var(--border, #333);
    }
    .travesia-result {
        background: var(--surface, #141417);
        border-radius: 12px;
        padding: 1.5rem;
    }
    .result-stats {
        display: flex;
        justify-content: space-around;
        text-align: center;
    }
    .stat-value {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--accent, #c9a87c);
    }
    .stat-label {
        font-size: 0.8rem;
        color: var(--muted, #a1a1aa);
    }
</style>
