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

	// Room ID from URL query param, or generate one
	let roomId = $derived($page.url.searchParams.get('room') || 'demo');
	let shareUrl = $derived(typeof window !== 'undefined' ? `${window.location.origin}/portals/grab-demo?room=${roomId}` : '');

	onMount(async () => {
		if (!browser || !container) return;
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
</script>

<svelte:head>
	<title>Grab Demo — Collect 30</title>
</svelte:head>

<div class="demo-page" class:booted>
	<div class="canvas-container" bind:this={container}></div>

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
			<p><strong>WASD</strong> move · <strong>Mouse drag</strong> look · <strong>Click</strong> collect</p>
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
</style>
