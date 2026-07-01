import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  PointLight,
  AmbientLight,
  SessionMode,
  World,
  Transform,
  createSystem,
  Interactable,
  RayInteractable,
  PokeInteractable,
  DistanceGrabbable,
  OneHandGrabbable,
  TwoHandsGrabbable,
  XRAnchor,
  XRPlane,
  XRMesh,
  PhysicsBody,
  PhysicsShape,
  PhysicsShapeType,
  PhysicsManipulation,
  DepthOccludable,
  EnvironmentRaycastTarget,
} from '@iwsdk/core';

// ─── Constants ───
const RAINBOW_SPEED = 0.1;
const SPIRIT_SCALE = 0.8;

// ─── ECS System: Rainbow + animation (priority 0) ───
class SpiritAnimationSystem extends createSystem({}) {
  update(delta) {
    const t = this.clock.getElapsedTime();
    const hue = (t * RAINBOW_SPEED) % 1;
    this.spirit.traverse((child) => {
      if (child.isMesh && child.material.color) {
        child.material.color.setHSL(hue, 0.85, 0.55);
      }
    });
    if (this.mixer) this.mixer.update(delta);
  }
}

// ─── ECS System: Float when not grabbed (priority 0) ───
class SpiritFloatSystem extends createSystem({}) {
  update(delta) {
    if (this.isManipulating) return;
    const t = this.clock.getElapsedTime();
    const pos = this.spiritEntity.getVectorView(Transform, 'position');
    pos[1] = this.baseY + Math.sin(t * 0.8) * 0.06;
  }
}

// ─── Reticle ───
function createReticle() {
  const geo = new THREE.RingGeometry(0.06, 0.1, 32);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xc9a87c, transparent: true, opacity: 0.6, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.matrixAutoUpdate = false;
  mesh.visible = false;
  return mesh;
}

