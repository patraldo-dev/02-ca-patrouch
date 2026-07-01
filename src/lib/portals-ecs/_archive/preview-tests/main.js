import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  PointLight,
  AmbientLight,
  SessionMode,
  World
} from '@iwsdk/core';

World.create(document.getElementById('scene-container'), {
  xr: {
    sessionMode: SessionMode.ImmersiveAR,
    offer: 'always',
    features: { anchors: true, hitTest: true, planeDetection: true }
  },
  features: {
    locomotion: false,
    grabbing: false,
    physics: false,
    sceneUnderstanding: false,
    environmentRaycast: false
  }
}).then(async (world) => {
  const { scene, camera } = world;
  camera.position.set(0, 1.2, 2);

  // Lighting
  scene.add(new AmbientLight(0xffffff, 1.0));
  const pl = new PointLight(0xfff5e6, 2, 15);
  pl.position.set(0, 2.5, 1);
  scene.add(pl);
  const rim = new PointLight(0xc9a87c, 1.0, 10);
  rim.position.set(-1.5, 2, -1);
  scene.add(rim);

  // Load enhanced spirit GLB
  const loader = new GLTFLoader();
  loader.load('/72fpsEFLSpirit-enhanced.glb', (gltf) => {
    const spirit = gltf.scene;
    spirit.position.set(0, -1.5, -1.0);
    spirit.scale.setScalar(0.8);
    spirit.rotation.x = -0.12;

    spirit.traverse(child => {
      if (child.isMesh) {
        child.material.transparent = true;
        child.material.opacity = 0.7;
        child.material.depthWrite = false;
        child.material.side = THREE.DoubleSide;
      }
    });

    scene.add(spirit);

    // Play all animations
    const mixer = new THREE.AnimationMixer(spirit);
    gltf.animations.forEach(clip => {
      // Skip morph_original — use morph_slow instead
      if (clip.name === 'morph_original') return;
      if (clip.name === 'rotate') return;
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

    // Title
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:#c9a87c;padding:8px 20px;border-radius:8px;font-family:Inter,sans-serif;font-size:14px;z-index:10;pointer-events:none;';
    el.textContent = '🦀 Spirit — Enhanced GLB';
    document.body.appendChild(el);

    // Animate
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const t = clock.getElapsedTime();
      mixer.update(dt);

      // Rainbow HSL cycling
      const hue = (t * 0.1) % 1;
      spirit.traverse(child => {
        if (child.isMesh && child.material.color) {
          child.material.color.setHSL(hue, 0.85, 0.55);
        }
      });

      renderer.render(scene, camera);
    }
    animate();
  });

  const renderer = world.renderer;
});
