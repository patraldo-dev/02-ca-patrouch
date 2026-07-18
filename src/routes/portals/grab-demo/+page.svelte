<!--
	/portals/grab-demo — ECS collectible demo. 30 GLB entities (10×3 models)
	scattered in a space with a background mural. Uses IWSDK World + elics
	components/systems — same architecture as the real portal engine.
	WASD to move, mouse drag to look, click objects to collect.
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	let container;
	let counter = $state(0);
	const total = 30;
	let booted = $state(false);
	let errorMsg = $state('');
	let cleanup = null;

	onMount(async () => {
		if (!browser || !container) return;
		try {
			const { bootGrabDemo } = await import('$lib/portals-ecs/grab-demo-world.js');
			cleanup = await bootGrabDemo(container, (count) => {
				counter = count;
			});
			booted = true;
		} catch (e) {
			console.error('[grab-demo] boot failed:', e);
			errorMsg = e.message;
		}
	});

	onDestroy(() => {
		if (cleanup) cleanup.destroy();
	});
</script>

<svelte:head>
	<title>Grab Demo — Collect 30</title>
</svelte:head>

<div class="demo-page" class:booted>
	<div class="canvas-container" bind:this={container}></div>

	{#if booted}
		<div class="hud">
			<div class="counter" class:complete={counter === total}>
				<span class="count">{counter}</span>
				<span class="total">/ {total}</span>
			</div>
			{#if counter === total}
				<div class="complete-msg">🎉 All collected!</div>
			{/if}
		</div>

		<div class="instructions">
			<p><strong>WASD</strong> to move · <strong>Mouse drag</strong> to look · <strong>Click</strong> an object to collect</p>
			<p class="models-loaded">3 models × 10 = 30 ECS collectible entities · IWSDK World + elics</p>
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
	.counter {
		background: rgba(10, 10, 20, 0.8);
		backdrop-filter: blur(12px);
		border: 1px solid rgba(201, 168, 124, 0.3);
		border-radius: 16px;
		padding: 0.6rem 1.5rem;
		display: inline-flex;
		align-items: baseline;
		gap: 0.3rem;
	}
	.counter.complete {
		border-color: #8fbc8f;
	}
	.count {
		font-size: 1.8rem;
		font-weight: 800;
		color: #c9a87c;
	}
	.counter.complete .count {
		color: #8fbc8f;
	}
	.total {
		font-size: 1rem;
		color: rgba(255, 255, 255, 0.5);
	}
	.complete-msg {
		margin-top: 0.5rem;
		font-size: 1.2rem;
		animation: pulse 1s ease-in-out infinite alternate;
	}
	.error-msg {
		background: rgba(100, 20, 20, 0.8);
		border-radius: 12px;
		padding: 0.75rem 1.5rem;
		color: #ff8888;
		font-size: 0.9rem;
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
	.models-loaded {
		font-size: 0.7rem !important;
		opacity: 0.6;
	}
</style>
