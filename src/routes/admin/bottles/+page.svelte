<script>
    import { onMount, onDestroy } from 'svelte';
    import { page } from '$app/stores';

    let { data } = $props();

    let bottles = $state(JSON.parse(JSON.stringify(data.bottles)));
    let mapRef = null;
    let leafletMap = null;
    let L = null;
    let markers = {};
    let saving = $state({});

    onMount(async () => {
        L = (await import('leaflet')).default;
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);

        await tick();
        initMap();
    });

    onDestroy(() => {
        if (leafletMap) leafletMap.remove();
    });

    function initMap() {
        const bounds = [];
        leafletMap = L.map(mapRef, {
            center: [20.65, -105.23],
            zoom: 14,
            zoomControl: false,
            attributionControl: false
        });

        L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 18
        }).addTo(leafletMap);

        for (const bottle of bottles) {
            const isLaunched = bottle.status === 'launched';
            const color = isLaunched ? '#22c55e' : '#ef4444';
            const icon = L.divIcon({
                className: 'bottle-admin-marker',
                html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.5);">🏴</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            const marker = L.marker([bottle.current_lat, bottle.current_lon], {
                icon,
                draggable: true
            }).addTo(leafletMap);

            marker.bindPopup(`<b>${bottle.title}</b><br>Status: ${bottle.status}`);

            marker.on('dragend', () => {
                const pos = marker.getLatLng();
                const b = bottles.find(b => b.id === bottle.id);
                if (b) {
                    b.current_lat = parseFloat(pos.lat.toFixed(7));
                    b.current_lon = parseFloat(pos.lng.toFixed(7));
                    bottles = [...bottles];
                }
            });

            markers[bottle.id] = marker;
            bounds.push([bottle.current_lat, bottle.current_lon]);
        }

        if (bounds.length > 0) {
            leafletMap.fitBounds(L.latLngBounds(bounds).pad(0.3));
        }
    }

    async function saveBottle(bottle) {
        saving[bottle.id] = true;
        try {
            const res = await fetch('/api/admin/bottles', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: bottle.id,
                    launch_lat: bottle.launch_lat,
                    launch_lon: bottle.launch_lon,
                    current_lat: bottle.current_lat,
                    current_lon: bottle.current_lon
                })
            });
            if (res.ok) {
                // Update marker position
                if (markers[bottle.id]) {
                    markers[bottle.id].setLatLng([bottle.current_lat, bottle.current_lon]);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            saving[bottle.id] = false;
            saving = { ...saving };
        }
    }

    function formatDate(ts) {
        if (!ts) return '—';
        return new Date(ts * 1000).toLocaleString();
    }

    function shortId(id) {
        return id.slice(0, 8);
    }
</script>

<svelte:head>
    <title>Admin — Bottles</title>
</svelte:head>

<div class="bottles-page">
    <h1>🏴‍☠️ Bottle Management</h1>
    <p class="subtitle">{bottles.length} physical bottles</p>

    <div class="table-section">
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Current Lat</th>
                        <th>Current Lon</th>
                        <th>Launch Lat</th>
                        <th>Launch Lon</th>
                        <th>Found By</th>
                        <th>Found At</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {#each bottles as bottle (bottle.id)}
                        <tr>
                            <td class="mono" title={bottle.id}>{shortId(bottle.id)}</td>
                            <td>{bottle.title}</td>
                            <td>
                                <span class="badge" class:launched={bottle.status === 'launched'} class:found={bottle.status === 'found'}>
                                    {bottle.status}
                                </span>
                            </td>
                            <td>
                                <input
                                    type="number"
                                    step="0.0000001"
                                    bind:value={bottle.current_lat}
                                    class="coord-input"
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    step="0.0000001"
                                    bind:value={bottle.current_lon}
                                    class="coord-input"
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    step="0.0000001"
                                    bind:value={bottle.launch_lat}
                                    class="coord-input"
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    step="0.0000001"
                                    bind:value={bottle.launch_lon}
                                    class="coord-input"
                                />
                            </td>
                            <td class="found-by">{bottle.found_by || '—'}</td>
                            <td class="date">{formatDate(bottle.found_at)}</td>
                            <td>
                                <button
                                    class="save-btn"
                                    onclick={() => saveBottle(bottle)}
                                    disabled={saving[bottle.id]}
                                >
                                    {saving[bottle.id] ? '...' : '💾'}
                                </button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>

    <div class="map-section">
        <div bind:this={mapRef} class="map-container"></div>
    </div>
</div>

<style>
    .bottles-page {
        padding: 1rem;
        max-width: 1400px;
    }

    h1 {
        color: #e2e8f0;
        margin-bottom: 0.25rem;
        font-size: 1.5rem;
    }

    .subtitle {
        color: #64748b;
        margin-bottom: 1.5rem;
        font-size: 0.875rem;
    }

    .table-section {
        margin-bottom: 1.5rem;
    }

    .table-wrap {
        overflow-x: auto;
        border-radius: 8px;
        border: 1px solid #1e293b;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.8rem;
    }

    th {
        background: var(--surface, #141417);
        color: #94a3b8;
        padding: 0.75rem 0.5rem;
        text-align: left;
        white-space: nowrap;
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.7rem;
        letter-spacing: 0.05em;
    }

    td {
        padding: 0.5rem;
        border-top: 1px solid #1e293b;
        color: #cbd5e1;
        white-space: nowrap;
    }

    .mono {
        font-family: monospace;
        font-size: 0.75rem;
        color: #64748b;
    }

    .coord-input {
        width: 110px;
        background: #09090b;
        border: 1px solid #334155;
        color: #e2e8f0;
        padding: 0.3rem 0.4rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-family: monospace;
    }

    .coord-input:focus {
        outline: none;
        border-color: var(--accent, #c9a87c);
    }

    .badge {
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
    }

    .launched {
        background: #064e3b;
        color: #6ee7b7;
    }

    .found {
        background: #7f1d1d;
        color: #fca5a5;
    }

    .found-by {
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .date {
        font-size: 0.7rem;
        color: #64748b;
    }

    .save-btn {
        background: none;
        border: 1px solid #334155;
        color: #94a3b8;
        padding: 0.3rem 0.5rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85rem;
    }

    .save-btn:hover {
        border-color: var(--accent, #c9a87c);
        color: var(--accent, #c9a87c);
    }

    .save-btn:disabled {
        opacity: 0.5;
        cursor: wait;
    }

    .map-section {
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #1e293b;
    }

    .map-container {
        height: 500px;
        width: 100%;
    }

    @media (max-width: 768px) {
        .bottles-page {
            padding: 0.5rem;
        }

        .map-container {
            height: 350px;
        }

        table {
            font-size: 0.7rem;
        }

        .coord-input {
            width: 85px;
        }
    }
</style>
