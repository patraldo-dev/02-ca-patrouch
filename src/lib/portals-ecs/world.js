/**
 * Unified Portal World — Spatial Index + Portal Interior
 *
 * One world, two modes:
 *   index     — floating portal tabs, reactive background, particles (the "browsing" space)
 *   interior  — ring, crystals, decorations, narrative lighting (inside a portal)
 *
 * Transition is a mode change within the same world, not a page navigation.
 * No menu, no AR/VR choice — the space IS the experience.
 *
 * Lifecycle:
 *   1. World.create() → renderer, scene, camera, core systems
 *   2. Index entities created from D1 portal data
 *   3. User touches + holds a portal tab → focus timer → mode = 'transitioning'
 *   4. Index entities fade out, interior entities materialize (entry cinematic)
 *   5. mode = 'interior' → ring, crystals, narrative lighting active
 *   6. User exits → mode = 'index', interior entities destroyed
 *
 * This module is browser-only. Dynamic import from Svelte onMount/$effect.
 */

import {
	World, SessionMode, ReferenceSpaceType, Transform,
	AudioSource, PlaybackMode,
} from '@iwsdk/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
	PortalGate,
	TabLayout,
	ReactiveBackground,
	AmbientParticle,
	CarouselSlide,
	WorldMode,
	NarrativeState,
	PortalRing,
	InteriorDecoration,
} from './components.js';
import {
	TabSystem,
	BackgroundSystem,
	ParticleSystem,
	CarouselSystem,
	PortalInputSystem,
	FocusHoldSystem,
	NarrativeSystem,
	ProximityRingSystem,
	EntryCinematicSystem,
	CrystalInteractionSystem,
} from './systems.js';

// ─── Color helper ───────────────────────────────────────────────────
function hexToRgb(hex) {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return [r, g, b, 1];
}

// ─── Tab mesh factory ───────────────────────────────────────────────
function createTabMesh(colorPrimary) {
	const color = new THREE.Color(colorPrimary);
	// Larger, brighter tab so it's visible
	const geo = new THREE.BoxGeometry(0.3, 0.18, 0.02);
	const mat = new THREE.MeshStandardMaterial({
		color: 0x333338,
		emissive: color,
		emissiveIntensity: 0.3,
		metalness: 0.3,
		roughness: 0.6,
		transparent: true,
		opacity: 0.95,
	});
	return new THREE.Mesh(geo, mat);
}

// ─── Portal ring mesh (interior mode) ───────────────────────────────
function createPortalRingMesh(colorHex) {
	const group = new THREE.Group();
	const color = new THREE.Color(colorHex);

	// Brighter, larger torus
	const torusGeo = new THREE.TorusGeometry(1.2, 0.12, 24, 96);
	const torusMat = new THREE.MeshBasicMaterial({
		color: color.clone().lerp(new THREE.Color(0xffffff), 0.3), // brighten
		transparent: true, opacity: 1,
	});
	const torus = new THREE.Mesh(torusGeo, torusMat);
	group.add(torus);

	// Brighter membrane
	const membraneGeo = new THREE.CircleGeometry(1.18, 64);
	const membraneMat = new THREE.MeshBasicMaterial({
		color: color.clone().lerp(new THREE.Color(0xffffff), 0.1),
		transparent: true, opacity: 0.45, side: THREE.DoubleSide,
	});
	const membrane = new THREE.Mesh(membraneGeo, membraneMat);
	membrane.position.z = 0.001;
	group.add(membrane);

	return group;
}

// ─── Interior decoration factory ────────────────────────────────────
function createCrystalMesh(colorHex, scale = 1.0) {
	const color = new THREE.Color(colorHex);
	const geo = new THREE.OctahedronGeometry(0.25 * scale, 0); // bigger
	const mat = new THREE.MeshBasicMaterial({
		color: color.clone().lerp(new THREE.Color(0xffffff), 0.4), // brighter
		transparent: true, opacity: 0.9,
	});
	return new THREE.Mesh(geo, mat);
}

function createPillarMesh(colorHex, height = 2.0) {
	const color = new THREE.Color(colorHex);
	const geo = new THREE.BoxGeometry(0.08, height, 0.08);
	const mat = new THREE.MeshBasicMaterial({
		color: color.clone().lerp(new THREE.Color(0xffffff), 0.2),
		transparent: true, opacity: 0.7, // start visible
	});
	return new THREE.Mesh(geo, mat);
}

