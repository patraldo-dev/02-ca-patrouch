// Portal Interior Preview - Minimal one-crystal demo
// Adapted from 02-ca-patrouch/src/lib/portals-ecs/world.js

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ── Core scene setup ──
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.02);

// ── Lighting ──
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444466, 0.6);
scene.add(hemiLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// ── Camera ──
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 5);
camera.lookAt(0, 0, 0);

// ── Renderer ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// ── Animation loop ──
let time = 0;
const clock = new THREE.Clock();

// ── Spirit GLB loading and setup ──
const spiritMeshes = [];
const gltfLoader = new GLTFLoader();

// Load the enhanced spirit GLB
gltfLoader.load(
  '/models/spirit.glb',
  (gltf) => {
    console.log('Spirit GLB loaded');
    
    // Create one crystal with spirit
    const crystalConfig = {
      text: "Bajo el crepúsculo, el sonido de una campana susurra secretos",
      position: [-2.0, 1.5, -3.0], // Center position
      color_index: 0,
      scale: 1.0
    };
    
    // Create crystal fallback mesh (octahedron) - MUCH larger
    const crystalGeometry = new THREE.OctahedronGeometry(2.0, 0); // 2.0 size for maximum visibility
    const crystalMaterial = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color().setHSL(crystalConfig.color_index / 3, 1.0, 0.5),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const crystalMesh = new THREE.Mesh(crystalGeometry, crystalMaterial);
    crystalMesh.position.set(...crystalConfig.position);
    crystalMesh.userData.crystalText = crystalConfig.text;
    crystalMesh.userData.portalId = 'demo';
    scene.add(crystalMesh);
    
    // Make crystal more visible by adding strong emissive glow
    crystalMaterial.emissive = new THREE.Color().setHSL(crystalConfig.color_index / 3, 1.0, 0.5); // Brighter glow
    crystalMaterial.emissiveIntensity = 1.5; // Maximum intensity
    
    // Ensure crystal is in front of spirit by adjusting render order
    crystalMesh.renderOrder = 2; // Higher render order = drawn later (in front)
    
    // Also make the spirit smaller to ensure crystal is visible
    spiritClone.scale.setScalar(0.2); // Reduce spirit size
    
    // Load spirit GLB and replace materials
    const spiritScene = gltf.scene;
    const spiritClone = spiritScene.clone(true);
    
    // Replace materials with unlit basic material for vibrant colors
    spiritClone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(crystalConfig.color_index / 3, 1.0, 0.5),
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        });
      }
    });
    
    spiritClone.scale.setScalar(0.4);
    // Center the GLB origin
    const box = new THREE.Box3().setFromObject(spiritClone);
    const center = box.getCenter(new THREE.Vector3());
    spiritClone.position.set(
      crystalConfig.position[0] - center.x,
      crystalConfig.position[1] - center.y,
      crystalConfig.position[2] - center.z
    );
    spiritClone.userData.crystalText = crystalConfig.text;
    spiritClone.userData.portalId = 'demo';
    spiritClone.userData.hueOffset = crystalConfig.color_index / 3;
    
    scene.add(spiritClone);
    spiritMeshes.push(spiritClone);
    
    console.log('Crystal and spirit added to scene');
  },
  (progress) => {
    console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
  },
  (error) => {
    console.error('Error loading spirit GLB:', error);
  }
);

// ── Rainbow cycling animation ──
function animate() {
  requestAnimationFrame(animate);
  
  time += clock.getDelta();
  
  // Animate spirit clones
  for (const s of spiritMeshes) {
    if (!s.rotation) continue;
    
    // Rainbow color cycling — full saturation, MeshBasicMaterial ignores scene fog/lighting
    const hue = ((time * 0.15) + (s.userData.hueOffset || 0)) % 1;
    s.traverse((child) => {
      if (child.isMesh && child.material && child.material.color) {
        child.material.color.setHSL(hue, 1.0, 0.5);
      }
    });
    
    // Float animation
    s.position.y += Math.sin(time * 2 + s.userData.hueOffset * 10) * 0.001;
  }
  
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