/**
 * Portal Transition World — AR → VR Session Switching
 *
 * The core idea:
 *   1. World boots in non-immersive mode (desktop preview / fallback)
 *   2. User taps "Enter AR" → launchXR(immersive-ar) → portal ring appears in room
 *   3. User taps/walks through portal ring → session ends → brief transition
 *   4. launchXR(immersive-vr) → generated world takes over entirely
 *
 * State machine: preview → ar-idle → ar-focused → transitioning → vr-active
 */

import { World, SessionMode, ReferenceSpaceType, Transform } from '@iwsdk/core';
import * as THREE from 'three';
import { createSystem, Types } from 'elics';

// ─── Session State Component ────────────────────────────────────────
const PortalSession = {
	phase: {
		type: Types.Enum,
		enum: { Preview: 0, ARIdle: 1, ARFocused: 2, Transitioning: 3, VRActive: 4 },
		default: 0,
	},
	portalId: { type: Types.String, default: '' },
	colorPrimary: { type: Types.Vec3, default: [0.79, 0.66, 0.49, 1] },
	transitionProgress: { type: Types.Float32, default: 0 },
};

// ─── Portal Ring Component (AR only) ────────────────────────────────
const PortalRing = {
	radius: { type: Types.Float32, default: 0.5 },
	opacity: { type: Types.Float32, default: 1 },
	pulsePhase: { type: Types.Float32, default: 0 },
	isFocused: { type: Types.Boolean, default: false },
};

// ─── VR Scene Content Component ─────────────────────────────────────
const VRContent = {
	visible: { type: Types.Boolean, default: false },
	fadeIn: { type: Types.Float32, default: 0 },
};

// ─── Session Manager System ─────────────────────────────────────────
// Drives the state machine and coordinates AR↔VR transitions
const SessionManagerSystem = class extends createSystem(
	{
		session: { required: [PortalSession] },
		rings: { required: [PortalRing, Transform] },
		content: { required: [VRContent, Transform] },
	},
	{
		transitionDuration: { type: Types.Float32, default: 1.5 },
	}
) {
	update(delta) {
		const sessionEntity = this.queries.session.entities[0];
		if (!sessionEntity) return;

		const phase = sessionEntity.getValue(PortalSession, 'phase');

		switch (phase) {
			case 0: { // Preview
					// Non-immersive desktop preview — slowly rotate ring if exists
					for (const ring of this.queries.rings.entities) {
						const rot = ring.getVectorView(Transform, 'orientation');
						const q = new THREE.Quaternion(rot[0], rot[1], rot[2], rot[3]);
						q.multiply(new THREE.Quaternion().setFromAxisAngle(
							new THREE.Vector3(0, 1, 0), delta * 0.3
						));
						rot[0] = q.x; rot[1] = q.y; rot[2] = q.z; rot[3] = q.w;
					}
					break;
			}
			case 1: { // ARIdle
					// Portal ring visible in AR, pulsing gently
					for (const ring of this.queries.rings.entities) {
						let pulse = ring.getValue(PortalRing, 'pulsePhase') + delta;
						ring.setValue(PortalRing, 'pulsePhase', pulse);
						const scale = ring.getVectorView(Transform, 'scale');
						const s = 1 + Math.sin(pulse * 2) * 0.05;
						scale[0] = s; scale[1] = s; scale[2] = s;
					}
					break;
			}
			case 2: { // ARFocused
					// User tapped ring — accelerate pulse, prepare transition
					for (const ring of this.queries.rings.entities) {
						let pulse = ring.getValue(PortalRing, 'pulsePhase') + delta * 3;
						ring.setValue(PortalRing, 'pulsePhase', pulse);
						const scale = ring.getVectorView(Transform, 'scale');
						const s = 1 + Math.sin(pulse * 4) * 0.15;
						scale[0] = s; scale[1] = s; scale[2] = s;
					}
					break;
			}
			case 3: { // Transitioning
					// Fade out AR content, ramp up transition
					let progress = sessionEntity.getValue(PortalSession, 'transitionProgress');
					progress = Math.min(progress + delta / this.config.transitionDuration.value, 1);
					sessionEntity.setValue(PortalSession, 'transitionProgress', progress);

					// Fade out portal ring
					for (const ring of this.queries.rings.entities) {
						let op = ring.getValue(PortalRing, 'opacity');
						op = Math.max(0, op - delta * 2);
						ring.setValue(PortalRing, 'opacity', op);
						if (ring.object3D?.material) {
							ring.object3D.material.opacity = op;
							ring.object3D.material.transparent = true;
						}
					}

					// Notify Svelte layer when transition completes
					if (progress >= 1) {
						this.globals.onTransitionReady?.();
					}
					break;
			}
			case 4: { // VRActive
					// VR world is active — fade in VR content
					for (const content of this.queries.content.entities) {
						let fade = content.getValue(VRContent, 'fadeIn');
						fade = Math.min(fade + delta * 0.8, 1);
						content.setValue(VRContent, 'fadeIn', fade);

						if (content.object3D) {
							content.object3D.traverse((child) => {
								if (child.material) {
									child.material.opacity = fade;
									child.material.transparent = fade < 1;
								}
							});
						}

						// Slow rotation for ambient feel
						const rot = content.getVectorView(Transform, 'orientation');
						const q = new THREE.Quaternion(rot[0], rot[1], rot[2], rot[3]);
						q.multiply(new THREE.Quaternion().setFromAxisAngle(
							new THREE.Vector3(0, 1, 0), delta * 0.05
						));
						rot[0] = q.x; rot[1] = q.y; rot[2] = q.z; rot[3] = q.w;
					}
					break;
			}
		}
	}
};

