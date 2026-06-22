/**
 * World Initialization — Portals Page ECS World
 *
 * Boots the IWSDK World in non-immersive mode, registers all custom
 * components and systems, then creates entities from SSR portal data.
 *
 * This module is browser-only. It must be dynamically imported from a
 * Svelte component running in onMount/$effect (client-side).
 *
 * Lifecycle:
 *   1. World.create() → renderer, scene, camera, core systems
 *   2. registerComponent() for each custom component
 *   3. registerSystem() with priorities
 *   4. createEntities() from D1 portal data
 *   5. Bumper plays once → tabs idle → user interaction begins
 *   6. On portal enter: world.launchXR()
 */

import { World, SessionMode, Transform } from '@iwsdk/core';
import * as THREE from 'three';
import {
	PortalGate,
	TabLayout,
	BumperPhase,
	ReactiveBackground,
	AmbientParticle,
	CarouselSlide,
} from './components.js';
import {
	TabSystem,
	BumperSystem,
	BackgroundSystem,
	ParticleSystem,
	CarouselSystem,
	PortalInputSystem,
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
	const geo = new THREE.BoxGeometry(0.12, 0.08, 0.01);
	const color = new THREE.Color(colorPrimary);
	const mat = new THREE.MeshStandardMaterial({
		color: 0x222226,
		emissive: color,
		emissiveIntensity: 0.05,
		metalness: 0.3,
		roughness: 0.6,
		transparent: true,
		opacity: 0.92,
	});
	return new THREE.Mesh(geo, mat);
}

// ─── Carousel mesh factory ──────────────────────────────────────────
function createCarouselMesh() {
	const geo = new THREE.PlaneGeometry(2.0, 1.125); // 16:9
	const mat = new THREE.MeshBasicMaterial({
		color: 0x111114,
		transparent: true,
		opacity: 0,
		side: THREE.DoubleSide,
	});
	return new THREE.Mesh(geo, mat);
}

// ─── Main initialization ────────────────────────────────────────────
export async function initPortalWorld(container, { portals, galaxies }) {
	// ── 1. Create World in non-immersive mode ──
	const world = await World.create(container, {
		xr: {
			sessionMode: SessionMode.ImmersiveAR,
			features: { anchors: true, hitTest: true },
		},
		features: {
			locomotion: false,
			grabbing: false,
			physics: false,
		},
	});

	// Position camera for a desktop reading view of the spatial UI
	world.camera.position.set(0, 0, 1.2);
	world.camera.lookAt(0, 0, 0);

	// Lighting
	world.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
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

	// ── 3. Globals — callbacks for the Svelte layer ──
	world.globals.onPortalFocus = null;
	world.globals.onCarouselAdvance = null;
	world.globals.onBumperComplete = null;
	world.globals.locale = typeof document !== 'undefined'
		? (document.documentElement.lang || 'es')
		: 'es';
	world.globals.launchPortal = (portalId) => {
		// Find the portal entity and enter XR
		// In production: world.loadLevel(`/glxf/${portalId}.glxf`) then launchXR
		console.log(`[portals-ecs] Launching portal: ${portalId}`);
		world.launchXR?.();
	};

	// ── 4. Register systems by priority ──
	world.registerSystem(PortalInputSystem, { priority: -5 });
	world.registerSystem(TabSystem, { priority: -3 });
	world.registerSystem(BumperSystem, { priority: 0 });
	world.registerSystem(CarouselSystem, { priority: 0 });
	world.registerSystem(BackgroundSystem, { priority: 1 });
	world.registerSystem(ParticleSystem, { priority: 2 });

	// ── 5. Create background entity ──
	const bgEntity = world.createEntity();
	bgEntity.addComponent(ReactiveBackground);

	// ── 6. Create bumper entity (runs once) ──
	const bumperEntity = world.createEntity();
	bumperEntity.addComponent(BumperPhase, {
		phase: 'converge',
		elapsed: 0,
		duration: 2.5,
	});

	// ── 7. Create ambient particles ──
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

	// ── 8. Create portal tab entities ──
	const RAIL_X = -0.85; // left edge of viewport
	const RAIL_Y_START = 0.35;
	const RAIL_SPACING = 0.1;

	// Build galaxy group indices
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

	// ── 9. Create carousel slide entities (portals with video) ──
	const carouselPortals = portals.filter((p) => p.video_url);
	const carouselY = 0.25;

	carouselPortals.forEach((portal, i) => {
		const mesh = createCarouselMesh();
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

	// ── 10. Wire Svelte-facing callbacks ──
	// When carousel advances, update Svelte overlay text
	world.globals.onCarouselAdvance = (portalId) => {
		window.dispatchEvent(new CustomEvent('portal-carousel', { detail: { portalId } }));
	};

	// When a tab is focused, update Svelte overlay + background
	world.globals.onPortalFocus = (portalId) => {
		window.dispatchEvent(new CustomEvent('portal-focus', { detail: { portalId } }));
	};

	// When bumper completes, reveal the Svelte content overlay
	world.globals.onBumperComplete = () => {
		window.dispatchEvent(new CustomEvent('portal-bumper-done'));
	};

	return { world, portalEntities };
}

// ─── Cleanup ────────────────────────────────────────────────────────
export function destroyPortalWorld(world) {
	// Entities self-clean via TransformSystem; systems clean up via cleanupFuncs
	if (world?.renderer) {
		world.renderer.dispose();
		world.renderer.domElement?.remove();
	}
}
