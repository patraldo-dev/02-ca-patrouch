<!--
	Portal layout — bare canvas, no chrome.
	The portals page IS the spatial world. Sits above all other layout elements.
-->
<script>
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	let { children } = $props();

	onMount(() => {
		if (!browser) return;
		document.body?.classList.add('portal-route');
	});

	onDestroy(() => {
		if (!browser) return;
		document.body?.classList.remove('portal-route');
	});
</script>

<svelte:head>
	<style>
		body.portal-route .navbar,
		body.portal-route .site-footer,
		body.portal-route .mobile-menu-overlay {
			display: none !important;
		}
		body.portal-route .app-layout {
			background: #050508 !important;
		}
		body.portal-route .main-content {
			padding: 0 !important;
			max-width: none !important;
			margin: 0 !important;
		}
	</style>
</svelte:head>

<div class="portal-scope">
	{@render children()}
</div>

<style>
	.portal-scope {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: #050508;
		overflow: hidden;
	}
</style>
