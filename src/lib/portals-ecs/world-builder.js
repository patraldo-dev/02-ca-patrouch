// ═══════════════════════════════════════════════════════════
//  world-builder.js — Config-driven ECS world builder
//  Reads scene config JSON, builds IWSDK world with ECS
// ═══════════════════════════════════════════════════════════
import { World, Transform } from '@iwsdk/core';
import { createComponent, createSystem, Types } from 'elics';
import * as THREE from 'three';
import { buildEnvironment } from './environments.js';
import { playTransition } from './scene-transition.js';

// ── Scene Renderer Registry ──
// Custom per-portal scene renderers (desert, ocean-floor, etc.)
// Keyed by portal ID. If a portal has a custom renderer, rebuildScene uses it
// instead of the default starfield + cubes.
const SCENE_RENDERERS = {};
export function registerSceneRenderer(portalId, buildFn) {
	SCENE_RENDERERS[portalId] = buildFn;
}
export function hasSceneRenderer(portalId) {
	return !!SCENE_RENDERERS[portalId];
}

// ── ECS Components ──

const PortalCube = createComponent('PortalCube', {
	portalId:    { type: Types.String, default: '' },
	color:       { type: Types.String, default: '#c9a87c' },
	floatPhase:  { type: Types.Float32, default: 0 },
	floatSpeed:  { type: Types.Float32, default: 0.5 },
	baseY:       { type: Types.Float32, default: 0 },
	isActive:    { type: Types.Boolean, default: false },
});

const CameraOrbit = createComponent('CameraOrbit', {
	angle:   { type: Types.Float32, default: 0 },
	radiusA: { type: Types.Float32, default: 5 },
	radiusB: { type: Types.Float32, default: 3.5 },
	height:  { type: Types.Float32, default: 1 },
	speed:   { type: Types.Float32, default: 0.06 },
	boost:   { type: Types.Float32, default: 0 },
});

const NarrativeState = createComponent('NarrativeState', {
	stateIndex:    { type: Types.Int32, default: 0 },
	lastAdvance:   { type: Types.Float32, default: 0 },
});

// ── ECS Systems ──

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
	cam: { required: [CameraOrbit] },
}) {
	update(dt) {
		for (const entity of this.queries.cam.entities) {
			const angle = entity.getValue(CameraOrbit, 'angle');
			const radiusA = entity.getValue(CameraOrbit, 'radiusA');
			const radiusB = entity.getValue(CameraOrbit, 'radiusB');
			const height = entity.getValue(CameraOrbit, 'height');
			const speed = entity.getValue(CameraOrbit, 'speed');
			const boost = entity.getValue(CameraOrbit, 'boost');
			const newAngle = angle + dt * (speed + boost);
			entity.setValue(CameraOrbit, 'boost', boost * 0.95);
			entity.setValue(CameraOrbit, 'angle', newAngle);
			const time = performance.now() / 1000;
			this.world.camera.position.set(
				Math.sin(newAngle) * radiusA,
				height + Math.sin(time * 0.3) * 0.2,
				Math.cos(newAngle) * radiusB,
			);
			this.world.camera.lookAt(0, 0, 0);
			this.world.camera.rotation.z = Math.sin(time * 0.15) * 0.03;
		}
	}
};

// ── Overlay helpers ──

let currentOverlay = null;

function showOverlay(text) {
	if (currentOverlay) { currentOverlay.remove(); currentOverlay = null; }
	const color = '#e8d5b5';
	const el = document.createElement('div');
	el.style.cssText = `position:fixed!important;top:15%!important;left:50%!important;transform:translateX(-50%)!important;color:${color}!important;font-family:Georgia,serif!important;font-size:clamp(18px,3.5vw,26px)!important;letter-spacing:0.05em!important;text-shadow:0 0 20px ${color}99,0 0 40px ${color}44!important;opacity:0;transition:opacity 0.8s ease;pointer-events:none;z-index:2147483647!important;text-align:center!important;max-width:80vw!important;white-space:pre-line!important;display:block!important;`;
	el.textContent = text;
	document.body.appendChild(el);
	currentOverlay = el;
	requestAnimationFrame(() => { el.style.opacity = '1'; });
	setTimeout(() => {
		el.style.opacity = '0';
		setTimeout(() => { if (el === currentOverlay) currentOverlay = null; el.remove(); }, 800);
	}, 4000);
}

