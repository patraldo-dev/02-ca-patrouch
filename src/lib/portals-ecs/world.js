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
import {
	PortalGate,
	TabLayout,
	BumperPhase,
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
	BumperSystem,
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

	const torusGeo = new THREE.TorusGeometry(0.5, 0.03, 16, 64);
	const torusMat = new THREE.MeshStandardMaterial({
		color, emissive: color, emissiveIntensity: 0.4,
		transparent: true, opacity: 1,
	});
	const torus = new THREE.Mesh(torusGeo, torusMat);
	group.add(torus);

	const membraneGeo = new THREE.CircleGeometry(0.48, 64);
	const membraneMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color(colorHex).multiplyScalar(0.3),
		transparent: true, opacity: 0.15, side: THREE.DoubleSide,
	});
	const membrane = new THREE.Mesh(membraneGeo, membraneMat);
	membrane.position.z = 0.001;
	group.add(membrane);

	return group;
}

// ─── Interior decoration factory ────────────────────────────────────
function createCrystalMesh(colorHex, scale = 1.0) {
	const color = new THREE.Color(colorHex);
	const geo = new THREE.OctahedronGeometry(0.15 * scale, 0);
	const mat = new THREE.MeshStandardMaterial({
		color, emissive: color.clone().multiplyScalar(0.5),
		emissiveIntensity: 0.3, transparent: true, opacity: 0,
		metalness: 0.8, roughness: 0.2,
	});
	return new THREE.Mesh(geo, mat);
}

