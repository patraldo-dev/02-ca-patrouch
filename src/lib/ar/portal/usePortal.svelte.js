/**
 * usePortal — Svelte 5 composable for WebXR AR portal state
 * Framework-agnostic core logic wrapped in Svelte runes.
 *
 * Usage in a Svelte component:
 *   const portal = usePortal({ theme: 'oceano', contentType: 'image' });
 *   portal.launch(); // must be called from user gesture
 */

import { browser } from '$app/environment';

const STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  UNSUPPORTED: 'unsupported',
  ACTIVE: 'ar-active',
  ERROR: 'error',
};

/**
 * @param {Object} opts
 * @param {string} opts.theme - Theme ID from themes.js
 * @param {'image'|'video'|'text'|'model'} opts.contentType
 * @param {Function} [opts.onStatusChange] - Callback on status transitions
 * @returns {Object} Portal controller
 */
export function usePortal({ theme = 'narrador', contentType = 'image', onStatusChange } = {}) {
  let status = $state(STATUS.LOADING);
  let session = $state(null);
  let renderer = $state(null);
  let scene = $state(null);
  let camera = $state(null);
  let hitTestSource = $state(null);
  let lastHitPose = $state(null);
  let placed = $state(false);
  let error = $state(null);

  // Content refs — set by content components
  let contentMesh = $state(null);
  let reticle = $state(null);

  function setStatus(newStatus) {
    status = newStatus;
    onStatusChange?.(newStatus);
  }

  /**
   * Initialize Three.js and check XR support.
   * Call once on mount.
   */
  async function init() {
    if (!browser || !navigator.xr) {
      setStatus(STATUS.UNSUPPORTED);
      return false;
    }

    try {
      const THREE = await import('three');
      const supported = await navigator.xr.isSessionSupported('immersive-ar');

      if (!supported) {
        setStatus(STATUS.UNSUPPORTED);
        return false;
      }

      setStatus(STATUS.READY);
      return true;
    } catch (e) {
      error = e.message;
      setStatus(STATUS.ERROR);
      return false;
    }
  }

  /**
   * Launch an immersive-ar session.
   * MUST be called from a user gesture (click/tap).
   */
  async function launch(opts = {}) {
    if (status !== STATUS.READY) return;

    try {
      const THREE = await import('three');

      const xrSession = await navigator.xr.requestSession('immersive-ar', {
        optionalFeatures: ['hit-test', 'dom-overlay', 'local-floor'],
        domOverlay: { root: document.body },
      });

      session = xrSession;

      // Renderer
      const r = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      r.setSize(window.innerWidth, window.innerHeight);
      r.setPixelRatio(window.devicePixelRatio);
      r.xr.enabled = true;
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.domElement.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;';
      document.body.appendChild(r.domElement);
      renderer = r;

      // Scene + Camera
      const s = new THREE.Scene();
      const c = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      s.add(new THREE.AmbientLight(0xffffff, 1.5));
      s.add(new THREE.DirectionalLight(0xffffff, 0.8));
      scene = s;
      camera = c;

      // Bind session
      await renderer.xr.setSession(xrSession);

      // Reference spaces
      const viewerSpace = await xrSession.requestReferenceSpace('viewer');
      let localSpace;
      for (const type of ['local-floor', 'local', 'viewer']) {
        try {
          localSpace = await xrSession.requestReferenceSpace(type);
          break;
        } catch (_) {}
      }
      if (!localSpace) {
        await xrSession.end();
        throw new Error('No supported reference space');
      }

      // Hit-test
      try {
        hitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });
      } catch (_) {
        console.warn('Hit test not available');
      }

      // Reticle
      const themeConfig = (await import('./themes.js')).getTheme(opts.theme || theme);
      const reticleGeo = new THREE.RingGeometry(0.03, 0.05, 32);
      reticleGeo.rotateX(-Math.PI / 2);
      const reticleMat = new THREE.MeshBasicMaterial({ color: themeConfig.colors.reticle });
      const ret = new THREE.Mesh(reticleGeo, reticleMat);
      ret.matrixAutoUpdate = false;
      ret.visible = false;
      s.add(ret);
      reticle = ret;

      // Resize
      const handleResize = () => {
        c.aspect = window.innerWidth / window.innerHeight;
        c.updateProjectionMatrix();
        r.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      // Session end
      xrSession.addEventListener('end', () => {
        cleanup(handleResize);
      });

      // Place on tap
      xrSession.addEventListener('select', () => {
        if (!placed && lastHitPose && contentMesh) {
          placed = true;
          const m = new THREE.Matrix4().fromArray(lastHitPose.transform.matrix);
          contentMesh.position.setFromMatrixPosition(m);
          contentMesh.quaternion.setFromRotationMatrix(m);
          contentMesh.matrixAutoUpdate = true;
          contentMesh.visible = true;
          reticle.visible = false;
        }
      });

      // Auto-place fallback
      if (!hitTestSource && contentMesh) {
        contentMesh.visible = true;
        contentMesh.matrixAutoUpdate = true;
        contentMesh.position.set(0, themeConfig.portal.defaultY || -0.5, themeConfig.portal.defaultDistance || -1.2);
        placed = true;
        reticle.visible = false;
      }

      // Render loop
      placed = false;
      setStatus(STATUS.ACTIVE);

      renderer.setAnimationLoop((time, frame) => {
        if (!frame) return;

        if (hitTestSource && !placed && contentMesh) {
          const results = frame.getHitTestResults(hitTestSource);
          if (results.length > 0) {
            const pose = results[0].getPose(localSpace);
            if (pose) {
              lastHitPose = pose;
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
              contentMesh.visible = true;
              contentMesh.matrix.fromArray(pose.transform.matrix);
            }
          } else {
            reticle.visible = false;
            if (!contentMesh.visible) {
              contentMesh.visible = true;
              contentMesh.position.set(0, themeConfig.portal.defaultY || -0.5, themeConfig.portal.defaultDistance || -1.2);
            }
          }
        }

        renderer.render(scene, camera);
      });

    } catch (e) {
      error = e.message;
      setStatus(STATUS.ERROR);
    }
  }

  /**
   * End the current session and clean up.
   */
  function end() {
    session?.end();
  }

  function cleanup(handleResize) {
    renderer?.setAnimationLoop(null);
    renderer?.domElement?.remove();
    renderer?.dispose();
    window.removeEventListener('resize', handleResize);

    // Reset body styles
    ['overflow', 'position', 'top', 'width', 'height', 'touchAction'].forEach((p) => {
      document.body.style.removeProperty(p);
    });

    // Remove any lingering AR UI elements
    document.querySelectorAll('[data-ar-portal]').forEach((el) => el.remove());

    setStatus(STATUS.READY);
    session = null;
    renderer = null;
    scene = null;
    camera = null;
    hitTestSource = null;
    lastHitPose = null;
    placed = false;
    contentMesh = null;
    reticle = null;

    // Hard reset — AR changes GL context
    window.location.replace('/');
  }

  return {
    // State (reactive via $state)
    get status() { return status; },
    get session() { return session; },
    get renderer() { return renderer; },
    get scene() { return scene; },
    get camera() { return camera; },
    get hitTestSource() { return hitTestSource; },
    get lastHitPose() { return lastHitPose; },
    get placed() { return placed; },
    get contentMesh() { return contentMesh; },
    get reticle() { return reticle; },
    get error() { return error; },

    // Setters for content components
    setContentMesh(mesh) { contentMesh = mesh; },

    // Actions
    init,
    launch,
    end,

    // Constants
    STATUS,
  };
}