function showPortalOverlay(name, desc, safeColor) {
	if (currentOverlay) { currentOverlay.remove(); currentOverlay = null; }
	const wrap = document.createElement('div');
	wrap.style.cssText = `position:fixed!important;top:18%!important;left:50%!important;transform:translateX(-50%)!important;text-align:center!important;max-width:80vw!important;opacity:0;transition:opacity 0.8s ease;pointer-events:none;z-index:2147483647!important;display:block!important;`;

	const heading = document.createElement('div');
	heading.style.cssText = `color:${safeColor}!important;font-family:Georgia,serif!important;font-size:clamp(20px,4vw,30px)!important;font-weight:700!important;letter-spacing:0.08em!important;text-transform:uppercase!important;text-shadow:0 0 16px ${safeColor}cc!important;margin-bottom:8px!important;`;
	heading.textContent = `\u27e1 ${name}`;

	const subtitle = document.createElement('div');
	subtitle.style.cssText = `color:${safeColor}!important;font-family:"Courier New",monospace!important;font-size:clamp(16px,3vw,22px)!important;font-style:italic!important;letter-spacing:0.03em!important;text-shadow:0 0 12px ${safeColor}66!important;`;
	subtitle.textContent = desc;

	wrap.appendChild(heading);
	wrap.appendChild(subtitle);
	document.body.appendChild(wrap);
	currentOverlay = wrap;
	requestAnimationFrame(() => { wrap.style.opacity = '1'; });
	setTimeout(() => { wrap.style.opacity = '0'; setTimeout(() => { if (wrap === currentOverlay) currentOverlay = null; wrap.remove(); }, 800); }, 4000);
}

// ── Navigation state (module-level, survives scene swaps) ──

const nav = {
	history: [],
	currentPortalId: '',
	allConfigs: {},
};

// Navigation bar removed — tap cubes to navigate, that's it

// ── Scene builder ──
// Track disposable objects so we can clean up between scenes