function createPillarMesh(colorHex, height = 2.0) {
	const color = new THREE.Color(colorHex);
	const geo = new THREE.BoxGeometry(0.08, height, 0.08);
	const mat = new THREE.MeshStandardMaterial({
		color: color.clone().multiplyScalar(0.3),
		emissive: color.clone().multiplyScalar(0.2),
		emissiveIntensity: 0.2, transparent: true, opacity: 0,
		metalness: 0.4, roughness: 0.5,
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

// ─── Main initialization ────────────────────────────────────────────
export async function initPortalWorld(container, { portals, galaxies }) {
	// ── 1. Create World — non-immersive, XR on demand ──
	const world = await World.create(container, {
		xr: {
			sessionMode: SessionMode.ImmersiveVR,
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
	});

	// Position camera for spatial browsing
	world.camera.position.set(0, 0, 1.2);
	world.camera.lookAt(0, 0, 0);

	// Scene background — not pure black so objects are distinguishable
	world.scene.background = new THREE.Color(0x0a0a12);

	// DEBUG: Bright test sphere directly in front of camera
	const testGeo = new THREE.SphereGeometry(0.15, 16, 16);
	const testMat = new THREE.MeshBasicMaterial({ color: 0xff0066 });
	const testSphere = new THREE.Mesh(testGeo, testMat);
	testSphere.position.set(0, 0, 0);
	world.scene.add(testSphere);

	// Lighting — shared between modes, NarrativeSystem takes over in interior
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
	world.scene.add(ambientLight);
	const keyLight = new THREE.DirectionalLight(0xfff5e6, 0.6);
	keyLight.position.set(0.5, 1, 1);
	world.scene.add(keyLight);

	// ── 2. Register custom components ──
	world.registerComponent(PortalGate);
	world.registerComponent(TabLayout);
	world.registerComponent(BumperPhase);
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
	world.registerSystem(PortalInputSystem, { priority: -5 });
	world.registerSystem(FocusHoldSystem, { priority: -4 });
	world.registerSystem(CrystalInteractionSystem, { priority: -4 });
	world.registerSystem(TabSystem, { priority: -3 });
	world.registerSystem(BumperSystem, { priority: 0 });
	world.registerSystem(CarouselSystem, { priority: 0 });
	world.registerSystem(NarrativeSystem, { priority: 0 });
	world.registerSystem(ProximityRingSystem, { priority: 0 });
	world.registerSystem(EntryCinematicSystem, { priority: 0 });
	world.registerSystem(BackgroundSystem, { priority: 1 });
	world.registerSystem(ParticleSystem, { priority: 2 });

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

	// ── 6. Background entity ──
	const bgEntity = world.createEntity();
	bgEntity.addComponent(ReactiveBackground);

	// ── 7. Bumper entity (runs once) ──
	const bumperEntity = world.createEntity();
	bumperEntity.addComponent(BumperPhase, {
		phase: 'converge',
		elapsed: 0,
		duration: 2.5,
	});

	// ── 8. Ambient particles ──
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
		window.dispatchEvent(new CustomEvent('portal-bumper-done'));
	};

	world.globals.onPortalEnter = (portalId) => {
		window.dispatchEvent(new CustomEvent('portal-enter', { detail: { portalId } }));
		// Build interior after a short delay for the fade
		setTimeout(() => buildInterior(world, portalEntities, portalId, ambientLight, keyLight), 100);
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

		// Check XR support
		async checkSupport() {
			const ar = await navigator.xr?.isSessionSupported('immersive-ar') ?? false;
			const vr = await navigator.xr?.isSessionSupported('immersive-vr') ?? false;
			return { ar, vr };
		},

		// Enter AR (if supported)
		async enterAR() {
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
	};

	return api;
}

// ─── Interior Construction ──────────────────────────────────────────
// Builds portal interior entities (ring, crystals, pillars, narrative state)
// when transitioning from index mode to interior mode.
function buildInterior(world, portalEntities, portalId, ambientLight, keyLight) {
	const portal = portalEntities.find((e) => e.getValue(PortalGate, 'portalId') === portalId);
	if (!portal) return;

	const colorPrimary = portal.getValue(PortalGate, 'portalName')
		? new THREE.Color().fromArray(portal.getVectorView(PortalGate, 'colorPrimary')).getHexString()
		: 'c9a87c';
	const colorHex = `#${colorPrimary}`;

	world.globals.portalBaseColor = colorHex;

	// Fade out index entities (tabs, carousel) — they'll be invisible
	for (const entity of portalEntities) {
		if (entity.object3D) {
			entity.object3D.visible = false;
		}
	}

	// Create narrative state entity
	const narrEntity = world.createEntity();
	narrEntity.addComponent(NarrativeState, {
		stateIndex: 0,
		targetStateIndex: 0,
		transitionProgress: 1,
		transitionSpeed: 0.8,
		maxStates: 3,
	});

	// Create portal ring
	const ringMesh = createPortalRingMesh(colorHex);
	const ringEntity = world.createTransformEntity(ringMesh);
	const ringPos = ringEntity.getVectorView(Transform, 'position');
	ringPos[0] = 0;
	ringPos[1] = 0;
	ringPos[2] = -1.5;
	ringEntity.addComponent(PortalRing, {
		radius: 0.5,
		proximity: 0,
		activationRadius: 2.5,
		triggerDistance: 0.6,
		pulsePhase: 0,
	});

	// Reposition camera to face the ring
	world.camera.position.set(0, 0, 0);

	// Crystal decorations — floating around the ring
	const crystalPositions = [
		[-1.2, 0.3, -2.5], [1.2, 0.8, -2.5], [0, 1.2, -3.0],
		[-1.8, 0.6, -3.5], [1.8, 0.2, -3.0],
	];

	const crystalColors = [colorHex, '#4fc3f7', '#b5ead7', '#ce93d8'];

	crystalPositions.forEach((pos, i) => {
		const colorIdx = i % crystalColors.length;
		const mesh = createCrystalMesh(crystalColors[colorIdx], 0.8 + Math.random() * 0.4);
		const entity = world.createTransformEntity(mesh);
		const p = entity.getVectorView(Transform, 'position');
		p[0] = pos[0]; p[1] = pos[1]; p[2] = pos[2];

		entity.addComponent(InteriorDecoration, {
			decoType: 'crystal',
			floatPhase: Math.random() * Math.PI * 2,
			floatSpeed: 0.8 + Math.random() * 0.6,
			floatAmp: 0.03 + Math.random() * 0.04,
			baseY: pos[1],
			spawnDelay: 0.5 + i * 0.15,  // stagger materialization
			materialized: 0,
		});

		// Spatial audio — each crystal emits a tone at its position
		// Pitches form a pentatonic cluster: C, D, E, G, A (offset by crystal index)
		const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00]; // C4, D4, E4, G4, A4
		const freq = pentatonic[i % pentatonic.length];
		// Generate a short sine wave buffer as DataAudio URL
		// AudioSource expects a file path, but we can use a data URI
		const audioPath = generateToneWAV(freq, 2.0);
		entity.addComponent(AudioSource, {
			src: audioPath,
			positional: true,
			loop: true,
			autoplay: true,
			volume: 0.08,
			refDistance: 0.8,
			rolloffFactor: 2.0,
			maxDistance: 8.0,
			distanceModel: 'inverse',
			playbackMode: PlaybackMode.Overlap,
		});
	});

	// Pillars — structural elements
	const pillarCount = 4;
	for (let i = 0; i < pillarCount; i++) {
		const angle = (i / pillarCount) * Math.PI * 2;
		const r = 1.8;
		const px = Math.cos(angle) * r;
		const pz = Math.sin(angle) * r - 1.5;
		const py = -0.5;

		const mesh = createPillarMesh(colorHex, 2.0 + Math.random() * 0.5);
		const entity = world.createTransformEntity(mesh);
		const p = entity.getVectorView(Transform, 'position');
		p[0] = px; p[1] = py; p[2] = pz;

		entity.addComponent(InteriorDecoration, {
			decoType: 'pillar',
			floatPhase: Math.random() * Math.PI * 2,
			floatSpeed: 0.3 + Math.random() * 0.2,
			floatAmp: 0.01,
			baseY: py,
			spawnDelay: 1.2 + i * 0.2,
			materialized: 0,
		});
	}

	// Switch mode
	const modeEntity = world.query({ required: [WorldMode] }).iterate().next().value;
	if (modeEntity) {
		modeEntity.setValue(WorldMode, 'mode', 'interior');
		modeEntity.setValue(WorldMode, 'cinematicTimer', 0);
	}

	// Dispatch event for Svelte layer
	window.dispatchEvent(new CustomEvent('portal-interior-ready', { detail: { portalId } }));
}

// ─── Interior Teardown ──────────────────────────────────────────────
function teardownInterior(world) {
	// Find and destroy interior entities
	const toDestroy = [];
	for (const entity of world.query({ required: [Transform] }).iterate()) {
		if (entity.hasComponent(NarrativeState) ||
			entity.hasComponent(PortalRing) ||
			entity.hasComponent(InteriorDecoration)) {
			toDestroy.push(entity);
		}
	}
	toDestroy.forEach((e) => e.dispose());

	// Make index entities visible again
	for (const entity of world.query({ required: [PortalGate, TabLayout] }).iterate()) {
		if (entity.object3D) {
			entity.object3D.visible = true;
		}
		entity.setValue(PortalGate, 'state', 'idle');
		entity.setValue(PortalGate, 'focusTimer', 0);
	}
}

// ─── Cleanup ────────────────────────────────────────────────────────
export function destroyPortalWorld(world) {
	if (world?.renderer) {
		world.renderer.dispose();
		world.renderer.domElement?.remove();
	}
}
