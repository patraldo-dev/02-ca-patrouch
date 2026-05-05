<script>
  import { tick } from 'svelte';
  import ARPortal from '$lib/ar/portal/ARPortal.svelte';
  import ImageContent from '$lib/ar/portal/ImageContent.svelte';
  import TextContent from '$lib/ar/portal/TextContent.svelte';
  import { THEMES, classifyText } from '$lib/ar/portal/themes.js';

  let selectedTheme = $state('narrador');
  let contentType = $state('image');
  let imageUrl = $state('https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800');
  let textInput = $state('En el umbral entre lo soñado y lo escrito, las palabras se materializan como constelaciones.');

  let classifiedThemes = $derived(classifyText(textInput));
  const themeList = Object.values(THEMES);

  // Carousel state
  let carouselEl = $state(null);
  let activeIndex = $state(themeList.findIndex(t => t.id === 'narrador'));

  function selectTheme(id) {
    selectedTheme = id;
    activeIndex = themeList.findIndex(t => t.id === id);
  }

  // Scroll-snap centering with scale effect
  function handleScroll() {
    if (!carouselEl) return;
    const container = carouselEl;
    const scrollCenter = container.scrollLeft + container.clientWidth / 2;

    const items = container.querySelectorAll('.theme-card');
    items.forEach((item, i) => {
      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const distance = Math.abs(scrollCenter - itemCenter) / container.clientWidth;
      const scale = Math.max(0.78, 1 - distance * 0.4);
      const opacity = Math.max(0.45, 1 - distance * 0.7);
      item.style.transform = `scale(${scale})`;
      item.style.opacity = opacity;

      if (distance < 0.2) {
        activeIndex = i;
        selectedTheme = themeList[i].id;
      }
    });
  }

  async function scrollToTheme(index) {
    if (!carouselEl) return;
    selectTheme(themeList[index].id);
    const item = carouselEl.querySelectorAll('.theme-card')[index];
    if (item) {
      const container = carouselEl;
      const scrollLeft = item.offsetLeft + item.offsetWidth / 2 - container.clientWidth / 2;
      carouselEl.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }
</script>

<svelte:head>
  <title>AR Portal — Demo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
</svelte:head>

<div class="demo-page">
  <div class="header">
    <h1>🦀 AR Portal</h1>
    <p class="subtitle">Elige tu mundo literario</p>
  </div>

  <!-- Horizontal Carousel -->
  <div class="carousel-wrapper">
    <div class="carousel-spacer"></div>
    <div
      class="theme-carousel"
      bind:this={carouselEl}
      onscroll={handleScroll}
    >
      {#each themeList as t, i}
        <button
          class="theme-card"
          class:active={selectedTheme === t.id}
          class:center={i === activeIndex}
          onclick={() => scrollToTheme(i)}
        >
          <div class="card-inner">
            <span class="card-icon">{t.icon}</span>
            <span class="card-name">{t.name}</span>
            <span class="card-desc">{t.description}</span>
          </div>
        </button>
      {/each}
    </div>
    <div class="carousel-spacer"></div>
  </div>

  <!-- Dot indicators -->
  <div class="dots">
    {#each themeList as t, i}
      <button
        class="dot"
        class:active={i === activeIndex}
        onclick={() => scrollToTheme(i)}
      ></button>
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

      {#if classifiedThemes.length > 0}
        <div class="classification">
          <span class="class-label">Detectado:</span>
          {#each classifiedThemes.slice(0, 3) as c}
            <button
              class="detect-btn"
              class:suggested={c.theme === selectedTheme}
              onclick={() => scrollToTheme(themeList.findIndex(t => t.id === c.theme))}
            >
              {THEMES[c.theme].icon} {THEMES[c.theme].name}
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
    max-width: 100%;
    margin: 0 auto;
    padding: 1rem 0 0;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 1rem;
    padding: 0 1.5rem;
  }

  h1 {
    font-size: 1.6rem;
    font-weight: 700;
    margin: 0 0 0.15rem;
  }

  .subtitle {
    color: #888;
    margin: 0;
    font-size: 0.85rem;
  }

  /* ── Carousel ── */
  .carousel-wrapper {
    display: flex;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .carousel-spacer {
    flex-shrink: 0;
    width: calc(50vw - 72px);
  }

  .theme-carousel {
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 0.5rem 0;
  }

  .theme-carousel::-webkit-scrollbar {
    display: none;
  }

  .theme-card {
    flex-shrink: 0;
    width: 120px;
    scroll-snap-align: center;
    border: 2px solid #e0e0e0;
    border-radius: 14px;
    background: white;
    cursor: pointer;
    transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.25s, border-color 0.2s;
    transform-origin: center center;
    font-family: inherit;
    padding: 0;
    text-align: center;
  }

  .theme-card.active {
    border-color: #c9a87c;
    background: #fdf8f0;
    box-shadow: 0 4px 16px rgba(201, 168, 124, 0.35);
  }

  .card-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.75rem 0.5rem;
    pointer-events: none;
  }

  .card-icon {
    font-size: 2rem;
    line-height: 1;
  }

  .card-name {
    font-weight: 700;
    font-size: 0.85rem;
  }

  .card-desc {
    font-size: 0.65rem;
    color: #888;
    line-height: 1.2;
  }

  /* ── Dots ── */
  .dots {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
    margin-bottom: 1.25rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    background: #ddd;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s;
  }

  .dot.active {
    background: #c9a87c;
    width: 20px;
    border-radius: 4px;
  }

  /* ── Config ── */
  .config {
    background: #f8f8f8;
    border-radius: 12px;
    padding: 1rem;
    margin: 0 1.5rem 1.5rem;
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
