/**
 * Portal Transition World — AR → VR Session Switching
 *
 * State machine: preview → ar-idle → ar-focused → transitioning → vr-active
 */

import { World, SessionMode, ReferenceSpaceType, Transform } from '@iwsdk/core';
import {
	createComponent, createSystem, Types,
	Mesh, TorusGeometry, CircleGeometry, BoxGeometry, OctahedronGeometry,
	Group, BufferGeometry, BufferAttribute, Points,
	MeshBasicMaterial, MeshStandardMaterial, ShaderMaterial, PointsMaterial,
	AmbientLight, DirectionalLight, PointLight,
	Color, Quaternion, Vector3, BackSide, AdditiveBlending, DoubleSide,
	Raycaster, Vector2,
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
	isFocused: { type: Types.Boolean, default: false },
});

const VRContent = createComponent('vr-content', {
	visible: { type: Types.Boolean, default: false },
	fadeIn: { type: Types.Float32, default: 0 },
});

// ─── Session Manager System ─────────────────────────────────────────
const SessionManagerSystem = class extends createSystem(
	{
		session: { required: [PortalSession] },
		rings: { required: [PortalRing, Transform] },
		content: { required: [VRContent, Transform] },
	},
	{
		transitionDuration: { type: 'Float32', default: 1.5 },
	}
) {
	update(delta) {
		const sessionEntity = this.queries.session.entities[0];
		if (!sessionEntity) return;

		const phase = sessionEntity.getValue(PortalSession, 'phase');

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
			}
		} else if (phase === 'ar-focused') {
			for (const ring of this.queries.rings.entities) {
				let pulse = ring.getValue(PortalRing, 'pulsePhase') + delta * 3;
				ring.setValue(PortalRing, 'pulsePhase', pulse);
				const scale = ring.getVectorView(Transform, 'scale');
				const s = 1 + Math.sin(pulse * 4) * 0.15;
				scale[0] = s; scale[1] = s; scale[2] = s;
			}
		} else if (phase === 'transitioning') {
			let progress = sessionEntity.getValue(PortalSession, 'transitionProgress');
			progress = Math.min(progress + delta / this.config.transitionDuration.value, 1);
			sessionEntity.setValue(PortalSession, 'transitionProgress', progress);

			for (const ring of this.queries.rings.entities) {
				let op = ring.getValue(PortalRing, 'opacity');
				op = Math.max(0, op - delta * 2);
				ring.setValue(PortalRing, 'opacity', op);
				if (ring.object3D?.material) {
					ring.object3D.material.opacity = op;
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
		color,
		emissive: color,
		emissiveIntensity: 0.4,
		transparent: true,
		opacity: 1,
	});
	group.add(new Mesh(torusGeo, torusMat));

	const membraneGeo = new CircleGeometry(0.48, 64);
	const membraneMat = new MeshBasicMaterial({
		color: new Color(colorHex).multiplyScalar(0.3),
		transparent: true,
		opacity: 0.15,
		side: DoubleSide,
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

	// Sky dome
	const skyGeo = new BoxGeometry(100, 100, 100);
	const skyMat = new ShaderMaterial({
		uniforms: {
			uColorTop: { value: color.clone().multiplyScalar(0.15) },
			uColorBottom: { value: color.clone().multiplyScalar(0.05) },
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
		side: BackSide,
	});
	group.add(new Mesh(skyGeo, skyMat));

	// Floor
	const floorGeo = new BoxGeometry(100, 0.01, 100);
	const floorMat = new MeshStandardMaterial({
		color: color.clone().multiplyScalar(0.08),
		roughness: 0.4,
		metalness: 0.6,
		transparent: true,
		opacity: 0,
	});
	const floor = new Mesh(floorGeo, floorMat);
	floor.position.y = -1.5;
	group.add(floor);

	// Floating crystals
	const crystalPositions = [[-2, 0.5, -3], [2, 1.2, -4], [0, 0.8, -6], [-3, 1.5, -5], [3, 0.3, -3.5]];
	crystalPositions.forEach((pos, i) => {
		const mat = new MeshStandardMaterial({
			color,
			emissive: color.clone().multiplyScalar(0.5),
			emissiveIntensity: 0.3,
			transparent: true,
			opacity: 0,
			metalness: 0.8,
			roughness: 0.2,
		});
		const crystal = new Mesh(new OctahedronGeometry(0.15, 0), mat);
		crystal.position.set(...pos);
		group.add(crystal);
	});

	// Lights
	group.add(new PointLight(color, 2, 20).translateY(2));
	group.add(new AmbientLight(0xffffff, 0.15));

	// Dust particles
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
		color,
		size: 0.03,
		transparent: true,
		opacity: 0,
		blending: AdditiveBlending,
		depthWrite: false,
		sizeAttenuation: true,
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

	// Camera for preview
	world.camera.position.set(0, 0, 1.5);
	world.camera.lookAt(0, 0, 0);

	// Lights
	world.scene.add(new AmbientLight(0xffffff, 0.6));
	const dirLight = new DirectionalLight(0xfff5e6, 0.5);
	dirLight.position.set(0.5, 1, 1);
	world.scene.add(dirLight);

	// Register
	world.registerComponent(PortalSession);
	world.registerComponent(PortalRing);
	world.registerComponent(VRContent);
	world.registerSystem(SessionManagerSystem, { priority: 0 });

	// Globals
	world.globals.onTransitionReady = null;
	world.globals.portalConfig = portalConfig;

	// Session entity
	const sessionEntity = world.createEntity();
	sessionEntity.addComponent(PortalSession, {
		phase: 'preview',
		portalId: portalConfig?.id || '',
		transitionProgress: 0,
	});

	// Portal ring
	const ringMesh = createPortalRingMesh(colorHex);
	const ringEntity = world.createTransformEntity(ringMesh);
	ringEntity.addComponent(PortalRing, {
		radius: 0.5,
		opacity: 1,
		pulsePhase: 0,
		isFocused: false,
	});

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
			const pos = ringEntity.getVectorView(Transform, 'position');
			pos[0] = 0; pos[1] = 1.2; pos[2] = -1.5;
			sessionEntity.setValue(PortalSession, 'phase', 'ar-idle');
		},

		focusPortal() {
			if (sessionEntity.getValue(PortalSession, 'phase') !== 'ar-idle') return;
			sessionEntity.setValue(PortalSession, 'phase', 'ar-focused');
			ringEntity.setValue(PortalRing, 'isFocused', true);
			setTimeout(() => {
				sessionEntity.setValue(PortalSession, 'phase', 'transitioning');
				sessionEntity.setValue(PortalSession, 'transitionProgress', 0);
			}, 500);
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

		handleTap(ndcX, ndcY) {
			if (sessionEntity.getValue(PortalSession, 'phase') !== 'ar-idle') return false;
			const raycaster = new Raycaster();
			const pointer = new Vector2(ndcX, ndcY);
			raycaster.setFromCamera(pointer, world.camera);
			const intersects = raycaster.intersectObject(ringMesh, true);
			if (intersects.length > 0) {
				this.focusPortal();
				return true;
			}
			return false;
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
