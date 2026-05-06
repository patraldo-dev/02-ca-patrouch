<script>
  import { onMount } from 'svelte';

  let status = $state('loading');
  let errorMsg = $state('');
  let THREE = null;

  onMount(async () => {
    if (!navigator.xr) {
      status = 'unsupported';
      return;
    }

    try {
      // XR check FIRST — doesn't need Three.js
      const xrCheck = navigator.xr.isSessionSupported('immersive-ar');
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('XR check timed out')), 5000)
      );
      const supported = await Promise.race([xrCheck, timeout]);

      if (!supported) {
        status = 'unsupported';
        return;
      }
    } catch (e) {
      console.warn('[ar/demo] XR check failed:', e.message);
      status = 'unsupported';
      return;
    }

    // Import Three.js only AFTER XR confirmed — heavy on mobile
    try {
      THREE = await import('three');
    } catch {
      errorMsg = 'Failed to load 3D engine';
      status = 'error';
      return;
    }

    status = 'ready';
  });

  async function launchAR() {
    if (!THREE) return;
    status = 'loading';
    try {
      await startAR(THREE);
      status = 'ar-active';
    } catch (e) {
      console.error('[ar/demo] Error:', e);
      errorMsg = e.message || 'AR failed to start';
      status = 'error';
    }
  }

  async function startAR(THREE) {
    const session = await navigator.xr.requestSession('immersive-ar', {
      optionalFeatures: ['hit-test', 'dom-overlay', 'local-floor'],
      domOverlay: { root: document.body }
    });

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;';

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.8));

    // Portal content — floating text sprite
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#c9a87c';
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🦀 AR Portal', 256, 100);
    ctx.font = '18px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#e4e4e7';
    ctx.fillText('Portal del Narrador', 256, 140);
    ctx.fillText('El umbral entre lo escrito', 256, 170);
    ctx.fillText('y lo soñado se abre aquí.', 256, 195);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(0.6, 0.3);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.matrixAutoUpdate = false;
    mesh.visible = false;
    scene.add(mesh);

    // Reticle
    const reticleGeo = new THREE.RingGeometry(0.03, 0.05, 32);
    reticleGeo.rotateX(-Math.PI / 2);
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0xc9a87c });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    const viewerSpace = await session.requestReferenceSpace('viewer');

    let placed = false;
    let lastHitPose = null;

    let hitTestSource = null;
    try {
      hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    } catch (e) {
      console.warn('[ar/demo] Hit test not available');
    }

    let localSpace;
    for (const type of ['local-floor', 'local', 'viewer']) {
      try {
        localSpace = await session.requestReferenceSpace(type);
        break;
      } catch (e) {
        console.warn('[ar/demo] Reference space', type, 'not supported');
      }
    }
    if (!localSpace) {
      await session.end();
      throw new Error('No supported reference space');
    }

    await renderer.xr.setSession(session);

    // Auto-place if no hit-test
    if (!hitTestSource) {
      mesh.visible = true;
      mesh.matrixAutoUpdate = true;
      mesh.position.set(0, -0.5, -1.2);
      placed = true;
    }

    renderer.setAnimationLoop((time, frame) => {
      if (!frame) return;

      if (hitTestSource && !placed) {
        const results = frame.getHitTestResults(hitTestSource);
        if (results.length > 0) {
          const pose = results[0].getPose(localSpace);
          if (pose) {
            lastHitPose = pose;
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
            mesh.visible = true;
            mesh.matrix.fromArray(pose.transform.matrix);
          }
        } else {
          reticle.visible = false;
          if (!mesh.visible) {
            mesh.visible = true;
            mesh.position.set(0, 0, -1);
            mesh.scale.set(0.5, 0.5, 0.5);
          }
        }
      }

      renderer.render(scene, renderer.xr.getCamera()); // ← THE real fix
    });

    session.addEventListener('select', () => {
      if (!placed && lastHitPose) {
        placed = true;
        const m = new THREE.Matrix4().fromArray(lastHitPose.transform.matrix);
        mesh.position.setFromMatrixPosition(m);
        mesh.quaternion.setFromRotationMatrix(m);
        mesh.matrixAutoUpdate = true;
        mesh.visible = true;
        reticle.visible = false;
      }
    });

    // Touch overlay for gestures
    const touchOverlay = document.createElement('div');
    touchOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;';
    document.body.appendChild(touchOverlay);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10003;background:rgba(0,0,0,0.7);color:#fff;border:none;padding:12px 16px;border-radius:50%;font-size:1.2rem;cursor:pointer;';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => session.end();
    document.body.appendChild(closeBtn);

    const cleanup = () => {
      renderer.setAnimationLoop(null);
      renderer.domElement.remove();
      closeBtn.remove();
      touchOverlay.remove();
      renderer.dispose();
      texture.dispose();
      geo.dispose();
      mat.dispose();
      reticleGeo.dispose();
      reticleMat.dispose();
      window.removeEventListener('resize', handleResize);
      ['overflow', 'position', 'top', 'width', 'height', 'touchAction'].forEach(p => {
        document.body.style.removeProperty(p);
      });
      document.body.querySelectorAll('[style*="z-index:9999"]').forEach(el => el.remove());
      window.location.replace('/ar/demo');
    };
    session.addEventListener('end', () => cleanup());
  }
