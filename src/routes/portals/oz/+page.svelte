<!--
	/portals/oz — Wizard of Oz-inspired world. You arrive as Dorothy
	in a field of flowers. Munchkins (GLB figures) hide inside — walk
	close and they pop out, scatter, and you can collect them. The
	yellow brick road leads forward into the scene.
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	let container;
	let score = $state(0);
	let booted = $state(false);
	let errorMsg = $state('');
	let cleanup = null;
	let revealed = $state(0);

	onMount(async () => {
		if (!browser || !container) return;
		try {
			const { bootOzWorld } = await import('$lib/portals-ecs/oz-world.js');
			cleanup = await bootOzWorld(container, {
				onScoreUpdate: (s) => { score = s; }
			});
			booted = true;
		} catch (e) {
			console.error('[oz] boot failed:', e);
			errorMsg = e.message;
		}
	});

	onDestroy(() => {
		if (cleanup) cleanup.destroy();
	});
</script>

<svelte:head>
	<title>Oz — Munchkin Garden</title>
</svelte:head>

<div class="demo-page" class:booted>
	<div class="canvas-container" bind:this={container}></div>

	{#if booted}
		<div class="hud">
			<div class="score-card">
				<span class="score-label">Munchkins Found</span>
				<span class="score-value">{score}</span>
			</div>
		</div>

		<div class="instructions">
			<p>🌸 <strong>WASD</strong> to walk through the garden · <strong>Mouse drag</strong> to look</p>
			<p class="hint">Walk close to flowers to reveal hiding munchkins · Follow the yellow brick road</p>
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
</style>
