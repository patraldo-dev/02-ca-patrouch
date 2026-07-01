// Ultra Simple Test - Instant loading
import * as THREE from 'three';

// ── Core scene setup ──
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02);

// ── Lighting ──
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

// ── Camera ──
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);
camera.lookAt(0, 0, 0);

// ── Renderer ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ── Crystal setup ──
const crystalGeometry = new THREE.OctahedronGeometry(2.0, 0);
const crystalMaterial = new THREE.MeshBasicMaterial({ 
  color: new THREE.Color().setHSL(0, 1.0, 0.5),
  transparent: true,
  opacity: 0.85,
  side: THREE.DoubleSide,
  emissive: new THREE.Color().setHSL(0, 1.0, 0.5),
  emissiveIntensity: 1.5
});
const crystalMesh = new THREE.Mesh(crystalGeometry, crystalMaterial);
scene.add(crystalMesh);

// ── Spirit setup ──
const spiritGeometry = new THREE.SphereGeometry(0.8, 32, 32);
const spiritMaterial = new THREE.MeshBasicMaterial({ 
  color: new THREE.Color().setHSL(0.5, 1.0, 0.5),
  transparent: true,
  opacity: 0.85,
  side: THREE.DoubleSide
});
const spiritMesh = new THREE.Mesh(spiritGeometry, spiritMaterial);
scene.add(spiritMesh);

// ── Animation loop ──
let time = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  time += clock.getDelta();
  
  // Rainbow cycling for spirit
  const hue = (time * 0.15) % 1.0;
  spiritMaterial.color.setHSL(hue, 1.0, 0.5);
  
  renderer.render(scene, camera);
}

// ── Start animation ──
animate();

// ── Handle window resize ──
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});