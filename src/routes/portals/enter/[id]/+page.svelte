<script>
	import TransitionPortal from '$lib/portals-ecs/TransitionPortal.svelte';

	let { data } = $props();
</script>

<TransitionPortal portalConfig={data.portalConfig} />