function rebuildScene(world, portalId, isNavigation = false) {
	const scene = world.scene;

	// On inter-portal navigation, play a random cinematic transition tinted
	// to the destination portal's color BEFORE teardown, so the swap is hidden
	// under the overlay. Skipped on initial boot (isNavigation = false).
	const destConfig = nav.allConfigs[portalId];
	const transitionPromise = (isNavigation && destConfig?.palette?.primary)
		? playTransition({ color: destConfig.palette.primary })
		: Promise.resolve();

	// Cleanup previous custom scene if any
	if (world._customSceneCleanup) {
		world._customSceneCleanup();
		world._customSceneCleanup = null;
	}

	// Remove tracked scene objects (lights, stars, cubes)
	if (world._sceneObjects) {
		for (const obj of world._sceneObjects) {
			if (obj.parent) obj.parent.remove(obj);
			if (obj.geometry) obj.geometry.dispose();
			if (obj.material) {
				if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
				else obj.material.dispose();
			}
		}
	}
	world._sceneObjects = [];

	// Remove ECS entities (cubes, camera, narrative)
	if (world._sceneEntities) {
		for (const entity of world._sceneEntities) {
			if (typeof entity.dispose === 'function') entity.dispose();
			else if (typeof entity.destroy === 'function') entity.destroy();
			else console.warn('[cleanup] No dispose/destroy on entity:', entity);
		}
	}
	world._sceneEntities = [];

	const config = nav.allConfigs[portalId];
	if (!config) {
		console.error('[portals] No config for', portalId);
		return;
	}

	nav.currentPortalId = portalId;
	if (nav.history[nav.history.length - 1] !== portalId) nav.history.push(portalId);

	// Sync URL
	window.history.pushState({ portalId }, '', `/portals/${portalId}`);

	// Check for custom scene renderer
	if (hasSceneRenderer(portalId)) {
		const handle = SCENE_RENDERERS[portalId](world, config, nav.allConfigs, (targetId) => {
			rebuildScene(world, targetId, true);
		});
		world._customSceneCleanup = handle?.cleanup || null;
		return;
	}

	const palette = config.palette;
	const lighting = config.lighting;
	const lang = document.documentElement?.lang || 'es';
	const track = (obj) => { world._sceneObjects.push(obj); return obj; };

	// ── Atmosphere ──
	scene.background = new THREE.Color(palette.background);
	scene.fog = new THREE.FogExp2(palette.fog_color, palette.fog_density);

	// ── Lighting ──
	const ambientLight = new THREE.AmbientLight(lighting.ambient.color, lighting.ambient.intensity);
	scene.add(ambientLight); track(ambientLight);

	const keyLight = new THREE.PointLight(lighting.key_light.color, lighting.key_light.intensity, lighting.key_light.distance);
	keyLight.position.set(...lighting.key_light.position);
	scene.add(keyLight); track(keyLight);

	const rimLight = new THREE.PointLight(lighting.rim_light.color, lighting.rim_light.intensity, lighting.rim_light.distance);
	rimLight.position.set(...lighting.rim_light.position);
	scene.add(rimLight); track(rimLight);

	const underLight = new THREE.PointLight(lighting.under_light.color, lighting.under_light.intensity, lighting.under_light.distance);
	underLight.position.set(...lighting.under_light.position);
	scene.add(underLight); track(underLight);

	// ── Environment: space portals use the starfield, others use themed scenes ──
	let envHandle;
	if (config.environment?.type === 'space') {
		// Starfield render path — the cosmos world's signature look
		const ap = config.ambient_particles;
		const starGeo = new THREE.BufferGeometry();
		const starPos = new Float32Array(ap.count * 3);
		const starCol = new Float32Array(ap.count * 3);
		for (let i = 0; i < ap.count; i++) {
			const r = 3 + Math.random() * ap.spawn_radius;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
			starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
			starPos[i*3+2] = r * Math.cos(phi);
			const hue = ap.color_range.hue_start + Math.random() * ap.color_range.hue_span;
			const c = new THREE.Color().setHSL(hue, ap.color_range.saturation,
				ap.color_range.lightness_min + Math.random() * (ap.color_range.lightness_max - ap.color_range.lightness_min));
			starCol[i*3] = c.r; starCol[i*3+1] = c.g; starCol[i*3+2] = c.b;
		}
		starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
		starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
		const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
			size: ap.size, vertexColors: true, transparent: true, opacity: ap.opacity,
			blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
		}));
		scene.add(stars); track(stars);
		envHandle = {
			update(dt, time) {
				stars.rotation.y += dt * ap.drift_speed;
				const tt = time / 1000;
				keyLight.intensity = lighting.key_light.intensity + Math.sin(tt * 0.8) * 0.5;
				rimLight.intensity = lighting.rim_light.intensity + Math.cos(tt * 0.6) * 0.4;
				underLight.intensity = lighting.under_light.intensity + Math.sin(tt * 1.2) * 0.3;
			}
		};
	} else {
		// Destination portal: themed static environment
		envHandle = buildEnvironment(config, scene, track);
	}

	// Store lights for environment animation
	world._lights = { ambient: ambientLight, key: keyLight, rim: rimLight, under: underLight };
	world._envHandle = envHandle;

	// ── Portal cubes from portal_links ──
	const links = config.portal_links || [];
	const cubeMeshes = [];

	links.forEach((link, i) => {
		const tc = nav.allConfigs[link.target];
		if (!tc) return;

		const angle = (i / links.length) * Math.PI * 2;
		const radius = 2.5;
		const cx = Math.cos(angle) * radius;
		const cy = 0.2 + (i % 3) * 0.4;
		const cz = Math.sin(angle) * radius - 1;

		// Each face shows a different artwork from the full collection
		const CF_HASH = '4bRSwPonOXfEIBVZiDXg0w';
		const texLoader = new THREE.TextureLoader();
		texLoader.crossOrigin = 'anonymous';

		// Collect all art IDs from all configs — each face picks a random one
		const allArtIds = Object.values(nav.allConfigs)
			.map(c => c.portal?.art)
			.filter(a => a && a !== '12c79899-fb93-4885-508f-d2da0a2fbf00'); // exclude placeholder
		if (allArtIds.length === 0) allArtIds.push(tc.portal.art);

		const cubeMats = [];
		for (let f = 0; f < 6; f++) {
			// Each face gets a random artwork from the collection
			const faceArt = allArtIds[Math.floor(Math.random() * allArtIds.length)];
			const fMat = new THREE.MeshBasicMaterial({
				color: new THREE.Color(tc.palette.primary), transparent: true, opacity: 0.8, side: THREE.DoubleSide,
			});
			texLoader.load(
				`https://imagedelivery.net/${CF_HASH}/${faceArt}/segment=foreground,width=256`,
				(tex) => {
					tex.colorSpace = THREE.SRGBColorSpace;
					fMat.map = tex;
					fMat.opacity = 0.92;
					fMat.needsUpdate = true;
				},
			);
			cubeMats.push(fMat);
		}

		// Geometry varies by portal mood
		const geometries = [
			new THREE.BoxGeometry(0.6, 0.6, 0.6),
			new THREE.OctahedronGeometry(0.45),
			new THREE.TetrahedronGeometry(0.55),
			new THREE.DodecahedronGeometry(0.4),
			new THREE.IcosahedronGeometry(0.42, 0),
			new THREE.BoxGeometry(0.5, 0.7, 0.5),
			new THREE.ConeGeometry(0.4, 0.7, 6),
			new THREE.OctahedronGeometry(0.5),
		];
		const geo = geometries[i % geometries.length];
		const cubeMesh = new THREE.Mesh(geo, cubeMats);
		cubeMesh.position.set(cx, cy, cz);
		cubeMesh.userData.portalId = link.target;

		const entity = world.createTransformEntity(cubeMesh);
		entity.addComponent(PortalCube, {
			portalId: link.target,
			color: tc.palette.safe_text_color,
			floatPhase: Math.random() * Math.PI * 2,
			floatSpeed: 0.4 + Math.random() * 0.4,
			baseY: cy,
		});
		world._sceneEntities.push(entity);
		cubeMeshes.push(cubeMesh);

		// (glow ring removed — was looking like flat circles)
	});

	// ── Narrative entity ──
	const narrEntity = world.createEntity();
	narrEntity.addComponent(NarrativeState, {
		stateIndex: 0,
		lastAdvance: performance.now(),
	});
	world._sceneEntities.push(narrEntity);

	// ── Camera orbit entity ──
	const camEntity = world.createEntity();
	camEntity.addComponent(CameraOrbit, {
		angle: 0,
		radiusA: config.camera.orbit.radius_a,
		radiusB: config.camera.orbit.radius_b,
		height: config.camera.orbit.height,
		speed: config.camera.orbit.speed,
	});
	// First entity — log available methods
	world._sceneEntities.push(camEntity);

	// ── Tap handler ──
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();

	// Remove old tap handler
	if (world._tapHandler) {
		world.renderer.domElement.removeEventListener('pointerdown', world._tapHandler);
		world.renderer.domElement.removeEventListener('touchstart', world._tapHandler);
	}

	function onPointerDown(e) {
		const x = e.touches ? e.touches[0].clientX : e.clientX;
		const y = e.touches ? e.touches[0].clientY : e.clientY;
		pointer.x = (x / window.innerWidth) * 2 - 1;
		pointer.y = -(y / window.innerHeight) * 2 + 1;
		raycaster.setFromCamera(pointer, world.camera);
		camEntity.setValue(CameraOrbit, 'boost', 1.5);

		const hits = raycaster.intersectObjects(cubeMeshes);
		console.log('[tap] hits:', hits.length, hits.length > 0 ? hits[0].object.userData.portalId : '');
		if (hits.length > 0) {
			const hit = hits[0].object;
			const targetId = hit.userData.portalId;
			const tc = nav.allConfigs[targetId];
			if (!tc) return;

			// Flash
			hit.material.forEach(m => { if (m.opacity) { m._o = m.opacity; m.opacity = 1; } });
			setTimeout(() => hit.material.forEach(m => { if (m._o != null) m.opacity = m._o; }), 200);

			const name = tc.portal.names[lang] || tc.portal.names.es;
			const desc = tc.portal.descriptions[lang] || tc.portal.descriptions.es;
			showPortalOverlay(name, desc, tc.palette.safe_text_color);

			// Flash transition
			const flash = document.createElement('div');
			flash.style.cssText = 'position:fixed;inset:0;background:' + tc.palette.primary + ';opacity:0;transition:opacity 0.3s ease;pointer-events:none;z-index:9998;';
			document.body.appendChild(flash);
			requestAnimationFrame(() => { flash.style.opacity = '0.6'; });
			setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 300); }, 600);

			console.log('[portals] Navigating:', nav.currentPortalId, '→', targetId);

			// Navigate after delay
			setTimeout(() => rebuildScene(world, targetId, true), 1500);
		}
	}

	world._tapHandler = onPointerDown;
	world.renderer.domElement.addEventListener('pointerdown', onPointerDown);
	world.renderer.domElement.addEventListener('touchstart', onPointerDown);

	// ── Narrative texts for system ──
	const texts = config.narrative_texts[lang] || config.narrative_texts.es;
	world.globals.narrativeTexts = texts;

	// ── Update animation wrapper (uses world-level refs, no stale closures) ──
	if (!world._updateWrapped) {
		const origUpdate = world.update.bind(world);
		world.update = function(delta, time) {
			origUpdate(delta, time);

			// Environment animation (particles, decorations, light movement)
			if (world._envHandle?.update) {
				world._envHandle.update(delta, time, world._lights);
			}

			// Narrative cycling
			if (world._narrEntity && world._narrTexts) {
				const narrLast = world._narrEntity.getValue(NarrativeState, 'lastAdvance');
				if (performance.now() - narrLast > 12000) {
					const idx = world._narrEntity.getValue(NarrativeState, 'stateIndex');
					if (world._narrTexts.length > 0) {
						showOverlay(world._narrTexts[idx]);
						world._narrEntity.setValue(NarrativeState, 'stateIndex', (idx + 1) % world._narrTexts.length);
						world._narrEntity.setValue(NarrativeState, 'lastAdvance', performance.now());
					}
				}
			}
		};
		world._updateWrapped = true;
	}

	// Store narrative refs on world for the wrapper
	world._narrEntity = narrEntity;
	world._narrTexts = texts;

	// ── First narrative ──
	setTimeout(() => showOverlay(texts[0]), 1500);

	// ── Nav bar ──
	// Nav bar removed — cubes are the navigation

	console.log('[portals] Scene built:', portalId, 'cubes:', cubeMeshes.length);
}

