<!--
	/portals/grab-demo — ECS collectible demo. 30 GLB entities (10×3 models)
	scattered in a space with a background mural. Uses IWSDK World + elics
	components/systems — same architecture as the real portal engine.
	WASD to move, mouse drag to look, click objects to collect.
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	let container;
	let counter = $state(0);
	const total = 30;
	let booted = $state(false);
	let errorMsg = $state('');
	let cleanup = null;
	let score = $state({ you: 0, opponent: 0, opponentName: 'Waiting...' });
	let isTouch = $state(false);

	// Room ID from URL query param, or generate one
	let roomId = $derived($page.url.searchParams.get('room') || 'demo');
	let shareUrl = $derived(typeof window !== 'undefined' ? `${window.location.origin}/portals/grab-demo?room=${roomId}` : '');

	// ── Visible thumbstick state (mobile only) ──
	// Floating thumbstick: the base repositions to wherever the first touch
	// lands in the left half, then the knob follows the finger (clamped).
	let stickActive = $state(false);
	let stickOrigin = { x: 0, y: 0 };
	let stickPos = $state({ x: 0, y: 0 });
	let stickBasePos = $state({ x: -200, y: -200 }); // off-screen until first touch
	const STICK_MAX_R = 60;

	// ── Look-zone state (mobile only) — drag to look, tap to collect ──
	let lookStart = null;
	let lookLast = null;
	let lookMoved = false;
	const TAP_THRESHOLD = 10; // px of movement before it's a drag, not a tap

	onMount(async () => {
		if (!browser || !container) return;
		isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		try {
			const { bootGrabDemo } = await import('$lib/portals-ecs/grab-demo-world.js');
			cleanup = await bootGrabDemo(
				container,
				(count) => { counter = count; },
				{
					roomId,
					playerName: 'Player-' + Math.random().toString(36).slice(2, 5),
					onScoreUpdate: (s) => { score = s; },
				}
			);
			booted = true;
		} catch (e) {
			console.error('[grab-demo] boot failed:', e);
			errorMsg = e.message;
		}
	});

	onDestroy(() => {
		if (cleanup) cleanup.destroy();
	});

	function copyShareLink() {
		navigator.clipboard?.writeText(shareUrl);
	}

	// ── Thumbstick (left side): drag to move ──
	function onStickStart(e) {
		e.preventDefault();
		const t = e.touches[0];
		stickActive = true;
		stickOrigin = { x: t.clientX, y: t.clientY };
		stickPos = { x: 0, y: 0 };
	}
	function onStickMove(e) {
		if (!stickActive || !cleanup?.touch) return;
		e.preventDefault();
		const t = e.touches[0];
		const dx = t.clientX - stickOrigin.x;
		const dy = t.clientY - stickOrigin.y;
		const len = Math.sqrt(dx * dx + dy * dy);
		const clampedLen = Math.min(len, STICK_MAX_R);
		const angle = Math.atan2(dy, dx);
		stickPos = { x: Math.cos(angle) * clampedLen, y: Math.sin(angle) * clampedLen };
		// Write normalized -1..1 into the shared touchInput the world reads.
		cleanup.touch.input.x = stickPos.x / STICK_MAX_R;
		cleanup.touch.input.y = stickPos.y / STICK_MAX_R;
	}
	function onStickEnd(e) {
		e.preventDefault();
		stickActive = false;
		stickPos = { x: 0, y: 0 };
		if (cleanup?.touch) { cleanup.touch.input.x = 0; cleanup.touch.input.y = 0; }
	}

	// ── Look-zone (right side): drag to look, tap to collect ──
	function onLookStart(e) {
		const t = e.touches[0];
		lookStart = { x: t.clientX, y: t.clientY, time: Date.now() };
		lookLast = { x: t.clientX, y: t.clientY };
		lookMoved = false;
	}
	function onLookMove(e) {
		if (!lookLast || !cleanup?.touch) return;
		const t = e.touches[0];
		const dx = t.clientX - lookLast.x;
		const dy = t.clientY - lookLast.y;
		if (Math.abs(t.clientX - lookStart.x) > TAP_THRESHOLD || Math.abs(t.clientY - lookStart.y) > TAP_THRESHOLD) {
			lookMoved = true;
		}
		if (lookMoved) {
			cleanup.touch.applyLook(dx, dy);
		}
		lookLast = { x: t.clientX, y: t.clientY };
	}
	function onLookEnd(e) {
		// Tap (no drag, quick) = collect at the touch point.
		if (lookStart && !lookMoved && Date.now() - lookStart.time < 300 && cleanup?.touch) {
			cleanup.touch.tryCollectAt(lookStart.x, lookStart.y);
		}
		lookStart = null;
		lookLast = null;
		lookMoved = false;
	}
</script>

<svelte:head>
	<title>Grab Demo — Collect 30</title>
</svelte:head>

