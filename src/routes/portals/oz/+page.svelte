<!--
	/portals/oz — Wizard of Oz-inspired multiplayer world. You arrive as
	Dorothy in a field of flowers. Munchkins hide inside — walk close to
	reveal them. Flying monkeys swoop down in waves — click/tap to defeat.
	Other players (Dorothys) appear as glowing emerald avatars. Shared
	collectibles: whoever reaches a munchkin or defeats a monkey first
	gets the points.
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	let container;
	let score = $state(0);
	let booted = $state(false);
	let errorMsg = $state('');
	let cleanup = null;
	let isTouch = $state(false);

	// Multiplayer HUD state
	let presence = $state({ count: 1, roster: [] });
	let waveWarning = $state(false);

	// Friendly player names (same generator as grab-demo)
	const ADJECTIVES = ['Swift', 'Brave', 'Clever', 'Merry', 'Bold', 'Calm', 'Eager', 'Gentle', 'Happy', 'Lucky', 'Mighty', 'Noble', 'Playful', 'Quick', 'Silly', 'Wise', 'Zany', 'Cosmic', 'Golden', 'Silver'];
	const ANIMALS = ['Fox', 'Otter', 'Owl', 'Wolf', 'Bear', 'Hawk', 'Crane', 'Lynx', 'Seal', 'Moth', 'Koi', 'Crow', 'Stag', 'Hare', 'Wren', 'Newt', 'Pika', 'Tern', 'Brambling', 'Caracol'];
	function randomPlayerName() {
		return ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
			+ ' ' + ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
	}

	// ── Mobile thumbstick state ──
	let stickActive = $state(false);
	let stickOrigin = { x: 0, y: 0 };
	let stickPos = $state({ x: 0, y: 0 });
	let stickStartTime = 0;
	let stickMoved = false;
	const STICK_MAX_R = 60;
	const TAP_THRESHOLD = 10;

	// ── Look-zone state (mobile) ──
	let lookStart = null;
	let lookLast = null;
	let lookMoved = false;

	// Shared movement input (written by thumbstick, read by oz-world's animate loop)
	// We expose it via the cleanup object — but oz-world uses keyboard directly,
	// so for now we write to a shared object the page owns and pass it in.
	let moveInput = { x: 0, y: 0 };

	onMount(async () => {
		if (!browser || !container) return;
		// Detect actual touch usage (not just capability — Chromebook fix)
		isTouch = false;
		const onFirstTouch = () => { isTouch = true; window.removeEventListener('touchstart', onFirstTouch); };
		window.addEventListener('touchstart', onFirstTouch, { once: true, passive: true });

		try {
			const { bootOzWorld } = await import('$lib/portals-ecs/oz-world.js');
			cleanup = await bootOzWorld(container, {
				playerName: randomPlayerName(),
				onScoreUpdate: (s) => { score = s; },
				onPresenceUpdate: (p) => { presence = p; },
			});
			booted = true;
		} catch (e) {
			console.error('[oz] boot failed:', e);
			errorMsg = e.message;
		}

		// Listen for monkey waves to flash the warning
		if (typeof window !== 'undefined') {
			// The WS handler in oz-world doesn't emit a DOM event for waves yet,
			// but we wire the listener for when it does. For now the warning
			// pulses every 20s (matches the DO's wave interval).
			waveWarningTimer = setInterval(() => {
				waveWarning = true;
				setTimeout(() => { waveWarning = false; }, 3000);
			}, 20000);
		}
	});

	let waveWarningTimer;
	onDestroy(() => {
		if (cleanup) cleanup.destroy();
		if (waveWarningTimer) clearInterval(waveWarningTimer);
	});

	// ── Thumbstick (left side): drag to move, tap to collect monkey ──
	function onStickStart(e) {
		e.preventDefault();
		const t = e.touches[0];
		stickActive = true;
		stickMoved = false;
		stickStartTime = Date.now();
		stickOrigin = { x: t.clientX, y: t.clientY };
		stickPos = { x: 0, y: 0 };
	}
	function onStickMove(e) {
		if (!stickActive) return;
		e.preventDefault();
		const t = e.touches[0];
		const dx = t.clientX - stickOrigin.x;
		const dy = t.clientY - stickOrigin.y;
		const len = Math.sqrt(dx * dx + dy * dy);
		if (len > TAP_THRESHOLD) stickMoved = true;
		const clampedLen = Math.min(len, STICK_MAX_R);
		const angle = Math.atan2(dy, dx);
		stickPos = { x: Math.cos(angle) * clampedLen, y: Math.sin(angle) * clampedLen };
		// TODO: wire moveInput to oz-world's movement (oz uses keyboard for now)
	}
	function onStickEnd(e) {
		e.preventDefault();
		stickActive = false;
		stickPos = { x: 0, y: 0 };
		// Tap on left half (no drag) = try to collect a monkey
		if (!stickMoved && Date.now() - stickStartTime < 300 && cleanup?.touch) {
			cleanup.touch.tryCollectMonkeyAt(stickOrigin.x, stickOrigin.y);
		}
	}

	// ── Look-zone (right side): drag to look, tap to collect monkey ──
	function onLookStart(e) {
		const t = e.touches[0];
		lookStart = { x: t.clientX, y: t.clientY, time: Date.now() };
		lookLast = { x: t.clientX, y: t.clientY };
		lookMoved = false;
	}
	function onLookMove(e) {
		if (!lookLast) return;
		const t = e.touches[0];
		const dx = t.clientX - lookLast.x;
		const dy = t.clientY - lookLast.y;
		if (Math.abs(t.clientX - lookStart.x) > TAP_THRESHOLD || Math.abs(t.clientY - lookStart.y) > TAP_THRESHOLD) {
			lookMoved = true;
		}
		// Look is handled by oz-world's mousemove listener on desktop;
		// on touch we'd need to forward — TODO for full mobile support.
		lookLast = { x: t.clientX, y: t.clientY };
	}
	function onLookEnd(e) {
		// Tap (no drag, quick) = collect monkey at the tap point
		if (lookStart && !lookMoved && Date.now() - lookStart.time < 300 && cleanup?.touch) {
			cleanup.touch.tryCollectMonkeyAt(lookStart.x, lookStart.y);
		}
		lookStart = null;
		lookLast = null;
		lookMoved = false;
	}