// ─── Portal Ring Mesh Factory ───────────────────────────────────────
function createPortalRingMesh(colorVec) {
	const group = new THREE.Group();

	// Torus — the ring itself
	const torusGeo = new THREE.TorusGeometry(0.5, 0.03, 16, 64);
	const torusMat = new THREE.MeshStandardMaterial({
		color: new THREE.Color(colorVec[0], colorVec[1], colorVec[2]),
		emissive: new THREE.Color(colorVec[0], colorVec[1], colorVec[2]),
		emissiveIntensity: 0.4,
		transparent: true,
		opacity: 1,
	});
	const torus = new THREE.Mesh(torusGeo, torusMat);
	group.add(torus);

	// Inner membrane — semi-transparent disk
	const membraneGeo = new THREE.CircleGeometry(0.48, 64);
	const membraneMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color(colorVec[0] * 0.3, colorVec[1] * 0.3, colorVec[2] * 0.3),
		transparent: true,
		opacity: 0.15,
		side: THREE.DoubleSide,
	});
	const membrane = new THREE.Mesh(membraneGeo, membraneMat);
	membrane.position.z = 0.001;
	group.add(membrane);

	// Particle ring — small points orbiting
	const particleCount = 40;
	const particleGeo = new THREE.BufferGeometry();
	const particlePositions = new Float32Array(particleCount * 3);
	for (let i = 0; i < particleCount; i++) {
		const angle = (i / particleCount) * Math.PI * 2;
		particlePositions[i * 3] = Math.cos(angle) * 0.55;
		particlePositions[i * 3 + 1] = Math.sin(angle) * 0.55;
		particlePositions[i * 3 + 2] = 0;
	}
	particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
	const particleMat = new THREE.PointsMaterial({
		color: new THREE.Color(colorVec[0], colorVec[1], colorVec[2]),
		size: 0.02,
		transparent: true,
		opacity: 0.8,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
	});
	const particles = new THREE.Points(particleGeo, particleMat);
	group.add(particles);

	return group;
}

