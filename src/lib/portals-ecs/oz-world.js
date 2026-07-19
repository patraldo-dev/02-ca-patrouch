// @ts-nocheck — IWSDK/Three.js ECS code
// ═══════════════════════════════════════════════════════════
//  oz-world.js
//  The Wizard of Oz-inspired world. The visitor is Dorothy, arriving
//  in a field of oversized flowers. GLB munchkins (Antoine's figures)
//  hide inside the flowers — invisible until Dorothy approaches. When
//  she gets close, they pop out, scatter, and the yellow brick road
//  lights up leading deeper into the scene.
//
//  ECS architecture: HideSystem handles proximity reveal, same pattern
//  as the portal engine's RevelationSystem.
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';
import { World } from '@iwsdk/core';
import { createComponent, createSystem, Types, ComponentRegistry } from 'elics';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const CF_IMAGES_HASH = '4bRSwPonOXfEIBVZiDXg0w';
const SKYBOX_ID = 'e9fd4477-84f5-4a57-ac67-aba89d28b000';

// ── ECS Components ──
function reuseOrCreate(id, schema) {
	return ComponentRegistry.has(id) ? ComponentRegistry.getById(id) : createComponent(id, schema);
}

const Munchkin = reuseOrCreate('OzMunchkin', {
	state:       { type: Types.String, default: 'hidden' }, // hidden|emerging|visible|scattering
	revealDist:  { type: Types.Float32, default: 3.0 },
	hideDist:    { type: Types.Float32, default: 5.0 },
	bobPhase:    { type: Types.Float32, default: 0 },
	spinSpeed:   { type: Types.Float32, default: 0.5 },
	scatterDir:  { type: Types.Float32, default: 0 }, // angle
	scatterTime: { type: Types.Float32, default: 0 },
	points:      { type: Types.Int32, default: 2 },
	collected:   { type: Types.Boolean, default: false },
});

const Flower = reuseOrCreate('OzFlower', {
	swayPhase: { type: Types.Float32, default: 0 },
	swaySpeed: { type: Types.Float32, default: 0.5 },
	hasMunchkin: { type: Types.Boolean, default: false },
});

// ── ECS Systems ──

// HideRevealSystem: manages munchkin visibility based on player proximity.
// Same pattern as the portal engine's RevelationSystem.
const HideRevealSystem = class extends createSystem({
	munchkins: { required: [Munchkin] },
}) {
	update(dt) {
		const camera = this.world?.camera;
		if (!camera) return;
		const playerX = camera.position.x;
		const playerZ = camera.position.z;

		for (const entity of this.queries.munchkins.entities) {
			if (entity.getValue(Munchkin, 'collected')) continue;
			const obj = entity.object3D;
			if (!obj) continue;

			const state = entity.getValue(Munchkin, 'state');
			const revealDist = entity.getValue(Munchkin, 'revealDist');
			const hideDist = entity.getValue(Munchkin, 'hideDist');
			const dist = Math.hypot(obj.position.x - playerX, obj.position.z - playerZ);

			if (state === 'hidden' && dist < revealDist) {
				entity.setValue(Munchkin, 'state', 'emerging');
			} else if (state === 'emerging') {
				// Scale up (pop out of flower)
				const s = Math.min(1, obj.scale.x + dt * 3);
				obj.scale.setScalar(s);
				if (s >= 1) {
					entity.setValue(Munchkin, 'state', 'visible');
					entity.setValue(Munchkin, 'scatterDir', Math.random() * Math.PI * 2);
					entity.setValue(Munchkin, 'scatterTime', 0);
				}
			} else if (state === 'visible') {
				const scatterTime = entity.getValue(Munchkin, 'scatterTime');
				const newTime = scatterTime + dt;

				if (newTime < 2.0) {
					// Scatter: run away from player
					const dir = entity.getValue(Munchkin, 'scatterDir');
					const speed = 1.5 * (1 - newTime / 2.0);
					obj.position.x += Math.cos(dir) * speed * dt;
					obj.position.z += Math.sin(dir) * speed * dt;
					obj.rotation.y += dt * 3;
				}

				entity.setValue(Munchkin, 'scatterTime', newTime);
				obj.position.y = 0.6 + Math.sin(performance.now() / 200 + entity.getValue(Munchkin, 'bobPhase')) * 0.1;

				// Collect on touch
				if (dist < 1.0) {
					entity.setValue(Munchkin, 'collected', true);
					if (_onMunchkinCollect) _onMunchkinCollect(entity.getValue(Munchkin, 'points'));
				}
			}
		}
	}
};

