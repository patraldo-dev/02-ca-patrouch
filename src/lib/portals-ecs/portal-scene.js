// ═══════════════════════════════════════════════════════════
//  Portal Scene — ECS + Three.js + IWSDK
//  World.create() with starfield, art cubes, i18n narrative
// ═══════════════════════════════════════════════════════════
import {
	World, SessionMode, ReferenceSpaceType, Transform,
} from '@iwsdk/core';
import { createComponent, createSystem, Types } from 'elics';
import * as THREE from 'three';

// ── i18n strings ──
const STRINGS = {
	es: {
		title: '✦ Portales',
		touch: 'Toca un cubo para entrar',
		portals: {
			'arboleda': 'Arboleda',
			'fiesta': 'Fiesta',
			'oceano': 'Océano',
			'narrador': 'Narrador',
			'cosmos': 'Cosmos',
			'urbano': 'Urbano',
			'suenos': 'Sueños',
			'nostalgias-espirituales': 'Nostalgias Espirituales',
		},
		narrative: [
			'❝ Cada historia es un portal ❞',
			'❝ Toca un cubo para entrar ❞',
			'❝ Los espíritus esperan ❞',
		],
	},
	en: {
		title: '✦ Portals',
		touch: 'Tap a cube to enter',
		portals: {
			'arboleda': 'The Grove',
			'fiesta': 'Celebration',
			'oceano': 'The Ocean',
			'narrador': 'The Narrator',
			'cosmos': 'The Cosmos',
			'urbano': 'The Street',
			'suenos': 'Dreams',
			'nostalgias-espirituales': 'Gates of Memory',
		},
		narrative: [
			'❝ Every story is a portal ❞',
			'❝ Tap a cube to enter ❞',
			'❝ The spirits are waiting ❞',
		],
	},
};

const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';
const t = STRINGS[lang] || STRINGS.es;

// ── Antoine artwork IDs ──
const CF_HASH = '4bRSwPonOXfEIBVZiDXg0w';
const PORTALS = [
	{ id: 'arboleda', art: '12c79899-fb93-4885-508f-d2da0a2fbf00', color: '#4a7c3a' },
	{ id: 'fiesta', art: 'bd4602b0-149d-42f8-e872-f697b64c7d00', color: '#ff6b35' },
	{ id: 'oceano', art: '5c7fb409-1aa2-45a9-8466-296077e18e00', color: '#0277bd' },
	{ id: 'narrador', art: 'f8a136eb-363e-4a24-0f54-70bb4f4bf800', color: '#c9a87c' },
	{ id: 'cosmos', art: '5c28fef5-cff0-4ddd-b4af-100d29bad100', color: '#7c4dff' },
	{ id: 'urbano', art: '62355ddb-0f6c-4251-5d8e-37a455e44000', color: '#546e7a' },
	{ id: 'suenos', art: '85319dc7-ae16-48f8-9500-608ba174eb00', color: '#9c27b0' },
	{ id: 'nostalgias-espirituales', art: '26fe40df-7745-41dc-7491-97cb36a32f00', color: '#3A4F7A' },
];

// ── ECS Components ──
const PortalCube = createComponent('PortalCube', {
	portalId: { type: Types.String, default: '' },
	artId: { type: Types.String, default: '' },
	color: { type: Types.String, default: '#c9a87c' },
	floatPhase: { type: Types.Float32, default: 0 },
	floatSpeed: { type: Types.Float32, default: 0.5 },
	baseY: { type: Types.Float32, default: 0 },
	isActive: { type: Types.Boolean, default: false },
});

const NarrativeState = createComponent('NarrativeState', {
	stateIndex: { type: Types.Int32, default: 0 },
	autoAdvance: { type: Types.Boolean, default: true },
});

const CameraOrbit = createComponent('CameraOrbit', {
	angle: { type: Types.Float32, default: 0 },
	radius: { type: Types.Float32, default: 5 },
	height: { type: Types.Float32, default: 1 },
	speed: { type: Types.Float32, default: 0.08 },
	boost: { type: Types.Float32, default: 0 },
});

// ── ECS Systems (class extends pattern) ──

