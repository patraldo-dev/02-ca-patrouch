<!--
	/portals — ECS Portal Scene (index). The engine boots at arboleda unless
	a ?portal=<id> query param requests a specific start portal. All boot logic
	lives in PortalScene.svelte, shared with /portals/[id].
-->
<script>
	import PortalScene from '$lib/components/PortalScene.svelte';
	let { data } = $props();
</script>

<PortalScene {data} />