// FlowerSwaySystem: gentle flower animation
const FlowerSwaySystem = class extends createSystem({
	flowers: { required: [Flower] },
}) {
	update(dt) {
		const time = performance.now() / 1000;
		for (const entity of this.queries.flowers.entities) {
			const obj = entity.object3D;
			if (!obj) continue;
			const phase = entity.getValue(Flower, 'swayPhase');
			const speed = entity.getValue(Flower, 'swaySpeed');
			obj.rotation.z = Math.sin(time * speed + phase) * 0.05;
		}
	}
};

// Module-level callbacks
let _onMunchkinCollect = null;

// ── Text sprite helper ──
function createTextSprite(text, color = '#ffd700') {
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 64;
	const ctx = canvas.getContext('2d');
	ctx.font = 'bold 24px sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = color;
	ctx.fillText(text, 128, 32);
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
	const sprite = new THREE.Sprite(material);
	sprite.scale.set(1.5, 0.4, 1);
	return sprite;
}

// ── Boot function ──
export async function bootOzWorld(container, options = {}) {
	if (!container) throw new Error('bootOzWorld: container is null');

	const onScoreUpdate = options.onScoreUpdate || (() => {});
	let score = 0;

	// ── Scene ──
	const scene = new THREE.Scene();

	// Skybox
	const skyboxTexture = new THREE.TextureLoader().load(
		`https://imagedelivery.net/${CF_IMAGES_HASH}/${SKYBOX_ID}/full`
	);
	skyboxTexture.colorSpace = THREE.SRGBColorSpace;
	const skybox = new THREE.Mesh(
		new THREE.SphereGeometry(45, 32, 16),
		new THREE.MeshBasicMaterial({ map: skyboxTexture, side: THREE.BackSide, depthWrite: false })
	);
	scene.add(skybox);
	scene.fog = new THREE.Fog(0x2a3318, 12, 38);

	// Camera
	const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 100);
	camera.position.set(0, 1.6, 6);

	// Renderer
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(container.clientWidth, container.clientHeight);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	container.appendChild(renderer.domElement);

	// Lighting — warm Oz daylight
	scene.add(new THREE.AmbientLight(0xffe8aa, 0.5));
	const sun = new THREE.DirectionalLight(0xfff0cc, 1.0);
	sun.position.set(5, 15, 8);
	scene.add(sun);
	const fill = new THREE.DirectionalLight(0x88aa44, 0.3);
	fill.position.set(-5, 5, -3);
	scene.add(fill);

	// ── Ground: grass-green textured plane ──
	const groundCanvas = document.createElement('canvas');
	groundCanvas.width = 256;
	groundCanvas.height = 256;
	const gctx = groundCanvas.getContext('2d');
	gctx.fillStyle = '#2d4a1e';
	gctx.fillRect(0, 0, 256, 256);
	// Grass texture noise
	for (let i = 0; i < 500; i++) {
		const x = Math.random() * 256;
		const y = Math.random() * 256;
		const v = Math.random();
		gctx.fillStyle = `rgb(${30 + v * 20}, ${60 + v * 30}, ${20 + v * 15})`;
		gctx.fillRect(x, y, 3, 3);
	}
	const groundTexture = new THREE.CanvasTexture(groundCanvas);
	groundTexture.wrapS = THREE.RepeatWrapping;
	groundTexture.wrapT = THREE.RepeatWrapping;
	groundTexture.repeat.set(15, 15);

	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry(60, 60),
		new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1.0 })
	);
	ground.rotation.x = -Math.PI / 2;
	scene.add(ground);

	// ── Yellow brick road: golden path leading forward ──
	const roadGroup = new THREE.Group();
	const roadSegments = 8;
	for (let i = 0; i < roadSegments; i++) {
		const seg = new THREE.Mesh(
			new THREE.PlaneGeometry(2.5, 3),
			new THREE.MeshStandardMaterial({
				color: 0xd4a017,
				roughness: 0.6,
				metalness: 0.2,
				emissive: 0x442200,
			})
		);
		seg.rotation.x = -Math.PI / 2;
		seg.position.set(0, 0.01, -(i * 3.2) - 2);
		roadGroup.add(seg);

		// Brick pattern lines
		for (let b = 0; b < 3; b++) {
			const line = new THREE.Mesh(
				new THREE.PlaneGeometry(2.3, 0.06),
				new THREE.MeshBasicMaterial({ color: 0x8a6810 })
			);
			line.rotation.x = -Math.PI / 2;
			line.position.set(0, 0.02, -(i * 3.2) - 2 + (b - 1) * 0.9);
			roadGroup.add(line);
		}
	}
	scene.add(roadGroup);

	// ── Load GLB munchkins ──
	const loader = new GLTFLoader();
	const munchkinTemplates = await Promise.all([
		new Promise((resolve) => {
			loader.load('/api/assets/models/hombre-amarillo.glb', (gltf) => {
				gltf.scene.traverse((child) => {
					if (child.isMesh && child.material) {
						child.material.transparent = true;
						child.material.opacity = 0.9;
						child.material.depthWrite = true;
						child.material.side = THREE.DoubleSide;
					}
				});
				resolve(gltf.scene);
			});
		}),
		new Promise((resolve) => {
			loader.load('/api/assets/models/antoine/mujer-musa.glb', (gltf) => {
				gltf.scene.traverse((child) => {
					if (child.isMesh && child.material) {
						child.material.transparent = true;
						child.material.opacity = 0.9;
						child.material.depthWrite = true;
						child.material.side = THREE.DoubleSide;
					}
				});
				resolve(gltf.scene);
			});
		}),
	]);

	// ── ECS World ──
	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});

	world.registerComponent(Munchkin);
	world.registerComponent(Flower);
	world.registerSystem(HideRevealSystem, { priority: 0 });
	world.registerSystem(FlowerSwaySystem, { priority: 0 });

	// ── Spawn flowers (some with hidden munchkins inside) ──
	const FLOWER_COUNT = 20;
	const MUNCHKIN_COUNT = 12;
	const flowerColors = [0xff6688, 0xffcc44, 0xff8844, 0xee44aa, 0x66dd88];

	for (let i = 0; i < FLOWER_COUNT; i++) {
		// Build a procedural flower: stem + petals
		const flowerGroup = new THREE.Group();

		// Stem
		const stem = new THREE.Mesh(
			new THREE.CylinderGeometry(0.06, 0.08, 1.5, 6),
			new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.8 })
		);
		stem.position.y = 0.75;
		flowerGroup.add(stem);

		// Petals (cone cluster)
		const petalColor = flowerColors[i % flowerColors.length];
		for (let p = 0; p < 5; p++) {
			const angle = (p / 5) * Math.PI * 2;
			const petal = new THREE.Mesh(
				new THREE.ConeGeometry(0.2, 0.5, 4),
				new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.6 })
			);
			petal.position.set(Math.cos(angle) * 0.2, 1.5, Math.sin(angle) * 0.2);
			petal.rotation.z = -Math.PI / 3;
			petal.rotation.y = angle;
			flowerGroup.add(petal);
		}

		// Center
		const center = new THREE.Mesh(
			new THREE.SphereGeometry(0.18, 8, 6),
			new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.5 })
		);
		center.position.y = 1.5;
		flowerGroup.add(center);

		// Position — scatter around the road, avoiding the road itself
		let fx, fz;
		do {
			const angle = Math.random() * Math.PI * 2;
			const radius = 3 + Math.random() * 12;
			fx = Math.cos(angle) * radius;
			fz = Math.sin(angle) * radius;
		} while (Math.abs(fx) < 1.5 && fz < 0); // keep off the road

		flowerGroup.position.set(fx, 0, fz);
		scene.add(flowerGroup);

		// ECS entity for sway
		const fEntity = world.createTransformEntity(flowerGroup);
		fEntity.addComponent(Flower, {
			swayPhase: Math.random() * Math.PI * 2,
			swaySpeed: 0.5 + Math.random() * 0.5,
			hasMunchkin: i < MUNCHKIN_COUNT,
		});
	}

	// ── Spawn munchkins hidden near flowers ──
	for (let i = 0; i < MUNCHKIN_COUNT; i++) {
		const template = munchkinTemplates[i % munchkinTemplates.length];
		const clone = template.clone(true);

		// Normalize scale
		const box = new THREE.Box3().setFromObject(clone);
		const size = new THREE.Vector3();
		box.getSize(size);
		if (size.y > 0) clone.scale.setScalar(0.8 / size.y);

		const group = new THREE.Group();
		group.add(clone);

		// Position near a flower area (same scatter as flowers, deterministic-ish)
		const angle = (i / MUNCHKIN_COUNT) * Math.PI * 2 + Math.random() * 0.5;
		const radius = 3 + Math.random() * 12;
		group.position.set(Math.cos(angle) * radius, 0.6, Math.sin(angle) * radius);

		// Start hidden (scale 0)
		group.scale.setScalar(0);
		scene.add(group);

		const entity = world.createTransformEntity(group);
		entity.addComponent(Munchkin, {
			state: 'hidden',
			revealDist: 3.0 + Math.random(),
			hideDist: 5.0 + Math.random() * 2,
			bobPhase: Math.random() * Math.PI * 2,
			spinSpeed: 0.5 + Math.random() * 0.5,
			scatterDir: Math.random() * Math.PI * 2,
			scatterTime: 0,
			points: 2,
			collected: false,
		});
	}

	// Wire collect callback
	_onMunchkinCollect = (pts) => {
		score += pts;
		onScoreUpdate(score);
	};

	// ── Controls + movement ──
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.target.set(0, 1, 0);

	const keys = {};
	const onKeyDown = (e) => { keys[e.code] = true; };
	const onKeyUp = (e) => { keys[e.code] = false; };
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);

	const onResize = () => {
		camera.aspect = container.clientWidth / container.clientHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(container.clientWidth, container.clientHeight);
	};
	window.addEventListener('resize', onResize);

	// ── Animation loop ──
	let animationId;
	const moveDir = new THREE.Vector3();

	function animate() {
		animationId = requestAnimationFrame(animate);
		const dt = 0.016;

		controls.update();

		// WASD movement
		moveDir.set(0, 0, 0);
		if (keys['KeyW'] || keys['ArrowUp']) moveDir.z -= 1;
		if (keys['KeyS'] || keys['ArrowDown']) moveDir.z += 1;
		if (keys['KeyA'] || keys['ArrowLeft']) moveDir.x -= 1;
		if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1;
		if (moveDir.lengthSq() > 0) {
			moveDir.normalize();
			const yaw = controls.getAzimuthalAngle();
			const cos = Math.cos(yaw);
			const sin = Math.sin(yaw);
			camera.position.x += (moveDir.x * cos - moveDir.z * sin) * 3 * dt;
			camera.position.z += (moveDir.x * sin + moveDir.z * cos) * 3 * dt;
			camera.position.y = 1.6;
			controls.target.set(camera.position.x, 1, camera.position.z);
		}

		// IWSDK's World runs registered systems automatically via its internal
		// loop. We do NOT call world.execute() ourselves.
		renderer.render(scene, camera);
	}
	animate();

	return {
		destroy() {
			cancelAnimationFrame(animationId);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('resize', onResize);
			controls.dispose();
			renderer.dispose();
			if (container.contains(renderer.domElement)) {
				container.removeChild(renderer.domElement);
			}
		},
	};
}
