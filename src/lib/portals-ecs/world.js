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

	const torusGeo = new THREE.TorusGeometry(0.8, 0.05, 16, 64);
	const torusMat = new THREE.MeshBasicMaterial({
		color, transparent: true, opacity: 1,
	});
	const torus = new THREE.Mesh(torusGeo, torusMat);
	group.add(torus);

	const membraneGeo = new THREE.CircleGeometry(0.78, 64);
	const membraneMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color(colorHex).multiplyScalar(0.5),
		transparent: true, opacity: 0.25, side: THREE.DoubleSide,
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
	const mat = new THREE.MeshBasicMaterial({
		color, transparent: true, opacity: 0,
	});
	return new THREE.Mesh(geo, mat);
}

function createPillarMesh(colorHex, height = 2.0) {
	const color = new THREE.Color(colorHex);
	const geo = new THREE.BoxGeometry(0.08, height, 0.08);
	const mat = new THREE.MeshBasicMaterial({
		color: color.clone().multiplyScalar(0.5),
		transparent: true, opacity: 0,
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
// ─── Emergency DOM debug (no Svelte dependency) ─────────────────────
function domDebug(msg) {
	console.log('[DEBUG]', msg);
	let el = document.getElementById('ecs-emergency-debug');
	if (!el) {
		el = document.createElement('div');
		el.id = 'ecs-emergency-debug';
		el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:100001;background:rgba(0,0,0,0.9);color:#0f0;font-family:monospace;font-size:11px;padding:8px;border:2px solid #0f0;max-height:50vh;overflow-y:auto;pointer-events:none;white-space:pre-wrap;';
		document.body.appendChild(el);
	}
	const line = document.createElement('div');
	line.textContent = msg;
	el.appendChild(line);
}

export async function initPortalWorld(container, { portals, galaxies, featuredPortalId }) {
	domDebug('=== initPortalWorld START ===');
	domDebug('portals count: ' + (portals?.length ?? 'undefined'));
	domDebug('galaxies count: ' + (galaxies?.length ?? 'undefined'));
	domDebug('featuredPortalId: ' + (featuredPortalId ?? 'undefined'));
	if (portals?.length > 0) {
		domDebug('portal[0] id: ' + portals[0].id + ', name: ' + (portals[0].name_es || portals[0].name_en));
	}

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

	// Position camera for spatial browsing
	world.camera.position.set(0, 0, 1.2);
	world.camera.lookAt(0, 0, 0);

	// Scene background — not pure black so objects are distinguishable
	world.scene.background = new THREE.Color(0x0a0a12);


	// Lighting — shared between modes, NarrativeSystem takes over in interior
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
	world.scene.add(ambientLight);
	const keyLight = new THREE.DirectionalLight(0xfff5e6, 0.6);
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
	world.registerSystem(PortalInputSystem, { priority: -5 });
	world.registerSystem(FocusHoldSystem, { priority: -4 });
	world.registerSystem(CrystalInteractionSystem, { priority: -4 });
	world.registerSystem(TabSystem, { priority: -3 });
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

	// ── 7. Bumper handled by HTML overlay in Svelte — no ECS bumper entity ──

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
		domDebug('onBumperComplete callback entered');
		// HTML bumper already played in Svelte overlay before ECS boot.
		// Auto-enter featured portal immediately.
		const targetId = featuredPortalId || (portals[0] && portals[0].id);
		domDebug('onBumperComplete targetId: ' + (targetId ?? 'NONE'));
		if (targetId) {
				domDebug('Scheduling buildInterior in 300ms...');
				setTimeout(() => {
					domDebug('setTimeout fired, calling buildInterior...');
					buildInterior(world, portalEntities, targetId, ambientLight, keyLight, portals.find(p => p.id === targetId), modeEntity);
				}, 300);
		} else {
			domDebug('WARNING: No targetId - buildInterior will NOT be called');
		}
	};

	world.globals.onPortalEnter = (portalId) => {
		window.dispatchEvent(new CustomEvent('portal-enter', { detail: { portalId } }));
		// Build interior after a short delay for the fade
		setTimeout(() => buildInterior(world, portalEntities, portalId, ambientLight, keyLight, portals.find(p => p.id === portalId), modeEntity), 100);
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
function buildInterior(world, portalEntities, portalId, ambientLight, keyLight, portalData, modeEntity) {
	domDebug('buildInterior START, portalId: ' + portalId);
	domDebug('portalEntities count: ' + portalEntities.length);
	domDebug('portalData: ' + (portalData ? JSON.stringify({id: portalData.id, name: portalData.name_es, color: portalData.color_primary}) : 'NULL'));

	const portal = portalEntities.find((e) => e.getValue(PortalGate, 'portalId') === portalId);
	if (!portal) {
		domDebug('FAILED: portal entity not found for id: ' + portalId);
		domDebug('Available portal ids: ' + portalEntities.map(e => e.getValue(PortalGate, 'portalId')).join(', '));
		return;
	}
	domDebug('Portal entity found OK');

	// Get color from raw portal data (more reliable than extracting from ECS component)
	const rawColor = portalData?.color_primary || '#c9a87c';
	const colorHex = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;

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
	ringPos[2] = -2.0;
	ringEntity.addComponent(PortalRing, {
		radius: 0.5,
		proximity: 0,
		activationRadius: 2.5,
		triggerDistance: 0.6,
		pulsePhase: 0,
	});

	// ── Backdrop image from Cloudflare Images ──
	// Image ID stored in portal metadata as scene_image or backdrop_image_id
	// URL pattern: https://imagedelivery.net/<hash>/<image_id>/<variant>
	const CF_IMAGES_HASH = '4bRSwPonOXfEIBVZiDXg0w';
	const imageId = portalData?.scene_image || portalData?.backdrop_image_id;
	if (imageId) {
		const imageUrl = `https://imagedelivery.net/${CF_IMAGES_HASH}/${imageId}/cover`;
		const loader = new THREE.TextureLoader();
		loader.crossOrigin = 'anonymous';
		loader.load(imageUrl, (texture) => {
			texture.colorSpace = THREE.SRGBColorSpace;
			const aspect = texture.image.width / texture.image.height;
			const geo = new THREE.PlaneGeometry(3 * aspect, 3);
			const mat = new THREE.MeshBasicMaterial({
				map: texture,
				transparent: true,
				opacity: 0, // starts invisible, EntryCinematicSystem fades in via InteriorDecoration
				side: THREE.DoubleSide,
				depthWrite: false,
			});
			const backdrop = new THREE.Mesh(geo, mat);
			backdrop.position.set(0, 0, -3.5);
			world.scene.add(backdrop);

			// Register as interior decoration so EntryCinematicSystem handles materialization
			const backdropEntity = world.createTransformEntity(backdrop);
			backdropEntity.addComponent(InteriorDecoration, {
				decoType: 'backdrop',
				floatPhase: 0,
				floatSpeed: 0.1,
				floatAmp: 0.005,
				baseY: 0,
				spawnDelay: 0.2, // appears first, before the ring
				materialized: 0,
			});
		}, undefined, (err) => {
			console.warn('[portals-ecs] Backdrop image failed to load:', imageUrl, err);
		});
	} else {
		// No image — subtle gradient backdrop using portal color
		const gradGeo = new THREE.PlaneGeometry(6, 4);
		const gradMat = new THREE.ShaderMaterial({
			transparent: true,
			opacity: 0,
			depthWrite: false,
			side: THREE.DoubleSide,
			uniforms: {
				uColor: { value: new THREE.Color(colorHex) },
			},
			vertexShader: `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform vec3 uColor;
				varying vec2 vUv;
				void main() {
					float d = length(vUv - vec2(0.5, 0.5));
					float alpha = smoothstep(0.8, 0.1, d) * 0.35;
					gl_FragColor = vec4(uColor * 1.5, alpha);
				}
			`,
		});
		const gradMesh = new THREE.Mesh(gradGeo, gradMat);
		gradMesh.position.set(0, 0, -3.5);
		world.scene.add(gradMesh);

		const gradEntity = world.createTransformEntity(gradMesh);
		gradEntity.addComponent(InteriorDecoration, {
			decoType: 'backdrop',
			floatPhase: 0,
			floatSpeed: 0.05,
			floatAmp: 0.002,
			baseY: 0,
			spawnDelay: 0.2,
			materialized: 0,
		});
	}

	// Reposition camera to face the ring
	world.camera.position.set(0, 0.3, 0.5);
	world.camera.lookAt(0, 0, -1.5);

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

	// Switch mode (modeEntity passed directly from initPortalWorld)
	console.log('[2] modeEntity:', !!modeEntity, 'setting mode to interior');
	window.dispatchEvent(new CustomEvent('portal-debug', { detail: '[2] modeEntity: ' + (!!modeEntity) }));
	if (modeEntity) {
		modeEntity.setValue(WorldMode, 'mode', 'interior');
		modeEntity.setValue(WorldMode, 'cinematicTimer', 0);
	} else {
		console.error('[portals-ecs] buildInterior: modeEntity is null!');
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