// ─── Audio: generate sine tone as WAV blob URL ─────────────────────
// Creates a looping positional audio source without needing external files.
function generateToneWAV(frequency, durationSec = 2.0, sampleRate = 44100) {
	const numSamples = Math.floor(durationSec * sampleRate);
	const buffer = new ArrayBuffer(44 + numSamples * 2);
	const view = new DataView(buffer);

	const writeString = (offset, str) => {
		for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
	};
	writeString(0, 'RIFF');
	view.setUint32(4, 36 + numSamples * 2, true);
	writeString(8, 'WAVE');
	writeString(12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);  // mono
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	writeString(36, 'data');
	view.setUint32(40, numSamples * 2, true);

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const envelope = Math.min(t * 4, 1) * Math.min((durationSec - t) * 4, 1);
		const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
		view.setInt16(44 + i * 2, sample * 32767, true);
	}

	return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

// ─── Debug (console only) ──────────────────────────────
function domDebug(msg) {
	console.log('[portals-ecs]', msg);
}

export async function initPortalWorld(container, { portals, galaxies, featuredPortalId, sceneConfigs }) {
	domDebug('=== initPortalWorld START ===');
	domDebug('portals count: ' + (portals?.length ?? 'undefined'));
	domDebug('galaxies count: ' + (galaxies?.length ?? 'undefined'));
	domDebug('featuredPortalId: ' + (featuredPortalId ?? 'undefined'));
	if (portals?.length > 0) {
		domDebug('portal[0] id: ' + portals[0].id + ', name: ' + (portals[0].name_es || portals[0].name_en));
	}

	// ── Global error trap — display uncaught errors in DOM debug ──
	window.addEventListener('error', (e) => {
		domDebug('UNCAUGHT ERROR: ' + (e.message || e.error?.message || 'unknown') + ' at ' + (e.filename || '') + ':' + (e.lineno || ''));
	});
	window.addEventListener('unhandledrejection', (e) => {
		domDebug('UNHANDLED REJECTION: ' + (e.reason?.message || e.reason || 'unknown'));
	});

	// ── 0. Pre-flight checks ──
	// Flush layout so container has real dimensions
	await new Promise(r => requestAnimationFrame(r));
	const rect = container.getBoundingClientRect();
	console.log('[portals-ecs] Container rect:', rect.width, 'x', rect.height);
	if (rect.width < 10 || rect.height < 10) {
		throw new Error(`Container too small before World.create: ${rect.width}x${rect.height}`);
	}

	// Check if navigator.xr.isSessionSupported hangs
	try {
		const xrCheck = await Promise.race([
			navigator.xr?.isSessionSupported?.('immersive-vr') ?? Promise.resolve(false),
			new Promise((_, reject) => setTimeout(() => reject(new Error('XR support check timeout')), 3000))
		]);
		console.log('[portals-ecs] XR VR supported:', xrCheck);
	} catch (e) {
		console.warn('[portals-ecs] XR check failed/hung:', e.message);
	}

	// ── 1. Create World — try omitting sessionMode entirely ──
	console.log('[portals-ecs] Calling World.create...');
	const world = await Promise.race([
		World.create(container, {
			xr: {
				offer: 'none',
			},
			render: {
				defaultLighting: false,
			},
			features: {
				locomotion: false,
				grabbing: false,
				physics: false,
			},
		}),
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error('World.create timeout after 8s')), 8000)
		)
	]);
	console.log('[portals-ecs] World.create resolved!');

	// ── Wrap world.update to catch per-frame ECS errors + run interior anim ──
	const origUpdate = world.update.bind(world);
	world.update = function(delta, time) {
		origUpdate(delta, time);
		if (world.globals._interiorAnimLoop) world.globals._interiorAnimLoop();
	};

	// Position camera for spatial browsing
	world.camera.position.set(0, 0, 1.2);
	world.camera.lookAt(0, 0, 0);

	// Scene background — not pure black so objects are distinguishable
	world.scene.background = new THREE.Color(0x0a0a12);


	// Lighting — hemisphere + directional for GLB visibility
	const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
	world.scene.add(ambientLight);
	const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444466, 0.8);
	world.scene.add(hemiLight);
	const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
	keyLight.position.set(0.5, 1, 1);
	world.scene.add(keyLight);

	// ── 2. Register custom components ──
	world.registerComponent(PortalGate);
	world.registerComponent(TabLayout);
	world.registerComponent(ReactiveBackground);
	world.registerComponent(AmbientParticle);
	world.registerComponent(CarouselSlide);
	world.registerComponent(WorldMode);
	world.registerComponent(NarrativeState);
	world.registerComponent(PortalRing);
	world.registerComponent(InteriorDecoration);
	// AudioSource is registered internally by IWSDK's AudioSystem — don't double-register

	// ── 3. Globals ──
	world.globals.onPortalFocus = null;
	world.globals.onCarouselAdvance = null;
	world.globals.onBumperComplete = null;
	world.globals.onPortalEnter = null;
	world.globals.onProximityTrigger = null;
	world.globals.portalBaseColor = '#c9a87c';
	world.globals.narrativeStates = null; // Set from scene config if available
	world.globals.locale = typeof document !== 'undefined'
		? (document.documentElement.lang || 'es')
		: 'es';
	world.globals.launchXR = null;

	// ── 4. Register systems by priority ──
	// TEMPORARILY DISABLED: BackgroundSystem, ParticleSystem, CarouselSystem
	// to isolate rendering issue
	world.registerSystem(PortalInputSystem, { priority: -5 });
	world.registerSystem(FocusHoldSystem, { priority: -4 });
	world.registerSystem(CrystalInteractionSystem, { priority: -4 });
	world.registerSystem(TabSystem, { priority: -3 });
	// world.registerSystem(CarouselSystem, { priority: 0 });
	world.registerSystem(NarrativeSystem, { priority: 0 });
	world.registerSystem(ProximityRingSystem, { priority: 0 });
	world.registerSystem(EntryCinematicSystem, { priority: 0 });
	// world.registerSystem(CrystalTestSystem, { priority: 2 }); // Removed — never defined
	// world.registerSystem(BackgroundSystem, { priority: 1 });
	// world.registerSystem(ParticleSystem, { priority: 2 });

	// Wire NarrativeSystem lights
	for (const sys of world.systems) {
		if (sys instanceof NarrativeSystem) {
			sys.setLights(ambientLight, keyLight);
			break;
		}
	}

	// ── 5. World mode entity (singleton) ──
	const modeEntity = world.createEntity();
	modeEntity.addComponent(WorldMode, {
		mode: 'index',
		activePortalId: '',
		transitionProgress: 0,
		cinematicTimer: 0,
	});

	// ── 6. Background entity — TEMPORARILY DISABLED ──
	// const bgEntity = world.createEntity();
	// bgEntity.addComponent(ReactiveBackground);

	// ── 7. Bumper handled by HTML overlay in Svelte — no ECS bumper entity ──

	// ── 8. Ambient particles — TEMPORARILY DISABLED ──
	/*
	const PARTICLE_COUNT = 60;
	for (let i = 0; i < PARTICLE_COUNT; i++) {
		const p = world.createTransformEntity();
		const pos = p.getVectorView(Transform, 'position');
		pos[0] = (Math.random() - 0.5) * 3;
		pos[1] = -0.5 + Math.random() * 1.5;
		pos[2] = (Math.random() - 0.5) * 2;
		p.addComponent(AmbientParticle, {
			velocityX: (Math.random() - 0.5) * 0.002,
			velocityY: 0.003 + Math.random() * 0.008,
			velocityZ: (Math.random() - 0.5) * 0.002,
			lifespan: 8 + Math.random() * 6,
			age: Math.random() * 8,
			size: 0.002 + Math.random() * 0.003,
		});
	}
	*/

	// ── 9. Portal tab entities ──
	const RAIL_X = -0.6;
	const RAIL_Y_START = 0.3;
	const RAIL_SPACING = 0.22;

	const galaxyIndexMap = {};
	let galaxyGroupIdx = 0;
	galaxies.forEach((g) => {
		galaxyIndexMap[g.id] = galaxyGroupIdx++;
	});

	const portalEntities = [];
	portals.forEach((portal, i) => {
		const colorPrimary = hexToRgb(portal.color_primary || '#c9a87c');
		const colorBg = hexToRgb(portal.color_bg || '#fff8e1');

		const mesh = createTabMesh(portal.color_primary || '#c9a87c');
		const entity = world.createTransformEntity(mesh);
		const pos = entity.getVectorView(Transform, 'position');
		const restY = RAIL_Y_START - i * RAIL_SPACING;
		pos[0] = RAIL_X;
		pos[1] = restY;
		pos[2] = 0;

		entity.addComponent(PortalGate, {
			portalId: portal.id,
			galaxyId: portal.galaxy_id,
			portalName: portal.name_es || portal.name_en || '',
			portalDesc: portal.description_es || portal.description_en || '',
			colorPrimary,
			colorBg,
			videoUrl: portal.video_url || '',
			writingsCount: portal.active_writings_count || 0,
			state: 'idle',
			focusTimer: 0,
			holdThreshold: 1.2,
		});

		entity.addComponent(TabLayout, {
			railIndex: i,
			galaxyGroup: galaxyIndexMap[portal.galaxy_id] || 0,
			restX: RAIL_X,
			restY,
			targetX: RAIL_X,
			targetY: restY,
			currentX: RAIL_X,
			currentY: restY,
			springVelocity: 0,
			width: 0.12,
			height: 0.08,
			isHovered: false,
		});

		portalEntities.push(entity);
	});

	// ── 10. Carousel entities ──
	const carouselPortals = portals.filter((p) => p.video_url);
	const carouselY = 0.25;

	carouselPortals.forEach((portal, i) => {
		const geo = new THREE.PlaneGeometry(2.0, 1.125);
		const mat = new THREE.MeshBasicMaterial({
			color: 0x111114,
			transparent: true,
			opacity: 0,
			side: THREE.DoubleSide,
		});
		const mesh = new THREE.Mesh(geo, mat);
		mesh.position.set(0, carouselY, -0.3);
		const entity = world.createTransformEntity(mesh);

		entity.addComponent(CarouselSlide, {
			portalId: portal.id,
			opacity: i === 0 ? 1 : 0,
			isActive: i === 0,
			cycleTimer: 0,
			cycleDuration: 6,
			textureRef: null,
		});
	});

	// ── 11. Callbacks bridge ECS → Svelte ──
	world.globals.onCarouselAdvance = (portalId) => {
		window.dispatchEvent(new CustomEvent('portal-carousel', { detail: { portalId } }));
	};

	world.globals.onPortalFocus = (portalId) => {
		window.dispatchEvent(new CustomEvent('portal-focus', { detail: { portalId } }));
	};

	world.globals.onBumperComplete = () => {
		domDebug('onBumperComplete callback entered');
		// HTML bumper already played in Svelte overlay before ECS boot.
		// Auto-enter featured portal immediately.
		const targetId = featuredPortalId || (portals[0] && portals[0].id);
		domDebug('onBumperComplete targetId: ' + (targetId ?? 'NONE'));
		if (targetId) {
				domDebug('Scheduling buildInterior in 300ms...');
				setTimeout(() => {
					domDebug('setTimeout fired, calling buildInterior...');
					buildInterior(world, portalEntities, targetId, ambientLight, keyLight, portals.find(p => p.id === targetId), modeEntity, sceneConfigs?.[targetId]);
				}, 300);
		} else {
			domDebug('WARNING: No targetId - buildInterior will NOT be called');
		}
	};

	world.globals.onPortalEnter = (portalId) => {
		window.dispatchEvent(new CustomEvent('portal-enter', { detail: { portalId } }));
		// Build interior after a short delay for the fade
		setTimeout(() => buildInterior(world, portalEntities, portalId, ambientLight, keyLight, portals.find(p => p.id === portalId), modeEntity, sceneConfigs?.[portalId]), 100);
	};

	world.globals.onProximityTrigger = async () => {
		window.dispatchEvent(new CustomEvent('portal-proximity-trigger'));
		// Auto-enter AR if supported, otherwise cinematic zoom
		try {
			const arSupported = await navigator.xr?.isSessionSupported?.('immersive-ar');
			if (arSupported) {
				const { launchXR } = await import('@iwsdk/core');
				launchXR(world, {
					sessionMode: SessionMode.ImmersiveAR,
					referenceSpace: {
						type: ReferenceSpaceType.LocalFloor,
						fallbackOrder: [ReferenceSpaceType.Local, ReferenceSpaceType.Viewer],
					},
					features: { anchors: true, hitTest: true, planeDetection: true },
				});
			} else {
				window.dispatchEvent(new CustomEvent('portal-cinematic-enter'));
			}
		} catch (err) {
			console.error('[portals-ecs] AR entry failed:', err);
			window.dispatchEvent(new CustomEvent('portal-cinematic-enter'));
		}
	};

	domDebug('About to fire onBumperComplete...');
	// ── Fire bumper-complete immediately (HTML bumper played before ECS boot) ──
	try {
		world.globals.onBumperComplete?.();
		domDebug('onBumperComplete fired OK');
	} catch(e) {
		domDebug('onBumperComplete ERROR: ' + e.message);
	}
	domDebug('=== initPortalWorld DONE ===');

	// ── 12. Public API ──
	const api = {
		world,
		portalEntities,
		modeEntity,

		// Advance narrative state (wire to crystal interactions)
		advanceNarrative() {
			for (const sys of world.systems) {
				if (sys instanceof NarrativeSystem) {
					sys.advance();
					return;
				}
			}
		},

		// Exit interior back to index
		exitToIndex() {
			teardownInterior(world);
			modeEntity.setValue(WorldMode, 'mode', 'index');
			modeEntity.setValue(WorldMode, 'activePortalId', '');
			modeEntity.setValue(WorldMode, 'cinematicTimer', 0);
			// Restore index lighting
			ambientLight.color.setHex(0xffffff);
			ambientLight.intensity = 0.8;
			keyLight.color.setHex(0xfff5e6);
			keyLight.intensity = 0.6;
			if (world.scene.fog) {
				world.scene.fog = null;
			}
			window.dispatchEvent(new CustomEvent('portal-exit-to-index'));
		},

		// Switch directly to another portal (teardown current interior, build new one)
		switchPortal(portalId) {
			const portal = portals.find(p => p.id === portalId);
			if (!portal) {
				console.warn('[portals-ecs] switchPortal: portal not found:', portalId);
				return;
			}
			if (!modeEntity || !world.entities) {
				console.warn('[portals-ecs] switchPortal: world not ready');
				return;
			}
			teardownInterior(world);
			modeEntity.setValue(WorldMode, 'mode', 'transitioning');
			window.dispatchEvent(new CustomEvent('portal-enter', { detail: { portalId } }));
			setTimeout(() => {
				buildInterior(world, portalEntities, portalId, ambientLight, keyLight, portal, modeEntity, sceneConfigs?.[portalId]);
			}, 150);
		},

		// Check XR support
		async checkSupport() {
			const ar = await navigator.xr?.isSessionSupported('immersive-ar') ?? false;
			const vr = await navigator.xr?.isSessionSupported('immersive-vr') ?? false;
			return { ar, vr };
		},

		// Enter AR — exit any active session first
		async enterAR() {
			if (world.session) world.exitXR();
			const { launchXR } = await import('@iwsdk/core');
			launchXR(world, {
				sessionMode: SessionMode.ImmersiveAR,
				referenceSpace: {
					type: ReferenceSpaceType.LocalFloor,
					fallbackOrder: [ReferenceSpaceType.Local, ReferenceSpaceType.Viewer],
				},
				features: { anchors: true, hitTest: true, planeDetection: true },
			});
		},

		// Enter VR — exit any active session first
		async enterVR() {
			if (world.session) world.exitXR();
			const { launchXR } = await import('@iwsdk/core');
			launchXR(world, {
				sessionMode: SessionMode.ImmersiveVR,
				referenceSpace: {
					type: ReferenceSpaceType.LocalFloor,
					fallbackOrder: [ReferenceSpaceType.Local, ReferenceSpaceType.Viewer],
				},
				features: {},
			});
		},

		// Exit XR back to 3D flat mode
		exitXR() {
			world.exitXR();
		},
	};

	return api;
}

