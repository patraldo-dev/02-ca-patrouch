// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict JS type-checking (see jsconfig.json).
// ═══════════════════════════════════════════════════════════
//  world-builder.js — Config-driven ECS world builder
//  Reads scene config JSON, builds IWSDK world with ECS
// ═══════════════════════════════════════════════════════════
import { World, Transform } from '@iwsdk/core';
import { createComponent, createSystem, Types, ComponentRegistry } from 'elics';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { buildEnvironment, buildMural, buildParticles, buildSceneElements } from './environments.js';
import { playTransition } from './scene-transition.js';
import { installNarration } from './portal-audio.js';
import { LocomotionSystem, locomotion, configureLocomotion } from './locomotion-system.js';
import { GrabSystem } from './grab-system.js';
import { InteractionSystem } from './interaction-system.js';
import { RevelationSystem, setShowOverlay } from './revelation-system.js';
import { NetworkSystem } from './network-system.js';

// Give the RevelationSystem access to the overlay display function.
setShowOverlay(showOverlay);

// ── Scene Renderer Registry ──
// Custom per-portal scene renderers (desert, ocean-floor, etc.)
// Keyed by portal ID. If a portal has a custom renderer, rebuildScene uses it
// instead of the default starfield + cubes.
const SCENE_RENDERERS = {};
export function registerSceneRenderer(portalId, buildFn) {
	SCENE_RENDERERS[portalId] = buildFn;
}

/**
 * Inject a runtime-generated scene config into the running world and rebuild
 * the scene immediately. Used by "write → materialize": the user's text is
 * distilled into a scene config via Mistral, and this swaps it into the live
 * world without a page reload.
 *
 * @param {object} world      - the IWSDK world (from bootPortalEngine)
 * @param {string} portalId   - unique id for the materialized realm
 * @param {object} config     - normalized scene config (from normalizeSceneConfig)
 */
export function injectSceneConfig(world, portalId, config) {
	nav.allConfigs[portalId] = config;
	rebuildScene(world, portalId, true);
}

// Factory: creates a self-contained tap-at-screen-coordinates function bound to
// a world. Raycasts into world._interactionTargets (set by each scene builder)
// and calls world._onNavigate with the hit's portalId. Used by touch devices
// where the look-zone overlay intercepts touches before the canvas.
function makeTapAt(world) {
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();
	return (clientX, clientY) => {
		pointer.x = (clientX / window.innerWidth) * 2 - 1;
		pointer.y = -(clientY / window.innerHeight) * 2 + 1;
		raycaster.setFromCamera(pointer, world.camera);
		const targets = world._interactionTargets || [];
		if (!targets.length) return false;
		const hits = raycaster.intersectObjects(targets, true);
		if (hits.length > 0) {
			// Check for the worlds compass first (it resolves UV → row → portalId)
			if (world._compassResolve && hits[0].object.userData?.isCompass) {
				const portalId = world._compassResolve(hits[0]);
				if (portalId) {
					world._onNavigate?.(portalId);
					return true;
				}
			}
			// Normal gateway: walk up to find userData.portalId
			let obj = hits[0].object;
			while (obj && !obj.userData?.portalId) obj = obj.parent;
			if (obj?.userData?.portalId) {
				world._onNavigate?.(obj.userData.portalId);
				return true;
			}
		}
		return false;
	};
}

export function hasSceneRenderer(portalId) {
	return !!SCENE_RENDERERS[portalId];
}

// ── ECS Components ──
// HMR-safe: elics' ComponentRegistry is a module-global static Map, so on hot
// reload `createComponent('X')` throws "already exists". Reuse the existing
// component instance if it was registered in a previous module evaluation.
function reuseOrCreate(id, schema) {
	return ComponentRegistry.has(id) ? ComponentRegistry.getById(id) : createComponent(id, schema);
}

