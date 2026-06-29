// ═══════════════════════════════════════════════════════════
//  Spirit Scene — Tier 1 Flat-Screen Compelling Experience
//  Loads GLB, particles, atmospheric lighting, auto-camera orbit
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ── Renderer ──
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ── Scene & Fog ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05030a);
scene.fog = new THREE.FogExp2(0x0a0612, 0.035);

// ── Camera ──
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0.5, 4.5);
camera.lookAt(0, 0, 0);

// ── Lighting ──
const ambient = new THREE.AmbientLight(0x2a1f3d, 0.6);
scene.add(ambient);

const keyLight = new THREE.PointLight(0xc9a87c, 3, 20);
keyLight.position.set(2, 3, 2);
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x4a6fa5, 2, 15);
rimLight.position.set(-3, 1, -2);
scene.add(rimLight);

const underLight = new THREE.PointLight(0x8b5cf6, 1.5, 8);
underLight.position.set(0, -2, 1);
scene.add(underLight);

// ── Particle Field (stars/embers) ──
const particleCount = 600;
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const sizes = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
  const i3 = i * 3;
  // Spherical distribution
  const radius = 3 + Math.random() * 8;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  positions[i3]     = radius * Math.sin(phi) * Math.cos(theta);
  positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6; // flatten vertically
  positions[i3 + 2] = radius * Math.cos(phi);

  // Warm palette: amber → violet
  const hue = 0.05 + Math.random() * 0.15; // amber to soft pink
  const c = new THREE.Color().setHSL(hue, 0.7, 0.5 + Math.random() * 0.3);
  colors[i3]     = c.r;
  colors[i3 + 1] = c.g;
  colors[i3 + 2] = c.b;

  sizes[i] = 0.02 + Math.random() * 0.06;
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

const particleMat = new THREE.PointsMaterial({
  size: 0.05,
  vertexColors: true,
  transparent: true,
  opacity: 0.7,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
});

const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// ── Ground glow disc ──
const discGeo = new THREE.CircleGeometry(3, 64);
const discMat = new THREE.MeshBasicMaterial({
  color: 0x1a0a2e,
  transparent: true,
  opacity: 0.5,
  side: THREE.DoubleSide,
});
const disc = new THREE.Mesh(discGeo, discMat);
disc.rotation.x = -Math.PI / 2;
disc.position.y = -1.8;
scene.add(disc);

// ── Antoine Art Cube — 6 faces, 6 characters ──
const CF_HASH = '4bRSwPonOXfEIBVZiDXg0w';
const ARTWORKS = [
  '12c79899-fb93-4885-508f-d2da0a2fbf00',
  'bd4602b0-149d-42f8-e872-f697b64c7d00',
  '5c7fb409-1aa2-45a9-8466-296077e18e00',
  'f8a136eb-363e-4a24-0f54-70bb4f4bf800',
  '5c28fef5-cff0-4ddd-b4af-100d29bad100',
  '62355ddb-0f6c-4251-5d8e-37a455e44000',
];
const texLoader = new THREE.TextureLoader();
texLoader.crossOrigin = 'anonymous';

const cubeMaterials = ARTWORKS.map((id) => {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  texLoader.load(
    `https://imagedelivery.net/${CF_HASH}/${id}/segment=foreground,width=512`,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.opacity = 0.92;
      mat.needsUpdate = true;
    }
  );
  return mat;
});

const cubeGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const artCube = new THREE.Mesh(cubeGeo, cubeMaterials);
artCube.position.set(0, 0.2, -2.5);
scene.add(artCube);

// Glow ring behind cube
const cubeGlowGeo = new THREE.RingGeometry(0.9, 1.1, 32);
const cubeGlowMat = new THREE.MeshBasicMaterial({
  color: 0xc9a87c,
  transparent: true,
  opacity: 0.2,
  side: THREE.DoubleSide,
});
const cubeGlow = new THREE.Mesh(cubeGlowGeo, cubeGlowMat);
cubeGlow.position.set(0, 0.2, -2.7);
scene.add(cubeGlow);

