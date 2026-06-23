/**
 * Bottle AR World — IWSDK ImmersiveAR integration for ArbootyAR
 *
 * Boots IWSDK ImmersiveAR with:
 *  - Bottle markers as floating 3D crystals around the user
 *  - Screen raycast for tap-to-select
 *  - Anchored placement for stability
 *  - Capture via same backend API
 *
 * Browser-only. Dynamically imported by ArbootyAR.svelte.
 */

import {
	World,
	SessionMode,
	ReferenceSpaceType,
	Transform,
	EnvironmentRaycastTarget,
	RaycastSpace,
	XRAnchor,
} from '@iwsdk/core';
import { Types } from 'elics';
import * as THREE from 'three';

// ─── Custom component: bottle metadata ────────────────────────
const BottleMarker = {
	bottleId: { type: Types.String, default: '' },
	bottleTitle: { type: Types.String, default: '' },
	state: { type: Types.Enum, enum: { Idle: 0, Selected: 1, Captured: 2 }, default: 0 },
	spin: { type: Types.Float32, default: 0.5 },
	bobPhase: { type: Types.Float32, default: 0 },
};

// ─── Mesh factory: crystal bottle ─────────────────────────────
const CRYSTAL_COLORS = [
	0xc9a87c, 0x4fc3f7, 0xb5ead7, 0xce93d8,
	0xfff59d, 0xffab91, 0x80cbc4, 0xf48fb1,
];

function createCrystalMesh(colorIndex = 0) {
	const color = CRYSTAL_COLORS[colorIndex % CRYSTAL_COLORS.length];
	const group = new THREE.Group();

	// Core octahedron
	const coreGeo = new THREE.OctahedronGeometry(0.04, 0);
	const coreMat = new THREE.MeshStandardMaterial({
		color,
		metalness: 0.4,
		roughness: 0.3,
		emissive: color,
		emissiveIntensity: 0.2,
		transparent: true,
		opacity: 0.88,
	});
	group.add(new THREE.Mesh(coreGeo, coreMat));

	// Wireframe shell
	const shellGeo = new THREE.OctahedronGeometry(0.065, 0);
	const shellMat = new THREE.MeshBasicMaterial({
		color,
		wireframe: true,
		transparent: true,
		opacity: 0.25,
	});
	group.add(new THREE.Mesh(shellGeo, shellMat));

	// Glow ring (horizontal)
	const ringGeo = new THREE.RingGeometry(0.05, 0.07, 24);
	const ringMat = new THREE.MeshBasicMaterial({
		color,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.3,
	});
	const ring = new THREE.Mesh(ringGeo, ringMat);
	ring.rotation.x = -Math.PI / 2;
	ring.position.y = -0.05;
	group.add(ring);

	return group;
}

// ─── Init ─────────────────────────────────────────────────────

