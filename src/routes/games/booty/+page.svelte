<script>
    import { onMount } from 'svelte';
    import { t } from '$lib/i18n';
    import { get } from 'svelte/store';
    import { browser } from '$app/environment';
    import { invalidateAll } from '$app/navigation';
    import BootyChat from '$lib/components/BootyChat.svelte';

    let { data } = $props();

    // Form state
    let showForm = $state(false);
    let formTitle = $state('');
    let formContent = $state('');
    let formContentType = $state('short_story');
    let saving = $state(false);
    let launching = $state(null);
    let launchPort = $state('port-pv');
    let showLaunchModal = $state(false);
    let toastMsg = $state('');
    function showToast(msg) { toastMsg = msg; setTimeout(() => toastMsg = '', 3000); }
    let narratorEvent = $state(null);
    let showTransferModal = $state(false);
    let transferTarget = $state(null);
    let transferAmount = $state('');
    let transferNote = $state('');
    let transferSending = $state(false);
    let fuelRequests = $state([]);
    let requestAmount = $state('');
    let requestMsg = $state('');
    let requestingFuel = $state(false);
    let marketListings = $state([]);
    let wordIndex = $state([]);
    let listPrice = $state('');
    let listingWritingId = $state(null);
    let showBetModal = $state(false);
    let betBottle = $state(null);
    let betPlayer = $state(null);
    let betAmount = $state('');

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
                showToast(get(t)('bottles.saved'));
                loadMyBottles();
            }
        } catch {}
        saving = false;
    }

    async function launchBottle(bottleId) {
        launching = bottleId;
        const port = ports.find(p => p.id === launchPort) || ports[0];
        try {
            const res = await fetch('/api/bottles/' + bottleId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'launched', launch_lat: port.lat, launch_lon: port.lon })
            });
            if (res.ok) {
                showLaunchModal = false;
                showToast(get(t)('bottles.launched'));
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
                showToast(get(t)('bottles.opened'));
                invalidateAll();
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

    function formatBeans(total) {
        total = total || 0;
        const licorice = Math.floor(total / 1000000);
        const r1 = total % 1000000;
        const cherry = Math.floor(r1 / 10000);
        const r2 = r1 % 10000;
        const lime = Math.floor(r2 / 100);
        const lemon = r2 % 100;
        let parts = [];
        if (licorice > 0) parts.push(`⚫${licorice}`);
        if (cherry > 0) parts.push(`🔴${cherry}`);
        if (lime > 0) parts.push(`🟢${lime}`);
        if (lemon > 0 || parts.length === 0) parts.push(`🟡${lemon}`);
        return parts.join(' ');
    }

    function formatSolarTime(lon) {
        if (lon == null) return '';
        const now = new Date();
        const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
        const solarHours = (utcHours + lon / 15 + 24) % 24;
        const h = Math.floor(solarHours);
        const m = Math.floor((solarHours - h) * 60);
        const icon = (solarHours >= 6 && solarHours < 18) ? '☀️' : '🌙';
        return `${icon} ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
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
    let isFullscreen = $state(false);
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            mapEl.requestFullscreen().then(() => isFullscreen = true).catch(() => {});
        } else {
            document.exitFullscreen().then(() => isFullscreen = false);
        }
    }
    onMount(() => {
        document.addEventListener('fullscreenchange', () => { isFullscreen = !!document.fullscreenElement; });
    });
    let mapInstance = $state(null);

    // Haversine
    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

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
        // Player markers — spread overlapping positions in a circle
        const playerPts = [];
        const posGroups = {};
        for (const player of (data.players || [])) {
            const key = `${player.lat},${player.lon}`;
            if (!posGroups[key]) posGroups[key] = [];
            posGroups[key].push(player);
        }
        for (const [key, group] of Object.entries(posGroups)) {
            const count = group.length;
            for (let i = 0; i < count; i++) {
                const player = group[i];
                let lat = player.lat, lon = player.lon;
                if (count > 1) {
                    const angle = (2 * Math.PI * i) / count;
                    const radius = 0.003 * count;
                    lat = lat + radius * Math.cos(angle);
                    lon = lon + radius * Math.sin(angle);
                }
                playerPts.push([lat, lon]);
                const emoji = player.type === 'ai' ? '🤖' : '🧭';
                const zIndexOffset = count > 1 ? i : 0;
                const icon = L.divIcon({
                    className: 'player-marker',
                    html: `<div style="background:${player.team_color || '#c9a87c'};color:#fff;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);position:relative;z-index:${400 + zIndexOffset}">${emoji}</div>`,
                    iconSize: [30, 30], iconAnchor: [15, 15]
                });
                const pm = L.marker([lat, lon], { icon, zIndexOffset }).addTo(mapInstance);
                pm.bindPopup(`<div style="color:#09090b;font-family:Inter,sans-serif"><strong>${player.display_name || player.username}</strong><br><span style="color:#555;font-size:0.85em"><b>${player.team_name || ''}</b><br>📍 ${player.port_name || ''}</span></div>`);
                pm.bindTooltip(player.display_name || player.username, {
                    permanent: true, direction: 'top', offset: [0, -14], className: 'player-label'
                });
            }
        }

        // Booty Bots on map
        const botPts = [];
        for (const bot of (data.bots || [])) {
            if (!bot.lat || !bot.lon) continue;
            botPts.push([bot.lat, bot.lon]);
            const isHijacked = bot.hijacked_by && new Date(bot.hijacked_until) > new Date();
            const icon = L.divIcon({
                className: 'bot-marker',
                html: `<div style="background:${isHijacked ? '#c9a87c' : '#ef4444'};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px dashed ${isHijacked ? '#fff' : '#ff6b6b'};box-shadow:0 0 12px rgba(239,68,68,0.5);animation:botPulse 2s infinite">☠️</div>`,
                iconSize: [32, 32], iconAnchor: [16, 16]
            });
            const bm = L.marker([bot.lat, bot.lon], { icon }).addTo(mapInstance);
            bm.bindPopup(`<div style="color:#09090b;font-family:Inter,sans-serif"><strong>${bot.name}</strong>${isHijacked ? '<br><span style="color:#c9a87c">⚓ Captured by ' + bot.hijacked_by + '</span>' : '<br><span style="color:#ef4444">🏴‍☠️ Booty Bot</span>'}<br><span style="color:#555;font-size:0.85em">🍷 ${bot.beans} beans · 🍾 ${bot.captured_bottles} captures</span></div>`);
            bm.bindTooltip(bot.name, {
                permanent: true, direction: 'top', offset: [0, -16], className: 'bot-label'
            });
        }

        const allPts = [...launchedBottles.map(b => [b.current_lat, b.current_lon]), ...playerPts, ...botPts];
        if (allPts.length) {
            mapInstance.fitBounds(L.latLngBounds(allPts).pad(0.3));
        }
    });

    let moveTarget = $state(null); // { lat, lon }
    let moveSpeed = $state('sail');
    let moveLoading = $state(false);
    let chatInput = $state('');
    let chatLoading = $state(false);
    let chatHistory = $state([]);
    let chatMessagesEl = $state(null);
    let pendingMove = $state(null);

    // Locale-aware narrator text
    let narratorTitle = $derived(narratorEvent ? (() => { const loc = data.serverLocale || 'es'; if (loc === 'es' && narratorEvent.title_es) return narratorEvent.title_es; if (loc === 'fr' && narratorEvent.title_fr) return narratorEvent.title_fr; return narratorEvent.title; })() : '');
    let narratorText = $derived(narratorEvent ? (() => { const loc = data.serverLocale || 'es'; if (loc === 'es' && narratorEvent.narrative_es) return narratorEvent.narrative_es; if (loc === 'fr' && narratorEvent.narrative_fr) return narratorEvent.narrative_fr; return narratorEvent.narrative; })() : '');

    let narratorSpeaking = $state(false);
    let currentAudio = $state(null);
    async function speakNarrator(text) {
        if (narratorSpeaking) return;
        narratorSpeaking = true;
        try {
            const res = await fetch('/api/tts', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.slice(0, 500), provider: 'cf' })
            });
            const d = await res.json();
            if (d.audio) {
                const audio = new Audio('data:audio/mp3;base64,' + d.audio);
                currentAudio = audio;
                audio.onended = () => { narratorSpeaking = false; currentAudio = null; };
                audio.play();
            } else if (d.url) {
                const audio = new Audio(d.url);
                currentAudio = audio;
                audio.onended = () => { narratorSpeaking = false; currentAudio = null; };
                audio.play();
            } else { narratorSpeaking = false; }
        } catch { narratorSpeaking = false; }
    }
    function stopNarrator() {
        if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; }
        narratorSpeaking = false;
    }

    let voiceListening = $state(false);
    let voiceRecognition = $state(null);
    function toggleVoiceCommand() {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            showToast('Voice not supported'); return;
        }
        if (voiceListening && voiceRecognition) { voiceRecognition.stop(); voiceListening = false; return; }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        voiceRecognition = new SR();
        voiceRecognition.lang = 'es';
        voiceRecognition.continuous = false;
        voiceRecognition.interimResults = false;
        voiceRecognition.onresult = (e) => {
            const text = e.results[0][0].transcript;
            chatInput = text;
            voiceListening = false;
            sendChatCommand();
        };
        voiceRecognition.onerror = (e) => { voiceListening = false; showToast('❌ Voice error: ' + (e.error || 'unknown')); };
        voiceRecognition.onend = () => voiceListening = false;
        voiceRecognition.start();
        voiceListening = true;
        showToast('🎙️ Listening...');
    }

    async function sendChatCommand() {
        const msg = chatInput.trim();
        if (!msg || chatLoading) return;
        chatLoading = true;
        chatHistory = [...chatHistory, { role: 'user', text: msg }];
        chatInput = '';
        try {
            const res = await fetch('/api/bottlequest/chat-command', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            });
            const d = await res.json();
            const reply = d.reply || (d.error ? '⚠️ ' + d.error : 'No response');
            chatHistory = [...chatHistory, { role: 'bot', text: reply }];
            if (d.action === 'move' && d.target_lat && d.target_lon) {
                pendingMove = d;
            }
        } catch { chatHistory = [...chatHistory, { role: 'bot', text: '.Connection lost at sea...' }]; }
        chatLoading = false;
        // Scroll to bottom
        if (chatMessagesEl) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    async function confirmChatMove(speed) {
        if (!pendingMove) return;
        moveLoading = true;
        try {
            const res = await fetch('/api/bottlequest/move', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_lat: pendingMove.target_lat, target_lon: pendingMove.target_lon, speed })
            });
            const d = await res.json();
            if (d.error) { showToast(d.error); chatHistory = [...chatHistory, { role: 'bot', text: '⚠️ ' + d.error }]; }
            else {
                showToast(d.message || `Moved!`);
                chatHistory = [...chatHistory, { role: 'bot', text: `✅ ${d.message || 'Moved successfully!'}` }];
                pendingMove = null;
                await invalidateAll();
            }
        } catch { showToast('Move failed'); }
        moveLoading = false;
    }

    // Click-to-move on map
    $effect(() => {
        if (!mapInstance || !data.player) return;
        mapInstance.on('click', (e) => {
            if (!data.player) return;
            moveTarget = { lat: parseFloat(e.latlng.lat.toFixed(5)), lon: parseFloat(e.latlng.lng.toFixed(5)) };
        });
    });

    async function doMove() {
        if (!moveTarget || moveLoading) return;
        moveLoading = true;
        try {
            const res = await fetch('/api/bottlequest/move', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_lat: moveTarget.lat, target_lon: moveTarget.lon, speed: moveSpeed })
            });
            const d = await res.json();
            if (d.error) { showToast(d.error); }
            else { showToast(d.message || `Moved! -${d.fuel_cost} 🫘`); moveTarget = null; await invalidateAll(); }
        } catch { showToast('Move failed'); }
        moveLoading = false;
    }

    let checkedIn = $state(false);
    let streakCount = $state(0);
    let checkinLoading = $state(false);
    let showJoinModal = $state(false);
    let joinPort = $state('port-pv');
    let joinAccepted = $state(false);
    let joining = $state(false);

    const ports = [
        { id: 'port-vancouver', name: 'Vancouver, BC', lat: 49.28, lon: -123.12 },
        { id: 'port-victoria', name: 'Victoria, BC', lat: 48.43, lon: -123.37 },
        { id: 'port-seattle', name: 'Seattle, WA', lat: 47.61, lon: -122.33 },
        { id: 'port-portland', name: 'Portland, OR', lat: 45.52, lon: -122.68 },
        { id: 'port-sanfrancisco', name: 'San Francisco, CA', lat: 37.77, lon: -122.42 },
        { id: 'port-monterey', name: 'Monterey, CA', lat: 36.60, lon: -121.89 },
        { id: 'port-carmel', name: 'Carmel, CA', lat: 36.55, lon: -121.92 },
        { id: 'port-santabarbara', name: 'Santa Barbara, CA', lat: 34.42, lon: -119.70 },
        { id: 'port-longbeach', name: 'Long Beach, CA', lat: 33.76, lon: -118.19 },
        { id: 'port-santamonica', name: 'Santa Monica, CA', lat: 34.01, lon: -118.50 },
        { id: 'port-sandiego', name: 'San Diego, CA', lat: 32.72, lon: -117.17 },
        { id: 'port-cabo', name: 'Cabo San Lucas, MX', lat: 22.89, lon: -109.92 },
        { id: 'port-mazatlan', name: 'Mazatlán, MX', lat: 23.21, lon: -106.41 },
        { id: 'port-pv', name: 'Puerto Vallarta, MX', lat: 20.70, lon: -105.30 },
        { id: 'port-manzanillo', name: 'Manzanillo, MX', lat: 19.05, lon: -104.32 },
        { id: 'port-acapulco', name: 'Acapulco, MX', lat: 16.85, lon: -99.90 },
        { id: 'port-huatulco', name: 'Huatulco, MX', lat: 15.77, lon: -96.13 },
        { id: 'port-honolulu', name: 'Honolulu, HI', lat: 21.31, lon: -157.86 },
        { id: 'port-papeete', name: 'Papeete, Tahiti', lat: -17.53, lon: -149.57 },
        { id: 'port-galapagos', name: 'Puerto Ayora, EC', lat: -0.74, lon: -90.31 },
        { id: 'port-valparaiso', name: 'Valparaíso, CL', lat: -33.05, lon: -71.62 },
        { id: 'port-lima', name: 'Callao, Lima, PE', lat: -12.05, lon: -77.15 }
    ];

    async function doJoin() {
        if (!joinAccepted || joining) return;
        joining = true;
        try {
            const res = await fetch('/api/bottlequest/join', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port_id: joinPort })
            });
            const d = await res.json();
            if (d.success) {
                showJoinModal = false;
                showToast('Joined the Crusade!');
                await invalidateAll();
            } else {
                showToast(d.error || 'Join failed');
            }
        } catch {}
        joining = false;
    }

    async function loadCheckin() {
        try {
            const res = await fetch('/api/bottlequest/checkin', { credentials: 'include' });
            const d = await res.json();
            checkedIn = d.checkedIn;
            streakCount = d.streak || 0;
        } catch {}
    }

    async function placeBet() {
        if (!betBottle || !betPlayer || !betAmount) return;
        try {
            const res = await fetch('/api/bottlequest/bets', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bottle_id: betBottle.id, bet_on_player_id: betPlayer.id, amount: parseInt(betAmount) })
            });
            const d = await res.json();
            showToast(d.success ? `Bet placed! Potential: ${d.potential_win || ''}` : d.error);
            showBetModal = false;
            betBottle = null;
            betAmount = '';
            await invalidateAll();
        } catch { showToast('Bet failed'); }
    }

    async function buyListing(listingId) {
        try {
            const res = await fetch('/api/bottlequest/marketplace', {
                method: 'PATCH', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listing_id: listingId })
            });
            const d = await res.json();
            showToast(d.success ? d.message : d.error);
            if (d.success) await invalidateAll();
        } catch { showToast('Purchase failed'); }
    }

    async function requestFuel() {
        if (!requestAmount || requestingFuel) return;
        requestingFuel = true;
        try {
            const res = await fetch('/api/bottlequest/fuel-request', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: parseInt(requestAmount), message: requestMsg })
            });
            const d = await res.json();
            showToast(d.success ? 'Request posted!' : d.error);
            if (d.success) { requestAmount = ''; requestMsg = ''; await invalidateAll(); }
        } catch {
            showToast('Request failed');
        }
        requestingFuel = false;
    }

    async function fulfillRequest(reqId) {
        try {
            const res = await fetch('/api/bottlequest/fuel-request', {
                method: 'PATCH', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: reqId })
            });
            const d = await res.json();
            showToast(d.success ? 'Fuel sent!' : d.error);
            if (d.success) await invalidateAll();
        } catch { showToast('Failed'); }
    }

    async function doTransfer() {
        if (!transferTarget || !transferAmount || transferSending) return;
        transferSending = true;
        try {
            const res = await fetch('/api/bottlequest/transfer', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to_player_id: transferTarget.id, amount: parseInt(transferAmount), note: transferNote })
            });
            const d = await res.json();
            if (d.error) { showToast(d.error); } else { showToast(d.message); }
            showTransferModal = false;
            transferTarget = null;
            transferAmount = '';
            transferNote = '';
            await invalidateAll();
        } catch { showToast('Transfer failed'); }
        transferSending = false;
    }

    async function doCheckin() {
        if (checkedIn || checkinLoading) return;
        checkinLoading = true;
        try {
            const res = await fetch('/api/bottlequest/checkin', { method: 'POST', credentials: 'include' });
            const d = await res.json();
            if (d.success) {
                checkedIn = true;
                streakCount = d.streak || streakCount + 1;
                showToast(d.message || '+10 🫘');
            }
        } catch {}
        checkinLoading = false;
    }

    onMount(async () => {
        if (browser) {
            loadCheckin();
            loadMyBottles();
            try {
                const [narrRes, reqRes, mktRes] = await Promise.all([
                    fetch('/api/narrator'),
                    fetch('/api/bottlequest/fuel-request'),
                    fetch('/api/bottlequest/marketplace')
                ]);
                const [narrD, reqD, mktD] = await Promise.all([narrRes.json(), reqRes.json(), mktRes.json()]);
                if (narrD.events?.length) narratorEvent = narrD.events[0];
                fuelRequests = reqD.requests || [];
                marketListings = mktD.listings || [];
                wordIndex = mktD.wordIndex || [];
            } catch {}
        }
    });
</script>

<svelte:head>
    <title>{$t('games.find_the_bottle')} — Patrouch</title>
</svelte:head>

<!-- Market Ticker Tape -->
<div class="ticker-tape" role="status" aria-label="Market prices">
    <div class="ticker-content">
        <span class="ticker-item">
            🫘 BRENT <span class="ticker-value">{data.market?.brent_price?.toFixed(2) || '73.00'}</span>
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
            🚢 <span class="ticker-value">{data.market?.cost_per_km?.toFixed(2) || '0.73'}</span> beans/km
        </span>
        <span class="ticker-divider">│</span>
        <span class="ticker-item">
            🤖 FEE <span class="ticker-value">{data.market?.fed_rate?.toFixed(2) || '5.25'}%</span>
        </span>
        {#if data.odds?.length && data.odds[0]?.odds?.length}
            <span class="ticker-divider">│</span>
            <span class="ticker-item">
                🎲 <span class="ticker-value">{data.odds[0].title}</span>
                {#each data.odds[0].odds.slice(0, 2) as o}
                    <span class="ticker-odds">{o.player.display_name || o.player.username} {o.odds}×</span>
                {/each}
            </span>
        {/if}
    </div>
</div>

{#if data.player}
    <BootyChat username={data.player.username} displayName={data.player.display_name} />
{/if}

<section class="bottles-page">
    <h1 class="page-title">🍾 Booty <span class="title-accent">Battle</span></h1>
    <p class="page-subtitle">{$t('games.find_the_bottle_desc')}</p>

    {#if toastMsg}
        <div class="toast" class:toast-visible={toastMsg}>{toastMsg}</div>
    {/if}

    <!-- Stats -->
    <div class="stats-bar">
        <div class="stats-row">
            <div class="stat-item">
                <span class="stat-num">{totalLaunched}</span>
                <span class="stat-label">{$t('bottles.total_launched')}</span>
            </div>
            <div class="stat-item stat-divider">
                <span class="stat-num">{totalBeached}</span>
                <span class="stat-label">{$t('bottles.total_beached')}</span>
            </div>
        </div>
        <div class="stats-row">
            <div class="stat-item">
                <span class="stat-num">{totalFound}</span>
                <span class="stat-label">{$t('bottles.total_found')}</span>
            </div>
            <div class="stat-item stat-divider">
                <span class="stat-num">{data.playersInPursuit || 0}</span>
                <span class="stat-label">{$t('bottles.players_in_pursuit')}</span>
            </div>
        </div>
        <div class="stats-row stats-row-center">
            <button class="stat-checkin" class:stat-checked={checkedIn} onclick={doCheckin} disabled={checkedIn || checkinLoading}>
                <span class="stat-num">{streakCount > 0 ? '🟡' : '✋'}</span>
                <span class="stat-label">{checkedIn ? '✓' : 'Check in'}</span>
            </button>
        </div>
        <div class="stats-row stats-row-center">
            {#if data.user && !data.myPlayer}
                <button class="stat-register" onclick={() => showJoinModal = true}>→ {$t('booty.register')}</button>
            {:else if data.user}
                <span class="stat-register stat-registered">✓ {$t('booty.registered')}</span>
            {:else}
                <a href="/signup" class="stat-register">→ {$t('bottles.register')}</a>
            {/if}
        </div>
    </div>

    <!-- El Narrador -->
    {#if narratorEvent}
    <div class="narrator-banner">
        <div class="narrator-header">
            <span class="narrator-icon">📜</span>
            <span class="narrator-label">{$t('booty.narrator_label')}</span>
        </div>
        <h3 class="narrator-title">{narratorTitle}</h3>
        <p class="narrator-text">{narratorText}</p>
        {#if narratorEvent.event_type !== 'flavor'}
            <div class="narrator-tag">⚡ {narratorEvent.event_type}</div>
        {/if}
        {#if data.user}
        <button class="narrator-speak {narratorSpeaking ? 'narrator-playing' : ''}" onclick={narratorSpeaking ? stopNarrator : () => speakNarrator(narratorTitle + '. ' + narratorText)} title={narratorSpeaking ? '⏹ Stop' : $t('booty.narrator_speak')}>{narratorSpeaking ? '⏹' : '🔊'}</button>
        {/if}
    </div>
    {/if}

    <!-- Bean Requests -->
    {#if data.myPlayer}
    <div class="section">
        <h2>🆘 Bean Requests</h2>
        {#if data.myPlayer}
            <div class="fuel-request-form">
                <div class="request-row">
                    <input type="number" bind:value={requestAmount} min="1" max="50" placeholder="Amount (1-50)" class="transfer-input" style="flex:1" />
                    <input type="text" bind:value={requestMsg} maxlength="140" placeholder="Why do you need beans?" class="transfer-input" style="flex:2" />
                    <button class="btn-transfer" onclick={requestFuel} disabled={requestingFuel}>{requestingFuel ? '...' : 'Request 🫘'}</button>
                </div>
                <p class="transfer-limit">Max 1 request/day · Albot Camus may reward the desperate</p>
            </div>
        {/if}
        {#if fuelRequests.length}
            <div class="requests-list">
                {#each fuelRequests as req}
                    <div class="request-card">
                        <div class="request-info">
                            <strong>{req.display_name || req.username}</strong>
                            <span class="request-port">📍 {req.port_name || '?'}</span>
                            <span class="request-amount">{req.type === 'ai' ? '🤖' : '👤'} requesting 🫘 {req.amount}</span>
                            {#if req.message}<span class="request-msg">"{req.message}"</span>{/if}
                        </div>
                        {#if data.myPlayer && req.player_id !== data.myPlayer.id}
                            <button class="btn-fulfill" onclick={() => fulfillRequest(req.id)}>Give 🫘</button>
                        {/if}
                    </div>
                {/each}
            </div>
        {:else}
            <p class="no-requests">No open requests</p>
        {/if}
    </div>
    {/if}

    <!-- Marketplace -->
    <div class="section">
        <h2>🏪 Agora Marketplace</h2>
        {#if wordIndex.length}
            <div class="word-index">
                <span class="word-index-label">📈 Word Index this month:</span>
                {#each wordIndex.slice(0, 10) as w}
                    <span class="word-pill">{w.word} <span class="word-pts">{w.total_points}</span></span>
                {/each}
            </div>
        {/if}
        {#if marketListings.length}
            <div class="listings-grid">
                {#each marketListings as listing}
                    <div class="listing-card">
                        <div class="listing-header">
                            <span class="listing-title">📖 {listing.title || 'Untitled'}</span>
                            <span class="listing-price" >🫘 {listing.price}</span>
                        </div>
                        <div class="listing-meta">by {listing.seller_name || listing.author_name} · 📍 {listing.seller_port || '?'}</div>
                        <div class="listing-excerpt">{listing.excerpt || '...'}</div>
                        {#if listing.resale_count > 0}<div class="listing-resale">🔄 Resold {listing.resale_count}x · 10% royalty to author</div>{/if}
                        {#if data.myPlayer && listing.seller_player_id !== data.myPlayer.id}
                            <button class="btn-buy" onclick={() => buyListing(listing.id)}>Buy for 🫘 {listing.price}</button>
                        {/if}
                    </div>
                {/each}
            </div>
        {:else}
            <p class="no-requests">No listings yet — publish writings and list them for sale!</p>
        {/if}
    </div>

    <!-- Betting Board -->
    {#if data.odds?.length}
    <div class="section">
        <h2>🎲 Betting Board</h2>
        {#each data.odds as bottleOdds}
            <div class="bet-bottle">
                <div class="bet-bottle-title">🍾 {bottleOdds.title}</div>
                <div class="bet-rows">
                    {#each bottleOdds.odds as o}
                        <div class="bet-row">
                            <span class="bet-player">{o.player.type === 'ai' ? '🤖' : '👤'} {o.player.display_name || o.player.username}</span>
                            <span class="bet-odds-val">{o.odds}×</span>
                            <span class="bet-dist">{o.distance.toFixed(2)}°</span>
                            {#if data.myPlayer && o.player.id !== data.myPlayer.id}
                                <button class="btn-bet" onclick={() => { betBottle = { id: bottleOdds.bottle_id, title: bottleOdds.title }; betPlayer = o.player; betAmount = ''; showBetModal = true; }}>Bet</button>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
    </div>
    {/if}

    <!-- Bet Modal -->
    {#if showBetModal && betBottle && betPlayer}
    <div class="modal-overlay" onclick={() => showBetModal = false}></div>
    <div class="modal-box">
        <button class="btn-cancel" onclick={() => showBetModal = false}>✕</button>
        <h2>🎲 Place Bet</h2>
        <div class="bet-info">
            <div><strong>Bottle:</strong> {betBottle.title}</div>
            <div><strong>On:</strong> {betPlayer.display_name || betPlayer.username}</div>
            <div><strong>Odds:</strong> {betPlayer._odds || '?'}×</div>
        </div>
        <label class="transfer-label">Amount (🫘)</label>
        <input type="number" bind:value={betAmount} min="1" placeholder="5" class="transfer-input" />
        {#if betAmount}
            <div class="bet-preview">
                <span>Potential win: 🫘 {parseInt(betAmount) * (betPlayer._odds || 1)}</span>
                <span class="transfer-fee">🤖 Bank fee (5%): 🫘 {Math.ceil(parseInt(betAmount) * (betPlayer._odds || 1) * 0.05)}</span>
            </div>
        {/if}
        <button class="btn-join" onclick={placeBet} disabled={!betAmount || parseInt(betAmount) < 1}>Place Bet →</button>
    </div>
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
                                    <td class="td-coords">{bottle.current_lat ? formatSolarTime(bottle.current_lon) : '—'}<br><span class="mono" style="font-size:0.75rem">{bottle.current_lat ? formatCoords(bottle.current_lat, bottle.current_lon) : ''}</span></td>
                                    <td class="td-action">
                                        {#if bottle.status === 'preparing'}
                                            <button class="btn btn-sm btn-accent" onclick={(e) => { e.stopPropagation(); launching = bottle.id; showLaunchModal = true; }} disabled={launching}>
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

    <!-- Chat Command -->
    <div class="chat-command">
        <div class="chat-messages" bind:this={chatMessagesEl}>
            {#if chatHistory.length}
                {#each chatHistory as msg}
                    <div class="chat-msg {msg.role}">{msg.text}</div>
                {/each}
            {/if}
        </div>
        <form onsubmit={(e) => { e.preventDefault(); sendChatCommand(); }} class="chat-form">
            <input type="text" bind:value={chatInput} placeholder={"Say go to San Diego or chase the bottle"} class="chat-input" disabled={chatLoading} />
            {#if data.user}
            <button type="button" class="btn-chat-send {voiceListening ? 'voice-active' : ''}" onclick={toggleVoiceCommand} title="Voice command" aria-label="Voice command">🎙️</button>
            {/if}
            <button type="submit" class="btn-chat-send" disabled={chatLoading || !chatInput.trim()}>🧭</button>
        </form>
    </div>

    <!-- Ocean Map -->
    <div class="section">
        <div class="section-header">
            <h2>{$t('bottles.map_title')}</h2>
            <button class="btn-sm" onclick={() => toggleFullscreen()} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>{isFullscreen ? '🔳' : '🔳'}</button>
        </div>
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

    <!-- Scoreboard -->
    {#if data.players?.length}
    <div class="scoreboard-section">
        <h2 class="section-title">🏆 {$t('scoreboard.title')}</h2>
        <div class="scoreboard-list" role="list">
            {#each [...data.players].sort((a, b) => (b.points || 0) - (a.points || 0)) as p, i}
                <div class="score-row" role="listitem">
                    <span class="score-rank">{i + 1}</span>
                    <span class="score-type">{p.type === 'ai' ? '🤖' : p.solo ? '👤' : '👥'}</span>
                    <span class="score-name">{p.display_name || p.username}</span>
                    <span class="score-pts">⭐ {p.points || 0}</span>
                    <span class="score-fuel">{formatBeans(p.fuel)}</span>
                </div>
            {/each}
        </div>
    </div>
    {/if}

    <!-- Players -->
    {#if playersWithDist.length}
    <div class="section">
        <h2>🏴‍☠️ Players</h2>
        <div class="players-grid">
            {#each playersWithDist as player}
                <div class="player-card">
                    <div class="player-header">
                        <div class="player-avatar" style="background:{player.team_color || 'var(--accent)'}">
                            {player.type === 'ai' ? '🤖' : '🧭'}
                        </div>
                        <div class="player-info">
                            <h3>{player.display_name || player.username} {player.type === 'ai' ? '🤖' : '👤'}</h3>
                            <span class="team-badge" style="background:{player.team_color || 'var(--accent)'}22;color:{player.team_color || 'var(--accent)'}">
                                {player.type === 'ai' ? '🤖 AI' : '👤 Human'} · {player.solo ? 'Solo' : player.team_name || 'Free Agent'}
                            </span>
                        </div>
                    </div>
                    <div class="player-details">
                        <div class="detail-row"><span>📍 Port</span><span>{player.port_name || 'Unknown'}</span></div>
                        <div class="detail-row"><span>{formatSolarTime(player.lon)}</span><span>{player.lat ? formatCoords(player.lat, player.lon) : '—'}</span></div>
                        <div class="detail-row"><span>⭐ Points</span><span>{player.points || 0}</span></div>
                        <div class="detail-row"><span>🫘 Beans</span><span>{formatBeans(player.fuel)}</span></div>
                        {#if player.nearestDist !== null}
                            <div class="detail-row"><span>🍾 Nearest</span><span>{player.nearestDist.toFixed(0)} km</span></div>
                        {/if}
                    </div>
                    {#if data.myPlayer && player.id === data.myPlayer.id}
                        <button class="btn-transfer" onclick={(e) => { e.stopPropagation(); showTransferModal = true; }}>
                            → Send 🫘
                        </button>
                    {:else if data.myPlayer && player.type !== 'ai' && !player.solo}
                        <button class="btn-send-me" onclick={(e) => { e.stopPropagation(); transferTarget = player; showTransferModal = true; }}>
                            💸 Send me 🫘
                        </button>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
    {/if}

    <!-- Transfer Modal -->
    {#if showTransferModal}
    <div class="modal-overlay" onclick={() => showTransferModal = false}></div>
    <div class="modal-box">
        <button class="btn-cancel" onclick={() => showTransferModal = false}>✕</button>
        <h2 >🫘 Send Beans</h2>
        <label class="transfer-label">To</label>
        <select bind:value={transferTarget} class="transfer-input">
            <option value="">Select player...</option>
            {#each (data.players || []) as player}
                {#if player.id !== data.myPlayer?.id && player.type !== 'ai'}
                    <option value={player}>{player.display_name || player.username} (📍 {player.port_name || '?'})</option>
                {/if}
            {/each}
        </select>
        <label class="transfer-label">Amount (🫘)</label>
        <input type="number" bind:value={transferAmount} min="0.01" step="0.01" max={data.myPlayer?.fuel || 0} placeholder="10" class="transfer-input" />
        <div class="transfer-fee">🤖 Bank fee (3%): 🫘 {transferAmount ? (transferAmount * 0.03).toFixed(2) : '0.00'}</div>
        <div class="transfer-net">Net received: 🫘 {transferAmount ? (parseFloat(transferAmount) - parseFloat(transferAmount) * 0.03).toFixed(2) : '0.00'}</div>
        <label class="transfer-label">Note (optional)</label>
        <input type="text" bind:value={transferNote} maxlength="100" placeholder="Good luck!" class="transfer-input" />
        <button class="btn-join" onclick={doTransfer} disabled={transferSending || !transferTarget || !transferAmount || parseInt(transferAmount) < 1}>
            {transferSending ? 'Sending...' : 'Send 🫘'}
        </button>
        <p class="transfer-limit">Daily limit: 50% of your fuel</p>
    </div>
    {/if}

    <!-- Chat Move Confirmation -->
    {#if pendingMove}
    <div class="chat-move-confirm">
        <span>🧭 Navigate to <strong>{pendingMove.target_name}</strong> ({pendingMove.distance_km} km)</span>
        {#if pendingMove.warning}
            <div style="font-size:0.75rem;margin:0.3rem 0;color:#f59e0b">{pendingMove.warning}</div>
        {/if}
        {#if pendingMove.night_penalty}
            <div style="font-size:0.75rem;color:#818cf8">🌙 Night penalty active (+50%)</div>
        {/if}
        {#if pendingMove.action === 'blocked'}
            <div style="font-size:0.75rem;margin:0.3rem 0;color:#ef4444">⛔ Movement blocked by El Narrador</div>
        {/if}
        <div class="chat-speed-btns">
            <button class="btn-chat-speed" onclick={() => confirmChatMove('drift')} disabled={moveLoading}>🌊 Drift ({pendingMove.estimated_cost?.drift || '?'} 🫘)</button>
            <button class="btn-chat-speed" onclick={() => confirmChatMove('sail')} disabled={moveLoading}>⛵ Sail ({pendingMove.estimated_cost?.sail || '?'} 🫘)</button>
            <button class="btn-chat-speed" onclick={() => confirmChatMove('motor')} disabled={moveLoading}>🚤 Motor ({pendingMove.estimated_cost?.motor || '?'} 🫘)</button>
            <button class="btn-chat-cancel" onclick={() => pendingMove = null}>✕</button>
        </div>
    </div>
    {/if}

    <!-- Click-to-Move Modal -->
    {#if moveTarget}
    <div class="modal-overlay" onclick={() => moveTarget = null}></div>
    <div class="modal-box">
        <button class="btn-cancel" onclick={() => moveTarget = null}>✕</button>
        <h3>🗺️ Move Here</h3>
        <p style="font-size:0.85rem;color:var(--muted)">{moveTarget.lat}, {moveTarget.lon}</p>
        <div style="margin:1rem 0">
            <label style="font-size:0.8rem;display:block;margin-bottom:0.3rem">Speed</label>
            <select bind:value={moveSpeed} class="transfer-input">
                <option value="drift">🌊 Drift (0.5×, cheap)</option>
                <option value="sail">⛵ Sail (1×, normal)</option>
                <option value="motor">🚤 Motor (4×, expensive)</option>
            </select>
        </div>
        <button class="btn-join" onclick={doMove} disabled={moveLoading}>{moveLoading ? '...' : '🧭 Move'}</button>
    </div>
    {/if}

    <!-- Launch Bottle Modal -->
    {#if showLaunchModal && launching}
    <div class="modal-overlay" onclick={() => { showLaunchModal = false; launching = null; }}></div>
    <div class="modal-box" onclick={(e) => e.stopPropagation()}>
        <button class="btn-cancel" onclick={() => { showLaunchModal = false; launching = null; }}>✕</button>
        <h2>🍾 Launch Bottle</h2>
        <p class="modal-desc">Choose where to cast your bottle into the Pacific:</p>
        <label class="transfer-label">Launch from</label>
        <select bind:value={launchPort} class="transfer-input">
            {#each ports as port}
                <option value={port.id}>{port.name} ({formatCoords(port.lat, port.lon)})</option>
            {/each}
        </select>
        <button class="btn-join" onclick={() => launchBottle(launching)} disabled={!launchPort}>
            🚀 Launch from {ports.find(p => p.id === launchPort)?.name || '...'}
        </button>
    </div>
    {/if}

    <!-- Join the Crusade Modal -->
    {#if showJoinModal}
    <div class="modal-overlay" onclick={() => showJoinModal = false}>
        <div class="modal-box" onclick={(e) => e.stopPropagation()}>
            <h2>⚔️ {$t('booty.join_title')}</h2>
            <p class="modal-desc">{$t('booty.join_desc')}</p>
            <div class="rules-box">
                <h3>📜 {$t('booty.rules_title')}</h3>
                <ul>
                    <li>{$t('booty.rule_1')}</li>
                    <li>{$t('booty.rule_2')}</li>
                    <li>{$t('booty.rule_3')}</li>
                    <li>{$t('booty.rule_4')}</li>
                    <li>{$t('booty.rule_5')}</li>
                </ul>
            </div>
            <label class="port-label">{$t('booty.choose_port')}</label>
            <select bind:value={joinPort}>
                {#each ports as port}
                    <option value={port.id}>{port.name}</option>
                {/each}
            </select>
            <label class="accept-label">
                <input type="checkbox" bind:checked={joinAccepted} />
                <span>{$t('booty.accept')}</span>
            </label>
            <button class="btn btn-join" onclick={doJoin} disabled={!joinAccepted || joining}>
                {joining ? '...' : '⚔️ ' + $t('booty.join_title')}
            </button>
            <button class="btn btn-cancel" onclick={() => showJoinModal = false}>✕</button>
        </div>
    </div>
    {/if}
</section>

<style>
    :global(:root) { --bs-bg: #09090b; --bs-surface: #141417; --bs-border: #27272a; --bs-fg: #fafafa; --bs-muted: #a1a1aa; }
    :global(html[data-theme="light"]) { --bs-bg: #faf9f7; --bs-surface: #f0eeeb; --bs-border: #ddd9d3; --bs-fg: #1a1a1a; --bs-muted: #71717a; }
    .bottles-page { max-width: 900px; margin: 0 auto; padding: 3rem 1.5rem 6rem; background: var(--bs-bg); }
    .title-accent { color: #ef4444; }
    .page-title { font-family: var(--font-heading); font-size: clamp(2.5rem, 6vw, 4rem); color: var(--bs-fg); margin-bottom: 0.5rem; font-weight: 700; }
    .page-subtitle { color: var(--bs-muted); font-size: 1.1rem; margin-bottom: 2rem; font-style: italic; }
    .bq-link { margin-bottom: 2rem; }
    .bq-link a { color: var(--accent); font-weight: 600; font-size: 0.95rem; text-decoration: none; }
    .bq-link a:hover { text-decoration: underline; }
    .section { margin-bottom: 3rem; }
    .section h2 { font-family: var(--font-heading); font-size: 1.5rem; color: var(--accent); margin-bottom: 1rem; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .section-header h2 { margin-bottom: 0; }

    /* Stats bar */
    .stats-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: -1rem 0 2rem 0; padding: 1.25rem; background: var(--bs-surface); border: 1px solid rgba(239,68,68,0.12); border-radius: 12px; }
    .stats-row { display: flex; flex: 1; min-width: 200px; }
    .stat-item { text-align: center; flex: 1; padding: 0.6rem 0.5rem; background: rgba(201,168,124,0.06); border: 1px solid rgba(201,168,124,0.1); border-radius: 8px; }
    .stat-num { display: block; font-family: var(--font-heading); font-size: 2rem; color: #ef4444; font-weight: 700; line-height: 1.2; }
    .stat-label { display: block; font-size: 0.7rem; color: var(--bs-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 0.15rem; }
    .stat-divider { border-left: 2px solid rgba(201,168,124,0.15); }
    .stats-row-center { display: flex; justify-content: center; flex-basis: 100%; }
    .stat-register { color: var(--accent); font-weight: 600; font-size: 0.85rem; text-decoration: none; }
    .stat-register:hover { color: #ef4444; }
    .stat-checkin { background: none; border: none; cursor: pointer; padding: 0.5rem 1rem; }
    .stat-registered { color: #4ade80; cursor: default; }

    /* Join Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; }
    .modal-box { background: var(--bs-surface); border: 1px solid rgba(239,68,68,0.15); border-radius: 16px; padding: 2rem; max-width: 500px; width: calc(100% - 2rem); position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1002; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
    .modal-box h2 { font-family: var(--font-heading); font-size: 1.5rem; color: var(--bs-fg); margin-bottom: 0.5rem; }
    .modal-desc { color: var(--bs-muted); font-size: 0.95rem; margin-bottom: 1.25rem; }
    .rules-box { background: rgba(201,168,124,0.06); border: 1px solid rgba(201,168,124,0.15); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem; }
    .rules-box h3 { font-family: var(--font-heading); font-size: 1rem; color: var(--accent); margin-bottom: 0.5rem; }
    .rules-box ul { padding-left: 1.25rem; margin: 0; }
    .rules-box li { color: var(--bs-muted); font-size: 0.85rem; margin-bottom: 0.4rem; line-height: 1.4; }
    .port-label { display: block; font-size: 0.85rem; color: var(--bs-muted); margin-bottom: 0.4rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    select { width: 100%; padding: 0.6rem; background: var(--bs-surface); color: var(--bs-fg); border: 1px solid var(--bs-border); border-radius: 8px; font-size: 0.95rem; margin-bottom: 1rem; }
    .accept-label { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 1.25rem; cursor: pointer; }
    .accept-label input { margin-top: 0.15rem; accent-color: #ef4444; }
    .accept-label span { font-size: 0.85rem; color: var(--bs-muted); line-height: 1.4; }
    .btn-join { width: 100%; padding: 0.75rem; background: #ef4444; color: white; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-bottom: 0.5rem; }
    .btn-join:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-join:hover:not(:disabled) { background: #dc2626; }
    .btn-cancel { position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #a1a1aa; font-size: 1.5rem; cursor: pointer; z-index: 1002; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: color 0.2s, background 0.2s; }
    .btn-cancel:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

    /* Narrator */
    .narrator-banner { background: linear-gradient(135deg, rgba(239,68,68,0.08), rgba(201,168,124,0.08)); border: 1px solid rgba(239,68,68,0.2); border-left: 3px solid #ef4444; border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 2rem; }
    .narrator-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .narrator-icon { font-size: 1.1rem; }
    .narrator-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #ef4444; font-weight: 700; }
    .narrator-title { font-family: var(--font-heading); font-size: 1.2rem; color: var(--bs-fg); margin: 0 0 0.5rem; }
    .narrator-text { font-size: 0.9rem; color: var(--bs-muted); line-height: 1.5; margin: 0; font-style: italic; }
    .narrator-tag { display: inline-block; margin-top: 0.5rem; font-size: 0.7rem; color: #ef4444; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

    .btn-transfer { width: 100%; margin-top: 0.75rem; padding: 0.5rem; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; color: #ef4444; font-size: 0.8rem; cursor: pointer; transition: background 0.2s; }
    .btn-send-me { width: 100%; margin-top: 0.75rem; padding: 0.5rem; background: rgba(201,168,124,0.08); border: 1px solid rgba(201,168,124,0.25); border-radius: 8px; color: var(--accent); font-size: 0.75rem; cursor: pointer; animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes botPulse { 0%, 100% { box-shadow: 0 0 12px rgba(239,68,68,0.5); } 50% { box-shadow: 0 0 24px rgba(239,68,68,0.8); } }
    .btn-transfer:hover { background: rgba(239,68,68,0.2); }
    .transfer-recipient { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bs-surface); border: 1px solid rgba(239,68,68,0.15); border-radius: 8px; margin-bottom: 1rem; }
    .transfer-port { font-size: 0.8rem; color: var(--bs-muted); }
    .transfer-label { display: block; font-size: 0.8rem; color: var(--bs-muted); margin: 0.75rem 0 0.25rem; }
    .transfer-input { width: 100%; padding: 0.6rem; background: var(--bs-bg); border: 1px solid var(--bs-border); border-radius: 8px; color: var(--bs-fg); font-size: 1rem; box-sizing: border-box; }
    .transfer-fee { font-size: 0.8rem; color: #ef4444; margin-top: 0.5rem; }
    .transfer-net { font-size: 0.8rem; color: #22c55e; margin-top: 0.25rem; }
    .transfer-limit { font-size: 0.7rem; color: var(--bs-muted); margin-top: 0.75rem; text-align: center; }

    .fuel-request-form { margin-bottom: 1rem; padding: 1rem; background: var(--bs-surface); border-radius: 10px; }
    .request-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .requests-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .request-card { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bs-surface); border: 1px solid rgba(239,68,68,0.15); border-radius: 8px; }
    .request-info { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; font-size: 0.85rem; }
    .request-port { color: var(--bs-muted); font-size: 0.75rem; }
    .request-amount { color: #ef4444; font-weight: 600; font-size: 0.8rem; }
    .request-msg { font-style: italic; color: var(--bs-muted); font-size: 0.8rem; }
    .btn-fulfill { padding: 0.35rem 0.75rem; background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); border-radius: 6px; color: #22c55e; font-size: 0.75rem; cursor: pointer; white-space: nowrap; }
    .btn-fulfill:hover { background: rgba(34,197,94,0.25); }
    .no-requests { color: var(--bs-muted); font-size: 0.8rem; font-style: italic; }

    .word-index { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; margin-bottom: 1rem; }
    .word-index-label { font-size: 0.75rem; color: var(--bs-muted); margin-right: 0.25rem; }
    .word-pill { display: inline-block; padding: 0.2rem 0.5rem; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 12px; font-size: 0.75rem; color: var(--bs-fg); }
    .word-pts { color: #ef4444; font-weight: 600; margin-left: 0.2rem; }
    .listings-grid { display: flex; flex-direction: column; gap: 0.75rem; }
    .listing-card { padding: 1rem; background: var(--bs-surface); border: 1px solid rgba(239,68,68,0.15); border-radius: 10px; }
    .listing-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem; }
    .listing-title { font-weight: 600; font-size: 0.9rem; color: var(--bs-fg); }
    .listing-price { font-weight: 700; color: #ef4444; font-size: 1rem; }
    .listing-meta { font-size: 0.75rem; color: var(--bs-muted); margin-bottom: 0.4rem; }
    .listing-excerpt { font-size: 0.8rem; color: var(--bs-muted); font-style: italic; line-height: 1.4; max-height: 3rem; overflow: hidden; }
    .listing-resale { font-size: 0.7rem; color: var(--accent); margin-top: 0.4rem; }
    .btn-buy { margin-top: 0.5rem; padding: 0.4rem 0.75rem; background: #ef4444; border: none; border-radius: 6px; color: white; font-size: 0.8rem; cursor: pointer; }
    .btn-buy:hover { background: #dc2626; }

    .bet-bottle { margin-bottom: 1rem; background: var(--bs-surface); border: 1px solid rgba(239,68,68,0.15); border-radius: 10px; padding: 1rem; }
    .bet-bottle-title { font-weight: 700; font-size: 0.95rem; margin-bottom: 0.5rem; }
    .bet-rows { display: flex; flex-direction: column; gap: 0.4rem; }
    .bet-row { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; padding: 0.4rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .bet-player { flex: 1; }
    .bet-odds-val { color: #ef4444; font-weight: 700; min-width: 3rem; text-align: center; }
    .bet-dist { color: var(--bs-muted); font-size: 0.75rem; min-width: 3rem; }
    .btn-bet { padding: 0.25rem 0.6rem; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; color: #ef4444; font-size: 0.75rem; cursor: pointer; }
    .btn-bet:hover { background: rgba(239,68,68,0.2); }
    .bet-info { display: flex; flex-direction: column; gap: 0.3rem; padding: 0.75rem; background: var(--bs-surface); border: 1px solid rgba(239,68,68,0.15); border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; }
    .bet-preview { display: flex; flex-direction: column; gap: 0.2rem; margin-top: 0.5rem; font-size: 0.85rem; }
    .ticker-odds { color: var(--accent); font-weight: 600; font-size: 0.75rem; }
    .stat-register:hover { text-decoration: underline; }

    /* Form */
    .form-card { background: var(--bs-bg); border: 1px solid rgba(239,68,68,0.12); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .form-card input, .form-card textarea, .form-card select { background: var(--bs-surface); border: 1px solid var(--bs-border); border-radius: 8px; padding: 0.6rem 0.8rem; color: var(--bs-fg); font-family: var(--font-body); font-size: 0.95rem; }
    .form-row { display: flex; gap: 0.75rem; }
    .form-row select { flex: 1; }
    .seal-notice { font-size: 0.85rem; color: var(--bs-muted); font-style: italic; }

    /* Buttons */
    .btn { background: var(--accent); color: var(--bs-bg); border: none; border-radius: 8px; padding: 0.6rem 1.2rem; font-family: var(--font-body); font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.85; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sm { font-size: 0.8rem; padding: 0.35rem 0.8rem; }
    .btn-accent { background: var(--accent); color: var(--bs-bg); }
    .btn-zoom { background: none; border: 1px solid var(--bs-border); color: var(--bs-fg); cursor: pointer; border-radius: 6px; padding: 0.25rem 0.5rem; font-size: 0.9rem; margin-left: 0.4rem; vertical-align: middle; }
    .btn-zoom:hover { border-color: var(--accent); color: var(--accent); }

    /* Table */
    .bottles-table-wrap { overflow-x: auto; }
    .bottles-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .bottles-table th { text-align: left; padding: 0.6rem 0.75rem; color: var(--bs-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--bs-border); }
    .bottles-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--bs-border); vertical-align: middle; color: var(--bs-fg); }
    .tr-clickable { cursor: pointer; transition: background 0.15s; }
    .tr-clickable:hover { background: rgba(201,168,124,0.05); }
    .tr-detail td { padding: 0; border-bottom: 1px solid var(--bs-border); }
    .detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem; padding: 1rem 0.75rem; }
    .detail-item { display: flex; flex-direction: column; gap: 0.15rem; }
    .detail-item.detail-full { grid-column: 1 / -1; }
    .detail-label { font-size: 0.7rem; color: var(--bs-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .detail-value { font-size: 0.9rem; color: var(--bs-fg); }
    .detail-value.mono { font-family: monospace; font-size: 0.82rem; }
    .detail-preview { font-style: italic; font-size: 0.85rem; color: var(--text-dim); white-space: pre-wrap; max-height: 80px; overflow-y: auto; padding: 0.5rem; background: var(--bs-surface); border-radius: 6px; border-left: 3px solid var(--accent); }
    .td-title { font-weight: 500; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .td-date { white-space: nowrap; color: var(--bs-muted); font-size: 0.85rem; }
    .td-coords { white-space: nowrap; color: var(--bs-muted); font-size: 0.85rem; font-family: monospace; }
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
    .chat-command { background: var(--bs-surface); border-radius: 12px; border: 1px solid var(--bs-border); margin-bottom: 1.5rem; overflow: hidden; }
    .chat-messages { max-height: 120px; overflow-y: auto; padding: 0.5rem 0.75rem; font-size: 0.8rem; }
    .chat-msg { padding: 0.25rem 0; line-height: 1.3; }
    .chat-msg.user { color: var(--text); }
    .chat-msg.bot { color: var(--muted); font-style: italic; }
    .chat-form { display: flex; border-top: 1px solid var(--bs-border); }
    .chat-input { flex: 1; padding: 0.5rem 0.75rem; background: transparent; border: none; color: var(--text); font-size: 0.85rem; outline: none; font-family: inherit; }
    .chat-input::placeholder { color: var(--muted); opacity: 0.6; }
    .btn-chat-send { background: var(--bs-accent); border: none; color: #fff; padding: 0.5rem 0.75rem; cursor: pointer; font-size: 1rem; border-radius: 0; }
    .narrator-speak { background: rgba(255,255,255,0.1); border: none; color: var(--accent); padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; margin-top: 0.4rem; }
    .narrator-speak:hover { background: rgba(255,255,255,0.2); }
    .narrator-speak.narrator-playing { animation: micPulse 1.5s infinite; color: #ef4444; }
    .voice-active { animation: micPulse 1.5s infinite; color: #ef4444; }
    @keyframes micPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .btn-chat-send:disabled { opacity: 0.4; cursor: default; }
    .chat-move-confirm { background: var(--bs-surface); border: 1px solid var(--bs-accent); border-radius: 8px; padding: 0.6rem 0.75rem; margin-bottom: 1rem; font-size: 0.8rem; }
    .chat-speed-btns { display: flex; gap: 0.4rem; margin-top: 0.4rem; flex-wrap: wrap; }
    .btn-chat-speed { background: var(--bs-ocean); color: #fff; border: none; padding: 0.3rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; }
    .btn-chat-speed:disabled { opacity: 0.4; }
    .btn-chat-cancel { background: transparent; border: 1px solid var(--muted); color: var(--muted); padding: 0.3rem 0.6rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem; }
    .map-container { height: 450px; border-radius: 12px; overflow: hidden; border: 1px solid var(--bs-border); cursor: crosshair; }
    .map-container:fullscreen { height: 100vh; border-radius: 0; border: none; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .section-header h2 { margin: 0; }
    .btn-sm { background: rgba(255,255,255,0.1); border: 1px solid var(--bs-border); color: var(--text); padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }

    /* Beached items */
    .beached-item { background: var(--bs-surface); border: 1px solid rgba(239,68,68,0.12); border-radius: 10px; padding: 1.25rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .beached-icon { font-size: 2rem; flex-shrink: 0; }
    .beached-info { flex: 1; min-width: 0; }
    .beached-info strong { color: var(--accent); display: block; margin-bottom: 0.3rem; }
    .beached-meta { display: flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: var(--bs-muted); flex-wrap: wrap; }
    .meta-sep { color: var(--bs-border); }

    /* Revealed content */
    .revealed-content { background: var(--bs-surface); border: 1px solid var(--accent); border-radius: 10px; padding: 1.25rem; margin-bottom: 0.75rem; animation: revealFade 0.5s ease; }
    .already-opened { border-color: var(--bs-border); }
    .revealed-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--accent); font-weight: 600; }
    .revealed-icon { font-size: 1.2rem; }
    .revealed-text { font-style: italic; line-height: 1.7; color: var(--bs-fg); white-space: pre-wrap; }
    @keyframes revealFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    /* Toast */
    .toast { position: fixed; top: 1rem; right: 1rem; background: rgba(82,183,136,0.9); color: #fff; padding: 0.4rem 0.8rem; border-radius: 6px; font-weight: 500; font-size: 0.75rem; z-index: 9999; max-width: 200px; max-height: 3rem; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 4px 12px rgba(82,183,136,0.3); opacity: 0; transform: translateY(-8px); transition: opacity 0.3s, transform 0.3s; pointer-events: none; line-height: 1.2; }
    .toast-visible { opacity: 1; transform: translateY(0); }
    @keyframes toastIn { from { opacity: 0; transform: translateY(-16px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

    @media (max-width: 640px) {
        .stats-bar { gap: 1rem; padding: 1rem; }
        .stat-num { font-size: 1.5rem; }
        .beached-item { flex-wrap: wrap; }
        .score-row { flex-wrap: wrap; gap: 0.4rem; }
        .score-team { display: none; }
    }

    /* Ticker tape */
    .ticker-tape { background: var(--bs-surface); border-bottom: 1px solid var(--bs-border); overflow: hidden; white-space: nowrap; padding: 0.5rem 0; }
    .ticker-content { display: inline-flex; gap: 1rem; align-items: center; font-size: 0.8rem; animation: tickerScroll 20s linear infinite; }
    @keyframes tickerScroll { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
    .ticker-item { display: inline-flex; align-items: center; gap: 0.3rem; color: var(--bs-muted); }
    .ticker-value { color: var(--bs-fg); font-weight: 600; }
    .ticker-change { font-size: 0.75rem; }
    .ticker-up { color: #4ade80; }
    .ticker-down { color: #ef4444; }
    .ticker-divider { color: var(--bs-border); }

    /* Stat divider */
    .stat-divider { border-left: 1px solid var(--bs-border); margin-left: 0; padding-left: 1rem; }

    /* Scoreboard */
    .scoreboard-section { padding: 2rem 0 1rem; }
    .scoreboard-section h2 { font-family: var(--font-heading); font-size: 1.3rem; color: var(--accent); margin-bottom: 0.75rem; }
    .scoreboard-list { display: flex; flex-direction: column; gap: 0.35rem; }
    .score-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; background: var(--bs-surface); border-radius: 6px; font-size: 0.88rem; border: 1px solid transparent; transition: border-color 0.2s; }
    .score-row:first-child { border-color: var(--accent); background: rgba(201,168,124,0.08); }
    .score-rank { font-weight: 700; color: var(--bs-muted); width: 1.5rem; text-align: center; }
    .score-type { font-size: 1rem; }
    .score-name { flex: 1; font-weight: 500; color: var(--bs-fg); }
    .score-team { font-size: 0.78rem; color: var(--bs-muted); }
    .score-pts { color: var(--accent); font-weight: 600; }
    .score-fuel { color: var(--bs-muted); font-size: 0.82rem; }

    /* Players */
    .players-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .player-card { background: var(--bs-surface); border: 1px solid rgba(239,68,68,0.12); border-radius: 12px; padding: 1.25rem; text-align: left; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; }
    .player-card:hover { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
    .player-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .player-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
    .player-info h3 { font-family: var(--font-heading); font-size: 1.05rem; margin: 0 0 0.2rem; color: var(--bs-fg); }
    .team-badge { font-size: 0.75rem; padding: 0.1rem 0.5rem; border-radius: 99px; font-weight: 500; }
    .player-details { display: flex; flex-direction: column; gap: 0.35rem; }
    .detail-row { display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--bs-muted); }
    .detail-row span:last-child { color: var(--bs-fg); font-weight: 500; }
</style>