// ─── VR Scene Factory ───────────────────────────────────────────────
// Builds the immersive world that appears after stepping through the portal
function createVRScene(portalConfig) {
	const group = new THREE.Group();

	// Sky dome — gradient sphere
	const skyGeo = new THREE.SphereGeometry(50, 32, 16);
	const color = portalConfig?.colorPrimary || [0.79, 0.66, 0.49];
	const skyMat = new THREE.ShaderMaterial({
		uniforms: {
			uColorTop: { value: new THREE.Color(color[0] * 0.15, color[1] * 0.15, color[2] * 0.15) },
			uColorBottom: { value: new THREE.Color(color[0] * 0.05, color[1] * 0.05, color[2] * 0.05) },
		},
		vertexShader: `
			varying vec3 vWorldPos;
			void main() {
				vWorldPos = position;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			uniform vec3 uColorTop;
			uniform vec3 uColorBottom;
			varying vec3 vWorldPos;
			void main() {
				float t = normalize(vWorldPos).y * 0.5 + 0.5;
				gl_FragColor = vec4(mix(uColorBottom, uColorTop, smoothstep(0.0, 1.0, t)), 1.0);
			}
		`,
		side: THREE.BackSide,
	});
	const sky = new THREE.Mesh(skyGeo, skyMat);
	group.add(sky);

	// Floor — subtle reflective plane
	const floorGeo = new THREE.PlaneGeometry(100, 100);
	const floorMat = new THREE.MeshStandardMaterial({
		color: new THREE.Color(color[0] * 0.08, color[1] * 0.08, color[2] * 0.08),
		roughness: 0.4,
		metalness: 0.6,
		transparent: true,
		opacity: 0,
	});
	const floor = new THREE.Mesh(floorGeo, floorMat);
	floor.rotation.x = -Math.PI / 2;
	floor.position.y = -1.5;
	group.add(floor);

	// Floating text crystal placeholders (will be populated from D1 writings)
	const crystalPositions = [
		[-2, 0.5, -3],
		[2, 1.2, -4],
		[0, 0.8, -6],
		[-3, 1.5, -5],
		[3, 0.3, -3.5],
	];
	crystalPositions.forEach((pos, i) => {
		const crystalGeo = new THREE.OctahedronGeometry(0.15, 0);
		const crystalMat = new THREE.MeshStandardMaterial({
			color: new THREE.Color(color[0], color[1], color[2]),
			emissive: new THREE.Color(color[0] * 0.5, color[1] * 0.5, color[2] * 0.5),
			emissiveIntensity: 0.3,
			transparent: true,
			opacity: 0,
			metalness: 0.8,
			roughness: 0.2,
		});
		const crystal = new THREE.Mesh(crystalGeo, crystalMat);
		crystal.position.set(...pos);
		crystal.userData.crystalIndex = i;
		group.add(crystal);
	});

	// Central light source
	const light = new THREE.PointLight(
		new THREE.Color(color[0], color[1], color[2]), 2, 20
	);
	light.position.set(0, 2, 0);
	group.add(light);

	// Ambient
	const ambient = new THREE.AmbientLight(0xffffff, 0.15);
	group.add(ambient);

	// Particle field — ambient dust in VR space
	const dustCount = 200;
	const dustGeo = new THREE.BufferGeometry();
	const dustPos = new Float32Array(dustCount * 3);
	for (let i = 0; i < dustCount; i++) {
		dustPos[i * 3] = (Math.random() - 0.5) * 20;
		dustPos[i * 3 + 1] = Math.random() * 6 - 1;
		dustPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
	}
	dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
	const dustMat = new THREE.PointsMaterial({
		color: new THREE.Color(color[0], color[1], color[2]),
		size: 0.03,
		transparent: true,
		opacity: 0,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
		sizeAttenuation: true,
	});
	const dust = new THREE.Points(dustGeo, dustMat);
	group.add(dust);

	return group;
}

