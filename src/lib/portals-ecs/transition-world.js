/**
 * Portal Transition World — AR → VR Session Switching
 *
 * Uses IWSDK native interaction: RayInteractable + Pressed/Hovered tags.
 * The InputSystem (auto-registered by World) handles all pointer event wiring.
 */

import {
	World, SessionMode, ReferenceSpaceType, Transform,
	createComponent, createSystem, Types,
	Mesh, TorusGeometry, CircleGeometry, BoxGeometry, OctahedronGeometry,
	Group, BufferGeometry, BufferAttribute, Points,
	MeshBasicMaterial, MeshStandardMaterial, ShaderMaterial, PointsMaterial,
	AmbientLight, DirectionalLight, PointLight,
	Color, Quaternion, Vector3, BackSide, AdditiveBlending, DoubleSide,
	RayInteractable, Hovered, Pressed,
} from '@iwsdk/core';

// ─── Components ─────────────────────────────────────────────────────
const PortalSession = createComponent('portal-session', {
	phase: { type: Types.String, default: 'preview' },
	portalId: { type: Types.String, default: '' },
	transitionProgress: { type: Types.Float32, default: 0 },
});

const PortalRing = createComponent('portal-ring', {
	radius: { type: Types.Float32, default: 0.5 },
	opacity: { type: Types.Float32, default: 1 },
	pulsePhase: { type: Types.Float32, default: 0 },
});

const VRContent = createComponent('vr-content', {
	visible: { type: Types.Boolean, default: false },
	fadeIn: { type: Types.Float32, default: 0 },
});

// ─── Session Manager System ─────────────────────────────────────────
// Uses IWSDK native queries: detects Pressed tag on ring entity
const PortalTransitionSystem = class extends createSystem(
	{
		session: { required: [PortalSession] },
		rings: { required: [PortalRing, Transform] },
		pressedRings: {
			required: [PortalRing, RayInteractable, Pressed],
		},
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

		// ── Detect tap on ring via IWSDK Pressed tag ──
		if (phase === 'ar-idle' && this.queries.pressedRings.entities.size > 0) {
			console.log('[transition] Ring pressed! Starting focus');
			sessionEntity.setValue(PortalSession, 'phase', 'ar-focused');
		}

		if (phase === 'preview') {
			for (const ring of this.queries.rings.entities) {
				const rot = ring.getVectorView(Transform, 'orientation');
				const q = new Quaternion(rot[0], rot[1], rot[2], rot[3]);
				q.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), delta * 0.3));
				rot[0] = q.x; rot[1] = q.y; rot[2] = q.z; rot[3] = q.w;
			}
		} else if (phase === 'ar-idle') {
			for (const ring of this.queries.rings.entities) {
				let pulse = ring.getValue(PortalRing, 'pulsePhase') + delta;
				ring.setValue(PortalRing, 'pulsePhase', pulse);
				const scale = ring.getVectorView(Transform, 'scale');
				const s = 1 + Math.sin(pulse * 2) * 0.05;
				scale[0] = s; scale[1] = s; scale[2] = s;

				// Grow when hovered
				if (ring.hasComponent(Hovered)) {
					scale[0] *= 1.1; scale[1] *= 1.1; scale[2] *= 1.1;
				}
			}
		} else if (phase === 'ar-focused') {
			for (const ring of this.queries.rings.entities) {
				let pulse = ring.getValue(PortalRing, 'pulsePhase') + delta * 3;
				ring.setValue(PortalRing, 'pulsePhase', pulse);
				const scale = ring.getVectorView(Transform, 'scale');
				const s = 1 + Math.sin(pulse * 4) * 0.2;
				scale[0] = s; scale[1] = s; scale[2] = s;
			}
			// After brief focus, start transition
			setTimeout(() => {
				if (sessionEntity.getValue(PortalSession, 'phase') === 'ar-focused') {
					sessionEntity.setValue(PortalSession, 'phase', 'transitioning');
					sessionEntity.setValue(PortalSession, 'transitionProgress', 0);
				}
			}, 500);
		} else if (phase === 'transitioning') {
			let progress = sessionEntity.getValue(PortalSession, 'transitionProgress');
			progress = Math.min(progress + delta / this.config.transitionDuration.peek(), 1);
			sessionEntity.setValue(PortalSession, 'transitionProgress', progress);

			for (const ring of this.queries.rings.entities) {
				let op = ring.getValue(PortalRing, 'opacity');
				op = Math.max(0, op - delta * 2);
				ring.setValue(PortalRing, 'opacity', op);
				if (ring.object3D?.material) {
					ring.object3D.traverse((child) => {
						if (child.material) {
							child.material.opacity = op;
							child.material.transparent = true;
						}
					});
				}
			}

			if (progress >= 1) {
				this.globals.onTransitionReady?.();
			}
		} else if (phase === 'vr-active') {
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
			}
		}
	}
};