// ── Load Spirit GLB ──
let spiritMixer = null;
let spiritRoot = null;
let gltfAnimations = [];

const loader = new GLTFLoader();
loader.load(
  '/72fpsEFLSpirit-enhanced.glb',
  (gltf) => {
    spiritRoot = gltf.scene;
    spiritRoot.position.set(0, -0.8, 0);
    spiritRoot.scale.setScalar(0.75);

    // Material enhancement — unlit, bright, ghostly
    spiritRoot.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.08, 0.8, 0.6), // warm amber start
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
      }
    });

    scene.add(spiritRoot);

    // Animation mixer
    spiritMixer = new THREE.AnimationMixer(spiritRoot);
    gltfAnimations = gltf.animations;

    gltf.animations.forEach((clip) => {
      // Skip noisy clips
      if (clip.name === 'morph_original' || clip.name === 'rotate') return;

      const action = spiritMixer.clipAction(clip);

      if (clip.name === 'zoom_in') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat);
      }
      action.play();
      console.log(`🎬 Playing: ${clip.name} (${clip.duration.toFixed(1)}s)`);
    });

    // Fade-in
    spiritRoot.scale.setScalar(0.01);
    const fadeIn = { val: 0.01 };
    const fadeInInterval = setInterval(() => {
      fadeIn.val += 0.02;
      if (fadeIn.val >= 0.75) {
        fadeIn.val = 0.75;
        clearInterval(fadeInInterval);
      }
      spiritRoot.scale.setScalar(fadeIn.val);
    }, 16);

    showOverlay('✦ The Spirit Awakens');
  },
  (progress) => {
    const pct = ((progress.loaded / progress.total) * 100).toFixed(0);
    if (pct % 25 === 0) console.log(`Loading GLB: ${pct}%`);
  },
  (err) => console.error('GLB load error:', err)
);

// ── Narrative Overlays (auto-advance) ──
const narrative = [
  { delay: 0,    text: '✦ The Spirit Awakens',   duration: 4000 },
  { delay: 4500, text: '❝ Words float through the ether ❞', duration: 5000 },
  { delay: 10000, text: '❝ Each story a portal ❞', duration: 4500 },
  { delay: 15500, text: '❝ Touch the crystal to enter ❞', duration: 4000 },
];

let overlayEl = null;
let narrativeTimers = [];

