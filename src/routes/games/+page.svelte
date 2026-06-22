<script>
    import PortalWorld from '$lib/portals-ecs/PortalWorld.svelte';
    import { t } from '$lib/i18n';

    let { data } = $props();
</script>

<svelte:head>
    <title>{$t('games.title')} — patrouch.ca</title>
</svelte:head>

<!--
    Portals Page — ECS Architecture

    The page is now an IWSDK ECS World running in non-immersive mode.
    PortalWorld.svelte handles:
      - Dynamic import of @iwsdk/core (browser-only)
      - World boot with D1 portal data from SSR
      - Brand bumper → tab rail → reactive background → carousel
      - Graceful degradation to DOM fallback if WebGL unavailable
      - Accessible sr-only nav for crawlers and screen readers

    SSR (+page.server.js) is unchanged — still fetches from D1,
    groups by galaxy, returns portals array.
-->

<PortalWorld {data} />
