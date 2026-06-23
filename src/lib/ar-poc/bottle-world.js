/**
 * Bottle AR World — IWSDK ImmersiveAR integration for ArbootyAR
 *
 * Boots IWSDK ImmersiveAR with:
 *  - Bottle markers as floating 3D crystals around the user
 *  - Screen raycast for tap-to-select
 *  - Anchored placement for stability
 *  - Capture via same backend API
 *  - Immersive decorations: ground halo, ambient particles, light pillars, energy spiral
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
import { Types, createSystem } from 'elics';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════
// ECS COMPONENTS
// ═══════════════════════════════════════════════════════════════

// Bottle functional marker
const BottleMarker = {
	bottleId: { type: Types.String, default: '' },
	bottleTitle: { type: Types.String, default: '' },
	state: { type: Types.Enum, enum: { Idle: 0, Selected: 1, Captured: 2 }, default: 0 },
	spin: { type: Types.Float32, default: 0.5 },
	bobPhase: { type: Types.Float32, default: 0 },
};

// Ambient particle (dust mote / firefly)
const AmbientParticle = {
	velocityX: { type: Types.Float32, default: 0 },
	velocityY: { type: Types.Float32, default: 0.01 },
	velocityZ: { type: Types.Float32, default: 0 },
	lifespan: { type: Types.Float32, default: 0 },
	age: { type: Types.Float32, default: 0 },
	baseY: { type: Types.Float32, default: 0 },
	baseX: { type: Types.Float32, default: 0 },
	baseZ: { type: Types.Float32, default: 0 },
	phase: { type: Types.Float32, default: 0 },
};

// Light pillar (vertical beam from ground)
const LightPillar = {
	height: { type: Types.Float32, default: 2.0 },
	pulsePhase: { type: Types.Float32, default: 0 },
	pulseSpeed: { type: Types.Float32, default: 0.5 },
	color: { type: Types.Float32, default: 0 }, // index into palette
};

// Energy spiral (rotating ring of small spheres)
const EnergySpiral = {
	radius: { type: Types.Float32, default: 0.5 },
	speed: { type: Types.Float32, default: 0.3 },
	count: { type: Types.Int32, default: 8 },
	tilt: { type: Types.Float32, default: 0 },
	phase: { type: Types.Float32, default: 0 },
};

// Ground halo (ring beneath user)
const GroundHalo = {
	pulsePhase: { type: Types.Float32, default: 0 },
	pulseSpeed: { type: Types.Float32, default: 0.4 },
};

// Portal tab — floating navigation card for another portal
const PortalTab = {
	portalId: { type: Types.String, default: '' },
	portalName: { type: Types.String, default: '' },
	portalIcon: { type: Types.String, default: '🌐' },
	colorHex: { type: Types.Float32, default: 0xc9a87c },
	angle: { type: Types.Float32, default: 0 },
	radius: { type: Types.Float32, default: 2.5 },
	height: { type: Types.Float32, default: 1.2 },
	spin: { type: Types.Float32, default: 0.1 },
	bobPhase: { type: Types.Float32, default: 0 },
	isSelected: { type: Types.Boolean, default: false },
};

// ═══════════════════════════════════════════════════════════════
// ECS SYSTEMS
// ═══════════════════════════════════════════════════════════════

// Animate bottles: spin + bob
const BottleAnimationSystem = createSystem(
	{ bottles: { required: [Transform, BottleMarker] } },
	{
		update(delta, time) {
			for (const entity of this.queries.bottles.iterate()) {
				const markerState = entity.getValue(BottleMarker, 'state');
				if (markerState === 2) continue;

				const obj = entity.object3D;
				if (!obj) continue;

				const spin = entity.getValue(BottleMarker, 'spin');
				const phase = entity.getValue(BottleMarker, 'bobPhase');

				obj.rotation.y += spin * delta;
				obj.rotation.x += spin * delta * 0.3;

				// Bob via vector view (Transform-safe)
				const pos = entity.getVectorView(Transform, 'position');
				pos[1] += Math.sin(time * 0.0012 + phase) * 0.0003;

				// Selected bottles pulse
				if (markerState === 1) {
					const pulse = 1.4 + Math.sin(time * 0.005) * 0.15;
					obj.scale.setScalar(pulse);
				}
			}
		},
	},
);

// Animate ambient particles: drift, sway, recycle
const ParticleAnimationSystem = createSystem(
	{ particles: { required: [Transform, AmbientParticle] } },
	{
		update(delta, time) {
			for (const entity of this.queries.particles.iterate()) {
				const obj = entity.object3D;
				if (!obj) continue;

				const vx = entity.getValue(AmbientParticle, 'velocityX');
				const vy = entity.getValue(AmbientParticle, 'velocityY');
				const vz = entity.getValue(AmbientParticle, 'velocityZ');
				const phase = entity.getValue(AmbientParticle, 'phase');
				const baseY = entity.getValue(AmbientParticle, 'baseY');

				const pos = entity.getVectorView(Transform, 'position');

				// Vertical drift
				pos[1] += vy * delta;
				// Horizontal sway
				pos[0] += Math.sin(time * 0.001 + phase) * delta * 0.008;
				pos[2] += Math.cos(time * 0.0007 + phase * 1.3) * delta * 0.006;

				// Age
				let age = entity.getValue(AmbientParticle, 'age') + delta;
				const lifespan = entity.getValue(AmbientParticle, 'lifespan');

				if (lifespan > 0 && age > lifespan) {
					// Recycle: reset to base position
					pos[1] = baseY;
					age = 0;
				}

				entity.setValue(AmbientParticle, 'age', age);

				// Fade based on age
				if (obj.material && lifespan > 0) {
					const lifeRatio = age / lifespan;
					obj.material.opacity = 0.6 * (1 - lifeRatio * lifeRatio);
				}
			}
		},
	},
);

// Animate light pillars: pulse opacity
const PillarAnimationSystem = createSystem(
	{ pillars: { required: [Transform, LightPillar] } },
	{
		update(delta, time) {
			for (const entity of this.queries.pillars.iterate()) {
				const obj = entity.object3D;
				if (!obj) continue;

				const phase = entity.getValue(LightPillar, 'pulsePhase');
				const speed = entity.getValue(LightPillar, 'pulseSpeed');

				// Pulse opacity
				const pulse = 0.5 + Math.sin(time * 0.001 * speed + phase) * 0.3;
				obj.traverse(child => {
					if (child.material) child.material.opacity = pulse;
				});
			}
		},
	},
);

// Animate energy spirals: rotate + bob
const SpiralAnimationSystem = createSystem(
	{ spirals: { required: [Transform, EnergySpiral] } },
	{
		update(delta, time) {
			for (const entity of this.queries.spirals.iterate()) {
				const obj = entity.object3D;
				if (!obj) continue;

				const speed = entity.getValue(EnergySpiral, 'speed');
				const phase = entity.getValue(EnergySpiral, 'phase');
				const tilt = entity.getValue(EnergySpiral, 'tilt');

				obj.rotation.y += speed * delta;
				obj.rotation.z = Math.sin(time * 0.0005 + phase) * 0.15 + tilt;

				// Bob the whole spiral via vector view
				const pos = entity.getVectorView(Transform, 'position');
				pos[1] = 0.5 + Math.sin(time * 0.0008 + phase) * 0.1;
			}
		},
	},
);

// Animate ground halo: pulse + slow rotation
const HaloAnimationSystem = createSystem(
	{ halos: { required: [Transform, GroundHalo] } },
	{
		update(delta, time) {
			for (const entity of this.queries.halos.iterate()) {
				const obj = entity.object3D;
				if (!obj) continue;

				const phase = entity.getValue(GroundHalo, 'pulsePhase');
				const speed = entity.getValue(GroundHalo, 'pulseSpeed');

				obj.rotation.z += delta * 0.05;

				const pulse = 0.4 + Math.sin(time * 0.001 * speed + phase) * 0.25;
				obj.traverse(child => {
					if (child.material) child.material.opacity = pulse;
				});
			}
		},
	},
);

// Animate portal tabs: slow orbit + bob + face user
const PortalTabSystem = createSystem(
	{ tabs: { required: [Transform, PortalTab] } },
	{
		update(delta, time) {
			for (const entity of this.queries.tabs.iterate()) {
				const obj = entity.object3D;
				if (!obj) continue;

				const angle = entity.getValue(PortalTab, 'angle');
				const radius = entity.getValue(PortalTab, 'radius');
				const baseHeight = entity.getValue(PortalTab, 'height');
				const phase = entity.getValue(PortalTab, 'bobPhase');
				const spin = entity.getValue(PortalTab, 'spin');

				// Slowly orbit around user — via vector view (Transform-safe)
				const pos = entity.getVectorView(Transform, 'position');
				const t = time * 0.00005;
				const currentAngle = angle + t * spin * 10;
				pos[0] = Math.cos(currentAngle) * radius;
				pos[2] = Math.sin(currentAngle) * radius;
				pos[1] = baseHeight + Math.sin(time * 0.0008 + phase) * 0.05;

				// Face the user (origin)
				obj.lookAt(0, pos[1], 0);
			}
		},
	},
);

// ═══════════════════════════════════════════════════════════════
// MESH FACTORIES
// ═══════════════════════════════════════════════════════════════

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
		emissiveIntensity: 0.25,
		transparent: true,
		opacity: 0.9,
	});
	group.add(new THREE.Mesh(coreGeo, coreMat));

	// Wireframe shell
	const shellGeo = new THREE.OctahedronGeometry(0.065, 0);
	const shellMat = new THREE.MeshBasicMaterial({
		color,
		wireframe: true,
		transparent: true,
		opacity: 0.3,
	});
	group.add(new THREE.Mesh(shellGeo, shellMat));

	// Glow ring
	const ringGeo = new THREE.RingGeometry(0.05, 0.07, 24);
	const ringMat = new THREE.MeshBasicMaterial({
		color,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.35,
	});
	const ring = new THREE.Mesh(ringGeo, ringMat);
	ring.rotation.x = -Math.PI / 2;
	ring.position.y = -0.05;
	group.add(ring);

	return group;
}

function createAmbientParticleMesh(color) {
	const geo = new THREE.SphereGeometry(0.008, 6, 6);
	const mat = new THREE.MeshBasicMaterial({
		color,
		transparent: true,
		opacity: 0.5,
	});
	return new THREE.Mesh(geo, mat);
}

function createLightPillarMesh(color, height = 2.0) {
	const geo = new THREE.CylinderGeometry(0.015, 0.04, height, 12, 1, true);
	const mat = new THREE.MeshBasicMaterial({
		color,
		transparent: true,
		opacity: 0.4,
		side: THREE.DoubleSide,
		depthWrite: false,
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.y = height / 2;
	return mesh;
}

function createEnergySpiralMesh(color, count = 8, radius = 0.5) {
	const group = new THREE.Group();
	for (let i = 0; i < count; i++) {
		const angle = (i / count) * Math.PI * 2;
		const geo = new THREE.SphereGeometry(0.012, 8, 8);
		const mat = new THREE.MeshStandardMaterial({
			color,
			emissive: color,
			emissiveIntensity: 0.4,
			transparent: true,
			opacity: 0.7,
		});
		const mesh = new THREE.Mesh(geo, mat);
		mesh.position.set(
			Math.cos(angle) * radius,
			(i / count) * 0.3, // staircase up
			Math.sin(angle) * radius,
		);
		group.add(mesh);
	}
	return group;
}

function createGroundHaloMesh(color, radius = 0.8) {
	const group = new THREE.Group();

	// Outer ring
	const ringGeo = new THREE.RingGeometry(radius * 0.85, radius, 48);
	const ringMat = new THREE.MeshBasicMaterial({
		color,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.5,
		depthWrite: false,
	});
	group.add(new THREE.Mesh(ringGeo, ringMat));

	// Inner glow disc
	const discGeo = new THREE.CircleGeometry(radius * 0.85, 48);
	const discMat = new THREE.MeshBasicMaterial({
		color,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.06,
		depthWrite: false,
	});
	group.add(new THREE.Mesh(discGeo, discMat));

	// Dashed inner ring
	const dashGeo = new THREE.RingGeometry(radius * 0.5, radius * 0.55, 32);
	const dashMat = new THREE.MeshBasicMaterial({
		color,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.3,
		depthWrite: false,
	});
	group.add(new THREE.Mesh(dashGeo, dashMat));

	return group;
}

// ─── Portal tab mesh: canvas texture card ─────────────────
// ─── Text crystal: floating excerpt from writings ─────────
function createTextCrystalMesh(text, colorHex, scale = 1.0) {
	const canvas = document.createElement('canvas');
	canvas.width = 512;
	canvas.height = 256;
	const ctx = canvas.getContext('2d');

	// Transparent background with subtle glow
	ctx.fillStyle = 'rgba(0,0,0,0)';
	ctx.fillRect(0, 0, 512, 256);

	// Border frame
	const colorStr = '#' + colorHex.toString(16).padStart(6, '0');
	ctx.strokeStyle = colorStr;
	ctx.lineWidth = 2;
	ctx.strokeRect(8, 8, 496, 240);

	// Corner accents
	const cornerSize = 20;
	ctx.lineWidth = 3;
	[[8,8],[504,8],[8,248],[504,248]].forEach(([x,y]) => {
		ctx.beginPath();
		if (x < 256) { ctx.moveTo(x, y + (y < 128 ? 0 : -cornerSize)); ctx.lineTo(x, y); ctx.lineTo(x + cornerSize, y); }
		else { ctx.moveTo(x, y + (y < 128 ? 0 : -cornerSize)); ctx.lineTo(x, y); ctx.lineTo(x - cornerSize, y); }
		ctx.stroke();
	});

	// Text — wrap manually
	ctx.fillStyle = '#e5e5e5';
	ctx.font = '600 18px Georgia, serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	const words = text.split(' ');
	const lines = [];
	let line = '';
	const maxLineLen = 38;
	for (const w of words) {
		if ((line + ' ' + w).length > maxLineLen) { lines.push(line); line = w; }
		else { line = line ? line + ' ' + w : w; }
	}
	if (line) lines.push(line);
	const startY = 128 - (lines.length - 1) * 12;
	lines.slice(0, 6).forEach((l, i) => {
		ctx.fillText(l, 256, startY + i * 24);
	});

	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;
	const geo = new THREE.PlaneGeometry(0.3 * scale, 0.15 * scale);
	const mat = new THREE.MeshBasicMaterial({
		map: texture,
		transparent: true,
		side: THREE.DoubleSide,
		depthWrite: false,
	});
	const mesh = new THREE.Mesh(geo, mat);

	// Add a subtle crystal behind the text
	const crystalGeo = new THREE.OctahedronGeometry(0.04 * scale, 0);
	const crystalMat = new THREE.MeshStandardMaterial({
		color: colorHex,
		metalness: 0.3,
		roughness: 0.4,
		emissive: colorHex,
		emissiveIntensity: 0.15,
		transparent: true,
		opacity: 0.5,
	});
	const crystal = new THREE.Mesh(crystalGeo, crystalMat);
	crystal.position.z = -0.02;
	mesh.add(crystal);

	return mesh;
}

function createPortalTabMesh(icon, name, accentColor) {
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 128;
	const ctx = canvas.getContext('2d');

	// Background gradient
	const grad = ctx.createLinearGradient(0, 0, 0, 128);
	grad.addColorStop(0, '#1a1a24');
	grad.addColorStop(1, '#0d0d14');
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, 256, 128);

	// Accent border
	ctx.strokeStyle = accentColor;
	ctx.lineWidth = 3;
	ctx.strokeRect(2, 2, 252, 124);

	// Left accent bar
	ctx.fillStyle = accentColor;
	ctx.fillRect(2, 2, 6, 124);

	// Icon (emoji)
	ctx.font = '48px sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(icon || '🌐', 50, 64);

	// Portal name
	ctx.font = 'bold 22px sans-serif';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'left';
	const displayName = name.length > 12 ? name.slice(0, 11) + '…' : name;
	ctx.fillText(displayName, 90, 64);

	const texture = new THREE.CanvasTexture(canvas);
	texture.minFilter = THREE.LinearFilter;
	const geo = new THREE.PlaneGeometry(0.5, 0.25);
	const mat = new THREE.MeshBasicMaterial({
		map: texture,
		transparent: true,
		side: THREE.DoubleSide,
		depthWrite: false,
	});
	return new THREE.Mesh(geo, mat);
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════

export async function initBottleAR(container, { bottles, portalConfig, allPortals = [] }) {
	const accentColor = portalConfig?.color_primary || '#c9a87c';
	const accentHex = parseInt(accentColor.replace('#', ''), 16);
	const bgColor = portalConfig?.color_bg || '#1a1a2e';
	const bgHex = parseInt(bgColor.replace('#', ''), 16);

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

	// ── 2. Register custom components ──
	world.registerComponent(BottleMarker);
	world.registerComponent(AmbientParticle);
	world.registerComponent(LightPillar);
	world.registerComponent(EnergySpiral);
	world.registerComponent(GroundHalo);
	world.registerComponent(PortalTab);

	// ── 3. Register animation systems ──
	world.registerSystem(BottleAnimationSystem, { priority: 0 });
	world.registerSystem(ParticleAnimationSystem, { priority: 1 });
	world.registerSystem(PillarAnimationSystem, { priority: 1 });
	world.registerSystem(SpiralAnimationSystem, { priority: 1 });
	world.registerSystem(HaloAnimationSystem, { priority: 1 });
	world.registerSystem(PortalTabSystem, { priority: 1 });

	// ── 4. Lighting ──
	world.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
	const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
	keyLight.position.set(0.5, 1, 0.3);
	world.scene.add(keyLight);
	// Accent colored point light
	const accentLight = new THREE.PointLight(accentHex, 0.4, 3);
	accentLight.position.set(0, 0.5, 0);
	world.scene.add(accentLight);

	// ── 5. State ──
	const state = {
		world,
		bottleEntities: [],
		decorationEntities: [],
		isInAR: false,
		selectedBottle: null,
		placedCount: 0,
		onSelect: null,
		onCapture: null,
		onARStart: null,
		onAREnd: null,
		_closed: false,
	};

	// ── 6. Enter AR ──
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
			}
		});

		// Wait for XR session
		const deadline = performance.now() + 12000;
		while (!world.session && performance.now() < deadline) {
			await new Promise(r => setTimeout(r, 100));
		}

		if (!world.session) {
			console.warn('[bottle-world] XR session did not start');
			if (state.onAREnd) state.onAREnd();
			return;
		}

		state.isInAR = true;
		if (state.onARStart) state.onARStart();

		// ── Spawn ground halo at user's feet ──
		const haloMesh = createGroundHaloMesh(accentHex, 1.0);
		haloMesh.position.set(0, 0, 0);
		const haloEntity = world.createTransformEntity(haloMesh);
		haloEntity.addComponent(GroundHalo, {
			pulsePhase: 0,
			pulseSpeed: 0.4,
		});
		state.decorationEntities.push(haloEntity);

		// ── Spawn energy spirals (2, opposite sides) ──
		for (let s = 0; s < 2; s++) {
			const angle = s * Math.PI;
			const dist = 1.5;
			const spiralMesh = createEnergySpiralMesh(accentHex, 8, 0.35);
			spiralMesh.position.set(Math.cos(angle) * dist, 0.5, Math.sin(angle) * dist);
			const spiralEntity = world.createTransformEntity(spiralMesh);
			spiralEntity.addComponent(EnergySpiral, {
				radius: 0.35,
				speed: s === 0 ? 0.4 : -0.4,
				count: 8,
				tilt: s === 0 ? 0.1 : -0.1,
				phase: s * Math.PI,
			});
			spiralEntity.addComponent(XRAnchor);
			state.decorationEntities.push(spiralEntity);
		}

		// ── Spawn light pillars (3-5 around the space) ──
		const pillarCount = 4;
		for (let p = 0; p < pillarCount; p++) {
			const angle = (p / pillarCount) * Math.PI * 2 + Math.PI / pillarCount;
			const dist = 2.0 + Math.random() * 0.5;
			const height = 1.5 + Math.random() * 1.0;
			const pillarColor = CRYSTAL_COLORS[p % CRYSTAL_COLORS.length];

			const pillarMesh = createLightPillarMesh(pillarColor, height);
			pillarMesh.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

			const pillarEntity = world.createTransformEntity(pillarMesh);
			pillarEntity.addComponent(LightPillar, {
				height,
				pulsePhase: p * Math.PI / 2,
				pulseSpeed: 0.3 + Math.random() * 0.3,
				color: p,
			});
			pillarEntity.addComponent(XRAnchor);
			state.decorationEntities.push(pillarEntity);
		}

		// ── Spawn ambient particles (40 dust motes) ──
		const PARTICLE_COUNT = 40;
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			const angle = Math.random() * Math.PI * 2;
			const radius = 0.3 + Math.random() * 2.5;
			const height = Math.random() * 1.8;
			const baseX = Math.cos(angle) * radius;
			const baseY = height;
			const baseZ = Math.sin(angle) * radius;

			const particleColor = Math.random() > 0.5 ? accentHex : 0xffffff;
			const mesh = createAmbientParticleMesh(particleColor);
			mesh.position.set(baseX, baseY, baseZ);

			const entity = world.createTransformEntity(mesh);
			entity.addComponent(AmbientParticle, {
				velocityX: (Math.random() - 0.5) * 0.01,
				velocityY: 0.01 + Math.random() * 0.03,
				velocityZ: (Math.random() - 0.5) * 0.01,
				lifespan: 4 + Math.random() * 6,
				age: Math.random() * 4,
				baseY,
				baseX,
				baseZ,
				phase: Math.random() * Math.PI * 2,
			});
			state.decorationEntities.push(entity);
		}

		// ── Spawn bottle crystals ──
		const available = bottles.filter(b => !b.found_by);
		const count = available.length;

		available.forEach((bottle, i) => {
			const angle = (i / Math.max(count, 1)) * Math.PI * 2 + Math.random() * 0.3;
			const radius = 1.2 + Math.random() * 1.5;
			const height = 0.3 + Math.random() * 0.6;

			const mesh = createCrystalMesh(i);
			mesh.position.set(
				Math.cos(angle) * radius,
				elevation,
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

			// Tag for raycast lookup
			mesh.traverse(child => {
				child.userData.bottleRef = { entity, bottle };
			});

			state.bottleEntities.push({ entity, bottle });
		});

		// ── Spawn ambient text crystals from writings ──
		const sceneCrystals = sc.crystals || [];
		if (sceneCrystals.length > 0) {
			sceneCrystals.forEach((crystal, i) => {
				if (!crystal.text) return;
				const angle = (i / sceneCrystals.length) * Math.PI * 2 + 0.5;
				const radius = (layout.crystal_ring_radius ?? 1.5) + 0.8;
				const elevation = ((elevations[i % elevations.length] || 0.8) + 0.4);

				const textMesh = createTextCrystalMesh(
					crystal.text,
					colorPool[crystal.color_index || 0] || accentHex,
					crystal.scale || 1.0,
				);
				textMesh.position.set(
					Math.cos(angle) * radius,
					elevation,
					Math.sin(angle) * radius,
				);

				const textEntity = world.createTransformEntity(textMesh);
				textEntity.addComponent(BottleMarker, {
					bottleId: 'scene-text-' + i,
					bottleTitle: crystal.text,
					state: 0,
					spin: 0.15,
					bobPhase: i * 0.5,
				});
				textEntity.addComponent(XRAnchor);

				textMesh.traverse(child => {
					child.userData.bottleRef = {
						entity: textEntity,
						bottle: { id: 'scene-text-' + i, title: crystal.text, isSceneText: true }
					};
				});

				state.bottleEntities.push({
					entity: textEntity,
					bottle: { id: 'scene-text-' + i, title: crystal.text, isSceneText: true }
				});
			});
		}

		// ── Spawn portal tabs (floating navigation cards) ──
		const locale = document.documentElement.lang || 'es';
		const portalCount = allPortals.length;
		console.log(`[bottle-world] Spawning ${portalCount} portal tabs`);
		if (portalCount > 0) {
			// Arrange tabs in a front-facing arc (180°), not full ring
			const tabRadius = 2.0;
			const tabHeight = 1.4;
			const tabArc = Math.PI; // 180° arc in front of user
			const arcStart = -Math.PI / 2; // start from left

			allPortals.forEach((portal, i) => {
				const angle = arcStart + (i / Math.max(portalCount - 1, 1)) * tabArc;
				const colorHex = parseInt((portal.color_primary || '#c9a87c').replace('#', ''), 16);

				const name = locale === 'en' ? portal.name_en : locale === 'fr' ? portal.name_fr : portal.name_es;

				const tabMesh = createPortalTabMesh(
					portal.icon || '🌐',
					name || portal.id,
					portal.color_primary || '#c9a87c',
				);
				tabMesh.position.set(
					Math.cos(angle) * tabRadius,
					tabHeight + (i % 2) * 0.2,
					Math.sin(angle) * tabRadius,
				);

				const tabEntity = world.createTransformEntity(tabMesh);
				tabEntity.addComponent(PortalTab, {
					portalId: portal.id,
					portalName: name || portal.id,
					portalIcon: portal.icon || '🌐',
					colorHex: colorHex,
					angle,
					radius: tabRadius,
					height: tabHeight + (i % 2) * 0.2,
					spin: 0.02,
					bobPhase: i * 1.2,
					isSelected: false,
				});
				tabEntity.addComponent(XRAnchor);

				// Tag for tap navigation
				tabMesh.userData.portalRef = { portalId: portal.id, portalName: name };

				state.decorationEntities.push(tabEntity);
			});
		}

		// ── Start custom animation loop for non-ECS objects ──
		animateScene();
	};

	// ── 7. Non-ECS animation (accent light pulse) ──
	let animId = null;
	function animateScene() {
		if (state._closed) return;
		const t = performance.now() * 0.001;

		// Pulse the accent point light
		accentLight.intensity = 0.3 + Math.sin(t * 0.8) * 0.15;

		animId = requestAnimationFrame(animateScene);
	}

	// ── 8. Tap-to-select (bottles + portal tabs) ──
	state.handleTap = (clientX, clientY) => {
		if (!state.isInAR) return;

		const camera = world.camera;
		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();

		const rect = world.renderer.domElement.getBoundingClientRect();
		mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
		mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

		raycaster.setFromCamera(mouse, camera);

		// Collect all tappable meshes
		const bottleMeshes = state.bottleEntities
			.filter(b => entity_getState(b) !== 2)
			.map(b => b.entity.object3D)
			.filter(Boolean);

		// Check bottle hits first
		const bottleHits = raycaster.intersectObjects(bottleMeshes, true);
		if (bottleHits.length > 0) {
			let hitObj = bottleHits[0].object;
			while (hitObj && !hitObj.userData.bottleRef) {
				hitObj = hitObj.parent;
			}
			if (hitObj?.userData.bottleRef) {
				selectBottle(hitObj.userData.bottleRef);
				return;
			}
		}

		// Check portal tab hits
		const tabMeshes = state.decorationEntities
			.filter(e => e.object3D)
			.flatMap(e => {
				const meshes = [];
				e.object3D.traverse(c => { if (c.userData.portalRef) meshes.push(c); });
				return meshes;
			});

		if (tabMeshes.length > 0) {
			const tabHits = raycaster.intersectObjects(tabMeshes, true);
			if (tabHits.length > 0) {
				let hitObj = tabHits[0].object;
				while (hitObj && !hitObj.userData.portalRef) {
					hitObj = hitObj.parent;
				}
				if (hitObj?.userData.portalRef) {
					const { portalId, portalName } = hitObj.userData.portalRef;
					window.dispatchEvent(new CustomEvent('portal-tab-tap', {
						detail: { portalId, portalName }
					}));
					selectBottle(null);
					return;
				}
			}
		}

		selectBottle(null);
	};

	function entity_getState(b) {
		try { return b.entity.getValue(BottleMarker, 'state'); } catch { return 2; }
	}

	function selectBottle(bottleEntry) {
		if (state.selectedBottle) {
			const prev = state.selectedBottle.entity;
			try { prev.setValue(BottleMarker, 'state', 0); } catch {}
			if (prev.object3D) prev.object3D.scale.setScalar(1);
		}

		state.selectedBottle = bottleEntry;

		if (bottleEntry) {
			try { bottleEntry.entity.setValue(BottleMarker, 'state', 1); } catch {}
		}

		if (state.onSelect) {
			state.onSelect(bottleEntry ? bottleEntry.bottle : null);
		}
	}

	// ── 9. Capture ──
	state.captureSelected = async () => {
		if (!state.selectedBottle) return null;
		const { entity, bottle } = state.selectedBottle;

		try { entity.setValue(BottleMarker, 'state', 2); } catch {}
		if (entity.object3D) entity.object3D.visible = false;

		return bottle;
	};

	// ── 10. Exit ──
	state.exitAR = () => {
		if (animId) cancelAnimationFrame(animId);
		if (world.xrSession) world.exitXR();
		state.isInAR = false;
		if (state.onAREnd) state.onAREnd();
	};

	if (world.addEventListener) {
		world.addEventListener('xrsessionend', () => {
			state.isInAR = false;
			if (animId) cancelAnimationFrame(animId);
			if (state.onAREnd) state.onAREnd();
		});
	}

	return state;
}

// ═══════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════

export function destroyBottleAR(state) {
	if (!state) return;
	state._closed = true;
	if (state.world?.renderer) {
		state.world.renderer.dispose();
		state.world.renderer.domElement?.remove();
	}
}