</script>

<svelte:head>
  <title>AR Portal — Demo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
</svelte:head>

{#if status === 'ar-active'}
  <!-- AR canvas covers everything -->
{:else if status === 'loading'}
  <div class="ar-page">
    <div class="spinner"></div>
    <p>Verificando soporte AR...</p>
  </div>
{:else if status === 'ready'}
  <div class="ar-page">
    <h1>🦀 AR Portal</h1>
    <p class="subtitle">Portal del Narrador</p>
    <div class="portal-preview">
      <div class="preview-card">
        <span class="preview-icon">📖</span>
        <span class="preview-title">Portal del Narrador</span>
        <span class="preview-desc">El umbral entre lo escrito y lo soñado</span>
      </div>
    </div>
    <button class="launch-btn" onclick={launchAR}>
      👁️ Entrar al Portal
    </button>
    <p class="note">Toca una superficie plana para colocar el portal</p>
  </div>
{:else if status === 'unsupported'}
  <div class="ar-page">
    <h2>AR No Disponible</h2>
    <p>Tu dispositivo no soporta WebXR AR. Prueba en un móvil con capacidades AR.</p>
  </div>
{:else if status === 'error'}
  <div class="ar-page">
    <h2>Error</h2>
    <p>{errorMsg}</p>
  </div>
{/if}

<style>
  .ar-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 1.5rem;
    padding: 2rem;
    font-family: 'Inter', system-ui, sans-serif;
    color: #1a1a1a;
  }

  h1 { font-size: 1.8rem; margin: 0; }
  .subtitle { color: #888; margin: 0; }

  .portal-preview { margin: 1rem 0; }

  .preview-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem 2.5rem;
    border: 2px solid #e0e0e0;
    border-radius: 16px;
    background: #fdf8f0;
    box-shadow: 0 4px 16px rgba(201, 168, 124, 0.15);
  }

  .preview-icon { font-size: 3rem; }
  .preview-title { font-weight: 700; font-size: 1.1rem; }
  .preview-desc { font-size: 0.85rem; color: #888; text-align: center; }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e0e0e0;
    border-top-color: #c9a87c;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .launch-btn {
    background: #c9a87c;
    color: #fff;
    border: none;
    padding: 1rem 2.5rem;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(201, 168, 124, 0.4);
    font-family: inherit;
  }

  .launch-btn:hover { opacity: 0.9; }

  .ar-page h2 { margin: 0; font-size: 1.5rem; color: #c9a87c; }
  .ar-page p { margin: 0; color: #666; text-align: center; max-width: 400px; }
  .note { font-size: 0.8rem; color: #aaa; }
</style>
