<!--
	/portals/grab-demo — ECS collectible demo with shared-room multiplayer.
	Players auto-join a level-N room (everyone at the same difficulty is in
	the same room — no invite links). Presence roster shows who's here.
	Round timer drives win condition: highest score when time expires
	promotes to the next level; losers stay for the next round.
	WASD/touch-stick to move, mouse/touch-drag to look, click/tap to collect.
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	let container;
	let counter = $state(0);
	let booted = $state(false);
	let errorMsg = $state('');
	let cleanup = null;
	let isTouch = $state(false);

	// Multiplayer HUD state
	let scoreState = $state({ scores: [], level: 1 });
	let presence = $state({ count: 1, roster: [] });
	let roundState = $state({ active: false, endMs: 0, level: 1 });
	let roundOverlay = $state(null); // { winner, winnerIsMe, scores } | null
	let timerDisplay = $state('');

	// Level from URL query param (default 1). Promoted players redirect here
	// with ?level=N+1, landing in a fresh (harder) DO room instance.
	let level = $derived(parseInt($page.url.searchParams.get('level') || '1', 10));

	// ── Visible thumbstick state (mobile only) ──
	let stickActive = $state(false);
	let stickOrigin = { x: 0, y: 0 };
	let stickPos = $state({ x: 0, y: 0 });
	const STICK_MAX_R = 60;

	// ── Look-zone state (mobile only) — drag to look, tap to collect ──
	let lookStart = null;
	let lookLast = null;
	let lookMoved = false;
	const TAP_THRESHOLD = 10;

	onMount(async () => {
		if (!browser || !container) return;
		isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		try {
			const { bootGrabDemo } = await import('$lib/portals-ecs/grab-demo-world.js');
			cleanup = await bootGrabDemo(
				container,
				(count) => { counter = count; },
				{
					level,
					playerName: 'Player-' + Math.random().toString(36).slice(2, 5),
					onScoreUpdate: (s) => { scoreState = s; },
					onPresenceUpdate: (p) => { presence = p; },
					onRoundUpdate: (r) => {
						roundState = r;
						if (r.winner !== undefined) {
							roundOverlay = { winner: r.winner, winnerIsMe: r.winnerIsMe, scores: r.scores };
							setTimeout(() => { roundOverlay = null; }, 4000);
						}
					},
				}
			);
			booted = true;
			// Tick the timer display every 200ms
			startTimerTick();
		} catch (e) {
			console.error('[grab-demo] boot failed:', e);
			errorMsg = e.message;
		}
	});

	onDestroy(() => {
		if (cleanup) cleanup.destroy();
		if (timerInterval) clearInterval(timerInterval);
	});

	// ── Round timer display ──
	let timerInterval;
	function startTimerTick() {
		timerInterval = setInterval(() => {
			if (roundState.active && roundState.endMs) {
				const remaining = Math.max(0, roundState.endMs - Date.now());
				const s = Math.ceil(remaining / 1000);
				timerDisplay = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
			} else {
				timerDisplay = '';
			}
		}, 200);
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
			<div class="hud-top">
				<div class="level-badge">Level {level}</div>
				{#if timerDisplay}
					<div class="timer" class:urgent={timerDisplay === '0:15' || (roundState.endMs && roundState.endMs - Date.now() < 15000)}>
						⏱ {timerDisplay}
					</div>
				{/if}
			</div>
			<div class="scoreboard">
				{#each scoreState.scores as s, i}
					<div class="score-card" class:me={s.isMe} class:leading={i === 0 && scoreState.scores.length > 1}>
						<span class="score-label">{s.name}{s.isMe ? ' (you)' : ''}</span>
						<span class="score-value">{s.score}</span>
					</div>
				{/each}
				{#if scoreState.scores.length === 0}
					<div class="score-card"><span class="score-label">Waiting...</span></div>
				{/if}
			</div>
			<div class="presence">
				<span class="presence-count">👤 {presence.count}</span>
				<span class="presence-names">
					{#each presence.roster as r, i}{#if i > 0}, {/if}{r.name}{/each}
					{#if presence.roster.length === 0}<em>just you so far</em>{/if}
				</span>
			</div>
		</div>

		{#if roundOverlay}
			<div class="round-overlay">
				{#if roundOverlay.winnerIsMe}
					<div class="round-result win">
						<div class="result-title">🎉 You won!</div>
						<div class="result-detail">Promoting to Level {level + 1}...</div>
					</div>
				{:else if roundOverlay.winner}
					<div class="round-result lose">
						<div class="result-title">{roundOverlay.winner} won</div>
						<div class="result-detail">Waiting for the next round...</div>
					</div>
				{:else}
					<div class="round-result">
						<div class="result-title">🤝 Tie!</div>
					</div>
				{/if}
				<div class="result-scores">
					{#each roundOverlay.scores as s}
						<div class="result-score-row" class:me={s.name === presence.roster[0]?.name || s.name === 'you'}>
							<span>{s.name}</span><span>{s.score}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div class="instructions">
			{#if isTouch}
				<p><strong>Left stick</strong> move · <strong>Right drag</strong> look · <strong>Tap</strong> collect</p>
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
		/* Cover the site nav (z-index: var(--z-nav) = 100). grab-demo is an
		   immersive fullscreen experience like PortalScene — the nav shouldn't
		   be visible while playing. Without this, the HUD piled on top of the
		   nav because both shared the same stacking context. */
		z-index: 200;
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
		gap: 0.75rem;
		background: rgba(10, 10, 20, 0.85);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(201, 168, 124, 0.2);
		border-radius: 16px;
		padding: 0.6rem 1.2rem;
		flex-wrap: wrap;
		justify-content: center;
		max-width: 90vw;
	}
	.score-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 60px;
	}
	.score-card.me .score-label { color: #c9a87c; }
	.score-card.me .score-value { color: #c9a87c; }
	.score-card.leading .score-value { color: #8fbc8f; }
	.score-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: rgba(255, 255, 255, 0.5);
		max-width: 90px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.score-value {
		font-size: 1.4rem;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.85);
	}
	.hud-top {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 0.4rem;
	}
	.level-badge {
		background: rgba(201, 168, 124, 0.2);
		border: 1px solid rgba(201, 168, 124, 0.4);
		color: #c9a87c;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.2rem 0.7rem;
		border-radius: 8px;
		letter-spacing: 0.5px;
	}
	.timer {
		font-size: 1rem;
		font-weight: 700;
		color: rgba(255, 255, 255, 0.8);
		font-variant-numeric: tabular-nums;
	}
	.timer.urgent { color: #ff6b6b; animation: pulse 0.5s ease-in-out infinite alternate; }
	.presence {
		margin-top: 0.4rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}
	.presence-count { font-weight: 700; color: rgba(255, 255, 255, 0.7); }
	.presence-names em { opacity: 0.5; font-style: italic; }

	/* Round-end overlay */
	.round-overlay {
		position: fixed;
		inset: 0;
		z-index: 20;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		background: rgba(5, 3, 10, 0.85);
		backdrop-filter: blur(8px);
		pointer-events: none;
	}
	.round-result { text-align: center; }
	.result-title { font-size: 2rem; font-weight: 800; }
	.round-result.win .result-title { color: #8fbc8f; }
	.round-result.lose .result-title { color: #ff8888; }
	.result-detail { font-size: 0.95rem; color: rgba(255, 255, 255, 0.6); margin-top: 0.4rem; }
	.result-scores {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 200px;
	}
	.result-score-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.7);
		padding: 0.2rem 0.8rem;
	}
	.result-score-row.me { color: #c9a87c; font-weight: 700; }
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
