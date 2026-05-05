<script>
  import { onMount } from 'svelte';
  import { usePortal } from './usePortal.svelte.js';
  import { getTheme } from './themes.js';
  import { createGestureController } from './gestureController.js';

  /**
   * ImageContent — Loads and displays an image in WebXR AR
   * Must be used as a child of ARPortal or standalone with a portal instance.
   *
   * Props:
   *   portal - usePortal instance (or null to create own)
   *   imageUrl - URL of the image to display
   *   theme - Theme ID
   *   width - Display width in AR space (meters, default 0.5)
   */

  let {
    portal,
    imageUrl,
    theme = 'narrador',
    width = 0.5,
  } = $props();

  let status = $state('idle'); // idle | loading | ready | error
  let errorMsg = $state('');
  let texture = $state(null);
  let mesh = null;

  onMount(async () => {
    if (!portal || !imageUrl) return;

    // Watch for portal becoming active, then create mesh
    const check = setInterval(async () => {
      if (portal.status === 'ar-active' && portal.scene && !mesh) {
        clearInterval(check);
        await createImageMesh();
      }
    }, 200);

    // Also stop checking if portal errors out
    return () => clearInterval(check);
  });

  async function createImageMesh() {
    status = 'loading';
    try {
      const THREE = await import('three');

      const loader = new THREE.TextureLoader();
      const tex = await new Promise((resolve, reject) =>
        loader.load(imageUrl, resolve, undefined, reject)
      );
      tex.colorSpace = THREE.SRGBColorSpace;
      texture = tex;

      const aspect = tex.image.height / tex.image.width;
      const geo = new THREE.PlaneGeometry(width, width * aspect);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const m = new THREE.Mesh(geo, mat);
      m.matrixAutoUpdate = false;
      m.visible = false;
      portal.scene.add(m);
      mesh = m;

      // Register with portal for hit-test placement
      portal.setContentMesh(m);

      status = 'ready';
    } catch (e) {
      errorMsg = e.message;
      status = 'error';
    }
  }

  // Cleanup
  $effect(() => {
    return () => {
      if (mesh) {
        mesh.geometry?.dispose();
        mesh.material?.dispose();
        texture?.dispose();
      }
    };
  });
</script>

{#if status === 'loading'}
  <div class="content-status">Cargando imagen...</div>
{:else if status === 'error'}
  <div class="content-status error">{errorMsg}</div>
{/if}
