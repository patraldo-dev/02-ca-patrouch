<script>
  import { onMount } from 'svelte';
  import { usePortal } from './usePortal.svelte.js';
  import { getTheme } from './themes.svelte.js';

  /**
   * TextContent — Renders floating text as a sprite in WebXR AR
   * Used by the Narrator to display proclamations, directivas, etc.
   *
   * Props:
   *   portal - usePortal instance
   *   text - The text to display
   *   theme - Theme ID (determines font style and colors)
   *   fontSize - Canvas font size (default 48)
   */

  let {
    portal,
    text,
    theme = 'narrador',
    fontSize = 48,
  } = $props();

  let status = $state('idle');
  let mesh = null;

  onMount(async () => {
    if (!portal || !text) return;

    const check = setInterval(async () => {
      if (portal.status === 'ar-active' && portal.scene && !mesh) {
        clearInterval(check);
        await createTextSprite();
      }
    }, 200);

    return () => clearInterval(check);
  });

  async function createTextSprite() {
    status = 'loading';
    try {
      const THREE = await import('three');
      const themeConfig = getTheme(theme);

      // Create canvas for text rendering
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const padding = 40;
      const maxWidth = 512;
      ctx.font = `${fontSize}px 'Playfair Display', Georgia, serif`;

      // Word wrap
      const words = text.split(' ');
      const lines = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      // Size canvas to fit text
      const lineHeight = fontSize * 1.4;
      canvas.width = maxWidth + padding * 2;
      canvas.height = lines.length * lineHeight + padding * 2;

      // Re-set font after resize (canvas resize clears state)
      ctx.font = `${fontSize}px 'Playfair Display', Georgia, serif`;

      // Background with theme color
      const bgColor = themeConfig.colors.uiBackground || 'rgba(0,0,0,0.8)';
      ctx.fillStyle = bgColor;
      ctx.roundRect?.(0, 0, canvas.width, canvas.height, 16) || ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fill();

      // Text
      const textColor = themeConfig.colors.uiText || '#ffffff';
      ctx.fillStyle = textColor;
      ctx.textBaseline = 'top';

      lines.forEach((line, i) => {
        const x = padding;
        const y = padding + i * lineHeight;
        ctx.fillText(line, x, y);
      });

      // Create sprite
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;

      const aspect = canvas.height / canvas.width;
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(0.6, 0.6 * aspect, 1);
      sprite.visible = false;
      portal.scene.add(sprite);
      mesh = sprite;

      portal.setContentMesh(sprite);
      status = 'ready';
    } catch (e) {
      status = 'error';
    }
  }

  $effect(() => {
    return () => {
      if (mesh) {
        mesh.material?.map?.dispose();
        mesh.material?.dispose();
      }
    };
  });
</script>

{#if status === 'loading'}
  <div class="content-status">Preparando texto...</div>
{/if}