// ─── Interior Construction ──────────────────────────────────────────
// Builds portal interior entities (ring, crystals, pillars, narrative state)
// when transitioning from index mode to interior mode.
function buildInterior(world, portalEntities, portalId, ambientLight, keyLight, portalData, modeEntity, sceneConfig) {
	console.log('[buildInterior] called for:', portalId);
	console.log('[buildInterior] modeEntity found:', !!modeEntity);
	domDebug('buildInterior START, portalId: ' + portalId);
	domDebug('portalEntities count: ' + portalEntities.length);

	// Check portalData safely
	try {
		const pDataInfo = portalData ? ('id=' + portalData.id + ' color=' + (portalData.color_primary || 'none')) : 'NULL';
		domDebug('portalData: ' + pDataInfo);
	} catch(e) {
		domDebug('portalData debug error: ' + e.message);
	}

	// Find portal entity with error handling
	let portal;
	try {
		domDebug('About to call find()...');
		portal = portalEntities.find((e) => {
			try {
				return e.getValue(PortalGate, 'portalId') === portalId;
			} catch(err) {
				domDebug('getValue error in find: ' + err.message);
				return false;
			}
		});
		domDebug('find() returned: ' + (portal ? 'FOUND' : 'NOT FOUND'));
	} catch(e) {
		domDebug('find() threw: ' + e.message);
		return;
	}

	if (!portal) {
		domDebug('FAILED: portal entity not found for id: ' + portalId);
		try {
			const ids = portalEntities.map(e => {
				try { return e.getValue(PortalGate, 'portalId'); } catch(_) { return '?'; }
			});
			domDebug('Available ids: ' + ids.join(', '));
		} catch(_) {}
		return;
	}
	domDebug('Portal entity found OK');
	domDebug('colorHex: ' + (portalData?.color_primary || '#c9a87c'));

	// Get color from raw portal data ( more reliable than extracting from ECS component)
	// ── Resolve colors from sceneConfig or fallback to portalData ──
	const palette = sceneConfig?.palette;
	const ringColor = palette?.primary || (portalData?.color_primary || '#c9a87c');
	const colorHex = ringColor.startsWith('#') ? ringColor : `#${ringColor}`;
	world.globals.portalBaseColor = colorHex;

	// Store narrative states from sceneConfig
	if (sceneConfig?.narrative_states) {
		world.globals.narrativeStates = sceneConfig.narrative_states;
	}

	// Fade out index entities
	for (const entity of portalEntities) {
		if (entity.object3D) entity.object3D.visible = false;
	}

	// ── Narrative state entity ──
	const numStates = sceneConfig?.narrative_states?.length || 3;
	const narrEntity = world.createEntity();
	narrEntity.addComponent(NarrativeState, {
		stateIndex: 0,
		targetStateIndex: 0,
		transitionProgress: 1,
		transitionSpeed: 0.8,
		maxStates: numStates,
	});

	// ── Atmosphere ──
	const atmos = sceneConfig?.atmosphere;
	if (atmos) {
		const fogDensity = atmos.fog_density || 0.03;
		const fogColor = new THREE.Color(atmos.ambient_color || colorHex);
		world.scene.fog = new THREE.FogExp2(fogColor, fogDensity);
		ambientLight.intensity = (atmos.light_intensity || 0.5) * 2;
		ambientLight.color.set(atmos.ambient_color || '#ffffff');
	}

	// ── Portal ring ──
	const ringMesh = createPortalRingMesh(colorHex);
	const ringEntity = world.createTransformEntity(ringMesh);
	const ringPos = ringEntity.getVectorView(Transform, 'position');
	ringPos[0] = 0; ringPos[1] = 0; ringPos[2] = -2.0;
	ringEntity.addComponent(PortalRing, {
		radius: 0.5, proximity: 0,
		activationRadius: 2.5, triggerDistance: 0.6, pulsePhase: 0,
	});

	// ── Backdrop — gradient only, no image ──
	{
		const gradGeo = new THREE.PlaneGeometry(8, 6);
		const gradMat = new THREE.ShaderMaterial({
			transparent: true, depthWrite: false, side: THREE.DoubleSide,
			uniforms: { uColor: { value: new THREE.Color(colorHex) }, uOpacity: { value: 0.3 } },
			vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
			fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; void main() { float d = length(vUv - vec2(0.5,0.5)); float a = smoothstep(0.8,0.1,d)*uOpacity; gl_FragColor = vec4(uColor*(1.5-d*0.5), a); }`,
		});
		const gradMesh = new THREE.Mesh(gradGeo, gradMat);
		gradMesh.position.set(0, 0, -4);
		world.scene.add(gradMesh);
	}

	// ── Camera ── positioned to see the ring and crystals clearly
	world.camera.position.set(0, 0.5, 1.5);
	world.camera.lookAt(0, 0.2, -2);
	world.camera.fov = 70;
	world.camera.updateProjectionMatrix();
	const camLight = new THREE.PointLight(0xffffff, 2.0, 10);
	camLight.position.copy(world.camera.position);
	world.scene.add(camLight);

	// Crystals from sceneConfig with spirit GLB
	const crystals = sceneConfig?.crystals || [];
	const crystalColors = palette?.crystal_colors || [colorHex, '#4fc3f7', '#b5ead7', '#ce93d8'];
	const ringRadius = sceneConfig?.spatial_layout?.crystal_ring_radius || 2;
	const elevations = sceneConfig?.spatial_layout?.crystal_elevations || [0.8, 1.2, 1.5];

	const spiritMeshes = [];
	// Pre-load spirit GLB
	const gltfLoader = new GLTFLoader();
	const spiritLoadPromise = gltfLoader.loadAsync('https://r2.mexicanbold.com/72fpsEFLSpirit-enhanced.glb').then((gltf) => {
		console.log('[portals-ecs] Spirit GLB loaded from mexicanbold R2');
		return gltf.scene;
	}).catch((err) => {
		console.warn('[portals-ecs] Spirit GLB failed:', err.message);
		return null;
	});

	crystals.forEach((crystal, i) => {
		const angle = (i / crystals.length) * Math.PI * 2;
		const elev = elevations[i % elevations.length];
		const cx = Math.cos(angle) * ringRadius;
		const cy = elev - 0.5;
		const cz = Math.sin(angle) * ringRadius - 2;

		const cColor = crystalColors[crystal.color_index % crystalColors.length] || colorHex;
		const cScale = crystal.scale || 1;

		// Start with fallback mesh, replace with GLB when loaded
		const mesh = createCrystalMesh(cColor, cScale);
		mesh.userData.crystalText = crystal.text || '';
		mesh.userData.portalId = portalId;

		const entity = world.createTransformEntity(mesh);
		const p = entity.getVectorView(Transform, 'position');
		p[0] = cx; p[1] = cy; p[2] = cz;

		entity.addComponent(InteriorDecoration, {
			decoType: 'crystal',
			floatPhase: Math.random() * Math.PI * 2,
			floatSpeed: 0.6 + Math.random() * 0.4,
			floatAmp: 0.04 + Math.random() * 0.03,
			baseY: cy,
			spawnDelay: 0,
			materialized: 1.0,
		});

		// Make sure the placeholder is visible immediately
		if (entity.object3D) {
			entity.object3D.visible = true;
			entity.object3D.traverse(child => {
				if (child.material) {
					child.material.opacity = 0.9;
					child.material.transparent = true;
				}
			});
		}

		// Replace placeholder with spirit GLB when loaded
		spiritLoadPromise.then((spiritScene) => {
			if (spiritScene && entity.object3D) {
				const spiritClone = spiritScene.clone(true);
				spiritClone.scale.setScalar(0.6 * cScale); // bigger spirit
				// Center the GLB origin
				const box = new THREE.Box3().setFromObject(spiritClone);
				const center = box.getCenter(new THREE.Vector3());
				spiritClone.position.set(cx - center.x, cy - center.y, cz - center.z);
				spiritClone.userData.crystalText = crystal.text || '';
				spiritClone.userData.portalId = portalId;
				// Replace materials with unlit basic — guarantees color visibility regardless of scene lighting/fog
				spiritClone.traverse((child) => {
					if (child.isMesh && child.material) {
						child.material = new THREE.MeshBasicMaterial({
							color: new THREE.Color().setHSL(i / crystals.length, 1.0, 0.5),
							transparent: true,
							opacity: 0.85,
							side: THREE.DoubleSide,
						});
					}
				});
				spiritClone.userData.baseY = cy;
				spiritClone.userData.floatSpeed = 0.5 + Math.random() * 0.5;
				spiritClone.userData.phase = Math.random() * Math.PI * 2;
				spiritClone.userData.hueOffset = (i / crystals.length);
				spiritMeshes.push(spiritClone);
				world.scene.add(spiritClone);
				// Hide placeholder only after GLB is actually visible
				entity.object3D.visible = false;
			}
		});

		// Spatial audio
		// Audio disabled — was causing unstoppable sound on some devices
		// const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00];
		// const freq = pentatonic[i % pentatonic.length];
		// const audioPath = generateToneWAV(freq, 2.0);
		// entity.addComponent(AudioSource, {
		// 	src: audioPath, positional: true, loop: true, autoplay: true,
		// 	volume: 0.06, refDistance: 0.8, rolloffFactor: 2.0,
		// 	maxDistance: 8.0, distanceModel: 'inverse', playbackMode: PlaybackMode.Overlap,
		// });
	});

	// ── Pillars from sceneConfig ──
	const decos = sceneConfig?.decorations || {};
	const pillarCount = decos.pillar_count || 5;
	const pillarHeight = decos.pillar_height || 2.2;
	for (let i = 0; i < pillarCount; i++) {
		const angle = (i / pillarCount) * Math.PI * 2 + Math.PI / pillarCount;
		const r = ringRadius + 0.8;
		const px = Math.cos(angle) * r;
		const pz = Math.sin(angle) * r - 2;
		const py = -0.5;

		const mesh = createPillarMesh(colorHex, pillarHeight);
		const entity = world.createTransformEntity(mesh);
		const p = entity.getVectorView(Transform, 'position');
		p[0] = px; p[1] = py; p[2] = pz;

		entity.addComponent(InteriorDecoration, {
			decoType: 'pillar',
			floatPhase: Math.random() * Math.PI * 2,
			floatSpeed: 0.3, floatAmp: 0.01,
			baseY: py, spawnDelay: 0, materialized: 1.0,
		});
	}

	// ── Halo — pulsing ring around the portal ──
	if (decos.halo_radius) {
		const haloGeo = new THREE.TorusGeometry(decos.halo_radius + 0.5, 0.02, 8, 64);
		const haloMat = new THREE.MeshBasicMaterial({
			color: new THREE.Color(palette?.accent || colorHex).lerp(new THREE.Color(0xffffff), 0.3),
			transparent: true, opacity: 0.4,
		});
		const haloMesh = new THREE.Mesh(haloGeo, haloMat);
		haloMesh.position.set(0, 0, -2);
		world.scene.add(haloMesh);

		// Animate halo pulse via a decoration entity
		const haloEntity = world.createTransformEntity(haloMesh);
		haloEntity.addComponent(InteriorDecoration, {
			decoType: 'pillar', // reuse float, but we'll pulse scale manually
			floatPhase: 0, floatSpeed: decos.halo_pulse_speed || 0.5,
			floatAmp: 0.001, baseY: 0, spawnDelay: 0, materialized: 0.4,
		});
		haloMesh.userData.isHalo = true;
		haloMesh.userData.pulseSpeed = decos.halo_pulse_speed || 0.5;
	}

	// ── Particles — sparkle field around the portal ──
	const particleCount = decos.particle_count || 20;
	const particleGeo = new THREE.BufferGeometry();
	const particlePositions = new Float32Array(particleCount * 3);
	const particleColors = new Float32Array(particleCount * 3);
	for (let i = 0; i < particleCount; i++) {
		particlePositions[i * 3] = (Math.random() - 0.5) * 6;
		particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 4;
		particlePositions[i * 3 + 2] = -1 + (Math.random() - 0.5) * 4;
		const c = new THREE.Color(crystalColors[i % crystalColors.length] || colorHex);
		particleColors[i * 3] = c.r;
		particleColors[i * 3 + 1] = c.g;
		particleColors[i * 3 + 2] = c.b;
	}
	particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
	particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
	const particleMat = new THREE.PointsMaterial({
		size: 0.04, vertexColors: true, transparent: true, opacity: 0.8,
		blending: THREE.AdditiveBlending, depthWrite: false,
	});
	const particles = new THREE.Points(particleGeo, particleMat);
	world.scene.add(particles);

	// ── Animation loop for ring pulse, spirit rotation, particles ──
	const animTime = { value: 0 };
	const ringObj = ringMesh; // the Group from createPortalRingMesh
	const animLoop = () => {
		animTime.value += 0.016;
		const t = animTime.value;

		// Pulse the ring (scale torus children)
		if (ringObj && ringObj.children[0]) {
			const pulse = 1 + Math.sin(t * 1.5) * 0.05;
			ringObj.children[0].scale.setScalar(pulse);
			// Pulsate membrane opacity
			if (ringObj.children[1] && ringObj.children[1].material) {
				ringObj.children[1].material.opacity = 0.3 + Math.sin(t * 1.5) * 0.15;
			}
		}

		// Animate spirit clones — rainbow cycling + float + rotate
		for (const s of spiritMeshes) {
			if (!s.rotation) continue;
			// Rainbow color cycling — full saturation, MeshBasicMaterial ignores scene lighting
			const hue = ((t * 0.15) + (s.userData.hueOffset || 0)) % 1;
			s.traverse((child) => {
				if (child.isMesh && child.material && child.material.color) {
					child.material.color.setHSL(hue, 1.0, 0.5);
				}
			});
			// Rotate
			s.rotation.y += 0.03;
			// Float
			s.position.y = s.userData.baseY + Math.sin(t * s.userData.floatSpeed + s.userData.phase) * 0.12;
		}

		// Drift particles
		if (particles) {
			const pos = particleGeo.attributes.position.array;
			for (let i = 0; i < particleCount; i++) {
				pos[i * 3 + 1] += 0.003;
				if (pos[i * 3 + 1] > 2) pos[i * 3 + 1] = -2;
			}
			particleGeo.attributes.position.needsUpdate = true;
		}
	};

	// Register animation in globals so it runs
	world.globals._interiorAnimLoop = animLoop;

	// ── Switch mode ──
	modeEntity.setValue(WorldMode, 'mode', 'interior');
	modeEntity.setValue(WorldMode, 'cinematicTimer', 5); // start advanced so decorations are visible
	// Ensure the modeEntity is properly referenced
	world.globals.modeEntity = modeEntity;

	window.dispatchEvent(new CustomEvent('portal-interior-ready', { detail: { portalId } }));
	domDebug('buildInterior complete: ' + crystals.length + ' crystals, ' + pillarCount + ' pillars');
}


// ─── Interior Teardown ──────────────────────────────────────────────
function teardownInterior(world) {
	// Kill animation loop
	world.globals._interiorAnimLoop = null;
	if (!world.entities) return;
	const toDestroy = [];
	for (const entity of world.entities.values()) {
		if (entity?.hasComponent?.(NarrativeState) ||
			entity?.hasComponent?.(PortalRing) ||
			entity?.hasComponent?.(InteriorDecoration)) {
			toDestroy.push(entity);
		}
	}
	toDestroy.forEach((e) => { try { e.dispose(); } catch(err) {} });

	// Make index entities visible again
	for (const entity of world.entities.values()) {
		if (entity?.hasComponent?.(PortalGate) && entity?.hasComponent?.(TabLayout)) {
			if (entity.object3D) entity.object3D.visible = true;
			try {
				entity.setValue(PortalGate, 'state', 'idle');
				entity.setValue(PortalGate, 'focusTimer', 0);
			} catch(err) {}
		}
	}
}

// ─── Cleanup ────────────────────────────────────────────────────────
export function destroyPortalWorld(world) {
	if (world?.renderer) {
		world.renderer.dispose();
		world.renderer.domElement?.remove();
	}
}
