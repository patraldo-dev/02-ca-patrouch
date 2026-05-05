<script>
  import { usePortal } from '$lib/ar/portal/usePortal.js';
  import ARPortal from '$lib/ar/portal/ARPortal.svelte';
  import ImageContent from '$lib/ar/portal/ImageContent.svelte';
  import TextContent from '$lib/ar/portal/TextContent.svelte';
  import { THEMES, classifyText } from '$lib/ar/portal/themes.js';

  let selectedTheme = $state('narrador');
  let contentType = $state('image');
  let imageUrl = $state('https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800');
  let textInput = $state('En el umbral entre lo soñado y lo escrito, las palabras se materializan como constelaciones.');

  // Text classification demo
  let classifiedThemes = $derived(classifyText(textInput));

  const themeList = Object.values(THEMES);

  function selectTheme(id) {
    selectedTheme = id;
  }
</script>

<svelte:head>
  <title>AR Portal — Demo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
</svelte:head>

<div class="demo-page">
  <div class="header">
    <h1>🦀 AR Portal Demo</h1>
    <p class="subtitle">Portal narrativo genérico — 7 mundos literarios</p>
  </div>

  <!-- Theme Selector -->
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

  <!-- Content Config -->
  <div class="config">
    <div class="config-row">
      <label>Contenido:</label>
      <div class="type-toggle">
        <button class:active={contentType === 'image'} onclick={() => contentType = 'image'}>🖼 Imagen</button>
        <button class:active={contentType === 'text'} onclick={() => contentType = 'text'}>📝 Texto</button>
      </div>
    </div>

    {#if contentType === 'image'}
      <div class="config-row">
        <label>URL de imagen:</label>
        <input type="url" bind:value={imageUrl} placeholder="https://..." />
      </div>
    {:else}
      <div class="config-row">
        <label>Texto flotante (proclamación del Narrador):</label>
        <textarea bind:value={textInput} rows="3"></textarea>
      </div>

      <!-- Classification result -->
      {#if classifiedThemes.length > 0}
        <div class="classification">
          <span class="class-label">Detectado:</span>
          {#each classifiedThemes.slice(0, 3) as c}
            <button
              class="detect-btn"
              class:suggested={c.theme === selectedTheme}
              onclick={() => selectTheme(c.theme)}
            >
              {THEMES[c.theme].icon} {THEMES[c.theme].name} ({c.confidence})
            </button>
          {/each}
        </div>
      {/if}
    {/if}
  </div>

  <!-- Portal Launcher -->
  {#if contentType === 'image'}
    <ARPortal theme={selectedTheme} contentType="image">
      {#snippet children(portal)}
        <ImageContent portal={portal} imageUrl={imageUrl} theme={selectedTheme} />
      {/snippet}
    </ARPortal>
  {:else}
    <ARPortal theme={selectedTheme} contentType="text">
      {#snippet children(portal)}
        <TextContent portal={portal} text={textInput} theme={selectedTheme} />
      {/snippet}
    </ARPortal>
  {/if}
</div>

<style>
  .demo-page {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 1.8rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
  }

  .subtitle {
    color: #888;
    margin: 0;
    font-size: 0.9rem;
  }

  .theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .theme-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.75rem 0.5rem;
    border: 2px solid #e0e0e0;
    border-radius: 10px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }

  .theme-btn:hover {
    border-color: #c9a87c;
  }

  .theme-btn.active {
    border-color: #c9a87c;
    background: #fdf8f0;
    box-shadow: 0 2px 8px rgba(201, 168, 124, 0.3);
  }

  .theme-icon {
    font-size: 1.8rem;
  }

  .theme-name {
    font-weight: 600;
    font-size: 0.85rem;
  }

  .theme-desc {
    font-size: 0.7rem;
    color: #888;
    text-align: center;
  }

  .config {
    background: #f8f8f8;
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .config-row {
    margin-bottom: 0.75rem;
  }

  .config-row label {
    display: block;
    font-weight: 600;
    font-size: 0.85rem;
    margin-bottom: 0.25rem;
  }

  .config-row input,
  .config-row textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 0.9rem;
    font-family: inherit;
    box-sizing: border-box;
  }

  .type-toggle {
    display: flex;
    gap: 0.5rem;
  }

  .type-toggle button {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
  }

  .type-toggle button.active {
    background: #c9a87c;
    color: white;
    border-color: #c9a87c;
  }

  .classification {
    margin-top: 0.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    align-items: center;
  }

  .class-label {
    font-size: 0.8rem;
    color: #888;
  }

  .detect-btn {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-family: inherit;
  }

  .detect-btn.suggested {
    border-color: #c9a87c;
    background: #fdf8f0;
    font-weight: 600;
  }
</style>
