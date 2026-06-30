// ═══════════════════════════════════════════════════════════
//  Portal Scene — ECS + Three.js + IWSDK
//  Respects IWSDK lifecycle: World.create starts render loop
//  Systems do ALL logic. No world.update wrapping.
// ═══════════════════════════════════════════════════════════
import { World, Transform } from '@iwsdk/core';
import { createComponent, createSystem, Types } from 'elics';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ── i18n ──
const STRINGS = {
	es: {
		title: '✦ Portales',
		portals: {
			'arboleda': 'Arboleda', 'fiesta': 'Fiesta', 'oceano': 'Océano',
			'narrador': 'Narrador', 'cosmos': 'Cosmos', 'urbano': 'Urbano',
			'suenos': 'Sueños', 'nostalgias-espirituales': 'Nostalgias Espirituales',
		},
		narrative: ['❝ Cada historia es un portal ❞', '❝ Toca un cubo para entrar ❞', '❝ Los espíritus esperan ❞'],
	},
	en: {
		title: '✦ Portals',
		portals: {
			'arboleda': 'The Grove', 'fiesta': 'Celebration', 'oceano': 'The Ocean',
			'narrador': 'The Narrator', 'cosmos': 'The Cosmos', 'urbano': 'The Street',
			'suenos': 'Dreams', 'nostalgias-espirituales': 'Gates of Memory',
		},
		narrative: ['❝ Every story is a portal ❞', '❝ Tap a cube to enter ❞', '❝ The spirits are waiting ❞'],
	},
	fr: {
		title: '✦ Portails',
		portals: {
			'arboleda': 'Le Bosquet', 'fiesta': 'Célébration', 'oceano': 'L\'Océan',
			'narrador': 'Le Narrateur', 'cosmos': 'Le Cosmos', 'urbano': 'La Rue',
			'suenos': 'Rêves', 'nostalgias-espirituales': 'Portes de la Mémoire',
		},
		narrative: ['❝ Chaque histoire est un portail ❞', '❝ Touchez un cube pour entrer ❞', '❝ Les esprits attendent ❞'],
	},
};

const PORTALS = [
	{ id: 'arboleda', art: '12c79899-fb93-4885-508f-d2da0a2fbf00', color: '#4a7c3a', desc: { es: 'Donde las raíces cuentan historias', en: 'Where roots tell stories', fr: 'Où les racines racontent' } },
	{ id: 'fiesta', art: 'bd4602b0-149d-42f8-e872-f697b64c7d00', color: '#ff6b35', desc: { es: 'Música, danza y celebración', en: 'Music, dance and celebration', fr: 'Musique, danse et célébration' } },
	{ id: 'oceano', art: '5c7fb409-1aa2-45a9-8466-296077e18e00', color: '#0277bd', desc: { es: 'Olas que traen recuerdos', en: 'Waves that bring memories', fr: 'Vagues qui apportent des souvenirs' } },
	{ id: 'narrador', art: 'f8a136eb-363e-4a24-0f54-70bb4f4bf800', color: '#c9a87c', desc: { es: 'La voz que teje los hilos', en: 'The voice that weaves threads', fr: 'La voix qui tisse les fils' } },
	{ id: 'cosmos', art: '5c28fef5-cff0-4ddd-b4af-100d29bad100', color: '#7c4dff', desc: { es: 'Estrellas que son palabras', en: 'Stars that are words', fr: 'Étoiles qui sont des mots' } },
	{ id: 'urbano', art: '62355ddb-0f6c-4251-5d8e-37a455e44000', color: '#546e7a', desc: { es: 'La ciudad también sueña', en: 'The city also dreams', fr: 'La ville rêve aussi' } },
	{ id: 'suenos', art: '85319dc7-ae16-48f8-9500-608ba174eb00', color: '#9c27b0', desc: { es: 'Donde los sueños se vuelven cuentos', en: 'Where dreams become stories', fr: 'Où les rêves deviennent contes' } },
	{ id: 'nostalgias-espirituales', art: '26fe40df-7745-41dc-7491-97cb36a32f00', color: '#3A4F7A', desc: { es: 'Memorias que flotan en el aire', en: 'Memories floating in the air', fr: 'Souvenirs qui flottent dans l\'air' } },
];

const CF_HASH = '4bRSwPonOXfEIBVZiDXg0w';

// ── Components ──
const PortalCube = createComponent('PortalCube', {
	portalId: { type: Types.String, default: '' },
	floatPhase: { type: Types.Float32, default: 0 },
	floatSpeed: { type: Types.Float32, default: 0.5 },
	baseY: { type: Types.Float32, default: 0 },
});