// ─── Main Init ──────────────────────────────────────────────────────
export async function initTransitionWorld(container, portalConfig) {
	const colorPrimary = portalConfig?.color_primary
		? hexToRgb(portalConfig.color_primary)
		: [0.79, 0.66, 0.49];

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
				planeDetection: true,
			},
			offer: 'none',
		},
		render: {
			defaultLighting: false,
			fov: 70,
		},
		features: {
			sceneUnderstanding: { showWireFrame: false },
			environmentRaycast: true,
		},
	});

	// Camera for preview mode
	world.camera.position.set(0, 0, 1.5);
	world.camera.lookAt(0, 0, 0);

	// Lighting
	world.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
	const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.5);
	dirLight.position.set(0.5, 1, 1);
	world.scene.add(dirLight);

	// Register components + systems
	world.registerComponent(PortalSession);
	world.registerComponent(PortalRing);
	world.registerComponent(VRContent);
	world.registerSystem(SessionManagerSystem, { priority: 0 });

	// Globals — Svelte bridge
	world.globals.onTransitionReady = null;
	world.globals.portalConfig = portalConfig;
	world.globals.locale = document.documentElement.lang || 'es';

	// ── Session entity ──
	const sessionEntity = world.createEntity();
	sessionEntity.addComponent(PortalSession, {
		phase: 0, // Preview
		portalId: portalConfig?.id || '',
		colorPrimary,
		transitionProgress: 0,
	});

	// ── Portal ring entity (visible in preview + AR) ──
	const ringMesh = createPortalRingMesh(colorPrimary);
	const ringEntity = world.createTransformEntity(ringMesh);
	ringEntity.addComponent(PortalRing, {
		radius: 0.5,
		opacity: 1,
		pulsePhase: 0,
		isFocused: false,
	});

	// ── VR content entity (hidden until VR phase) ──
	const vrScene = createVRScene({ colorPrimary, ...portalConfig });
	const vrEntity = world.createTransformEntity(vrScene);
	vrEntity.addComponent(VRContent, {
		visible: false,
		fadeIn: 0,
	});
	vrScene.visible = false; // Hidden initially

	// ── Public API for Svelte component ──
	const api = {
		world,

		// Phase 1: Enter AR — portal ring appears in room
		async enterAR() {
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
					planeDetection: true,
				},
			});

			// Place ring 1.5m in front of user at eye level
			const pos = ringEntity.getVectorView(Transform, 'position');
			pos[0] = 0;
			pos[1] = 1.2;
			pos[2] = -1.5;

			sessionEntity.setValue(PortalSession, 'phase', 1); // ARIdle
			console.log('[transition] AR session started, portal ring placed');
		},

		// Phase 2: User tapped the ring — start transition
		focusPortal() {
			if (sessionEntity.getValue(PortalSession, 'phase') !== 1) return;
			sessionEntity.setValue(PortalSession, 'phase', 2); // ARFocused
			ringEntity.setValue(PortalRing, 'isFocused', true);
			console.log('[transition] Portal focused, starting transition');

			// After brief focus period, start actual transition
			setTimeout(() => {
				sessionEntity.setValue(PortalSession, 'phase', 3); // Transitioning
				sessionEntity.setValue(PortalSession, 'transitionProgress', 0);
			}, 500);
		},

		// Phase 3: Exit AR and enter VR — called by Svelte onTransitionReady
		async enterVR() {
			// Exit AR session
			if (world.session) {
				world.exitXR();
			}

			// Hide AR content, show VR content
			ringMesh.visible = false;
			vrScene.visible = true;

			// Reset VR content position for immersive viewing
			const vrPos = vrEntity.getVectorView(Transform, 'position');
			vrPos[0] = 0;
			vrPos[1] = 0;
			vrPos[2] = 0;

			// Brief delay to let AR session fully end
			await new Promise(r => setTimeout(r, 300));

			// Launch VR session
			const { launchXR } = await import('@iwsdk/core');
			launchXR(world, {
				sessionMode: SessionMode.ImmersiveVR,
				referenceSpace: {
					type: ReferenceSpaceType.Local,
					fallbackOrder: [ReferenceSpaceType.LocalFloor, ReferenceSpaceType.Viewer],
				},
				features: {
					anchors: false,
					hitTest: false,
					planeDetection: false,
				},
			});

			sessionEntity.setValue(PortalSession, 'phase', 4); // VRActive
			vrEntity.setValue(VRContent, 'visible', true);
			console.log('[transition] VR session started, immersive world active');
		},

		// Exit everything
		exit() {
			if (world.session) {
				world.exitXR();
			}
			sessionEntity.setValue(PortalSession, 'phase', 0); // Preview
		},

		// Check support
		async checkSupport() {
			const arSupported = await navigator.xr?.isSessionSupported('immersive-ar') ?? false;
			const vrSupported = await navigator.xr?.isSessionSupported('immersive-vr') ?? false;
			return { ar: arSupported, vr: vrSupported };
		},

		// Tap detection — call from Svelte on canvas tap
		handleTap(ndcX, ndcY) {
			if (sessionEntity.getValue(PortalSession, 'phase') === 1) {
				// ARIdle — raycast to check if ring was tapped
				const raycaster = new THREE.Raycaster();
				raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), world.camera);
				const intersects = raycaster.intersectObject(ringMesh, true);
				if (intersects.length > 0) {
					this.focusPortal();
					return true;
				}
			}
			return false;
		},
	};

	// Wire transition callback
	world.globals.onTransitionReady = () => {
		// Dispatch event for Svelte to trigger enterVR
		window.dispatchEvent(new CustomEvent('portal-transition-ready'));
	};

	return api;
}

// ─── Utils ──────────────────────────────────────────────────────────
function hexToRgb(hex) {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return [r, g, b];
}

// ─── Cleanup ────────────────────────────────────────────────────────
export function destroyTransitionWorld(world) {
	if (world?.session) {
		try { world.exitXR(); } catch {}
	}
	if (world?.renderer) {
		world.renderer.dispose();
		world.renderer.domElement?.remove();
	}
}
