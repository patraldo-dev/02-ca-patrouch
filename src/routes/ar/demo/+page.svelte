<script>
  import { onMount } from 'svelte';
  let loaded = $state(false);
  let ARPortal = null;

  onMount(async () => {
    const ap = await import('$lib/ar/portal/ARPortal.svelte');
    ARPortal = ap.default;
    loaded = true;
  });
</script>

{#if loaded}
  <ARPortal theme="narrador" contentType="text" />
{/if}
