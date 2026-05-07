<script>
  import { onMount } from 'svelte';
  import { THEMES, classifyText } from '$lib/ar/portal/themes.js';
  import { calculateBearing, relativeBearing } from '$lib/geo.js';

  let loaded = $state(false);
  let selectedTheme = $state('narrador');
  let textInput = $state('En el umbral entre lo soñado y lo escrito, las palabras se materializan como constelaciones.');
  let portalInstance = $state(null);
  let narratorVideo = $state(null);

  let classifiedThemes = $derived(classifyText(textInput));
  const themeList = Object.values(THEMES);

  const playerLat = 19.4326, playerLng = -99.1332, playerHeading = 0;
  const portalLat = 19.4330, portalLng = -99.1330;

  let spatialPosition = $derived.by(() => {
    if (portalInstance?.status !== 'ar-active') return { azimuth: 0, elevation: 0 };
    const bearing = calculateBearing(playerLat, playerLng, portalLat, portalLng);
    return { azimuth: relativeBearing(playerHeading, bearing), elevation: -5 };
  });

  let components = $state(null);

  onMount(async () => {
    const [ap, tc, sa] = await Promise.all([
      import('$lib/ar/portal/ARPortal.svelte'),
      import('$lib/ar/portal/TextContent.svelte'),
      import('$lib/ar/portal/SpatialAudio.svelte'),
    ]);
    components = {
      ARPortal: ap.default,
      TextContent: tc.default,
      SpatialAudio: sa.default,
    };
    loaded = true;
  });

  function selectTheme(id) { selectedTheme = id; }
</script>

<svelte:head>
  <title>AR Portal — Demo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
</svelte:head>

{#if loaded && components}
  {@const { ARPortal, TextContent, SpatialAudio } = components}
  <div class="demo-page">
    <div class="header">
      <h1>🦀 AR Portal</h1>
      <p class="subtitle">Choose your literary world</p>
    </div>

    <div class="theme-grid">
      {#each themeList as t}
        <button
          class="theme-btn"
          class:active={selectedTheme === t.id}
          onclick={() => selectTheme(t.id)}
        >
          <span class="theme-icon">{t.icon}</span>
          <span class="theme-name">{t.name}</span>
          <span class="theme-desc">{t.description}</span>
        </button>
      {/each}
    </div>

    <div class="config">
      <div class="config-row">
        <label>Narrator proclamation:</label>
        <textarea bind:value={textInput} rows="3"></textarea>
      </div>
    </div>

    <ARPortal theme={selectedTheme} contentType="text" onExit={() => portalInstance = null}>
      {#snippet children(portal)}
        {#if portal}
          <TextContent portal={portal} text={textInput} theme={selectedTheme} />
        {/if}
      {/snippet}
    </ARPortal>
  </div>
{:else}
  <div style="padding:2rem;text-align:center;color:#888;">
    <p>Loading...</p>
  </div>
{/if}

<style>
  .demo-page { max-width: 600px; margin: 0 auto; padding: 1.5rem; font-family: 'Inter', system-ui, sans-serif; }
  .header { text-align: center; margin-bottom: 1.5rem; }
  h1 { font-size: 1.8rem; font-weight: 700; margin: 0 0 0.25rem; }
  .subtitle { color: #888; margin: 0; font-size: 0.9rem; }
  .theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.5rem; margin-bottom: 1.5rem; }
  .theme-btn { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.75rem 0.5rem; border: 2px solid #e0e0e0; border-radius: 12px; background: white; cursor: pointer; font-family: inherit; }
  .theme-btn:hover { border-color: #c9a87c; }
  .theme-btn.active { border-color: #c9a87c; background: #fdf8f0; }
  .theme-icon { font-size: 1.8rem; }
  .theme-name { font-weight: 600; font-size: 0.85rem; }
  .theme-desc { font-size: 0.7rem; color: #888; text-align: center; }
  .config { background: #f8f8f8; border-radius: 12px; padding: 1rem; }
  .config-row { margin-bottom: 0.75rem; }
  .config-row label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 0.25rem; }
  .config-row textarea { width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem; font-family: inherit; box-sizing: border-box; }
</style>