<div class="demo-page" class:booted>
	<div class="canvas-container" bind:this={container}></div>

	{#if booted && isTouch}
		<!-- Look-zone: right half of screen. Drag to look, tap to collect. -->
		<div
			class="look-zone"
			ontouchstart={onLookStart}
			ontouchmove={onLookMove}
			ontouchend={onLookEnd}
		></div>
		<!-- Thumbstick: left half of screen. Drag to move. Visible base + knob. -->
		<div
			class="thumbstick-zone"
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
			<div class="scoreboard">
				<div class="score-card you" class:winning={score.you > score.opponent} class:losing={score.you < score.opponent}>
					<span class="score-label">You</span>
					<span class="score-value">{score.you}</span>
				</div>
				<div class="vs">vs</div>
				<div class="score-card opponent" class:winning={score.opponent > score.you} class:losing={score.opponent < score.you}>
					<span class="score-label">{score.opponentName}</span>
					<span class="score-value">{score.opponent}</span>
				</div>
			</div>
			<div class="remaining">Remaining: {total - score.you - score.opponent}</div>
			{#if score.you + score.opponent >= total}
				<div class="complete-msg">
					{#if score.you > score.opponent}
						🎉 You win!
					{:else if score.opponent > score.you}
						😅 {score.opponentName} wins!
					{:else}
						🤝 Tie!
					{/if}
				</div>
			{/if}
		</div>

		<div class="share-bar">
			<button class="share-btn" onclick={copyShareLink}>📋 Copy link to invite opponent</button>
			<span class="room-id">Room: {roomId}</span>
		</div>

			<div class="instructions">
				{#if isTouch}
					<p><strong>Left stick</strong> move · <strong>Right side drag</strong> look · <strong>Tap</strong> collect</p>
				{:else}
					<p><strong>WASD</strong> move · <strong>Mouse drag</strong> look · <strong>Click</strong> collect</p>
				{/if}
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
		background: #05030a;
		overflow: hidden;
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
	}
	.scoreboard {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: rgba(10, 10, 20, 0.85);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(201, 168, 124, 0.2);
		border-radius: 16px;
		padding: 0.75rem 1.5rem;
	}
	.score-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 80px;
	}
	.score-card.winning .score-value { color: #8fbc8f; }
	.score-card.losing .score-value { opacity: 0.5; }
	.score-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: rgba(255, 255, 255, 0.5);
		max-width: 100px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.score-value {
		font-size: 1.8rem;
		font-weight: 800;
		color: #c9a87c;
	}
	.score-card.you .score-label { color: #c9a87c; }
	.score-card.opponent .score-label { color: #4fc3f7; }
	.score-card.opponent .score-value { color: #4fc3f7; }
	.vs {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.3);
	}
	.remaining {
		margin-top: 0.4rem;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.5);
	}
	.complete-msg {
		margin-top: 0.5rem;
		font-size: 1.3rem;
		font-weight: 700;
		animation: pulse 1s ease-in-out infinite alternate;
	}
	.share-bar {
		position: fixed;
		top: 1.5rem;
		right: 1.5rem;
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.3rem;
	}
	.share-btn {
		background: rgba(201, 168, 124, 0.2);
		border: 1px solid rgba(201, 168, 124, 0.4);
		color: #c9a87c;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		font-size: 0.8rem;
		cursor: pointer;
		backdrop-filter: blur(8px);
	}
	.share-btn:hover {
		background: rgba(201, 168, 124, 0.3);
	}
	.room-id {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.3);
		font-family: monospace;
	}
	@keyframes pulse {
		from { opacity: 0.7; }
		to { opacity: 1; }
	}
	.instructions {
		position: fixed;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		text-align: center;
		pointer-events: none;
		background: rgba(10, 10, 20, 0.7);
		backdrop-filter: blur(8px);
		padding: 0.5rem 1.2rem;
		border-radius: 12px;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}
	.instructions p {
		margin: 0;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.6);
	}

	/* ── Mobile touch overlays ── */
	/* Look-zone: right half of screen, transparent. Intercepts touches
	   before the canvas so drag=look and tap=collect work cleanly. */
	.look-zone {
		position: fixed;
		top: 0;
		right: 0;
		width: 50%;
		height: 100%;
		z-index: 5;
		touch-action: none;
		background: transparent;
	}
	/* Thumbstick-zone: left half of screen. Captures touches (drag to move).
	   The visible stick is a child that ignores pointer events itself. */
	.thumbstick-zone {
		position: fixed;
		top: 0;
		left: 0;
		width: 50%;
		height: 100%;
		z-index: 5;
		touch-action: none;
		display: flex;
		align-items: flex-end;
		justify-content: flex-start;
		padding: 2rem;
	}
	.thumbstick-base {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		border: 2px solid rgba(201, 168, 124, 0.3);
		background: rgba(10, 10, 20, 0.35);
		backdrop-filter: blur(6px);
		position: relative;
		pointer-events: none;
		opacity: 0.55;
		transition: opacity 0.15s ease, border-color 0.15s ease;
	}
	.thumbstick-base.active {
		opacity: 1;
		border-color: rgba(201, 168, 124, 0.6);
	}
	.thumbstick-knob {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 48px;
		height: 48px;
		margin: -24px 0 0 -24px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 35%, rgba(201, 168, 124, 0.9), rgba(201, 168, 124, 0.4));
		border: 1px solid rgba(201, 168, 124, 0.6);
		transition: transform 0.05s linear; /* snappy but smooths sub-pixel jitter */
	}
</style>