const FloatSystem = class extends createSystem({
	cubes: { required: [PortalCube, Transform] },
}) {
	update(dt) {
		const time = performance.now() / 1000;
		for (const entity of this.queries.cubes.entities) {
			const obj = entity.object3D;
			if (!obj) continue;
			const phase = entity.getValue(PortalCube, 'floatPhase');
			const speed = entity.getValue(PortalCube, 'floatSpeed');
			const baseY = entity.getValue(PortalCube, 'baseY');
			obj.rotation.x += 0.005;
			obj.rotation.y += 0.008;
			obj.position.y = baseY + Math.sin(time * speed + phase) * 0.15;
		}
	}
};

const CameraOrbitSystem = class extends createSystem({
	camera: { required: [CameraOrbit] },
}) {
	update(dt) {
		for (const entity of this.queries.camera.entities) {
			const angle = entity.getValue(CameraOrbit, 'angle');
			const radius = entity.getValue(CameraOrbit, 'radius');
			const height = entity.getValue(CameraOrbit, 'height');
			const speed = entity.getValue(CameraOrbit, 'speed');
			const boost = entity.getValue(CameraOrbit, 'boost');
			const newAngle = angle + dt * (speed + boost);
			entity.setValue(CameraOrbit, 'boost', boost * 0.95); // decay
			entity.setValue(CameraOrbit, 'angle', newAngle);
			const time = performance.now() / 1000;
			const camX = Math.sin(newAngle) * radius;
			const camZ = Math.cos(newAngle) * radius;
			const camY = height + Math.sin(time * 0.3) * 0.2;
			if (this.world.camera) {
				this.world.camera.position.set(camX, camY, camZ);
				this.world.camera.lookAt(0, 0, 0);
			}
		}
	}
};

let lastNarrativeAdvance = 0;
const NarrativeSystem = class extends createSystem({
	narrative: { required: [NarrativeState] },
}) {
	update(dt) {
		const now = performance.now();
		for (const entity of this.queries.narrative.entities) {
			const auto = entity.getValue(NarrativeState, 'autoAdvance');
			if (!auto) continue;
			if (now - lastNarrativeAdvance > 90000) {
				let idx = entity.getValue(NarrativeState, 'stateIndex');
				idx = (idx + 1) % t.narrative.length;
				entity.setValue(NarrativeState, 'stateIndex', idx);
				lastNarrativeAdvance = now;
				showNarrative(t.narrative[idx]);
			}
		}
	}
};

// ── Narrative overlay ──
let overlayEl = null;
function showNarrative(text) {
	if (overlayEl) overlayEl.remove();
	overlayEl = document.createElement('div');
	overlayEl.style.cssText = `
		position: fixed; top: 15%; left: 50%; transform: translateX(-50%);
		color: #c9a87c; font-family: Georgia, serif;
		font-size: clamp(16px, 3.5vw, 24px); letter-spacing: 0.05em;
		text-shadow: 0 0 20px rgba(201,168,124,0.6);
		opacity: 0; transition: opacity 1.5s ease;
		pointer-events: none; z-index: 100; text-align: center; max-width: 80vw;
	`;
	overlayEl.textContent = text;
	document.body.appendChild(overlayEl);
	requestAnimationFrame(() => { overlayEl.style.opacity = '1'; });
	setTimeout(() => { if (overlayEl) overlayEl.style.opacity = '0'; }, 4000);
}

// ── Title overlay ──
function showTitle() {
	const el = document.createElement('div');
	el.style.cssText = `
		position: fixed; top: 5%; left: 50%; transform: translateX(-50%);
		color: #c9a87c; font-family: Georgia, serif;
		font-size: clamp(18px, 4vw, 28px); letter-spacing: 0.1em;
		text-shadow: 0 0 30px rgba(201,168,124,0.4);
		opacity: 0; transition: opacity 2s ease;
		pointer-events: none; z-index: 100;
	`;
	el.textContent = t.title;
	document.body.appendChild(el);
	requestAnimationFrame(() => { el.style.opacity = '0.8'; });
}