// ── Boot Portal Engine — accepts pre-merged configs (SSR + static fallbacks) ──

/**
 * Boot the ECS portal world.
 * @param {HTMLElement} container
 * @param {object} configs        - map of portalId → scene config
 * @param {string} initialPortalId - which portal to start in (required)
 */
export async function bootPortalEngine(container, configs, initialPortalId) {
	if (!configs || Object.keys(configs).length === 0) {
		throw new Error('bootPortalEngine: configs is empty');
	}
	const start = initialPortalId && configs[initialPortalId]
		? initialPortalId
		: Object.keys(configs)[0];
	const indexConfig = configs[start] || {};
	return boot(container, indexConfig, configs, start);
}

// ── Boot ──

export async function boot(container, indexConfig, allConfigs, startPortalId) {
	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});

	// Register components
	world.registerComponent(PortalCube);
	world.registerComponent(CameraOrbit);
	world.registerComponent(NarrativeState);

	// Register systems
	world.registerSystem(FloatSystem, { priority: 0 });
	world.registerSystem(CameraOrbitSystem, { priority: 0 });

	// Init tracking
	world._sceneObjects = [];
	world._sceneEntities = [];

	// Store configs
	nav.allConfigs = allConfigs;
	nav.history = [];

	// Build initial scene
	const initialPortal = startPortalId || indexConfig._initialPortal || indexConfig.portal?.id;
	if (!initialPortal) {
		throw new Error('boot: cannot determine initial portal id');
	}
	rebuildScene(world, initialPortal);

	// Browser back/forward support
	window.addEventListener('popstate', (event) => {
		const pid = event.state?.portalId;
		if (pid && nav.allConfigs[pid]) {
			rebuildScene(world, pid, true);
		}
	});

	console.log('[portals] World booted:', initialPortal);

	return world;
}
