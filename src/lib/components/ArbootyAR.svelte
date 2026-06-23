<script>
    import { onDestroy } from 'svelte';

    let { bottles = [], onCapture, player, theme = 'pirate', portalConfig = null, allPortals = [] } = $props();

    // ── WebXR AR detection ──
    let webxrSupported = $state(false);
    let useWebXR = $state(false);
    let webxrState = $state(null);
    let webxrLoading = $state(false);

    if (typeof navigator !== 'undefined' && navigator.xr?.isSessionSupported) {
        navigator.xr.isSessionSupported('immersive-ar')
            .then(s => { webxrSupported = s; })
            .catch(() => {});
    }

    const themes = {
        pirate: {
            icon: '🏴‍☠️🔭',
            title: 'Modo AR',
            desc: 'Gira para encontrar botellas en tu entorno',
            accentColor: '#c9a87c',
            accentRgb: '201,168,124',
            markerNear: '🏴‍☠️',
            markerRange: '🍾',
            markerFar: '🏴‍☠️',
            captureText: '¡Capturar!',
            emptyText: 'Gira para buscar botellas 🧭',
            compassColor: '#c9a87c',
            modalIcon: '🏴‍☠️',
            captureBtnBg: '#ef4444',
            captureBtnShadow: 'rgba(239,68,68,0.5)',
            rangeStroke: '#ef4444',
            rangeFill: 'rgba(239,68,68,0.2)',
        },
        event: {
            icon: '🎉🎁✨',
            title: 'Evento de Celebración',
            desc: 'Encuentra los mensajes ocultos',
            accentColor: '#881337',
            accentRgb: '136,19,55',
            markerNear: '🍾',
            markerRange: '🎂',
            markerFar: '🥂',
            captureText: '¡Abrir!',
            emptyText: 'Gira para buscar sorpresas 🎉',
            compassColor: '#c9a87c',
            modalIcon: '🎉',
            captureBtnBg: '#881337',
            captureBtnShadow: 'rgba(136,19,55,0.5)',
            rangeStroke: '#c9a87c',
            rangeFill: 'rgba(201,168,124,0.2)',
        }
    };

    let isEvent = $derived(theme === 'event');
    let t = $derived(themes[theme] || themes.pirate);

    let videoEl;
    let stream = $state(null);
    let error = $state(null);

    // Heading tracking — relative rotation only, no compass/GPS needed
    let heading = $state(0);          // current device heading (0-360)
    let baseHeading = $state(0);      // heading at camera start — "forward"
    let useCompass = $state(true);
    let touchStartX = 0;
    let touchHeadingStart = 0;

    let cameraActive = $state(false);
    let capturing = $state(null);
    let captured = $state(null);
    let gamePaused = $state(false);
    let lastCaptureTime = $state(0);

    // FOV for marker visibility
    const FOV = 65; // degrees on each side

    // ── Local-space marker placement ──────────────────────────────────────
    // Each bottle gets a random angle and elevation tier when camera activates
    let placedMarkers = $state([]);

    function distributeMarkers() {
        const available = bottles.filter(b => !b.found_by);
        placedMarkers = available.map(b => {
            const angle = Math.random() * 360;               // 0-360°
            const tiers = ['high', 'mid', 'low'];
            const elevation = tiers[Math.floor(Math.random() * tiers.length)];
            return { ...b, angle, elevation };
        });
    }

    $effect(() => {
        // Re-distribute when bottles array changes or camera toggles
        if (cameraActive) {
            distributeMarkers();
        }
    });

    // Relative heading: how far has user rotated from base
    let relHeading = $derived((heading - baseHeading + 360) % 360);

    // Compute visible markers based on relative heading
    let markers = $derived(
        placedMarkers.map(m => {
            // Angle of this marker relative to user's current facing
            const relAngle = (m.angle - relHeading + 360) % 360;
            // Normalize to -180..180
            const signed = relAngle > 180 ? relAngle - 360 : relAngle;
            const visible = Math.abs(signed) < FOV;
            // Map to screen position: 0 = center, FOV = edge
            const xPercent = visible ? Math.round(50 + (signed / FOV) * 50) : (signed > 0 ? 105 : -5);
            // Elevation → vertical position
            const topPct = m.elevation === 'high' ? 20 : m.elevation === 'low' ? 52 : 35;
            return { ...m, signed, visible, xPercent, topPct };
        })
        .filter(m => m.visible)
        .sort((a, b) => Math.abs(a.signed) - Math.abs(b.signed))
        .slice(0, 5)
    );

    let nearest = $derived(markers[0] || null);
    let nearestWasVisible = $state(false);
    $effect(() => {
        if (nearest && !nearestWasVisible) playPing();
        nearestWasVisible = !!nearest;
    });

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

    // ── Sensors (orientation only, no GPS) ─────────────────────────────────

    function startOrientation() {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
    }

    function handleOrientation(e) {
        if (!useCompass) return;
        if (e.absolute && e.alpha !== null) {
            heading = (360 - e.alpha) % 360;
        } else if (e.webkitCompassHeading !== undefined) {
            heading = e.webkitCompassHeading;
        }
    }

    // ── Capture ────────────────────────────────────────────────────────────

    const CAPTURE_COOLDOWN_MS = 2000;

    async function captureBottle(bottle) {
        if (capturing) return;
        const now = Date.now();
        if (now - lastCaptureTime < CAPTURE_COOLDOWN_MS) return;
        lastCaptureTime = now;
        capturing = bottle.id;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch('/api/bottlequest/physical', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bottle_id: bottle.id, nickname: effectivePlayer?.username }),
                signal: controller.signal
            });
            clearTimeout(timeout);
            const result = await res.json();
            if (result.cooldown) {
                proximityEvents = [...proximityEvents.slice(-4), { id: crypto.randomUUID(), event: 'cooldown', message: result.error, ts: Date.now() }];
                setTimeout(() => { proximityEvents = proximityEvents.filter(e => Date.now() - e.ts < 3000); }, 3000);
            }
            else if (result.success) {
                captured = { bottle: result.bottle, reward: result.reward, trap: result.trap, challenge: result.challenge };
                if (result.trap) {
                    playSadTrombone();
                } else if (result.challenge) {
                    spawnConfetti();
                    playFanfare();
                    gamePaused = true;
                } else {
                    spawnConfetti();
                    playFanfare();
                }
                // Remove captured marker from placed list
                placedMarkers = placedMarkers.filter(m => m.id !== bottle.id);
                // Broadcast capture to other players
                if (ws?.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'capture', bottle_id: bottle.id, title: bottle.title || 'Botella', trap: result.trap, challenge: result.challenge }));
                }
                if (onCapture) onCapture(result);
            }
            else if (result.already_captured) {}
            else { alert(result.error || 'Error al capturar (' + res.status + ')'); }
        } catch (e) {
            if (e.name === 'AbortError') alert('Tiempo de espera agotado — intenta de nuevo');
            else alert('Error: ' + e.message);
        }
        finally { capturing = null; }
    }

    // ── WebSocket (capture notifications only, no location broadcast) ──────

    let ws = $state(null);
    let wsConnected = $state(false);
    let onlineCount = $state(0);
    let proximityEvents = $state([]);
    const WS_URL = 'wss://booty-chat-worker.chef-tech.workers.dev/chat/ws';

    function connectWS() {
        if (ws) { ws.close(); ws = null; }
        const username = player?.username || 'anonymous';
        const displayName = player?.display_name || username;
        try {
            ws = new WebSocket(`${WS_URL}?username=${encodeURIComponent(username)}&display_name=${encodeURIComponent(displayName)}`);
            ws.onopen = () => { wsConnected = true; };
            ws.onmessage = (e) => { try { handleWSMessage(JSON.parse(e.data)); } catch {} };
            ws.onclose = () => { ws = null; wsConnected = false; };
            ws.onerror = () => { ws = null; };
        } catch (e) { console.warn('WS failed:', e.message); }
    }

    function handleWSMessage(msg) {
        if (msg.type === 'capture' && msg.username !== (player?.username || 'anonymous')) {
            const icon = msg.trap ? '💀' : '🎉';
            const verb = msg.trap ? 'cayó en aguafiestas' : 'capturó';
            proximityEvents = [...proximityEvents.slice(-4), { id: crypto.randomUUID(), event: 'capture', message: `${icon} ${msg.username} ${verb} «${msg.bottle_title}»`, ts: Date.now() }];
            setTimeout(() => { proximityEvents = proximityEvents.filter(e => Date.now() - e.ts < 6000); }, 6000);
            if (msg.trap) playSadTrombone(); else if (msg.challenge) playFanfare(); else playPing();
        }
        if (msg.type === 'vote') {
            const icon = msg.approved ? '✅' : '❌';
            const verb = msg.approved ? 'cumplió' : 'falló';
            proximityEvents = [...proximityEvents.slice(-4), { id: crypto.randomUUID(), event: 'vote', message: `${icon} ${msg.username} ${verb}: «${msg.challenge}»`, ts: Date.now() }];
            setTimeout(() => { proximityEvents = proximityEvents.filter(e => Date.now() - e.ts < 6000); }, 6000);
            if (msg.approved) playFanfare(); else playSadTrombone();
        }
        if (msg.type === 'pause') { gamePaused = true; }
        if (msg.type === 'resume') { gamePaused = false; }
        if (msg.type === 'online') { onlineCount = msg.count || 0; }
        if (msg.type === 'online_update' && msg.username) {
            onlineCount = msg.count || 0;
            if (msg.username !== (player?.username || '')) {
                const leaving = msg.action === 'leave';
                const label = leaving ? '🔴' : '🟢';
                const verb = leaving ? 'salió' : 'se unió';
                proximityEvents = [...proximityEvents.slice(-4), { id: crypto.randomUUID(), event: leaving ? 'leave' : 'join', message: `${label} ${msg.username} ${verb}`, ts: Date.now() }];
                setTimeout(() => { proximityEvents = proximityEvents.filter(e => Date.now() - e.ts < 4000); }, 4000);
            }
        }
    }

    function disconnectWS() {
        if (ws) { ws.close(); ws = null; }
        onlineCount = 0; proximityEvents = []; wsConnected = false;
    }

    // ── Confetti ───────────────────────────────────────────────────────────
    let confetti = $state([]);
    function spawnConfetti() {
        if (theme !== 'event') return;
        const emojis = ['🎉','🎊','🥳','🎈','⭐','✨','🎂','🍾','🎁'];
        confetti = Array.from({ length: 20 }, () => ({
            id: crypto.randomUUID(),
            emoji: emojis[Math.floor(Math.random() * emojis.length)],
            x: Math.random() * 100,
            delay: Math.random() * 500,
            duration: 1500 + Math.random() * 1000,
        }));
        setTimeout(() => { confetti = []; }, 3000);
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────

    let nickname = $state('');
    let showNickModal = $state(false);
    let effectivePlayer = $derived(player || (nickname ? { username: nickname, display_name: nickname } : null));

    async function activate() {
        if (!effectivePlayer && isEvent) {
            showNickModal = true;
            return;
        }
        if (!effectivePlayer) {
            window.location.href = '/login';
            return;
        }
        showNickModal = false;
        error = null;
        playFanfare();

        // ── Branch: WebXR ImmersiveAR vs pseudo-AR ──
        if (webxrSupported) {
            await activateWebXR();
        } else {
            await activatePseudoAR();
        }
    }

    // ── IWSDK ImmersiveAR mode ──
    let webxrContainer = null;

    async function activateWebXR() {
        webxrLoading = true;

        // Safety timeout: if onARStart doesn't fire in 15s, reset
        const loadingTimeout = setTimeout(() => {
            if (webxrLoading) {
                console.warn('[WebXR] Timed out waiting for AR session');
                webxrLoading = false;
                if (webxrState) {
                    import('$lib/ar-poc/bottle-world.js').then(({ destroyBottleAR }) => {
                        destroyBottleAR(webxrState);
                        webxrState = null;
                    });
                }
                // Fall back to pseudo-AR
                activatePseudoAR();
            }
        }, 15000);

        try {
            const { initBottleAR } = await import('$lib/ar-poc/bottle-world.js');

            // Clean up any previous container
            if (webxrContainer) { webxrContainer.remove(); webxrContainer = null; }

            webxrContainer = document.createElement('div');
            webxrContainer.style.cssText = 'position:absolute;inset:0;z-index:0;';
            const root = document.querySelector('.ar-root');
            if (root) root.prepend(webxrContainer);

            webxrState = await initBottleAR(webxrContainer, {
                bottles: bottles.filter(b => !b.found_by),
                portalConfig,
                allPortals,
            });

            webxrState.onSelect = (bottle) => {
                selectedBottle = bottle;
            };

            // Listen for portal tab taps in AR
            window.addEventListener('portal-tab-tap', (e) => {
                const { portalId } = e.detail;
                // Navigate to that portal's AR view
                window.location.href = `/portals/booty/arbooty?theme=${portalId}`;
            });

            webxrState.onARStart = () => {
                clearTimeout(loadingTimeout);
                useWebXR = true;
                webxrLoading = false;
                connectWS();
            };

            webxrState.onAREnd = () => {
                clearTimeout(loadingTimeout);
                useWebXR = false;
                webxrLoading = false;
                webxrState = null;
                disconnectWS();
                selectedBottle = null;
            };

            await webxrState.enterAR();
        } catch (e) {
            console.error('[WebXR] Failed, falling back to pseudo-AR:', e);
            clearTimeout(loadingTimeout);
            webxrLoading = false;
            webxrState = null;
            webxrSupported = false;
            await activatePseudoAR();
        }
    }

    // ── Existing pseudo-AR (camera + compass) ──
    async function activatePseudoAR() {
        if (!(await requestOrientationPermission())) return;
        await startCamera();
        if (!cameraActive) return;
        baseHeading = heading;
        startOrientation();
        distributeMarkers();
        connectWS();
    }

    let selectedBottle = $state(null);

    // ── WebXR capture handler ──
    async function captureWebXR() {
        if (!webxrState || !selectedBottle) return;
        capturing = selectedBottle.id;
        try {
            const bottle = await webxrState.captureSelected();
            if (!bottle) return;
            const res = await fetch('/api/bottlequest/physical', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bottle_id: bottle.id, nickname: effectivePlayer?.username }),
            });
            const result = await res.json();
            if (result.success) {
                captured = { bottle: result.bottle, reward: result.reward, trap: result.trap, challenge: result.challenge };
                if (result.trap) playSadTrombone();
                else if (result.challenge) { spawnConfetti(); playFanfare(); gamePaused = true; }
                else { spawnConfetti(); playFanfare(); }
                placedMarkers = placedMarkers.filter(m => m.id !== bottle.id);
                selectedBottle = null;
                if (ws?.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'capture', bottle_id: bottle.id, title: bottle.title || 'Botella', trap: result.trap, challenge: result.challenge }));
                }
                if (onCapture) onCapture(result);
            } else if (result.cooldown) {
                proximityEvents = [...proximityEvents.slice(-4), { id: crypto.randomUUID(), event: 'cooldown', message: result.error, ts: Date.now() }];
                setTimeout(() => { proximityEvents = proximityEvents.filter(e => Date.now() - e.ts < 3000); }, 3000);
            }
        } catch (e) {
            console.error('[WebXR] Capture failed:', e);
        } finally {
            capturing = null;
        }
    }

    function deactivateWebXR() {
        webxrLoading = false;
        if (webxrState) {
            try { webxrState.exitAR(); } catch {}
            import('$lib/ar-poc/bottle-world.js').then(({ destroyBottleAR }) => {
                destroyBottleAR(webxrState);
                webxrState = null;
            });
        }
        if (webxrContainer) { webxrContainer.remove(); webxrContainer = null; }
        useWebXR = false;
        selectedBottle = null;
        disconnectWS();
    }

    function deactivate() {
        if (useWebXR || webxrLoading) {
            deactivateWebXR();
            return;
        }
        disconnectWS();
        stopCamera();
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
        window.removeEventListener('deviceorientation', handleOrientation, true);
        captured = null; confetti = []; placedMarkers = []; useCompass = true;
    }

    onDestroy(deactivate);

    // ── Sound FX ────────────────────────────────────────────────────────
    let audioCtx = null;
    function getAudioCtx() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx;
    }

    function playPing() {
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } catch {}
    }

    function playFanfare() {
        try {
            const ctx = getAudioCtx();
            const notes = [523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'triangle';
                const tm = ctx.currentTime + i * 0.12;
                gain.gain.setValueAtTime(0.2, tm);
                gain.gain.exponentialRampToValueAtTime(0.001, tm + 0.4);
                osc.start(tm);
                osc.stop(tm + 0.4);
            });
        } catch {}
    }

    function playSadTrombone() {
        try {
            const ctx = getAudioCtx();
            const notes = [440, 415, 392, 349];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sawtooth';
                const tm = ctx.currentTime + i * 0.3;
                gain.gain.setValueAtTime(0.1, tm);
                gain.gain.exponentialRampToValueAtTime(0.001, tm + 0.6);
                osc.start(tm);
                osc.stop(tm + 0.6);
            });
        } catch {}
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    function canCapture() {
        return Date.now() - lastCaptureTime >= CAPTURE_COOLDOWN_MS;
    }

    function voteChallenge(approved) {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'vote', challenge: captured.bottle.title, approved }));
        }
        captured = null;
    }

    function resumeGame() {
        gamePaused = false;
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'resume' }));
        }
    }

    function decodeContent(c) {
        return (c || '').replace(/\\n/g, '\n').trim();
    }

    function isNearest(m) {
        return nearest && m.id === nearest.id;
    }

    function elevationIcon(m) {
        if (m.elevation === 'high') return '⬆️';
        if (m.elevation === 'low') return '⬇️';
        return '';
    }
