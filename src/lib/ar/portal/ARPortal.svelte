<script>
  import { onMount } from 'svelte';
  import { usePortal } from './usePortal.js';
  import { getTheme } from './themes.js';
  import { createGestureController } from './gestureController.js';

  /**
   * ARPortal — Reusable WebXR AR session wrapper
   *
   * Props:
   *   theme - Theme ID (arboleda|fiesta|oceano|narrador|espacio|urbano|fantasia)
   *   contentType - What to display (image|video|text|model)
   *   contentUrl - URL for image/video content
   *   contentText - Text for TextContent
   *   autoPlace - Skip hit-test, place immediately
   *
   * Children:
   *   Snippet content — slot for custom UI overlay
   */

  let {
    theme = 'narrador',
    contentType = 'image',
    contentUrl = '',
    contentText = '',
    autoPlace = false,
    children,
  } = $props();

  let portal = null;
  let touchOverlay = null;
  let gestureController = null;
  let uiContainer = null;
  let themeConfig = $derived(getTheme(theme));

  onMount(async () => {
    portal = usePortal({
      theme,
      contentType,
    });

    const ready = await portal.init();

    if (!ready) return;
  });

  function handleLaunch() {
    // Create touch overlay
    touchOverlay = document.createElement('div');
    touchOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;pointer-events:auto;';
    touchOverlay.dataset.arPortal = 'true';
    document.body.appendChild(touchOverlay);

    // Create UI container
    uiContainer = document.createElement('div');
    uiContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;z-index:10002;pointer-events:none;padding:1rem;';
    uiContainer.dataset.arPortal = 'true';
    uiContainer.innerHTML = `
      <button id="ar-close" style="
        pointer-events:auto;
        background:${themeConfig.colors.uiBackground};
        color:${themeConfig.colors.uiText};
        border:2px solid ${themeConfig.colors.uiPrimary};
        border-radius:50%;
        width:44px;height:44px;
        font-size:1.2rem;
        cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
      ">✕</button>
    `;
    document.body.appendChild(uiContainer);

    document.getElementById('ar-close')?.addEventListener('click', () => {
      portal.end();
    });

    portal.launch({ theme }).then(async () => {
      const THREE = await import('three');

      // Wait for content mesh to be set by the consuming component
      // The consumer calls portal.setContentMesh(mesh) after creating their content

      // Set up gestures once content is placed
      const checkMesh = setInterval(() => {
        if (portal.contentMesh && portal.placed) {
          clearInterval(checkMesh);
          gestureController = createGestureController({
            mesh: portal.contentMesh,
            sensitivity: { rotate: 0.01, pan: 0.002 },
            onTransformChange: () => {
              // Future: broadcast to WebRTC peers in Fiesta
            },
          });
          gestureController.attach(touchOverlay);
        }
      }, 200);

      // Auto-timeout: if no content mesh after 30s, stop checking
      setTimeout(() => clearInterval(checkMesh), 30000);
    });
  }

  function handleEnd() {
    gestureController?.detach();
    portal?.end();
  }

  function getButtonLabel() {
    if (portal?.status === 'loading') return '...';
    if (portal?.status === 'unsupported') return 'AR no disponible';
    if (portal?.status === 'error') return 'Error';
    return `${themeConfig.icon} Entrar al ${themeConfig.nameEn}`;
  }

  function isDisabled() {
    return !portal || portal.status !== 'ready';
  }
</script>

<div class="ar-portal-launcher" data-theme={theme}>
  {#if portal?.status === 'ready'}
    <button
      class="launch-btn"
      style="--theme-primary: {themeConfig.colors.uiPrimary}; --theme-bg: {themeConfig.colors.uiBackground}; --theme-text: {themeConfig.colors.uiText};"
      onclick={handleLaunch}
      disabled={isDisabled()}
    >
      <span class="btn-icon">{themeConfig.icon}</span>
      <span class="btn-text">Entrar al {themeConfig.nameEn}</span>
    </button>
  {:else if portal?.status === 'unsupported'}
    <div class="ar-unsupported">
      <span>{themeConfig.icon}</span>
      <p>WebXR no está disponible en este dispositivo</p>
    </div>
  {:else if portal?.status === 'error'}
    <div class="ar-error">
      <p>{portal.error}</p>
    </div>
  {:else}
    <div class="ar-loading">
      <div class="spinner"></div>
      <p>Verificando soporte AR...</p>
    </div>
  {/if}

  <!-- Slot for content setup callback / custom UI -->
  {@render children?.(portal)}
</div>

<style>
  .ar-portal-launcher {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
  }

  .launch-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 2rem;
    border: 2px solid var(--theme-primary);
    border-radius: 12px;
    background: var(--theme-bg);
    color: var(--theme-text);
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
    font-family: inherit;
  }

  .launch-btn:hover:not(:disabled) {
    opacity: 0.9;
    transform: scale(1.02);
  }

  .launch-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-icon {
    font-size: 1.5rem;
  }

  .ar-unsupported, .ar-error, .ar-loading {
    text-align: center;
    padding: 1rem;
    color: #888;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid #e0e0e0;
    border-top-color: #c9a87c;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 0.5rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
