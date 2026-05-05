/**
 * Gesture Controller for AR Portal
 * Pure JS module — no framework dependency.
 * Handles drag (1-finger rotate), pinch-to-scale, twist-to-rotate, 2-finger pan.
 *
 * Usage:
 *   const controller = createGestureController({ mesh, onTransformChange });
 *   controller.attach(touchElement);
 *   controller.detach();
 */

/**
 * Create a gesture controller for a THREE.Mesh
 * @param {Object} opts
 * @param {THREE.Mesh} opts.mesh - The mesh to manipulate
 * @param {Function} [opts.onTransformChange] - Called after each gesture frame
 * @param {Object} [opts.sensitivity] - Override default sensitivities
 * @param {number} [opts.sensitivity.rotate=0.01] - Single-finger rotation sensitivity
 * @param {number} [opts.sensitivity.pan=0.002] - Two-finger pan sensitivity
 * @param {number} [opts.sensitivity.minScale=0.05] - Minimum scale clamp
 * @param {number} [opts.sensitivity.maxScale=5] - Maximum scale clamp
 */
export function createGestureController({ mesh, onTransformChange, sensitivity = {} }) {
  const {
    rotate = 0.01,
    pan = 0.002,
    minScale = 0.05,
    maxScale = 5,
  } = sensitivity;

  let isDragging = false;
  let isPinching = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartRotX = 0;
  let touchStartRotY = 0;
  let touchStartRotZ = 0;
  let touchStartPosX = 0;
  let touchStartPosY = 0;
  let lastPinchDist = 0;
  let lastPinchAngle = 0;
  let lastPinchCenter = { x: 0, y: 0 };

  let attachedElement = null;
  let handlers = {};

  function angleBetweenTouches(t1, t2) {
    return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
  }

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      e.preventDefault();
      isDragging = true;
      isPinching = false;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartRotX = mesh.rotation.x;
      touchStartRotY = mesh.rotation.y;
      touchStartRotZ = mesh.rotation.z;
      touchStartPosX = mesh.position.x;
      touchStartPosY = mesh.position.y;
    } else if (e.touches.length === 2) {
      e.preventDefault();
      isDragging = false;
      isPinching = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      lastPinchAngle = angleBetweenTouches(e.touches[0], e.touches[1]);
      lastPinchCenter = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }

  function onTouchMove(e) {
    if (!isDragging && !isPinching) return;
    e.preventDefault();

    // === TWO-FINGER GESTURES ===
    if (e.touches.length === 2 && isPinching) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = angleBetweenTouches(e.touches[0], e.touches[1]);

      // PINCH TO SCALE
      if (lastPinchDist > 0) {
        const factor = dist / lastPinchDist;
        mesh.scale.multiplyScalar(factor);
        const s = Math.max(minScale, Math.min(maxScale, mesh.scale.x));
        mesh.scale.set(s, s, s);
      }
      lastPinchDist = dist;

      // TWIST TO ROTATE Z
      const angleDelta = angle - lastPinchAngle;
      mesh.rotation.z += angleDelta;
      lastPinchAngle = angle;

      // TWO-FINGER PAN
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      mesh.position.x += (cx - lastPinchCenter.x) * pan;
      mesh.position.y -= (cy - lastPinchCenter.y) * pan;
      lastPinchCenter = { x: cx, y: cy };

      onTransformChange?.();
      return;
    }

    // === ONE-FINGER DRAG → ROTATE X and Y ===
    if (!isDragging || e.touches.length !== 1) return;

    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;

    mesh.rotation.x = touchStartRotX + dy * rotate;
    mesh.rotation.y = touchStartRotY + dx * rotate;
    mesh.rotation.z = touchStartRotZ;

    onTransformChange?.();
  }

  function onTouchEnd() {
    isDragging = false;
    isPinching = false;
    lastPinchDist = 0;
  }

  /**
   * Attach gesture handling to a DOM element
   * @param {HTMLElement} el - The touch target element
   */
  function attach(el) {
    if (attachedElement) detach();

    attachedElement = el;
    handlers = {
      touchstart: onTouchStart,
      touchmove: onTouchMove,
      touchend: onTouchEnd,
    };

    el.addEventListener('touchstart', handlers.touchstart, { passive: false });
    el.addEventListener('touchmove', handlers.touchmove, { passive: false });
    el.addEventListener('touchend', handlers.touchend, { passive: false });
  }

  /** Detach gesture handling from the current element */
  function detach() {
    if (!attachedElement) return;
    attachedElement.removeEventListener('touchstart', handlers.touchstart);
    attachedElement.removeEventListener('touchmove', handlers.touchmove);
    attachedElement.removeEventListener('touchend', handlers.touchend);
    attachedElement = null;
    handlers = {};
  }

  /** Update the target mesh (e.g., after content swap) */
  function setMesh(newMesh) {
    mesh = newMesh;
  }

  return { attach, detach, setMesh };
}