</script>

<div class="ar-root {theme}"
    ontouchstart={(e) => { touchStartX = e.touches[0].clientX; touchHeadingStart = heading; }}
    ontouchmove={(e) => {
        const dx = e.touches[0].clientX - touchStartX;
        heading = (touchHeadingStart - dx * 0.5 + 360) % 360;
        useCompass = false;
    }}
    onmousedown={(e) => { touchStartX = e.clientX; touchHeadingStart = heading; const move = (ev) => { const dx = ev.clientX - touchStartX; heading = (touchHeadingStart - dx * 0.5 + 360) % 360; useCompass = false; }; const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); }; window.addEventListener('mousemove', move); window.addEventListener('mouseup', up); }}
>
    <video bind:this={videoEl} autoplay playsinline muted class="ar-video"></video>

    {#if !cameraActive && !error}
        <div class="ar-overlay">
            {#if showNickModal}
                <div class="nick-modal">
                    <div class="nick-card">
                        <p class="nick-title">🎂 ¿Quién captura?</p>
                        <input class="nick-input" bind:value={nickname} placeholder="Tu nombre..." maxlength="20" />
                        <button class="start-btn" onclick={activate} disabled={!nickname.trim()}>🎉 ¡Jugar!</button>
                        <button class="nick-skip" onclick={() => showNickModal = false}>Cancelar</button>
                    </div>
                </div>
            {:else}
            <div class="ar-start">
                <button class="start-btn" onclick={activate}>
                    {#if webxrLoading}⏳ Iniciando AR…
                    {:else if webxrSupported}🔮 Activar Cámara AR
                    {:else}📸 {isEvent ? 'Activar Fiesta' : 'Activar Cámara AR'}{/if}
                </button>
                {#if webxrSupported}
                    <div class="webxr-badge">✨ WebXR ImmersiveAR disponible</div>
                {/if}
                <div class="ar-icon">{t.icon}</div>
                <p class="ar-title">{t.title}</p>
                {#if isEvent}
                    <p class="ar-subtitle">🎂 60 años joven 🎂</p>
                {/if}
                <p class="ar-desc">{t.desc}</p>
                <p class="ar-note">Gira 360° para descubrir todas las botellas</p>
                {#if isEvent}
                    <details class="rules-toggle">
                        <summary>📋 ¿Cómo jugar?</summary>
                        <div class="rules-card">
                            <p><strong>🎯 Gira lentamente</strong> — las botellas aparecen alrededor tuyo</p>
                            <p><strong>🍾 Toca para capturar</strong> — todas están a tu alcance</p>
                            <p><strong>⏳ Cooldown 2s</strong> — entre capturas</p>
                            <p><strong>🎯 Retos</strong> — completa el desafío y el grupo vota</p>
                            <p><strong>💀 ¡Cuidado!</strong> — hay mensajes aguafiestas (-50 pts)</p>
                        </div>
                    </details>
                {/if}
            </div>
            {/if}
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
                <div class="compass-center-line" style="background: {t.compassColor}"></div>
            </div>
            <div class="ar-status">
                <span class="good">📍 Modo local</span>
                <span>🧭 {Math.round(heading)}° {#if !useCompass}(modo touch){/if}</span>
                {#if !useCompass}
                    <button class="compass-btn" onclick={() => useCompass = true}>🧭 Brújula</button>
                {/if}
            </div>
        </div>

        <!-- Markers -->
        {#each markers as m (m.id)}
            <div class="ar-marker {isNearest(m) ? 'nearest' : 'far'}" style="left: {m.xPercent}%; top: {m.topPct}%;">
                <svg viewBox="0 0 48 48" class="marker-svg pulse">
                    <circle cx="24" cy="24" r="22" fill={t.rangeFill} stroke={t.rangeStroke} stroke-width="2.5"/>
                    <text x="24" y="30" text-anchor="middle" font-size="24">{t.markerRange}</text>
                </svg>
                <div class="marker-info info-nearest">
                    <span class="marker-name">{m.title || (theme === 'event' ? 'Sorpresa' : 'Botella')} {elevationIcon(m)}</span>
                    <span class="marker-dist" style="color: {t.accentColor}">🏁 ¡Toca!</span>
                </div>
                {#if gamePaused}
                    <div class="pause-overlay">
                        <div class="pause-badge">⏸️ ¡Reto en curso!</div>
                    </div>
                    <button class="resume-btn" onclick={resumeGame}>▶️ Continuar</button>
                {:else}
                    <button
                        class="capture-btn {theme}"
                        style="background: {t.captureBtnBg}; box-shadow: 0 2px 8px {t.captureBtnShadow}"
                        disabled={!!capturing || !canCapture()}
                        onclick={() => captureBottle(m)}
                    >
                        {capturing === m.id ? '...' : t.captureText}
                    </button>
                {/if}
            </div>
        {/each}

        <div class="ar-hud-bottom">
            <span class="hud-badge">👥 {onlineCount}</span>
            {#if wsConnected}
                <span class="hud-badge connected">🟢 En línea</span>
            {/if}
            <span class="hud-badge">🍾 {placedMarkers.length} restantes</span>
        </div>

        {#each proximityEvents as evt (evt.id)}
            <div class="proximity-toast {evt.event === 'enter' ? 'enter' : 'leave'}">
                {evt.event === 'enter' ? '🟢' : '🔴'} {evt.message}
            </div>
        {/each}

        {#if markers.length === 0 && placedMarkers.length > 0}
            <div class="no-bottles">{t.emptyText}</div>
        {/if}

        {#if placedMarkers.length === 0 && bottles.length > 0}
            <div class="no-bottles">🏆 ¡Todas capturadas!</div>
        {/if}

        {#if bottles.length === 0}
            <div class="no-bottles">Sin botellas disponibles</div>
        {/if}

        <button class="ar-close" onclick={deactivate}>✕</button>

        <!-- Confetti -->
        {#each confetti as c (c.id)}
            <span class="confetti-piece" style="left: {c.x}%; animation-delay: {c.delay}ms; animation-duration: {c.duration}ms;">{c.emoji}</span>
        {/each}

        <!-- Capture success modal (shared by both modes) -->
        {#if captured}
            <div class="capture-modal">
                <div class="capture-modal-card {captured.trap ? 'trap' : theme}">
                    {#if captured.trap}
                        <h2>💀 ¡Aguafiestas!</h2>
                        <pre class="capture-content">{decodeContent(captured.bottle.content)}</pre>
                        <div class="trap-penalty">-{captured.reward?.points || 50} puntos</div>
                    {:else if captured.challenge}
                        <h2>🎯 ¡Reto!</h2>
                        <pre class="capture-content">{decodeContent(captured.bottle.content)}</pre>
                        <div class="challenge-votes">
                            <button class="vote-btn approve" onclick={() => voteChallenge(true)}>👍 ¡Lo logró!</button>
                            <button class="vote-btn reject" onclick={() => voteChallenge(false)}>👎 Nope</button>
                        </div>
                    {:else}
                        <h2>{t.modalIcon} {captured.bottle.title}</h2>
                        <pre class="capture-content">{decodeContent(captured.bottle.content)}</pre>
                        {#if captured.reward && theme !== 'event'}
                            <div class="capture-reward">
                                ⛽ +{captured.reward.fuel} Combustible · 🏆 +{captured.reward.points} Puntos
                            </div>
                        {/if}
                        {#if theme === 'event'}
                            <div class="event-message">🎊 ¡Mensaje encontrado! 🎊</div>
                        {/if}
                    {/if}
                    <button class="capture-close-btn {theme}" style="background: {t.accentColor}" onclick={() => captured = null}>Cerrar</button>
                </div>
            </div>
        {/if}
    {/if}

    <!-- ── WebXR ImmersiveAR HUD ── -->
    {#if useWebXR}
        <div class="webxr-hud" role="dialog" aria-label="AR controls"
            ontouchstart={(e) => { if (useWebXR && webxrState && e.touches[0]) { webxrState.handleTap(e.touches[0].clientX, e.touches[0].clientY); } }}
            onclick={(e) => { if (useWebXR && webxrState) { webxrState.handleTap(e.clientX, e.clientY); } }}
        >
            <div class="webxr-top">
                <span class="hud-badge webxr-badge-active">🔮 AR Inmersivo</span>
                <span class="hud-badge">🍾 {bottles.filter(b => !b.found_by).length} cristales</span>
                {#if wsConnected}
                    <span class="hud-badge connected">🟢</span>
                {/if}
                <button class="hud-btn" onclick={deactivate}>✕</button>
            </div>

            <div class="webxr-instructions">
                Camina y toca un cristal para seleccionarlo
            </div>

            {#if selectedBottle}
                <div class="webxr-selected">
                    <div class="selected-card">
                        <span class="selected-name">{selectedBottle.title || 'Botella'}</span>
                        <button
                            class="capture-btn {theme}"
                            style="background: {t.captureBtnBg}; box-shadow: 0 2px 8px {t.captureBtnShadow}"
                            disabled={!!capturing}
                            onclick={captureWebXR}
                        >
                            {capturing ? '...' : t.captureText}
                        </button>
                    </div>
                </div>
            {/if}

            <!-- Proximity events (shared) -->
            {#each proximityEvents as evt (evt.id)}
                <div class="proximity-toast">
                    {evt.message}
                </div>
            {/each}

            <!-- Capture modal (shared) -->
            {#if captured}
                <div class="capture-modal">
                    <div class="capture-modal-card {captured.trap ? 'trap' : theme}">
                        {#if captured.trap}
                            <h2>💀 ¡Aguafiestas!</h2>
                            <pre class="capture-content">{decodeContent(captured.bottle.content)}</pre>
                            <div class="trap-penalty">-{captured.reward?.points || 50} puntos</div>
                        {:else if captured.challenge}
                            <h2>🎯 ¡Reto!</h2>
                            <pre class="capture-content">{decodeContent(captured.bottle.content)}</pre>
                            <div class="challenge-votes">
                                <button class="vote-btn approve" onclick={() => voteChallenge(true)}>👍 ¡Lo logró!</button>
                                <button class="vote-btn reject" onclick={() => voteChallenge(false)}>👎 Nope</button>
                            </div>
                        {:else}
                            <h2>{t.modalIcon} {captured.bottle.title}</h2>
                            <pre class="capture-content">{decodeContent(captured.bottle.content)}</pre>
                            {#if captured.reward && theme !== 'event'}
                                <div class="capture-reward">⛽ +{captured.reward.fuel} · 🏆 +{captured.reward.points}</div>
                            {/if}
                        {/if}
                        <button class="capture-close-btn {theme}" style="background: {t.accentColor}" onclick={() => captured = null}>Cerrar</button>
                    </div>
                </div>
            {/if}

            <!-- Confetti (shared) -->
            {#each confetti as c (c.id)}
                <span class="confetti-piece" style="left: {c.x}%; animation-delay: {c.delay}ms; animation-duration: {c.duration}ms;">{c.emoji}</span>
            {/each}

            {#if webxrLoading}
                <div class="webxr-loading">
                    <div class="spinner"></div>
                    <p>Iniciando AR…</p>
                </div>
            {/if}
        </div>
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

    /* ── WebXR HUD ── */
    .webxr-hud {
        position: absolute;
        inset: 0;
        z-index: 15;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .webxr-top {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.6rem 0.75rem;
        background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
    }
    .webxr-badge-active {
        background: rgba(79,195,247,0.2);
        color: #4fc3f7;
        border: 1px solid rgba(79,195,247,0.3);
    }
    .hud-btn {
        margin-left: auto;
        background: rgba(0,0,0,0.5);
        color: #fff;
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        font-size: 1rem;
        cursor: pointer;
        pointer-events: all;
    }
    .webxr-instructions {
        position: absolute;
        top: 45%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: rgba(255,255,255,0.5);
        font-size: 0.85rem;
        text-align: center;
        text-shadow: 0 1px 6px rgba(0,0,0,0.9);
        pointer-events: none;
        animation: pulse-fade 2.5s ease-in-out infinite;
    }
    @keyframes pulse-fade {
        0%, 100% { opacity: 0.25; }
        50% { opacity: 0.65; }
    }
    .webxr-selected {
        position: absolute;
        bottom: 1.5rem;
        left: 50%;
        transform: translateX(-50%);
        pointer-events: all;
    }
    .selected-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        background: rgba(0,0,0,0.8);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 16px;
        padding: 0.75rem 1.25rem;
        backdrop-filter: blur(12px);
    }
    .selected-name {
        color: #fff;
        font-weight: 600;
        font-size: 0.9rem;
    }
    .webxr-loading {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.8);
        color: #fff;
        gap: 1rem;
    }
    .spinner {
        width: 36px;
        height: 36px;
        border: 3px solid rgba(255,255,255,0.1);
        border-top-color: #4fc3f7;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .webxr-badge {
        color: #4fc3f7;
        font-size: 0.7rem;
        margin-top: -0.3rem;
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
    .nick-modal {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
    }
    .nick-card {
        background: #141417;
        border: 1px solid rgba(201,168,124,0.4);
        border-radius: 16px;
        padding: 2rem 1.5rem;
        text-align: center;
        max-width: 300px;
        width: 90%;
    }
    .nick-title {
        color: #c9a87c;
        font-family: Playfair Display, serif;
        font-size: 1.3rem;
        margin: 0 0 1rem 0;
    }
    .nick-input {
        width: 100%;
        padding: 0.6rem 0.8rem;
        border: 2px solid rgba(201,168,124,0.3);
        border-radius: 8px;
        background: rgba(255,255,255,0.05);
        color: #fff;
        font-size: 1rem;
        text-align: center;
        outline: none;
        margin-bottom: 1rem;
        box-sizing: border-box;
    }
    .nick-input:focus { border-color: #c9a87c; }
    .nick-skip {
        background: none;
        border: none;
        color: rgba(255,255,255,0.5);
        cursor: pointer;
        font-size: 0.85rem;
        margin-top: 0.5rem;
        padding: 0.3rem;
    }
    .rules-toggle {
        margin-top: 0.5rem;
        text-align: left;
        max-width: 280px;
    }
    .rules-toggle summary {
        color: #c9a87c;
        font-size: 0.85rem;
        cursor: pointer;
        margin-bottom: 0.5rem;
    }
    .rules-card {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(201,168,124,0.2);
        border-radius: 8px;
        padding: 0.75rem;
        font-size: 0.8rem;
        color: rgba(255,255,255,0.8);
    }
    .rules-card p { margin: 0.3rem 0; }

    .ar-icon { font-size: 3rem; }
    .ar-title { font-family: Playfair Display, serif; font-size: 1.5rem; margin: 0; text-align: center; }
    .ar-desc { color: rgba(255,255,255,0.7); font-size: 0.9rem; margin: 0; text-align: center; }
    .ar-subtitle { color: #c9a87c; font-size: 1.1rem; margin: 0; text-align: center; font-weight: 600; }
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
    .compass-btn {
        background: none;
        border: 1px solid rgba(255,255,255,0.3);
        color: #fff;
        border-radius: 4px;
        padding: 2px 6px;
        font-size: 10px;
        cursor: pointer;
        pointer-events: all;
    }

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

    .ar-root.event .info-nearest {
        border-color: rgba(136,19,55,0.5);
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
        font-size: 11px;
        font-weight: 700;
        text-shadow: 0 1px 3px rgba(0,0,0,1);
    }

    .capture-btn {
        pointer-events: all;
        color: #fff;
        border: none;
        border-radius: 9999px;
        padding: 6px 16px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }

    .capture-btn:disabled, .capture-btn.disabled {
        opacity: 0.4;
        background: #555 !important;
        box-shadow: none !important;
    }
    .pause-overlay {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.7);
        border-radius: 16px;
        padding: 1rem 1.5rem;
        z-index: 40;
        pointer-events: none;
    }
    .pause-badge {
        color: #c9a87c;
        font-family: Playfair Display, serif;
        font-size: 1.3rem;
        text-align: center;
        animation: pulse-text 1.5s infinite;
    }
    @keyframes pulse-text { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    .resume-btn {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #22c55e;
        border: none;
        border-radius: 9999px;
        padding: 8px 20px;
        font-size: 14px;
        font-weight: 700;
        color: #fff;
        cursor: pointer;
        z-index: 50;
        pointer-events: all;
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

    /* Confetti */
    .confetti-piece {
        position: absolute;
        top: -20px;
        font-size: 1.5rem;
        z-index: 25;
        animation: confettiFall var(--duration, 2000ms) ease-in forwards;
        pointer-events: none;
    }

    @keyframes confettiFall {
        0% { opacity: 1; transform: translateY(0) rotate(0deg); }
        100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
    }

    @keyframes slideIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
    }

    .capture-modal {
        position: absolute;
        inset: 0;
        z-index: 30;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.7);
    }

    .capture-modal-card {
        background: var(--surface, #141417);
        border: 1px solid rgba(201,168,124,0.3);
        border-radius: 12px;
        padding: 1.5rem;
        max-width: 340px;
        width: 90%;
        color: #fff;
    }

    .capture-modal-card.event {
        border-color: rgba(136,19,55,0.4);
    }

    .capture-modal-card h2 {
        font-family: Playfair Display, serif;
        font-size: 1.2rem;
        margin: 0 0 1rem 0;
        color: var(--accent, #c9a87c);
    }

    .capture-modal-card.event h2 {
        color: #c9a87c;
    }

    .capture-content {
        background: rgba(0,0,0,0.4);
        border-radius: 8px;
        padding: 1rem;
        font-size: 14px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
        margin-bottom: 1rem;
        max-height: 40vh;
        overflow-y: auto;
    }

    .capture-reward {
        background: rgba(201,168,124,0.1);
        border: 1px solid rgba(201,168,124,0.3);
        border-radius: 8px;
        padding: 0.6rem;
        text-align: center;
        font-weight: 600;
        margin-bottom: 1rem;
        color: var(--accent, #c9a87c);
    }

    .capture-modal-card.trap { border-color: rgba(239,68,68,0.6) !important; }
    .capture-modal-card.trap h2 { color: #f87171 !important; }
    .challenge-votes { display: flex; gap: 10px; justify-content: center; margin-top: 0.75rem; }
    .vote-btn {
        padding: 0.6rem 1.2rem;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        color: #fff;
    }
    .vote-btn.approve { background: #22c55e; }
    .vote-btn.reject { background: #ef4444; }
    .vote-btn:active { transform: scale(0.95); }
    .trap-penalty { color: #f87171; font-size: 1.2rem; font-weight: 700; text-align: center; margin: 0.5rem 0; }
    .event-message {
        background: rgba(201,168,124,0.1);
        border: 1px solid rgba(201,168,124,0.3);
        border-radius: 8px;
        padding: 0.8rem;
        text-align: center;
        font-weight: 700;
        font-size: 1.1rem;
        margin-bottom: 1rem;
        color: #c9a87c;
    }

    .capture-close-btn {
        width: 100%;
        padding: 0.7rem;
        color: var(--bg, #09090b);
        border: none;
        border-radius: 8px;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
    }
</style>
