<!--
	/portals/[id] — direct link to a specific portal world. Same engine as
	/portals, just starting at the portal named in the URL. This makes the
	URLs the engine writes via history.pushState shareable, refreshable, and
	back-button-friendly. The 404 guard lives in +page.server.js.
-->
<script>
	import PortalScene from '$lib/components/PortalScene.svelte';
	let { data } = $props();
</script>

<PortalScene {data} initialPortalId={data.initialPortalId} />