// ─── Portal Ring Mesh ───────────────────────────────────────────────
function createPortalRingMesh(colorHex) {
	const group = new Group();
	const color = new Color(colorHex);

	const torusGeo = new TorusGeometry(0.5, 0.03, 16, 64);
	const torusMat = new MeshStandardMaterial({
		color, emissive: color, emissiveIntensity: 0.4,
		transparent: true, opacity: 1,
	});
	group.add(new Mesh(torusGeo, torusMat));

	const membraneGeo = new CircleGeometry(0.48, 64);
	const membraneMat = new MeshBasicMaterial({
		color: new Color(colorHex).multiplyScalar(0.3),
		transparent: true, opacity: 0.15, side: DoubleSide,
	});
	const membrane = new Mesh(membraneGeo, membraneMat);
	membrane.position.z = 0.001;
	group.add(membrane);

	return group;
}

// ─── VR Scene ───────────────────────────────────────────────────────
function createVRScene(colorHex) {
	const group = new Group();
	const color = new Color(colorHex);

	const skyGeo = new BoxGeometry(100, 100, 100);
	const skyMat = new ShaderMaterial({
		uniforms: {
			uColorTop: { value: color.clone().multiplyScalar(0.15) },
			uColorBottom: { value: color.clone().multiplyScalar(0.05) },
		},
		vertexShader: `varying vec3 vWorldPos; void main() { vWorldPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
		fragmentShader: `uniform vec3 uColorTop; uniform vec3 uColorBottom; varying vec3 vWorldPos; void main() { float t = normalize(vWorldPos).y * 0.5 + 0.5; gl_FragColor = vec4(mix(uColorBottom, uColorTop, smoothstep(0.0, 1.0, t)), 1.0); }`,
		side: BackSide,
	});
	group.add(new Mesh(skyGeo, skyMat));

	const floorGeo = new BoxGeometry(100, 0.01, 100);
	const floorMat = new MeshStandardMaterial({
		color: color.clone().multiplyScalar(0.08),
		roughness: 0.4, metalness: 0.6, transparent: true, opacity: 0,
	});
	const floor = new Mesh(floorGeo, floorMat);
	floor.position.y = -1.5;
	group.add(floor);

	[[-2, 0.5, -3], [2, 1.2, -4], [0, 0.8, -6], [-3, 1.5, -5], [3, 0.3, -3.5]].forEach((pos) => {
		const mat = new MeshStandardMaterial({
			color, emissive: color.clone().multiplyScalar(0.5),
			emissiveIntensity: 0.3, transparent: true, opacity: 0,
			metalness: 0.8, roughness: 0.2,
		});
		const crystal = new Mesh(new OctahedronGeometry(0.15, 0), mat);
		crystal.position.set(...pos);
		group.add(crystal);
	});

	group.add(new PointLight(color, 2, 20).translateY(2));
	group.add(new AmbientLight(0xffffff, 0.15));

	const dustCount = 200;
	const dustGeo = new BufferGeometry();
	const dustPos = new Float32Array(dustCount * 3);
	for (let i = 0; i < dustCount; i++) {
		dustPos[i * 3] = (Math.random() - 0.5) * 20;
		dustPos[i * 3 + 1] = Math.random() * 6 - 1;
		dustPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
	}
	dustGeo.setAttribute('position', new BufferAttribute(dustPos, 3));
	const dustMat = new PointsMaterial({
		color, size: 0.03, transparent: true, opacity: 0,
		blending: AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	});
	group.add(new Points(dustGeo, dustMat));

	return group;
}

// ─── Main Init ──────────────────────────────────────────────────────
export async function initTransitionWorld(container, portalConfig) {
	const colorHex = portalConfig?.color_primary || '#c9a87c';

	const world = await World.create(container, {
		xr: {
			sessionMode: SessionMode.ImmersiveAR,
			referenceSpace: {
				type: ReferenceSpaceType.LocalFloor,
				fallbackOrder: [ReferenceSpaceType.Local, ReferenceSpaceType.Viewer],
			},
			features: { anchors: true, hitTest: true, planeDetection: true },
			offer: 'none',
		},
		render: { defaultLighting: false, fov: 70 },
		features: {
			sceneUnderstanding: { showWireFrame: false },
			environmentRaycast: true,
		},
	});

	world.camera.position.set(0, 0, 1.5);
	world.camera.lookAt(0, 0, 0);

	world.scene.add(new AmbientLight(0xffffff, 0.6));
	const dirLight = new DirectionalLight(0xfff5e6, 0.5);
	dirLight.position.set(0.5, 1, 1);
	world.scene.add(dirLight);

	world.registerComponent(PortalSession);
	world.registerComponent(PortalRing);
	world.registerComponent(VRContent);
	world.registerSystem(PortalTransitionSystem, { priority: 0 });

	world.globals.onTransitionReady = null;
	world.globals.portalConfig = portalConfig;

	// Session entity
	const sessionEntity = world.createEntity();
	sessionEntity.addComponent(PortalSession, {
		phase: 'preview',
		portalId: portalConfig?.id || '',
		transitionProgress: 0,
	});

	// Portal ring — with RayInteractable so InputSystem handles taps
	const ringMesh = createPortalRingMesh(colorHex);
	const ringEntity = world.createTransformEntity(ringMesh);
	ringEntity.addComponent(PortalRing, { radius: 0.5, opacity: 1, pulsePhase: 0 });
	ringEntity.addComponent(RayInteractable); // ← IWSDK native interaction

	// VR scene (hidden)
	const vrScene = createVRScene(colorHex);
	const vrEntity = world.createTransformEntity(vrScene);
	vrEntity.addComponent(VRContent, { visible: false, fadeIn: 0 });
	vrScene.visible = false;

	// Public API
	const api = {
		world,

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

			await new Promise(resolve => {
				const check = setInterval(() => {
					if (world.session) { clearInterval(check); resolve(); }
				}, 50);
			});

			console.log('[transition] AR session active, ring is RayInteractable');
			const pos = ringEntity.getVectorView(Transform, 'position');
			pos[0] = 0; pos[1] = 1.2; pos[2] = -1.5;
			sessionEntity.setValue(PortalSession, 'phase', 'ar-idle');

			world.session.addEventListener('end', () => {
				sessionEntity.setValue(PortalSession, 'phase', 'preview');
				ringMesh.visible = true;
				vrScene.visible = false;
				window.dispatchEvent(new CustomEvent('portal-session-ended'));
			});
		},

		focusPortal() {
			if (sessionEntity.getValue(PortalSession, 'phase') !== 'ar-idle') return;
			sessionEntity.setValue(PortalSession, 'phase', 'ar-focused');
		},

		async enterVR() {
			if (world.session) world.exitXR();
			ringMesh.visible = false;
			vrScene.visible = true;
			await new Promise(r => setTimeout(r, 300));

			const { launchXR } = await import('@iwsdk/core');
			launchXR(world, {
				sessionMode: SessionMode.ImmersiveVR,
				referenceSpace: {
					type: ReferenceSpaceType.Local,
					fallbackOrder: [ReferenceSpaceType.LocalFloor, ReferenceSpaceType.Viewer],
				},
				features: {},
			});

			await new Promise(resolve => {
				const check = setInterval(() => {
					if (world.session) { clearInterval(check); resolve(); }
				}, 50);
			});

			world.session.addEventListener('end', () => {
				sessionEntity.setValue(PortalSession, 'phase', 'preview');
				ringMesh.visible = true;
				vrScene.visible = false;
				window.dispatchEvent(new CustomEvent('portal-session-ended'));
			});

			sessionEntity.setValue(PortalSession, 'phase', 'vr-active');
			vrEntity.setValue(VRContent, 'visible', true);
		},

		exit() {
			if (world.session) world.exitXR();
			sessionEntity.setValue(PortalSession, 'phase', 'preview');
		},

		async checkSupport() {
			const ar = await navigator.xr?.isSessionSupported('immersive-ar') ?? false;
			const vr = await navigator.xr?.isSessionSupported('immersive-vr') ?? false;
			return { ar, vr };
		},
	};

	world.globals.onTransitionReady = () => {
		window.dispatchEvent(new CustomEvent('portal-transition-ready'));
	};

	return api;
}

export function destroyTransitionWorld(world) {
	if (world?.session) { try { world.exitXR(); } catch {} }
	if (world?.renderer) {
		world.renderer.dispose();
		world.renderer.domElement?.remove();
	}
}