const PortalCube = reuseOrCreate('PortalCube', {
	portalId:    { type: Types.String, default: '' },
	color:       { type: Types.String, default: '#c9a87c' },
	floatPhase:  { type: Types.Float32, default: 0 },
	floatSpeed:  { type: Types.Float32, default: 0.5 },
	baseY:       { type: Types.Float32, default: 0 },
	isActive:    { type: Types.Boolean, default: false },
});

const CameraOrbit = reuseOrCreate('CameraOrbit', {
	angle:   { type: Types.Float32, default: 0 },
	radiusA: { type: Types.Float32, default: 5 },
	radiusB: { type: Types.Float32, default: 3.5 },
	height:  { type: Types.Float32, default: 1 },
	speed:   { type: Types.Float32, default: 0.06 },
	boost:   { type: Types.Float32, default: 0 },
});

const NarrativeState = reuseOrCreate('NarrativeState', {
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
			// Write Y through the ECS Transform (source of truth) — direct
			// obj.position.y writes are overwritten by TransformSystem each frame.
			const pos = entity.getVectorView(Transform, 'position');
			pos[1] = baseY + Math.sin(time * speed + phase) * 0.15;
		}
	}
};

const CameraOrbitSystem = class extends createSystem({
	cam: { required: [CameraOrbit] },
}) {
	update(dt) {
		// Yield to the locomotion system once the visitor takes control: either
		// an XR session is active (desktop emulation or real headset) or the
		// visitor has moved. Until then, keep the gentle idle orbit.
		if (this.world.session || locomotion.userActive) return;
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
	setTimeout(() => { wrap.style.opacity = '0'; setTimeout(() => { if (wrap === currentOverlay) currentOverlay = null; wrap.remove(); }, 400); }, 1200);
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
	if (isNavigation && destConfig) {
		// Flash the destination name concurrently with the transition so both
		// navigation paths (art-cube carousel + custom scenes) get a brief
		// "you're heading to X" cue. Auto-dismisses; doesn't block the rebuild.
		const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';
		const name = destConfig.portal?.names?.[lang] || destConfig.portal?.names?.es || portalId;
		const safeColor = destConfig.palette?.safe_text_color || destConfig.palette?.primary || '#e8d5b5';
		showPortalOverlay(name, '', safeColor);
	}
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
	world._glowRings = []; // clear glow rings from previous scene

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

	// Tell the locomotion system whether this scene is the floorless hub
	// (flight mode) or a grounded world (walk mode). Also passes the scene
	// + camera so the TeleportSystem + ComfortVignette can attach visuals.
	configureLocomotion(config, scene, world.camera);

	nav.currentPortalId = portalId;
	world._currentPortalId = portalId;  // NetworkSystem reads this to join the right room
	if (nav.history[nav.history.length - 1] !== portalId) nav.history.push(portalId);

	// Sync URL
	window.history.pushState({ portalId }, '', `/portals/${portalId}`);

	// Check for custom scene renderer
	if (hasSceneRenderer(portalId)) {
		// Navigation callback shared by the custom scene + the XR InteractionSystem.
		const onNavigate = (targetId) => {
			if (targetId === '__random__') {
				const ids = Object.keys(nav.allConfigs).filter((id) => id !== portalId);
				targetId = ids.length ? ids[Math.floor(Math.random() * ids.length)] : portalId;
			}
			rebuildScene(world, targetId, true);
		};
		const handle = SCENE_RENDERERS[portalId](world, config, nav.allConfigs, onNavigate);
		world._customSceneCleanup = handle?.cleanup || null;
		// Expose for XR controller-ray selection (themed scenes push their
		// tapTargets to handle.tapTargets if available).
		world._interactionTargets = handle?.tapTargets || [];
		world._onNavigate = onNavigate;
		// Programmatic tap-at-coordinates for touch devices (the look-zone overlay
		// intercepts touches before the canvas; PortalScene forwards taps here).
		// Self-contained so it works for themed scenes too (the default starfield
		// path defines its own below).
		world._tapAt = makeTapAt(world);
		return;
	}

	const palette = config.palette;
	const lighting = config.lighting;
	const lang = document.documentElement?.lang || 'es';
	const track = (obj) => { world._sceneObjects.push(obj); return obj; };

	// Sanitize hex colors: strip 8-digit alpha channel (#RRGGBBAA → #RRGGBB).
	// Three.js Color doesn't support alpha in hex strings.
	const cleanHex = (h) => h && h.length === 9 ? h.slice(0, 7) : h;

	// ── Atmosphere ──
	scene.background = new THREE.Color(cleanHex(palette.background));
	scene.fog = new THREE.FogExp2(cleanHex(palette.fog_color), palette.fog_density);

	// ── Lighting ──
	const ambientLight = new THREE.AmbientLight(cleanHex(lighting.ambient.color), lighting.ambient.intensity);
	scene.add(ambientLight); track(ambientLight);

	const keyLight = new THREE.PointLight(cleanHex(lighting.key_light.color), lighting.key_light.intensity, lighting.key_light.distance);
	keyLight.position.set(...lighting.key_light.position);
	scene.add(keyLight); track(keyLight);

	const rimLight = new THREE.PointLight(cleanHex(lighting.rim_light.color), lighting.rim_light.intensity, lighting.rim_light.distance);
	rimLight.position.set(...lighting.rim_light.position);
	scene.add(rimLight); track(rimLight);

	const underLight = new THREE.PointLight(cleanHex(lighting.under_light.color), lighting.under_light.intensity, lighting.under_light.distance);
	underLight.position.set(...lighting.under_light.position);
	scene.add(underLight); track(underLight);

	// ── Environment: space portals (and any type without a dedicated scene
	// renderer — e.g. parallax/pillar/lithograph whose renderers were
	// jettisoned) use the starfield as the fallback. Themed types route to
	// buildEnvironment instead. ──
	let envHandle;
	const envType = config.environment?.type;
	const THEMED_TYPES = ['forest','ocean','celebration','city','theater','memory','dream'];
	const useStarfield = envType === 'space' || !THEMED_TYPES.includes(envType);
	if (useStarfield) {
		// Starfield render path — the cosmos world's signature look
		const ap = config.ambient_particles || {
			count: 1200,
			spawn_radius: 12,
			size: 0.05,
			opacity: 0.9,
			drift_speed: 0.01,
			color_range: { hue_start: 0.55, hue_span: 0.35, saturation: 0.7, lightness_min: 0.5, lightness_max: 0.85 },
		};
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

	// ── Register collision geometry for grounded realms ──
	// After the environment is built, scan the scene for:
	//   1. Ground planes (walkable surfaces — floor you stand on)
	//   2. Obstacles (solid objects you can't walk through — trees, columns,
	//      structures, scene elements)
	// Both feed the GroundedPlayer's BVH so the physics step keeps the
	// player on the floor AND pushes them out of solid geometry.
	// Free-flight realms (space/dream/cosmos) skip this entirely.
	if (locomotion.groundedPlayer) {
		scene.traverse((child) => {
			if (!child.isMesh || !child.geometry) return;

			// Skip particle systems (Points, not Mesh — but double-check)
			if (child.isPoints || child.isLine) return;

			// Skip transparent decorative overlays (murals, backdrops, water
			// planes, light shafts — visual-only, not solid)
			const mat = child.material;
			if (mat && mat.transparent && mat.opacity < 0.5) return;
			if (mat && mat.blending === THREE.AdditiveBlending) return;

			// Ground planes: rotated flat, near floorY → walkable surface
			const isFlat = Math.abs(child.rotation.x + Math.PI / 2) < 0.1;
			const isNearFloor = Math.abs(child.position.y - locomotion.floorY) < 0.5;
			if (isFlat && isNearFloor) {
				locomotion.groundedPlayer.register(child);
				return;
			}

			// Obstacles: solid meshes that sit on or near the ground (not
			// overhead decorations). Heuristic: the mesh's bounding box
			// bottom is within ~2m of the floor and its height is between
			// 0.3m and 4m (tall enough to block, short enough to not be
			// a ceiling/skybox).
			child.updateMatrixWorld(true);
			const box = new THREE.Box3().setFromObject(child);
			if (box.min.y > locomotion.floorY + 2) return; // too high overhead
			const height = box.max.y - box.min.y;
			if (height < 0.2 || height > 6) return; // too thin or too tall
			// Skip very large flat surfaces (backdrops, already caught above)
			const size = new THREE.Vector3();
			box.getSize(size);
			if (size.y < 0.15 && (size.x > 10 || size.z > 10)) return;

			locomotion.groundedPlayer.register(child);
		});
	}

	// ── Grab system: makes scene elements (figures, quadrupeds, structures)
	// physically interactable — point + trigger/click to pick up, move, drop. ──
	if (locomotion.grab) locomotion.grab.dispose();
	locomotion.grab = new GrabSystem(scene);
	// Collect grabbables from both paths (themed via envHandle, starfield via elementsHandle)
	const grabbables = [];
	if (envHandle?.grabbables) grabbables.push(...envHandle.grabbables);
	if (useStarfield && typeof elementsHandle !== 'undefined' && elementsHandle?.grabbables) {
		grabbables.push(...elementsHandle.grabbables);
	}
	locomotion.grab.setGrabbables(grabbables);

	// ── Art mural + ambient particles: apply to ALL scenes (both starfield
	// and themed), so every realm has the visual enrichment. buildEnvironment
	// already adds these for themed scenes; for the starfield path we add them
	// here so cosmos/materialized realms also get murals + particles. ──
	if (useStarfield) {
		// Murals + particles + scene elements for starfield (themed already has
		// them via buildEnvironment). These functions expect track to be an array
		// with .push(); world-builder's track is a function, so use a local array
		// then register each object via track().
		const envTrack = [];
		buildMural(config, scene, envTrack);
		const particleHandle = buildParticles(config, scene, envTrack);
		const elementsHandle = buildSceneElements(config, scene, envTrack);
		for (const obj of envTrack) track(obj);

		const prevUpdate = envHandle.update;
		envHandle.update = (dt, time) => {
			prevUpdate?.(dt, time);
			particleHandle?.update(dt, time);
			elementsHandle?.update(dt, time);
		};
	}

	// ── Portal cubes from portal_links — dynamic multi-ring carousel ──
	// Restores the 2f0029c "best version" energy: cubes distributed across
	// concentric rings at varied elevations, each face showing a different
	// artwork from the collection (deterministic cycling, not random), uniform
	// BoxGeometry so artwork reads cleanly, lively float/spin, and subtle
	// additive glow rings billboarded to camera.
	const links = config.portal_links || [];
	const cubeMeshes = [];

	const CF_HASH = '4bRSwPonOXfEIBVZiDXg0w';
	const texLoader = new THREE.TextureLoader();
	texLoader.crossOrigin = 'anonymous';

	// The collection's artwork IDs — cycle deterministically so each cube
	// shows a unique combination of 6 faces (matches the 2f0029c look).
	const PORTAL_ARTWORKS = [
		'12c79899-fb93-4885-508f-d2da0a2fbf00', 'bd4602b0-149d-42f8-e872-f697b64c7d00',
		'5c7fb409-1aa2-45a9-8466-296077e18e00', 'f8a136eb-363e-4a24-0f54-70bb4f4bf800',
		'5c28fef5-cff0-4ddd-b4af-100d29bad100', '62355ddb-0f6c-4251-5d8e-37a455e44000',
		'85319dc7-ae16-48f8-9500-608ba174eb00', '26fe40df-7745-41dc-7491-97cb36a32f00',
	];

	// Two concentric rings for depth ("circles within circles").
	const RING_RADII = [2.2, 3.4];
	// Varied elevations — cubes float at different heights, not a flat ladder.
	const ELEVATIONS = [0.3, 1.0, 0.6, 1.4, 0.4, 1.1, 0.8, 1.3];

	links.forEach((link, i) => {
		const tc = nav.allConfigs[link.target];
		if (!tc) return;

		// Distribute across rings: even indices inner, odd outer. Each ring
		// gets its own angular offset so cubes don't line up radially.
		const ringIdx = i % 2;
		const radius = RING_RADII[ringIdx];
		const inRingCount = Math.ceil((links.length - ringIdx) / 2);
		const inRingIndex = Math.floor(i / 2);
		const angleOffset = ringIdx === 0 ? 0 : Math.PI / inRingCount;
		const angle = (inRingIndex / inRingCount) * Math.PI * 2 + angleOffset;
		const cx = Math.cos(angle) * radius;
		const cy = ELEVATIONS[i % ELEVATIONS.length];
		const cz = Math.sin(angle) * radius - 1;

		// Art cube — 6 faces, each a different artwork (deterministic cycling)
		const cubeMats = [];
		for (let f = 0; f < 6; f++) {
			const faceArt = PORTAL_ARTWORKS[(i * 6 + f) % PORTAL_ARTWORKS.length];
			const fMat = new THREE.MeshBasicMaterial({
				color: 0x1a0a2e, transparent: true, opacity: 0, side: THREE.DoubleSide,
			});
			texLoader.load(
				`https://imagedelivery.net/${CF_HASH}/${faceArt}/segment=foreground,width=256`,
				(tex) => {
					tex.colorSpace = THREE.SRGBColorSpace;
					fMat.map = tex;
					fMat.color.setHex(0xffffff);
					fMat.opacity = 0.92;
					fMat.needsUpdate = true;
				},
				undefined,
				(err) => { fMat.opacity = 0.6; }  // texture failed — show dark face
			);
			cubeMats.push(fMat);
		}

		// Uniform BoxGeometry — artwork reads cleaner than mixed polyhedra.
		const cubeSize = 0.5 + (ringIdx === 0 ? 0.05 : 0); // inner ring slightly bigger
		const cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize), cubeMats);
		cubeMesh.userData.portalId = link.target;
		// Proximity revelation: approach this cube and a fragment of the target
		// portal's narrative text appears (RevelationSystem reads this).
		const revLang = document.documentElement?.lang || 'es';
		const revTexts = tc.narrative_texts?.[revLang] || tc.narrative_texts?.es || [];
		const revText = revTexts[i % revTexts.length] || tc.portal?.names?.[revLang] || '';
		if (revText) cubeMesh.userData.revelation = { text: revText };

		const entity = world.createTransformEntity(cubeMesh);
		// Set position/rotation via the ECS Transform (source of truth) — direct
		// Three.js writes are overwritten by TransformSystem each frame.
		const cpos = entity.getVectorView(Transform, 'position');
		cpos[0] = cx; cpos[1] = cy; cpos[2] = cz;
		entity.addComponent(PortalCube, {
			portalId: link.target,
			color: tc.palette.safe_text_color,
			floatPhase: Math.random() * Math.PI * 2,
			floatSpeed: 0.5 + Math.random() * 0.5, // livelier than the old 0.4+0.4
			baseY: cy,
		});
		world._sceneEntities.push(entity);
		cubeMeshes.push(cubeMesh);

		// Subtle glow ring — thin RingGeometry, additive, billboarded to camera
		// each frame via the update loop (stored in world._glowRings).
		// Tint each cube's ring with its corresponding crystal color so the
		// glow matches the distilled excerpt it reveals.
		const crystalIdx = tc.crystals?.[i % Math.max(tc.crystals.length, 1)]?.color_index;
		const crystalColors = tc.palette?.crystal_colors;
		const ringHex = (crystalIdx != null && crystalColors?.[crystalIdx]) || tc.palette.primary;
		const glowColor = new THREE.Color(ringHex);
		const glowRing = new THREE.Mesh(
			new THREE.RingGeometry(cubeSize * 0.9, cubeSize * 1.4, 24),
			new THREE.MeshBasicMaterial({
				color: glowColor, transparent: true, opacity: 0.18,
				blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
			}),
		);
		glowRing.position.set(cx, cy, cz);
		scene.add(glowRing); track(glowRing);
		if (!world._glowRings) world._glowRings = [];
		world._glowRings.push(glowRing);
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

	// Reset locomotion state for the new scene: drop userActive so the idle
	// orbit resumes. Only reposition the player rig when an XR session is
	// active — in inline mode the player must stay at origin (identity) so it
	// doesn't skew the orbit camera's world transform (which would break the
	// tap raycast). The LocomotionSystem handles rig placement on XR entry.
	locomotion.userActive = false;
	if (world.player && world.session) {
		const rad = config.camera.orbit.radius_b || 3;
		const hgt = config.camera.orbit.height ?? 1;
		const floorY = locomotion.mode === 'walk' ? locomotion.floorY + 1.6 : hgt;
		world.player.position.set(0, floorY, rad);
		world.player.lookAt(0, floorY, 0);
	}

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
		if (hits.length > 0) {
			const hit = hits[0].object;
			const targetId = hit.userData.portalId;
			const tc = nav.allConfigs[targetId];
			if (!tc) return;

			// Brief cube flash so the tap feels acknowledged.
			hit.material.forEach(m => { if (m.opacity) { m._o = m.opacity; m.opacity = 1; } });
			setTimeout(() => hit.material.forEach(m => { if (m._o != null) m.opacity = m._o; }), 180);

			console.log('[portals] Navigating:', nav.currentPortalId, '→', targetId);
			// Navigate immediately — rebuildScene plays the transition overlay and
			// shows the destination name. No manual flash/delay here; the single
			// playTransition in rebuildScene is the whole handoff.
			rebuildScene(world, targetId, true);
		}
	}

	world._tapHandler = onPointerDown;
	world.renderer.domElement.addEventListener('pointerdown', onPointerDown);
	world.renderer.domElement.addEventListener('touchstart', onPointerDown);

	// Expose the starfield's interactive targets for the XR InteractionSystem
	// (controller-ray selection). Each target carries userData.portalId.
	world._interactionTargets = cubeMeshes;
	world._onNavigate = (targetId) => rebuildScene(world, targetId, true);

	// Programmatic tap-at-coordinates for touch devices (see makeTapAt).
	world._tapAt = makeTapAt(world);

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

			// NOTE: The ambient narrative cycler was removed — narrative text now
			// appears ONLY via proximity-triggered revelation (RevelationSystem),
			// so discovering text feels earned rather than automatic.

			// Billboard glow rings toward camera + gentle pulse
			if (world._glowRings && world._glowRings.length) {
				const camPos = world.camera.position;
				for (const ring of world._glowRings) {
					ring.lookAt(camPos);
					if (ring.material) {
						ring.material.opacity = 0.14 + Math.sin(time / 1000 * 1.5 + ring.position.x) * 0.06;
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

	// ── Spoken narration (speaker affordance, fetched on tap) ──
	// `lang` is already in scope (declared earlier in rebuildScene).
	const narration = installNarration({ portalId, track: [], lang });
	// Dispose narration on scene teardown — piggyback on the custom-cleanup slot
	// since the default path doesn't have its own cleanup return.
	const prevCustomCleanup = world._customSceneCleanup;
	world._customSceneCleanup = () => {
		if (typeof prevCustomCleanup === 'function') prevCustomCleanup();
		narration.dispose();
	};

	console.log('[portals] Scene built:', portalId, 'cubes:', cubeMeshes.length);
}

// ── Boot Portal Engine — accepts pre-merged configs (SSR + static fallbacks) ──

/**
 * Boot the ECS portal world.
 * @param {HTMLElement} container
 * @param {object} configs        - map of portalId → scene config
 * @param {string} initialPortalId - which portal to start in (required)
 */
export async function bootPortalEngine(container, configs, initialPortalId, options = {}) {
	if (!configs || Object.keys(configs).length === 0) {
		throw new Error('bootPortalEngine: configs is empty');
	}
	const start = initialPortalId && configs[initialPortalId]
		? initialPortalId
		: Object.keys(configs)[0];
	const indexConfig = configs[start] || {};
	// Stash the visitor's display name on the boot options so boot() can set it
	// on the world before NetworkSystem registers (it reads world._visitorName
	// to identify this visitor by name in co-presence instead of "visitor").
	bootOptions = options;
	return boot(container, indexConfig, configs, start);
}

// Module-level holder for per-boot options (set by bootPortalEngine, read by boot).
let bootOptions = {};

// ── Boot ──

/**
 * Install IWER (Immersive Web Emulation Runtime) when there is no native WebXR
 * device, so the portals can be explored on desktop (WASD/mouse via Play Mode).
 *
 * The @iwsdk/vite-plugin-dev builds a self-contained injection bundle with all
 * the IWER+IWSDK glue (including the input bridge that wires Play Mode's WASD
 * into the XR gamepad). That plugin's HTML injection doesn't reach SvelteKit
 * SSR routes, so we import its virtual module DIRECTLY here — which runs the
 * same proven bundle in-app, before World.create. Must run before IWSDK probes
 * for session support.
 */
async function installIWER() {
	// If native WebXR is genuinely available, leave it alone.
	let nativeVR = false;
	try {
		if (navigator.xr) nativeVR = await navigator.xr.isSessionSupported('immersive-vr');
	} catch {}
	if (nativeVR) {
		console.log('[portals] Native WebXR detected — skipping IWER emulation');
		return;
	}
	try {
		// Import the plugin's virtual module directly. This runs the pre-built
		// injection bundle (IWER runtime + DevUI + IWSDK input bridge), configured
		// for metaQuest3, gated to localhost activation.
		await import('/@iwer-injection-runtime');
		console.log('[portals] IWER injection bundle loaded (via plugin virtual module).');
	} catch (err) {
		console.warn('[portals] IWER virtual module import failed, falling back to manual install:', err);
		// Fallback: manual install (no input bridge, but session + render work).
		try {
			const { XRDevice, metaQuest3 } = await import('iwer');
			const { DevUI } = await import('@iwer/devui');
			const xrDevice = new XRDevice(metaQuest3);
			xrDevice.installRuntime({ forceInstall: true });
			xrDevice.installDevUI(DevUI);
			window.xrdevice = xrDevice;
			console.log('[portals] IWER manual fallback installed (metaQuest3).');
		} catch (err2) {
			console.warn('[portals] IWER manual install also failed:', err2);
		}
	}
}

export async function boot(container, indexConfig, allConfigs, startPortalId) {
	if (!container) {
		throw new Error('boot: container element is null — bind:this may not have resolved');
	}
	// Install the WebXR emulator before the world boots so the navigator.xr
	// polyfill is active when IWSDK initializes.
	await installIWER();

	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});

	// ── Post-processing: bloom for luminosity ──
	// Wraps the renderer so IWSDK's internal render call goes through an
	// EffectComposer with an UnrealBloomPass. This makes crystals, glow rings,
	// particles, and murals feel luminous rather than flat. The override is
	// skipped during XR sessions (the composer doesn't work well in immersive
	// mode — the headset needs the raw render).
	const renderer = world.renderer;
	const composer = new EffectComposer(renderer);
	const renderPass = new RenderPass(world.scene, world.camera);
	composer.addPass(renderPass);
	const bloomPass = new UnrealBloomPass(
		new THREE.Vector2(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight),
		0.6,  // strength — subtle, not blown out
		0.4,  // radius
		0.85, // threshold — only bright areas bloom
	);
	composer.addPass(bloomPass);
	// Intercept the renderer's render call. IWSDK calls renderer.render(scene, camera)
	// internally each frame; we redirect to the composer. CRITICAL: composer.render()
	// internally calls renderer.render() for its RenderPass — without a re-entry guard
	// this creates infinite recursion (Maximum call stack size exceeded).
	const origRender = renderer.render.bind(renderer);
	let inComposer = false;  // re-entry guard
	renderer.render = function(scene, camera) {
		if (world.session) {
			origRender(scene, camera);  // XR: raw render
		} else if (!inComposer) {
			inComposer = true;
			renderPass.camera = camera;  // keep camera in sync
			composer.render();
			inComposer = false;
		} else {
			// Called from inside the composer (RenderPass) — use the real render
			origRender(scene, camera);
		}
	};
	// Resize the composer when the viewport changes.
	window.addEventListener('resize', () => {
		composer.setSize(window.innerWidth, window.innerHeight);
	});

	// Register components
	world.registerComponent(PortalCube);
	world.registerComponent(CameraOrbit);
	world.registerComponent(NarrativeState);

	// Register systems
	console.log('[portals] registering systems...');
	world.registerSystem(FloatSystem, { priority: 0 });
	world.registerSystem(CameraOrbitSystem, { priority: 0 });
	// Cross-platform locomotion: drives world.player from the XR left thumbstick
	// (WASD via IWER Play Mode on desktop). Runs before CameraOrbitSystem so the
	// visitor's movement applies before the orbit (which yields anyway).
	world.registerSystem(LocomotionSystem, { priority: 0 });
	// XR controller-ray selection: aim with the right controller (mouse-look in
	// Play Mode), click trigger (left-click) to navigate between portals.
	world.registerSystem(InteractionSystem, { priority: 0 });
	// Proximity-triggered revelation: approach objects → they glow + reveal text.
	try {
		world.registerSystem(RevelationSystem, { priority: 0 });
		console.log('[portals] RevelationSystem registered');
	} catch (e) {
		console.warn('[portals] RevelationSystem registration issue:', e.message);
	}

	// Multiplayer avatar sync: broadcasts local pose, spawns remote avatars.
	// Set the visitor's name + avatar on the world BEFORE the system registers —
	// NetworkSystem.init reads these to identify this visitor (falls back to
	// "visitor"/null for anonymous/guest sessions).
	world._visitorName = bootOptions.visitorName || null;
	world._visitorAvatar = bootOptions.visitorAvatar || null;
	try {
		world.registerSystem(NetworkSystem, { priority: 0 });
		console.log('[portals] NetworkSystem registered');
	} catch (e) {
		console.warn('[portals] NetworkSystem registration issue:', e.message);
	}

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
	// Seed history state for the initial scene ONLY IF the current URL is a
	// portal URL without state (e.g. a direct link to /portals/cosmos loaded
	// from scratch). We must NOT rewrite a /portals (index) URL — that entry
	// is the "surprise me" floor the back button should be able to reach.
	const currentPath = window.location.pathname;
	if (!window.history.state?.portalId && currentPath.startsWith('/portals/')) {
		window.history.replaceState({ portalId: initialPortal }, '', currentPath);
	}
	rebuildScene(world, initialPortal);

	// Browser back/forward support. Three cases:
	// 1. event.state.portalId → navigate to that portal (normal inter-portal back).
	// 2. event.state is null/falsy (back to /portals index) → drop into a fresh
	//    random world, since /portals means "surprise me."
	// 3. state has a portalId we don't have a config for → also pick random,
	//    so a stale/deleted portal id never freezes the scene.
	window.addEventListener('popstate', (event) => {
		const pid = event.state?.portalId;
		if (pid && nav.allConfigs[pid]) {
			rebuildScene(world, pid, true);
			return;
		}
		// Backed out to /portals (or an unknown portal id). Pick a random world
		// other than the current one, mirroring the index's "surprise me" intent.
		const ids = Object.keys(nav.allConfigs).filter((id) => id !== nav.currentPortalId);
		if (ids.length) {
			const randomId = ids[Math.floor(Math.random() * ids.length)];
			// pushState (not just rebuildScene) so the URL reflects the new world
			// and a subsequent back doesn't loop on the empty /portals entry.
			window.history.pushState({ portalId: randomId }, '', `/portals/${randomId}`);
			rebuildScene(world, randomId, true);
		}
	});

	console.log('[portals] World booted:', initialPortal);

	return world;
}