// ── Boot the world ──
export async function boot(container) {
	if (!container) return null;

	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});

	// Register components
	world.registerComponent(PortalCube);
	world.registerComponent(NarrativeState);
	world.registerComponent(CameraOrbit);

	// Register systems
	world.registerSystem(FloatSystem, { priority: 0 });
	world.registerSystem(CameraOrbitSystem, { priority: 0 });
	world.registerSystem(NarrativeSystem, { priority: 0 });

	const scene = world.scene;
	const camera = world.camera;

	// ── Scene atmosphere ──
	scene.background = new THREE.Color(0x05030a);
	scene.fog = new THREE.FogExp2(0x0a0612, 0.03);

	// ── Lighting ──
	scene.add(new THREE.AmbientLight(0x2a1f3d, 0.6));
	const keyLight = new THREE.PointLight(0xc9a87c, 3, 20);
	keyLight.position.set(2, 3, 2);
	scene.add(keyLight);
	const rimLight = new THREE.PointLight(0x4a6fa5, 2, 15);
	rimLight.position.set(-3, 1, -2);
	scene.add(rimLight);
	const underLight = new THREE.PointLight(0x8b5cf6, 1.5, 8);
	underLight.position.set(0, -2, 1);
	scene.add(underLight);

	// ── Starfield particles ──
	const STAR_COUNT = 600;
	const starGeo = new THREE.BufferGeometry();
	const starPos = new Float32Array(STAR_COUNT * 3);
	const starCol = new Float32Array(STAR_COUNT * 3);
	for (let i = 0; i < STAR_COUNT; i++) {
		const r = 3 + Math.random() * 8;
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos(2 * Math.random() - 1);
		starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
		starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
		starPos[i*3+2] = r * Math.cos(phi);
		const hue = 0.05 + Math.random() * 0.15;
		const c = new THREE.Color().setHSL(hue, 0.7, 0.5 + Math.random() * 0.3);
		starCol[i*3] = c.r; starCol[i*3+1] = c.g; starCol[i*3+2] = c.b;
	}
	starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
	starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
	const starMat = new THREE.PointsMaterial({
		size: 0.05, vertexColors: true, transparent: true, opacity: 0.7,
		blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	});
	const stars = new THREE.Points(starGeo, starMat);
	scene.add(stars);

	// ── Ground glow ──
	const discGeo = new THREE.CircleGeometry(3, 64);
	const discMat = new THREE.MeshBasicMaterial({
		color: 0x1a0a2e, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
	});
	const disc = new THREE.Mesh(discGeo, discMat);
	disc.rotation.x = -Math.PI / 2;
	disc.position.y = -1.8;
	scene.add(disc);

	// ── Portal art cubes — ECS entities ──
	const texLoader = new THREE.TextureLoader();
	texLoader.crossOrigin = 'anonymous';
	const cubeEntities = [];

	PORTALS.forEach((portal, i) => {
		const angle = (i / PORTALS.length) * Math.PI * 2;
		const radius = 2.5;
		const cx = Math.cos(angle) * radius;
		const cy = 0.2 + (i % 3) * 0.4;
		const cz = Math.sin(angle) * radius - 1;

		// 6 faces — each cube has its own distinct set of 6 artworks
		const cubeMats = [];
		for (let f = 0; f < 6; f++) {
			const faceArt = PORTALS[(i + f) % PORTALS.length].art;
			const fMat = new THREE.MeshBasicMaterial({
				color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide,
			});
			texLoader.load(
				`https://imagedelivery.net/${CF_HASH}/${faceArt}/segment=foreground,width=256`,
				(tex) => {
					tex.colorSpace = THREE.SRGBColorSpace;
					fMat.map = tex; fMat.opacity = 0.92; fMat.needsUpdate = true;
				}
			);
			cubeMats.push(fMat);
		}

		const cubeSize = 0.6;
		const cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize), cubeMats);
		cubeMesh.position.set(cx, cy, cz);
		cubeMesh.userData.portalId = portal.id;

		// Create ECS entity with the cube
		const entity = world.createTransformEntity(cubeMesh);
		entity.addComponent(PortalCube, {
			portalId: portal.id,
			artId: portal.art,
			color: portal.color,
			floatPhase: Math.random() * Math.PI * 2,
			floatSpeed: 0.4 + Math.random() * 0.4,
			baseY: cy,
			isActive: false,
		});
		cubeEntities.push({ entity, mesh: cubeMesh, portal });

		// Glow ring behind each cube
		const glowGeo = new THREE.RingGeometry(0.4, 0.5, 32);
		const glowMat = new THREE.MeshBasicMaterial({
			color: new THREE.Color(portal.color), transparent: true, opacity: 0.15, side: THREE.DoubleSide,
		});
		const glow = new THREE.Mesh(glowGeo, glowMat);
		glow.position.set(cx, cy, cz - 0.1);
		scene.add(glow);
	});

	// ── Camera orbit entity ──
	const camEntity = world.createEntity();
	camEntity.addComponent(CameraOrbit, {
		angle: 0, radius: 5, height: 1, speed: 0.06,
	});

	// ── Narrative entity ──
	const narrEntity = world.createEntity();
	narrEntity.addComponent(NarrativeState, {
		stateIndex: 0, autoAdvance: true,
	});

	// ── Wrap world.update to animate stars, lights, disc ──
	const origUpdate = world.update.bind(world);
	world.update = function(delta, time) {
		origUpdate(delta, time);
		const t = time / 1000;
		// Star drift
		stars.rotation.y += delta * 0.02;
		// Light pulse
		keyLight.intensity = 3 + Math.sin(t * 0.8) * 0.5;
		rimLight.intensity = 2 + Math.cos(t * 0.6) * 0.4;
		underLight.intensity = 1.5 + Math.sin(t * 1.2) * 0.3;
		// Disc pulse
		disc.material.opacity = 0.3 + Math.sin(t * 0.5) * 0.15;
	};

	// ── Tap/Click — raycaster against cube meshes ──
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();

	function onPointerDown(e) {
		const x = e.touches ? e.touches[0].clientX : e.clientX;
		const y = e.touches ? e.touches[0].clientY : e.clientY;
		pointer.x = (x / window.innerWidth) * 2 - 1;
		pointer.y = -(y / window.innerHeight) * 2 + 1;
		raycaster.setFromCamera(pointer, camera);

		// Boost camera orbit on every tap
		camEntity.setValue(CameraOrbit, 'boost', 1.5);

		const meshes = cubeEntities.map(c => c.mesh);
		const hits = raycaster.intersectObjects(meshes);
		if (hits.length > 0) {
			const hit = hits[0].object;
			const portalId = hit.userData.portalId;
			const portal = PORTALS.find(p => p.id === portalId);
			if (portal) {
				// Flash the cube
				hit.material.forEach(m => { if (m.opacity) { m._origOpacity = m.opacity; m.opacity = 1; } });
				setTimeout(() => {
					hit.material.forEach(m => { if (m._origOpacity != null) m.opacity = m._origOpacity; });
				}, 200);

				showNarrative(`⟡ ${t.portals[portalId] || portalId}`);

				// Mark active in ECS
				cubeEntities.forEach(c => c.entity.setValue(PortalCube, 'isActive', c.portal.id === portalId));

				// Dispatch event for Svelte layer
				window.dispatchEvent(new CustomEvent('portal-tapped', { detail: { portalId } }));
			}
		}
	}
	container.addEventListener('pointerdown', onPointerDown);
	container.addEventListener('touchstart', onPointerDown);

	// ── Title ──
	showTitle();
	setTimeout(() => showNarrative(t.narrative[0]), 2000);
	lastNarrativeAdvance = performance.now();

	return world;
}

// Auto-boot if container exists (for direct script loading)
const autoContainer = document.getElementById('portal-scene-container') || document.getElementById('scene-container');
if (autoContainer) {
	boot(autoContainer).then((world) => {
	console.log('[portals] World booted with ECS');

	// Check XR support
	if (navigator.xr?.isSessionSupported) {
		Promise.all([
			navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
			navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
		]).then(([ar, vr]) => {
			window.dispatchEvent(new CustomEvent('xr-support', { detail: { ar, vr } }));
		});
	}
}).catch(err => console.error('[portals] boot failed:', err));
}