</script>

<svelte:head>
	<title>Oz — Munchkin Garden</title>
</svelte:head>

<div class="demo-page" class:booted>
	<div class="canvas-container" bind:this={container}></div>

	{#if booted && isTouch}
		<div class="look-zone"
			ontouchstart={onLookStart}
			ontouchmove={onLookMove}
			ontouchend={onLookEnd}
		></div>
		<div class="thumbstick-zone"
			ontouchstart={onStickStart}
			ontouchmove={onStickMove}
			ontouchend={onStickEnd}
		>
			<div class="thumbstick-base" class:active={stickActive}>
				<div class="thumbstick-knob" style="transform: translate({stickPos.x}px, {stickPos.y}px)"></div>
			</div>
		</div>
	{/if}

	{#if booted}
		<div class="hud">
			<div class="score-card">
				<span class="score-label">Points</span>
				<span class="score-value">{score}</span>
			</div>
			<div class="presence">
				<span class="presence-count">👤 {presence.count}</span>
				<span class="presence-names">
					{#each presence.roster as r, i}{#if i > 0}, {/if}{r.name}{/each}
					{#if presence.roster.length === 0}<em>just you so far</em>{/if}
				</span>
			</div>
		</div>

		{#if waveWarning}
			<div class="wave-warning">🐒 Monkeys incoming!</div>
		{/if}

		<div class="instructions">
			{#if isTouch}
				<p>🌸 <strong>Left stick</strong> walk · <strong>Right drag</strong> look · <strong>Tap</strong> monkeys</p>
			{:else}
				<p>🌸 <strong>WASD</strong> walk · <strong>Mouse drag</strong> look · <strong>Click</strong> monkeys</p>
			{/if}
			<p class="hint">Walk close to flowers to reveal munchkins · Defeat flying monkeys for 5 points each</p>
		</div>
	{:else if errorMsg}
		<div class="hud">
			<div class="error-msg">⚠️ {errorMsg}</div>
		</div>
	{/if}
</div>

<style>
	.demo-page {
		position: fixed;
		inset: 0;
		background: #2a3318;
		overflow: hidden;
		z-index: 200;  /* cover the site nav (z-index: 100) */
	}
	.canvas-container {
		width: 100%;
		height: 100%;
		cursor: crosshair;
	}
	.canvas-container :global(canvas) {
		display: block;
	}
	.hud {
		position: fixed;
		top: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		text-align: center;
		pointer-events: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}
	.score-card {
		background: rgba(20, 30, 10, 0.85);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 215, 0, 0.3);
		border-radius: 16px;
		padding: 0.6rem 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.score-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: rgba(255, 215, 0, 0.7);
	}
	.score-value {
		font-size: 1.8rem;
		font-weight: 800;
		color: #ffd700;
	}
	.presence {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.presence-count { font-weight: 700; color: rgba(255, 255, 255, 0.7); }
	.presence-names em { opacity: 0.5; font-style: italic; }
	.wave-warning {
		position: fixed;
		top: 30%;
		left: 50%;
		transform: translateX(-50%);
		z-index: 15;
		background: rgba(60, 20, 60, 0.85);
		border: 1px solid rgba(170, 80, 170, 0.5);
		color: #ff88ff;
		padding: 0.6rem 1.5rem;
		border-radius: 12px;
		font-size: 1rem;
		font-weight: 700;
		backdrop-filter: blur(8px);
		animation: pulse 0.5s ease-in-out infinite alternate;
	}
	.error-msg {
		background: rgba(100, 20, 20, 0.8);
		border-radius: 12px;
		padding: 0.75rem 1.5rem;
		color: #ff8888;
		font-size: 0.9rem;
	}
	.instructions {
		position: fixed;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		text-align: center;
		pointer-events: none;
		background: rgba(20, 30, 10, 0.7);
		backdrop-filter: blur(8px);
		padding: 0.6rem 1.2rem;
		border-radius: 12px;
		border: 1px solid rgba(255, 215, 0, 0.15);
	}
	.instructions p {
		margin: 0;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.7);
	}
	.instructions .hint {
		font-size: 0.7rem;
		opacity: 0.6;
		margin-top: 0.2rem;
	}

	/* Mobile touch overlays */
	.look-zone {
		position: fixed; top: 0; right: 0; width: 50%; height: 100%;
		z-index: 5; touch-action: none; background: transparent;
	}
	.thumbstick-zone {
		position: fixed; top: 0; left: 0; width: 50%; height: 100%;
		z-index: 5; touch-action: none;
		display: flex; align-items: flex-end; justify-content: flex-start; padding: 2rem;
	}
	.thumbstick-base {
		width: 120px; height: 120px; border-radius: 50%;
		border: 2px solid rgba(255, 215, 0, 0.3);
		background: rgba(20, 30, 10, 0.35); backdrop-filter: blur(6px);
		position: relative; opacity: 0.55; transition: opacity 0.15s, border-color 0.15s;
	}
	.thumbstick-base.active { opacity: 1; border-color: rgba(255, 215, 0, 0.6); }
	.thumbstick-knob {
		position: absolute; top: 50%; left: 50%; width: 48px; height: 48px;
		margin: -24px 0 0 -24px; border-radius: 50%;
		background: radial-gradient(circle at 35% 35%, rgba(255, 215, 0, 0.9), rgba(255, 215, 0, 0.4));
		border: 1px solid rgba(255, 215, 0, 0.6);
	}
	@keyframes pulse {
		from { opacity: 0.7; }
		to { opacity: 1; }
	}
</style>
