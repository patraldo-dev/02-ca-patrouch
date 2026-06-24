<!--
	Portal layout — bare canvas, no chrome.

	The portals page IS the spatial world. No header, no footer.
	Overrides the app layout by hiding its elements from the shadow DOM
	of the parent layout.
-->
<script>
	import { onMount, onDestroy } from 'svelte';

	let { children } = $props();

	let hidden = [];

	onMount(() => {
		// Hide app layout chrome (navbar, footer, mobile menu)
		const selectors = ['.navbar', '.site-footer', '.mobile-menu-overlay', '.app-layout > *:not(.portal-scope)'];
		for (const sel of selectors) {
			document.querySelectorAll(sel).forEach((el) => {
				el.style.display = 'none';
				hidden.push(el);
			});
		}
		// Make app layout background transparent
		const appLayout = document.querySelector('.app-layout');
		if (appLayout) {
			appLayout.style.background = 'transparent';
			hidden.push(appLayout);
		}
	});

	onDestroy(() => {
		hidden.forEach((el) => {
			if (el) el.style.display = '';
		});
	});
</script>

<div class="portal-scope" style="position: fixed; inset: 0; z-index: 1;">
	{@render children()}
</div>