function showOverlay(text) {
  if (overlayEl) overlayEl.remove();

  overlayEl = document.createElement('div');
  overlayEl.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #c9a87c;
    font-family: 'Georgia', serif;
    font-size: clamp(18px, 4vw, 28px);
    letter-spacing: 0.05em;
    text-shadow: 0 0 20px rgba(201,168,124,0.6), 0 0 40px rgba(139,92,246,0.3);
    opacity: 0;
    transition: opacity 1.5s ease;
    pointer-events: none;
    z-index: 100;
    text-align: center;
    max-width: 80vw;
  `;
  overlayEl.textContent = text;
  document.body.appendChild(overlayEl);

  requestAnimationFrame(() => {
    overlayEl.style.opacity = '1';
  });

  setTimeout(() => {
    if (overlayEl) overlayEl.style.opacity = '0';
  }, 3000);
}

function scheduleNarrative() {
  narrative.forEach((line) => {
    const t = setTimeout(() => showOverlay(line.text), line.delay);
    narrativeTimers.push(t);
  });
}

// ── Click/Tap interaction ──
let userInteracted = false;
renderer.domElement.addEventListener('pointerdown', () => {
  userInteracted = true;
  // Speed up camera orbit briefly on tap
  orbitBoost = 1.0;
});

// ── Camera orbit state ──
let orbitAngle = 0;
let orbitBoost = 0;
const orbitRadius = 4.5;
const orbitHeight = 0.5;

// ── Animation Loop ──
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.getElapsedTime();

  // Camera slow orbit
  orbitAngle += dt * (0.08 + orbitBoost);
  orbitBoost *= 0.95; // decay

  const camX = Math.sin(orbitAngle) * orbitRadius;
  const camZ = Math.cos(orbitAngle) * orbitRadius;
  const camY = orbitHeight + Math.sin(t * 0.3) * 0.3; // gentle bob

  camera.position.set(camX, camY, camZ);
  camera.lookAt(0, -0.3, 0);

  // Spirit animations
  if (spiritMixer) {
    spiritMixer.update(dt);
  }

  // Spirit gentle float + rainbow color
  if (spiritRoot) {
    spiritRoot.position.y = -0.8 + Math.sin(t * 0.5) * 0.15;
    spiritRoot.rotation.y += 0.02;

    // Rainbow HSL cycling — bright and visible
    const hue = (t * 0.12) % 1;
    spiritRoot.traverse((child) => {
      if (child.isMesh && child.material && child.material.color) {
        child.material.color.setHSL(hue, 0.9, 0.6);
      }
    });
  }

  // Particle drift
  particles.rotation.y += dt * 0.02;
  particles.rotation.x += dt * 0.005;

  // Lights pulse
  keyLight.intensity = 3 + Math.sin(t * 0.8) * 0.5;
  rimLight.intensity = 2 + Math.cos(t * 0.6) * 0.4;
  underLight.intensity = 1.5 + Math.sin(t * 1.2) * 0.3;

  // Disc pulse
  disc.material.opacity = 0.4 + Math.sin(t * 0.5) * 0.15;

  // Crystal rotate + float
  crystal.rotation.y += 0.02;
  crystal.rotation.x += 0.01;
  crystal.position.y = 0.5 + Math.sin(t * 0.8) * 0.1;
  // Crystal hue cycle
  const cHue = (t * 0.05 + 0.08) % 1;
  crystalMat.color.setHSL(cHue, 0.7, 0.6);

  // Art cube — slow rotate on all axes
  artCube.rotation.x += 0.005;
  artCube.rotation.y += 0.008;
  artCube.position.y = 0.2 + Math.sin(t * 0.4) * 0.15;
  // Cube glow pulse
  cubeGlow.material.opacity = 0.15 + Math.sin(t * 1.0) * 0.1;
  cubeGlow.scale.setScalar(1 + Math.sin(t * 0.8) * 0.05);

  renderer.render(scene, camera);
}

// ── Crystal — floating octahedron, clickable ──
const crystalGeo = new THREE.OctahedronGeometry(0.35, 0);
const crystalMat = new THREE.MeshBasicMaterial({
  color: 0xc9a87c,
  transparent: true,
  opacity: 0.9,
  side: THREE.DoubleSide,
});
const crystal = new THREE.Mesh(crystalGeo, crystalMat);
crystal.position.set(0, 0.5, -1.5);
scene.add(crystal);

// Raycaster for touch/click
crystal.userData.tappable = true;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let crystalTouched = false;

function onPointerDown(e) {
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const y = e.touches ? e.touches[0].clientY : e.clientY;
  pointer.x = (x / window.innerWidth) * 2 - 1;
  pointer.y = -(y / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(crystal);
  if (hits.length > 0 && !crystalTouched) {
    crystalTouched = true;
    // Flash bright
    crystalMat.color.setRGB(1, 1, 1);
    setTimeout(() => crystalMat.color.setHex(0xc9a87c), 200);
    showOverlay('❝ The portal opens ❞');
    // Boost camera orbit
    orbitBoost = 2.0;
    // Could trigger scene change here
  }
}
renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('touchstart', onPointerDown);

// ── Start ──
animate();
scheduleNarrative();

// Schedule narrative loop every 25 seconds
setInterval(() => {
  narrativeTimers.forEach(clearTimeout);
  narrativeTimers = [];
  scheduleNarrative();
}, 25000);

// ── Resize ──
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