const CameraOrbit = createComponent('CameraOrbit', {
	angle: { type: Types.Float32, default: 0 },
	radius: { type: Types.Float32, default: 5 },
	height: { type: Types.Float32, default: 1 },
	speed: { type: Types.Float32, default: 0.06 },
	boost: { type: Types.Float32, default: 0 },
});

const NarrativeState = createComponent('NarrativeState', {
	stateIndex: { type: Types.Int32, default: 0 },
	lastAdvance: { type: Types.Float32, default: 0 },
});

// Ambient data — stored in globals, not ideal but avoids world.update wrapping
const ambient = {
	time: 0,
	cubeMeshes: [],
};

// ── Systems ──

const FloatSystem = class extends createSystem({
	cubes: { required: [PortalCube, Transform] },
}) {
	update(dt) {
		ambient.time += dt;
		const t = ambient.time;
		for (const entity of this.queries.cubes.entities) {
			const obj = entity.object3D;
			if (!obj) continue;
			const phase = entity.getValue(PortalCube, 'floatPhase');
			const speed = entity.getValue(PortalCube, 'floatSpeed');
			const baseY = entity.getValue(PortalCube, 'baseY');
			obj.rotation.x += 0.005;
			obj.rotation.y += 0.008;
			obj.position.y = baseY + Math.sin(t * speed + phase) * 0.15;
		}
	}
};

const CameraOrbitSystem = class extends createSystem({
	cam: { required: [CameraOrbit] },
}) {
	update(dt) {
		for (const entity of this.queries.cam.entities) {
			const angle = entity.getValue(CameraOrbit, 'angle');
			const radius = entity.getValue(CameraOrbit, 'radius');
			const height = entity.getValue(CameraOrbit, 'height');
			const speed = entity.getValue(CameraOrbit, 'speed');
			const boost = entity.getValue(CameraOrbit, 'boost');
			const newAngle = angle + dt * (speed + boost);
			entity.setValue(CameraOrbit, 'angle', newAngle);
			entity.setValue(CameraOrbit, 'boost', boost * 0.95);
			const t = ambient.time;
			if (this.world.camera) {
				this.world.camera.position.set(
					Math.sin(newAngle) * radius,
					height + Math.sin(t * 0.3) * 0.2,
					Math.cos(newAngle) * radius,
				);
				this.world.camera.lookAt(0, 0, 0);
			}
		}
	}
};

const NarrativeSystem = class extends createSystem({
	narr: { required: [NarrativeState] },
}) {
	update(dt) {
		const now = performance.now();
		for (const entity of this.queries.narr.entities) {
			const last = entity.getValue(NarrativeState, 'lastAdvance');
			if (now - last > 12000) { // 12s for first cycle, then 90s
				let idx = entity.getValue(NarrativeState, 'stateIndex');
				const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';
				const strs = STRINGS[lang] || STRINGS.es;
				if (idx < strs.narrative.length) {
					showOverlay(strs.narrative[idx], { font: 'Georgia, serif', color: '#e8d5b5', size: 'clamp(18px, 3.5vw, 26px)' });
					entity.setValue(NarrativeState, 'stateIndex', idx + 1);
					entity.setValue(NarrativeState, 'lastAdvance', now);
				}
			}
		}
	}
};

// ── Overlay helpers ──
let currentOverlay = null;

function showOverlay(text, options = {}) {
	if (currentOverlay) { currentOverlay.remove(); currentOverlay = null; }
	const color = options.color || '#c9a87c';
	const font = options.font || '"Courier New", monospace';
	const size = options.size || '22px';
	const glow = options.glow || color;
	const el = document.createElement('div');
	el.style.cssText = `position:fixed!important;top:15%!important;left:50%!important;transform:translateX(-50%)!important;color:${color}!important;font-family:${font}!important;font-size:${size}!important;letter-spacing:0.05em!important;text-shadow:0 0 20px ${glow}99, 0 0 40px ${glow}44!important;opacity:0;transition:opacity 0.8s ease;pointer-events:none;z-index:2147483647!important;text-align:center!important;max-width:80vw!important;white-space:pre-line!important;display:block!important;`;
	el.textContent = text;
	document.body.appendChild(el);
	currentOverlay = el;
	requestAnimationFrame(() => { el.style.opacity = '1'; });
	setTimeout(() => {
		el.style.opacity = '0';
		setTimeout(() => { if (el === currentOverlay) currentOverlay = null; el.remove(); }, 800);
	}, 3500);
}