export async function initBottleAR(container, { bottles, portalConfig }) {
	const accentColor = portalConfig?.color_primary || '#c9a87c';

	// ── 1. Create World ──
	const world = await World.create(container, {
		xr: {
			sessionMode: SessionMode.ImmersiveAR,
			referenceSpace: {
				type: ReferenceSpaceType.LocalFloor,
				fallbackOrder: [ReferenceSpaceType.Local, ReferenceSpaceType.Viewer],
			},
			features: {
				anchors: true,
				hitTest: true,
				planeDetection: false,
				lightEstimation: true,
			},
			offer: 'none',
		},
		render: {
			defaultLighting: false,
			fov: 70,
			near: 0.01,
			far: 50,
		},
		features: {
			locomotion: false,
			grabbing: false,
			physics: false,
			environmentRaycast: true,
			camera: false,
			spatialUI: false,
		},
	});

	// ── 2. Lighting ──
	world.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
	const dir = new THREE.DirectionalLight(0xffffff, 0.7);
	dir.position.set(0.5, 1, 0.3);
	world.scene.add(dir);

	// ── 3. State ──
	const state = {
		world,
		bottleEntities: [],
		isInAR: false,
		selectedBottle: null,
		placedCount: 0,
		onSelect: null,    // callback(bottle | null)
		onCapture: null,   // callback(bottle) → returns promise
		onARStart: null,
		onAREnd: null,
		_closed: false,
	};

	// ── 4. Enter AR ──
	state.enterAR = async () => {
		const { launchXR } = await import('@iwsdk/core');
		launchXR(world, {
			sessionMode: SessionMode.ImmersiveAR,
			referenceSpace: {
				type: ReferenceSpaceType.LocalFloor,
				fallbackOrder: [ReferenceSpaceType.Local, ReferenceSpaceType.Viewer],
			},
			features: {
				anchors: true,
				hitTest: true,
				lightEstimation: true,
			},
		});
		state.isInAR = true;
		if (state.onARStart) state.onARStart();

		// Spawn bottle crystals around user
		const available = bottles.filter(b => !b.found_by);
		const count = available.length;

		available.forEach((bottle, i) => {
			const angle = (i / Math.max(count, 1)) * Math.PI * 2 + Math.random() * 0.3;
			const radius = 1.2 + Math.random() * 1.5; // 1.2-2.7m
			const height = 0.3 + Math.random() * 0.6; // 0.3-0.9m

			const mesh = createCrystalMesh(i);
			mesh.position.set(
				Math.cos(angle) * radius,
				height,
				Math.sin(angle) * radius,
			);

			const entity = world.createTransformEntity(mesh);
			entity.addComponent(BottleMarker, {
				bottleId: bottle.id,
				bottleTitle: bottle.title || '',
				state: 0,
				spin: 0.3 + Math.random() * 0.4,
				bobPhase: i * 0.8,
			});
			entity.addComponent(XRAnchor);

			state.bottleEntities.push({ entity, bottle });
		});

		// Start animation loop
		animateBottles();
	};

	// ── 5. Animation ──
	let animId = null;
	function animateBottles() {
		if (state._closed) return;
		const t = performance.now() * 0.001;

		for (const { entity, bottle } of state.bottleEntities) {
			const obj = entity.object3D;
			if (!obj) continue;
			const markerState = entity.getValue(BottleMarker, 'state');
			if (markerState === 2) continue; // captured

			const spin = entity.getValue(BottleMarker, 'spin');
			const phase = entity.getValue(BottleMarker, 'bobPhase');
			obj.rotation.y += spin * 0.016;
			obj.position.y += Math.sin(t * 1.2 + phase) * 0.0004;
		}

		animId = requestAnimationFrame(animateBottles);
	}

	// ── 6. Tap-to-select (screen raycast) ──
	// We use a simple approach: raycast from camera through screen center
	// on each pointer event, check intersection with bottle meshes.
	state.handleTap = (clientX, clientY) => {
		if (!state.isInAR) return;

		// Use screen-space distance: find bottle closest to tap point
		const camera = world.camera;
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();

		const rect = world.renderer.domElement.getBoundingClientRect();
		mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

		raycaster.setFromCamera(mouse, camera);

		const meshes = state.bottleEntities
			.filter(b => entity_getState(b) !== 2)
			.map(b => b.entity.object3D)
			.filter(Boolean);

		const intersects = raycaster.intersectObjects(meshes, true);

		if (intersects.length > 0) {
			// Find which bottle this mesh belongs to
			let hitObj = intersects[0].object;
			while (hitObj && !hitObj.userData.bottleRef) {
				hitObj = hitObj.parent;
			}
			if (hitObj?.userData.bottleRef) {
				selectBottle(hitObj.userData.bottleRef);
				return;
			}
		}

		// No hit — deselect
		selectBottle(null);
	};

	function entity_getState(b) {
		try { return b.entity.getValue(BottleMarker, 'state'); } catch { return 2; }
	}

	function selectBottle(bottleEntry) {
		// Clear previous selection
		if (state.selectedBottle) {
			const prev = state.selectedBottle.entity;
			try { prev.setValue(BottleMarker, 'state', 0); } catch {}
			// Reset scale
			if (prev.object3D) prev.object3D.scale.setScalar(1);
		}

		state.selectedBottle = bottleEntry;

		if (bottleEntry) {
			try { bottleEntry.entity.setValue(BottleMarker, 'state', 1); } catch {}
			// Enlarge selected
			if (bottleEntry.entity.object3D) {
				bottleEntry.entity.object3D.scale.setScalar(1.4);
			}
		}

		if (state.onSelect) {
			state.onSelect(bottleEntry ? bottleEntry.bottle : null);
		}
	}

	// Tag meshes with bottle refs for raycast lookup
	// (done after entity creation in enterAR, but we need to wire userData)
	// We'll do it in a microtask after entities are created
	setTimeout(() => {
		for (const entry of state.bottleEntities) {
			if (entry.entity.object3D) {
				entry.entity.object3D.traverse(child => {
					child.userData.bottleRef = entry;
				});
			}
		}
	}, 100);

	// ── 7. Capture selected bottle ──
	state.captureSelected = async () => {
		if (!state.selectedBottle) return null;
		const { entity, bottle } = state.selectedBottle;

		try { entity.setValue(BottleMarker, 'state', 2); } catch {}

		// Shrink and fade
		if (entity.object3D) {
			entity.object3D.visible = false;
		}

		return bottle;
	};

	// ── 8. Exit AR ──
	state.exitAR = () => {
		if (animId) cancelAnimationFrame(animId);
		if (world.xrSession) world.exitXR();
		state.isInAR = false;
		if (state.onAREnd) state.onAREnd();
	};

	// Session end listener
	if (world.addEventListener) {
		world.addEventListener('xrsessionend', () => {
			state.isInAR = false;
			if (animId) cancelAnimationFrame(animId);
			if (state.onAREnd) state.onAREnd();
		});
	}

	return state;
}

// ─── Cleanup ──────────────────────────────────────────────────

export function destroyBottleAR(state) {
	if (!state) return;
	state._closed = true;
	if (state.world?.renderer) {
		state.world.renderer.dispose();
		state.world.renderer.domElement?.remove();
	}
}