// ─── World setup ───
World.create(document.getElementById('scene-container'), {
  xr: {
    sessionMode: SessionMode.ImmersiveAR,
    offer: 'always',
    features: {
      handTracking: true,
      anchors: true,
      hitTest: true,
      planeDetection: true,
      lightEstimation: true,
      depthSensing: true,
    },
  },
  features: {
    locomotion: true,
    grabbing: true,
    physics: true,
    sceneUnderstanding: true,
    environmentRaycast: true,
  },
}).then(async (world) => {
  const { scene, camera, renderer } = world;

  // ─── Lighting ───
  scene.add(new AmbientLight(0xffffff, 1.0));
  const pointLight = new PointLight(0xfff5e6, 2, 15);
  pointLight.position.set(0, 2.5, 1);
  scene.add(pointLight);
  const rimLight = new PointLight(0xc9a87c, 1.0, 10);
  rimLight.position.set(-1.5, 2, -1);
  scene.add(rimLight);

  const reticle = createReticle();
  scene.add(reticle);

  // ─── State ───
  let spiritEntity = null;
  let spirit = null;
  let placed = false;
  let xrHitTestSource = null;
  let xrRefSpace = null;

  // ─── Mouse manipulation state ───
  let isDragging = false;
  let isRotating = false;
  let isPanning = false;
  let prevMouse = { x: 0, y: 0 };
  let manipulationMode = null; // 'rotate' | 'pan' | null
  let baseY = -1.5;

  // ─── XR session ───
  renderer.xr.addEventListener('sessionstart', async () => {
    const session = renderer.xr.getSession();
    try { xrRefSpace = await session.requestReferenceSpace('local'); }
    catch { xrRefSpace = await session.requestReferenceSpace('viewer'); }

    try {
      const viewerSpace = await session.requestReferenceSpace('viewer');
      xrHitTestSource = await session.requestHitTestSource({
        space: viewerSpace, entityTypes: ['plane'],
      });
      console.log('✅ Hit test ready');
    } catch (e) { console.warn('No hit test:', e); }

    try {
      const lp = await session.requestLightProbe();
      const xrLight = new THREE.XREstimatedLight(renderer);
      xrLight.addEventListener('estimationstart', () => {
        scene.add(xrLight);
        if (xrLight.environment) scene.environment = xrLight.environment;
      });
      scene.add(lp);
    } catch (e) { /* no light probe */ }
  });

  // ─── Hit test reticle system ───
  class ReticleSystem extends createSystem({}) {
    update(delta) {
      if (!xrHitTestSource || placed) return;
      const frame = renderer.xr.getFrame();
      if (!frame || !xrRefSpace) return;
      try {
        const results = frame.getHitTestResults(xrHitTestSource);
        if (results.length > 0) {
          const pose = results[0].getPose(xrRefSpace);
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
        } else { reticle.visible = false; }
      } catch {}
    }
  }
  world.registerSystem(ReticleSystem, { priority: -2 });

  // ═══════════════════════════════════════════════
  // ─── MOUSE MANIPULATION (works in emulator) ───
  // ═══════════════════════════════════════════════

  const canvas = renderer.domElement;

  canvas.addEventListener('mousedown', (e) => {
    if (!spiritEntity) return;
    prevMouse.x = e.clientX;
    prevMouse.y = e.clientY;

    if (e.button === 0) {        // Left click = rotate
      if (!placed) { placeSpiritAtCamera(); return; }
      isDragging = true;
      manipulationMode = 'rotate';
    } else if (e.button === 2) { // Right click = pan/move
      isDragging = true;
      manipulationMode = 'pan';
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging || !spiritEntity) return;

    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;
    prevMouse.x = e.clientX;
    prevMouse.y = e.clientY;

    const orient = spiritEntity.getVectorView(Transform, 'orientation');
    const pos = spiritEntity.getVectorView(Transform, 'position');

    // Extract current quaternion
    const qx = orient[0], qy = orient[1], qz = orient[2], qw = orient[3];

    if (manipulationMode === 'rotate') {
      // Rotate around world Y (horizontal mouse) and local X (vertical mouse)
      const yawAngle = dx * 0.01;
      const yawQ = new THREE.Quaternion(Math.sin(yawAngle / 2), 0, 0, Math.cos(yawAngle / 2));

      // Local pitch around X axis
      const pitchAngle = dy * 0.01;
      const pitchQ = new THREE.Quaternion(0, 0, Math.sin(pitchAngle / 2), Math.cos(pitchAngle / 2));

      const currentQ = new THREE.Quaternion(qx, qy, qz, qw);
      currentQ.premultiply(yawQ);
      currentQ.multiply(pitchQ);

      orient[0] = currentQ.x;
      orient[1] = currentQ.y;
      orient[2] = currentQ.z;
      orient[3] = currentQ.w;
    } else if (manipulationMode === 'pan') {
      // Move spirit in screen space
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      const speed = 0.005;
      pos[0] -= right.x * dx * speed - up.x * dy * speed;
      pos[1] -= right.y * dx * speed - up.y * dy * speed;
      pos[2] -= right.z * dx * speed - up.z * dy * speed;
      baseY = pos[1];
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    manipulationMode = null;
  });

  canvas.addEventListener('wheel', (e) => {
    if (!spiritEntity) return;
    e.preventDefault();
    const pos = spiritEntity.getVectorView(Transform, 'position');
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const zoomSpeed = 0.1;
    pos[0] += camDir.x * e.deltaY * zoomSpeed;
    pos[1] += camDir.y * e.deltaY * zoomSpeed;
    pos[2] += camDir.z * e.deltaY * zoomSpeed;
    baseY = pos[1];
  }, { passive: false });

  // Prevent right-click context menu
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function placeSpiritAtCamera() {
    if (!spiritEntity) return;
    const pos = spiritEntity.getVectorView(Transform, 'position');
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    pos[0] = camera.position.x + camDir.x * 1.5;
    pos[1] = camera.position.y - 1.0;
    pos[2] = camera.position.z + camDir.z * 1.5;
    spiritEntity.addComponent(XRAnchor);
    placed = true;
    reticle.visible = false;
    updateLabel('🦀 Spirit — Placed!\n🖱️ Left drag = rotate | Right drag = move | Scroll = zoom');
  }

  // ─── Load GLB ───
  const loader = new GLTFLoader();
  loader.load('/72fpsEFLSpirit-enhanced.glb', (gltf) => {
    spirit = gltf.scene;

    spirit.traverse((child) => {
      if (child.isMesh) {
        child.material.transparent = true;
        child.material.opacity = 0.7;
        child.material.depthWrite = false;
        child.material.side = THREE.DoubleSide;
      }
    });

    spiritEntity = world.createTransformEntity(spirit);

    const pos = spiritEntity.getVectorView(Transform, 'position');
    pos[0] = 0; pos[1] = baseY; pos[2] = -1.0;

    const scale = spiritEntity.getVectorView(Transform, 'scale');
    scale[0] = SPIRIT_SCALE;
    scale[1] = SPIRIT_SCALE;
    scale[2] = SPIRIT_SCALE;

    // Animation
    const mixer = new THREE.AnimationMixer(spirit);
    gltf.animations.forEach((clip) => {
      if (clip.name === 'morph_original' || clip.name === 'rotate') return;
      const action = mixer.clipAction(clip);
      if (clip.name === 'zoom_in') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.startAt(8);
      } else {
        action.setLoop(THREE.LoopRepeat);
      }
      action.play();
      console.log(`🎬 ${clip.name} — ${clip.duration.toFixed(1)}s`);
    });

    // ECS Systems
    world.registerSystem(SpiritAnimationSystem, { priority: 0 });
    const animSys = world.getSystem(SpiritAnimationSystem);
    animSys.clock = new THREE.Clock();
    animSys.mixer = mixer;
    animSys.spirit = spirit;

    world.registerSystem(SpiritFloatSystem, { priority: 0 });
    const floatSys = world.getSystem(SpiritFloatSystem);
    floatSys.clock = new THREE.Clock();
    floatSys.spiritEntity = spiritEntity;
    floatSys.baseY = baseY;
    floatSys.isManipulating = false;

    // Stop floating while mouse is dragging
    canvas.addEventListener('mousedown', () => {
      if (placed && floatSys) floatSys.isManipulating = true;
    });
    canvas.addEventListener('mouseup', () => {
      if (floatSys) floatSys.isManipulating = false;
    });

    // XR interactivity (for real headset)
    spiritEntity.addComponent(Interactable);
    spiritEntity.addComponent(RayInteractable);
    spiritEntity.addComponent(PokeInteractable);
    spiritEntity.addComponent(DistanceGrabbable, { movementMode: 'moveFromTarget' });
    spiritEntity.addComponent(OneHandGrabbable);
    spiritEntity.addComponent(TwoHandsGrabbable);
    spiritEntity.addComponent(XRPlane);
    spiritEntity.addComponent(EnvironmentRaycastTarget);
    spiritEntity.addComponent(DepthOccludable);
    spiritEntity.addComponent(PhysicsBody, {
      mass: 0.5, gravityFactor: 0.1, linearDamping: 0.95,
    });
    spiritEntity.addComponent(PhysicsShape, { type: PhysicsShapeType.SPHERE, radius: 0.5 });
    spiritEntity.addComponent(PhysicsManipulation);

    updateLabel('🦀 Spirit — Click to place\nThen: 🖱️ Left drag = rotate | Right drag = move | Scroll = zoom');
  });
});

function updateLabel(text) {
  let el = document.getElementById('status-label');
  if (!el) {
    el = document.createElement('div');
    el.id = 'status-label';
    el.style.cssText =
      'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#c9a87c;padding:12px 24px;border-radius:12px;font-family:Inter,sans-serif;font-size:12px;z-index:10;pointer-events:none;max-width:90%;text-align:center;line-height:1.6;white-space:pre-line;';
    document.body.appendChild(el);
  }
  el.textContent = text;
}