// ── Boot ──
export async function boot(container, options = {}) {
	const { portals = [], sceneConfigs = {} } = options;
	if (!container) return null;

	const statusEl = document.createElement('div');
	statusEl.style.cssText = 'position:fixed;top:10px;left:10px;color:#0f0;font-family:monospace;font-size:12px;z-index:999999;background:rgba(0,0,0,0.8);padding:4px 8px;border-radius:4px;';
	statusEl.textContent = 'boot: starting...';
	document.body.appendChild(statusEl);

	try {
		statusEl.textContent = 'boot: World.create...';
		const world = await Promise.race([
			World.create(container, {
				xr: { offer: 'none' },
				render: { defaultLighting: false },
				features: { locomotion: false, grabbing: false, physics: false },
			}),
			new Promise((_, rej) => setTimeout(() => rej(new Error('World.create timeout')), 10000)),
		]);

		statusEl.textContent = 'boot: registering ECS...';
		world.registerComponent(PortalCube);
		world.registerComponent(CameraOrbit);
		world.registerComponent(NarrativeState);
		world.registerSystem(FloatSystem, { priority: 0 });
		world.registerSystem(CameraOrbitSystem, { priority: 0 });
		world.registerSystem(NarrativeSystem, { priority: 0 });

		const scene = world.scene;
		const camera = world.camera;

		// ── Scene setup (pure Three.js, before render loop starts) ──
		scene.background = new THREE.Color(0x05030a);
		scene.fog = new THREE.FogExp2(0x0a0612, 0.03);

		// Lighting
		scene.add(new THREE.AmbientLight(0x2a1f3d, 0.6));
		const keyLight = new THREE.PointLight(0xc9a87c, 3, 20);
		keyLight.position.set(2, 3, 2);
		scene.add(keyLight);
		const rimLight = new THREE.PointLight(0x4a6fa5, 2, 15);
		rimLight.position.set(-3, 1, -2);
		scene.add(rimLight);

		// Starfield
		const N = 600;
		const sg = new THREE.BufferGeometry();
		const sp = new Float32Array(N * 3);
		const sc = new Float32Array(N * 3);
		for (let i = 0; i < N; i++) {
			const r = 3 + Math.random() * 8;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			sp[i*3] = r * Math.sin(phi) * Math.cos(theta);
			sp[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
			sp[i*3+2] = r * Math.cos(phi);
			const c = new THREE.Color().setHSL(0.05 + Math.random() * 0.15, 0.7, 0.5 + Math.random() * 0.3);
			sc[i*3] = c.r; sc[i*3+1] = c.g; sc[i*3+2] = c.b;
		}
		sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
		sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
		const stars = new THREE.Points(sg, new THREE.PointsMaterial({
			size: 0.05, vertexColors: true, transparent: true, opacity: 0.7,
			blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
		}));
		scene.add(stars);

		// Ground glow
		const disc = new THREE.Mesh(
			new THREE.CircleGeometry(3, 64),
			new THREE.MeshBasicMaterial({ color: 0x1a0a2e, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
		);
		disc.rotation.x = -Math.PI / 2;
		disc.position.y = -1.8;
		scene.add(disc);

		// ── Portal art cubes as ECS entities ──
		const texLoader = new THREE.TextureLoader();
		texLoader.crossOrigin = 'anonymous';

		PORTALS.forEach((portal, i) => {
			const angle = (i / PORTALS.length) * Math.PI * 2;
			const radius = 2.5;
			const cx = Math.cos(angle) * radius;
			const cy = 0.2 + (i % 3) * 0.4;
			const cz = Math.sin(angle) * radius - 1;

			// 6 faces — each cube has its own set of 6 artworks
			const mats = [];
			for (let f = 0; f < 6; f++) {
				const faceArt = PORTALS[(i + f) % PORTALS.length].art;
				const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide });
				texLoader.load(
					`https://imagedelivery.net/${CF_HASH}/${faceArt}/segment=foreground,width=256`,
					(tex) => { tex.colorSpace = THREE.SRGBColorSpace; m.map = tex; m.opacity = 0.92; m.needsUpdate = true; },
				);
				mats.push(m);
			}

			const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mats);
			mesh.position.set(cx, cy, cz);
			mesh.userData.portalId = portal.id;
			mesh.userData.desc = portal.desc;

			const entity = world.createTransformEntity(mesh);
			entity.addComponent(PortalCube, {
				portalId: portal.id,
				floatPhase: Math.random() * Math.PI * 2,
				floatSpeed: 0.4 + Math.random() * 0.4,
				baseY: cy,
			});
			ambient.cubeMeshes.push(mesh);

			// Glow ring
			const glow = new THREE.Mesh(
				new THREE.RingGeometry(0.4, 0.5, 32),
				new THREE.MeshBasicMaterial({ color: new THREE.Color(portal.color), transparent: true, opacity: 0.15, side: THREE.DoubleSide }),
			);
			glow.position.set(cx, cy, cz - 0.1);
			scene.add(glow);
		});

		// Camera orbit entity
		const camEntity = world.createEntity();
		camEntity.addComponent(CameraOrbit, { angle: 0, radius: 5, height: 1, speed: 0.06, boost: 0 });

		// Narrative entity
		const narrEntity = world.createEntity();
		narrEntity.addComponent(NarrativeState, { stateIndex: 0, lastAdvance: performance.now() });

		// ── Portal interior state ──
		let inPortal = false;
		let interiorGroup = null;
		let spiritMixer = null;
		const gltfLoader = new GLTFLoader();

		async function enterPortal(portalId) {
			if (inPortal) return;
			inPortal = true;

			const portal = PORTALS.find(p => p.id === portalId);
			if (!portal) return;
			const sceneConfig = sceneConfigs[portalId] || {};
			const palette = sceneConfig.palette || {};
			const ringColor = palette.primary || portal.color;
			const crystals = sceneConfig.crystals || [];
			const lang = document.documentElement?.lang || 'es';
			const strs = STRINGS[lang] || STRINGS.es;

			// Fade out index scene
			ambient.cubeMeshes.forEach(m => { m.visible = false; });
			stars.visible = false;
			disc.visible = false;
			camEntity.setValue(CameraOrbit, 'speed', 0);
			camEntity.setValue(CameraOrbit, 'boost', 0);

			// Create interior group
			interiorGroup = new THREE.Group();
			scene.add(interiorGroup);

			// Portal ring
			const ringMesh = new THREE.Mesh(
				new THREE.TorusGeometry(1.2, 0.06, 16, 96),
				new THREE.MeshBasicMaterial({ color: new THREE.Color(ringColor), transparent: true, opacity: 0.9 }),
			);
			ringMesh.position.set(0, 0, -2);
			interiorGroup.add(ringMesh);

			// Ring membrane
			const membrane = new THREE.Mesh(
				new THREE.CircleGeometry(1.18, 64),
				new THREE.MeshBasicMaterial({ color: new THREE.Color(ringColor).lerp(new THREE.Color(0xffffff), 0.2), transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
			);
			membrane.position.set(0, 0, -1.99);
			interiorGroup.add(membrane);

			// Spirit GLB
			gltfLoader.loadAsync('https://r2.mexicanbold.com/72fpsEFLSpirit-enhanced.glb').then((gltf) => {
				const spirit = gltf.scene;
				spirit.scale.setScalar(0.6);
				spirit.position.set(0, 0.3, -2);
				spirit.traverse((child) => {
					if (child.isMesh) {
						child.material = new THREE.MeshBasicMaterial({
							color: new THREE.Color(ringColor).lerp(new THREE.Color(0xffffff), 0.3),
							transparent: true, opacity: 0.8,
							side: THREE.DoubleSide, depthWrite: false,
							blending: THREE.AdditiveBlending,
						});
					}
				});
				interiorGroup.add(spirit);
				spiritMixer = new THREE.AnimationMixer(spirit);
				gltf.animations.forEach((clip) => {
					if (clip.name === 'morph_original') return;
					const action = spiritMixer.clipAction(clip);
					if (clip.name === 'zoom_in') { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
					else action.setLoop(THREE.LoopRepeat);
					action.play();
				});
				console.log('[portals] Spirit loaded for', portalId);
			}).catch(err => console.warn('[portals] Spirit failed:', err.message));

			// Crystals with texts
			const crystalColors = palette.crystal_colors || [ringColor, '#4fc3f7', '#b5ead7', '#ce93d8'];
			const crystalRingRadius = sceneConfig.spatial_layout?.crystal_ring_radius || 2;
			const crystalEntities = [];

			crystals.forEach((crystal, i) => {
				const angle = (i / crystals.length) * Math.PI * 2;
				const elev = (sceneConfig.spatial_layout?.crystal_elevations || [0.8, 1.2, 1.5])[i % 3];
				const cx = Math.cos(angle) * crystalRingRadius;
				const cy = (elev || 1) - 0.5;
				const cz = Math.sin(angle) * crystalRingRadius - 2;
				const cColor = crystalColors[crystal.color_index % crystalColors.length] || ringColor;

				const cm = new THREE.Mesh(
					new THREE.OctahedronGeometry(0.2, 0),
					new THREE.MeshBasicMaterial({ color: new THREE.Color(cColor).lerp(new THREE.Color(0xffffff), 0.4), transparent: true, opacity: 0.9 }),
				);
				cm.position.set(cx, cy, cz);
				cm.userData.text = crystal.text || '';
				cm.userData.isCrystal = true;
				interiorGroup.add(cm);
				crystalEntities.push(cm);
			});

			// Camera closer
			camera.position.set(0, 0.5, 1);
			camera.lookAt(0, 0, -2);

			// Welcome text
			showOverlay(`${strs.portals[portalId] || portalId}\n${portal.desc?.[lang] || ''}`, {
				color: ringColor, glow: ringColor, font: 'Georgia, serif', size: 'clamp(18px, 4vw, 28px)',
			});

			window.dispatchEvent(new CustomEvent('portal-tapped', { detail: { portalId } }));

			// Crystal tap — show text
			function onInteriorTap(e) {
				pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
				pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
				raycaster.setFromCamera(pointer, camera);
				const hits = raycaster.intersectObjects(crystalEntities);
				if (hits.length > 0 && hits[0].object.userData.text) {
					showOverlay(`❝ ${hits[0].object.userData.text} ❞`, {
						color: ringColor, glow: ringColor, font: 'Georgia, serif', size: 'clamp(16px, 3vw, 22px)',
					});
				}
			}
			container.addEventListener('pointerdown', onInteriorTap);
			interiorGroup.userData.cleanup = () => container.removeEventListener('pointerdown', onInteriorTap);
		}

		function exitPortal() {
			if (!inPortal || !interiorGroup) return;
			inPortal = false;
			if (interiorGroup.userData.cleanup) interiorGroup.userData.cleanup();
			scene.remove(interiorGroup);
			interiorGroup.traverse(obj => {
				if (obj.geometry) obj.geometry.dispose();
				if (obj.material) { Array.isArray(obj.material) ? obj.material.forEach(m => m.dispose()) : obj.material.dispose(); }
			});
			interiorGroup = null;
			spiritMixer = null;
			ambient.cubeMeshes.forEach(m => { m.visible = true; });
			stars.visible = true;
			disc.visible = true;
			camEntity.setValue(CameraOrbit, 'speed', 0.06);
			const lang = document.documentElement?.lang || 'es';
			const strs = STRINGS[lang] || STRINGS.es;
			showOverlay(strs.narrative[1], { font: 'Georgia, serif', color: '#e8d5b5', size: 'clamp(18px, 3.5vw, 26px)' });
		}

		// ── Tap handler ──
		const raycaster = new THREE.Raycaster();
		const pointer = new THREE.Vector2();

		container.addEventListener('pointerdown', (e) => {
			// Boost orbit
			camEntity.setValue(CameraOrbit, 'boost', 1.5);

			// Raycast cubes
			pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
			pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
			raycaster.setFromCamera(pointer, camera);
			const hits = raycaster.intersectObjects(ambient.cubeMeshes);
			if (hits.length > 0 && !inPortal) {
				const portalId = hits[0].object.userData.portalId;
				enterPortal(portalId);
			} else if (inPortal) {
				// Tap anywhere in portal = exit
				exitPortal();
			}
		});

		container.addEventListener('touchstart', (e) => {
			if (e.touches.length === 0) return;
			const touch = e.touches[0];
			container.dispatchEvent(new PointerEvent('pointerdown', { clientX: touch.clientX, clientY: touch.clientY }));
		});

		// Title
		statusEl.textContent = 'boot: ready!';
		setTimeout(() => statusEl.remove(), 2000);

		// First narrative — hardcoded fallback + i18n
		const lang = document.documentElement?.lang || 'es';
		const strs = STRINGS[lang] || STRINGS.es;
		console.log('[portals] lang:', lang, 'narrative[0]:', strs.narrative[0]);
		setTimeout(() => {
			console.log('[portals] firing first narrative');
			showOverlay(strs.narrative[0], { font: 'Georgia, serif', color: '#e8d5b5', size: 'clamp(18px, 3.5vw, 26px)' });
		}, 1000);

		return world;
	} catch (err) {
		statusEl.textContent = 'boot ERROR: ' + (err.message || String(err));
		statusEl.style.color = '#ef4444';
		console.error('[portals] boot failed:', err);
		return null;
	}
}
