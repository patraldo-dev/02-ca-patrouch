/**
 * ECS System Definitions for the Portals Page
 *
 * Systems contain ALL logic. Components are pure data.
 * Systems read component data via queries, mutate via vector views / setValue.
 *
 * Frame budget priorities (negative = before game logic, positive = after):
 *   -5  PortalInputSystem    — pointer/touch → state changes
 *   -4  FocusHoldSystem      — hold-timer → enter portal (replaces menu)
 *   -3  TabSystem            — spring physics on tab positions
 *    0  BumperSystem         — brand bumper (runs only during intro)
 *    0  CarouselSystem       — cycle active slide
 *    0  NarrativeSystem      — lighting conductor (interior mode)
 *    0  ProximityRingSystem  — camera-distance ring reaction (interior mode)
 *    0  EntryCinematicSystem — materialization sequence (interior mode)
 *    1  BackgroundSystem     — lerp colors toward focused portal
 *    2  ParticleSystem       — ambient dust mote movement
 *
 * CRITICAL RULES:
 *   - Never write to entity.object3D.position directly — IWSDK overwrites it
 *   - Use entity.getVectorView(Transform, 'position') for spatial mutation
 *   - Systems auto-pause when their queries return empty sets
 *   - Entity API: getValue(Component, key), setValue(Component, key, value),
 *     getVectorView(Component, key)
 */

import { createSystem, Transform, eq } from '@iwsdk/core';
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

// ─── Tab System (priority -3) ───────────────────────────────────────
// Spring physics for tab slide-out animation. Reads targetX/Y from
// TabLayout, writes currentX/Y and pushes to Transform.
export const TabSystem = class extends createSystem({
	tabs: { required: [TabLayout, Transform] },
	focused: {
		required: [PortalGate, TabLayout],
		where: [eq(PortalGate, 'state', 'focused')],
	},
}, {
	stiffness:    { type: 'Float32', default: 170 },
	damping:      { type: 'Float32', default: 22 },
	tabSpacing:   { type: 'Float32', default: 0.1 },
	slideOffset:  { type: 'Float32', default: 0.3 },
}) {
	update(delta) {
		const k = this.config.stiffness.value;
		const c = this.config.damping.value;
		const offset = this.config.slideOffset.value;

		// Determine which tab is focused
		let focusedIndex = -1;
		for (const entity of this.queries.focused.entities) {
			focusedIndex = entity.getValue(TabLayout, 'railIndex');
			break;
		}

		for (const entity of this.queries.tabs.entities) {
			const railIdx = entity.getValue(TabLayout, 'railIndex');
			const restX = entity.getValue(TabLayout, 'restX');
			const restY = entity.getValue(TabLayout, 'restY');

			const pos = entity.getVectorView(Transform, 'position');

			// Determine target: focused tabs slide out, others stay in rail
			let targetX = restX;

			if (railIdx === focusedIndex) {
				targetX = restX + offset;
			} else if (focusedIndex >= 0) {
				// Non-focused tabs nudge slightly (spring repulsion)
				const dist = Math.abs(railIdx - focusedIndex);
				targetX = restX + offset * 0.15 / (1 + dist * 0.5);
			}

			// Spring physics: F = -k(x - target) - c*v
			const currentX = pos[0];
			const vel = entity.getValue(TabLayout, 'springVelocity');

			const forceX = -k * (currentX - targetX) - c * vel;
			const newVel = vel + forceX * delta;
			const newX = currentX + newVel * delta;

			entity.setValue(TabLayout, 'springVelocity', newVel);
			entity.setValue(TabLayout, 'currentX', newX);
			pos[0] = newX;
			pos[1] = restY + (pos[1] - restY) * 0.9;

			// Scale: focused tab grows slightly
			const scaleView = entity.getVectorView(Transform, 'scale');
			const targetScale = (railIdx === focusedIndex) ? 1.15 : 1.0;
			scaleView[0] += (targetScale - scaleView[0]) * 0.1;
			scaleView[1] += (targetScale - scaleView[1]) * 0.1;
		}
	}
};

// ─── Background System (priority 1) ─────────────────────────────────
// Lerps the reactive background colors toward the focused portal's palette.
export const BackgroundSystem = class extends createSystem({
	background: { required: [ReactiveBackground] },
	focusedPortal: {
		required: [PortalGate],
		where: [eq(PortalGate, 'state', 'focused')],
	},
}) {
	init() {
		this.bgMesh = new THREE.Mesh(
			new THREE.PlaneGeometry(2, 2),
			new THREE.ShaderMaterial({
				uniforms: {
					uColorA: { value: new THREE.Color(0x0d0d14) },
					uColorB: { value: new THREE.Color(0x05050a) },
					uTime: { value: 0 },
				},
				vertexShader: `
					varying vec2 vUv;
					void main() {
						vUv = uv;
						gl_Position = vec4(position, 1.0);
					}
				`,
				fragmentShader: `
					uniform vec3 uColorA;
					uniform vec3 uColorB;
					uniform float uTime;
					varying vec2 vUv;
					void main() {
						float t = vUv.y + sin(vUv.x * 2.0 + uTime * 0.1) * 0.05;
						vec3 color = mix(uColorA, uColorB, smoothstep(0.0, 1.0, t));
						float grain = fract(sin(dot(vUv * uTime, vec2(12.9898, 78.233))) * 43758.5453);
						color += (grain - 0.5) * 0.015;
						gl_FragColor = vec4(color, 1.0);
					}
				`,
				depthTest: false,
				depthWrite: false,
			})
		);
		this.bgMesh.frustumCulled = false;
		this.bgMesh.renderOrder = -1000;
		this.world.scene.add(this.bgMesh);
		this.cleanupFuncs.push(() => {
			this.world.scene.remove(this.bgMesh);
			this.bgMesh.geometry.dispose();
			this.bgMesh.material.dispose();
		});
	}

	update(delta, time) {
		let targetA = null;
		let targetB = null;

		for (const entity of this.queries.focusedPortal.entities) {
			const colorView = entity.getVectorView(PortalGate, 'colorPrimary');
			targetA = new THREE.Color(
				colorView[0] * 0.15,
				colorView[1] * 0.15,
				colorView[2] * 0.15
			);
			const bgView = entity.getVectorView(PortalGate, 'colorBg');
			targetB = new THREE.Color(
				bgView[0] * 0.05,
				bgView[1] * 0.05,
				bgView[2] * 0.05
			);
			break;
		}

		for (const entity of this.queries.background.entities) {
			const bgView = entity.getVectorView(ReactiveBackground);
			const speed = bgView.driftSpeed[0];

			if (targetA) {
				bgView.targetColorA[0] = targetA.r;
				bgView.targetColorA[1] = targetA.g;
				bgView.targetColorA[2] = targetA.b;
			}
			if (targetB) {
				bgView.targetColorB[0] = targetB.r;
				bgView.targetColorB[1] = targetB.g;
				bgView.targetColorB[2] = targetB.b;
			}

			// Lerp current toward target
			const lerpFactor = 1 - Math.exp(-speed * delta);
			bgView.colorA[0] += (bgView.targetColorA[0] - bgView.colorA[0]) * lerpFactor;
			bgView.colorA[1] += (bgView.targetColorA[1] - bgView.colorA[1]) * lerpFactor;
			bgView.colorA[2] += (bgView.targetColorA[2] - bgView.colorA[2]) * lerpFactor;
			bgView.colorB[0] += (bgView.targetColorB[0] - bgView.colorB[0]) * lerpFactor;
			bgView.colorB[1] += (bgView.targetColorB[1] - bgView.colorB[1]) * lerpFactor;
			bgView.colorB[2] += (bgView.targetColorB[2] - bgView.colorB[2]) * lerpFactor;

			// Push to shader
			this.bgMesh.material.uniforms.uColorA.value.setRGB(
				bgView.colorA[0], bgView.colorA[1], bgView.colorA[2]
			);
			this.bgMesh.material.uniforms.uColorB.value.setRGB(
				bgView.colorB[0], bgView.colorB[1], bgView.colorB[2]
			);
			this.bgMesh.material.uniforms.uTime.value = time;
		}
	}
};

// ─── Particle System (priority 2) ───────────────────────────────────
// Ambient dust motes. Recycles particles when they exceed lifespan.
export const ParticleSystem = class extends createSystem({
	particles: { required: [AmbientParticle, Transform] },
}, {
	maxParticles: { type: 'Int32', default: 80 },
	spawnRadius:  { type: 'Float32', default: 3 },
}) {
	init() {
		const geo = new THREE.BufferGeometry();
		const positions = new Float32Array(this.config.maxParticles.value * 3);
		geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geo.setDrawRange(0, 0);

		const mat = new THREE.PointsMaterial({
			color: 0xffffff,
			size: 0.004,
			transparent: true,
			opacity: 0.3,
			sizeAttenuation: true,
			depthWrite: false,
		});

		this.points = new THREE.Points(geo, mat);
		this.points.frustumCulled = false;
		this.world.scene.add(this.points);

		this.cleanupFuncs.push(() => {
			this.world.scene.remove(this.points);
			geo.dispose();
			mat.dispose();
		});
	}

	update(delta) {
		const positions = this.points.geometry.attributes.position;
		const maxParts = this.config.maxParticles.value;
		const spawnR = this.config.spawnRadius.value;

		let count = 0;
		for (const entity of this.queries.particles.entities) {
			if (count >= maxParts) break;

			const pos = entity.getVectorView(Transform, 'position');
			const age = entity.getValue(AmbientParticle, 'age');
			const lifespan = entity.getValue(AmbientParticle, 'lifespan');
			let newAge = age + delta;

			if (newAge > lifespan) {
				newAge = 0;
				pos[0] = (Math.random() - 0.5) * spawnR;
				pos[1] = -0.5 + Math.random() * 0.5;
				pos[2] = (Math.random() - 0.5) * spawnR;
				entity.setValue(AmbientParticle, 'velocityX', (Math.random() - 0.5) * 0.002);
				entity.setValue(AmbientParticle, 'velocityY', 0.003 + Math.random() * 0.008);
				entity.setValue(AmbientParticle, 'velocityZ', (Math.random() - 0.5) * 0.002);
			}
			entity.setValue(AmbientParticle, 'age', newAge);

			const vx = entity.getValue(AmbientParticle, 'velocityX');
			const vy = entity.getValue(AmbientParticle, 'velocityY');
			const vz = entity.getValue(AmbientParticle, 'velocityZ');

			pos[0] += vx;
			pos[1] += vy;
			pos[2] += vz;

			positions.array[count * 3]     = pos[0];
			positions.array[count * 3 + 1] = pos[1];
			positions.array[count * 3 + 2] = pos[2];
			count++;
		}

		this.points.geometry.setDrawRange(0, count);
		positions.needsUpdate = true;
	}
};

// ─── Carousel System (priority 0) ───────────────────────────────────
// Cycles through portal video previews. Fades opacity, dispatches focus.
export const CarouselSystem = class extends createSystem({
	slides: { required: [CarouselSlide, Transform] },
}, {
	cycleDuration: { type: 'Float32', default: 6 },
}) {
	update(delta) {
		const slides = [...this.queries.slides.entities];
		if (slides.length === 0) return;

		const cycleDur = this.config.cycleDuration.value;

		for (const entity of slides) {
			const isActive = entity.getValue(CarouselSlide, 'isActive');
			let timer = entity.getValue(CarouselSlide, 'cycleTimer');

			if (isActive) {
				timer += delta;
				if (timer >= cycleDur) {
					entity.setValue(CarouselSlide, 'isActive', false);
					entity.setValue(CarouselSlide, 'cycleTimer', 0);

					const currentIdx = slides.indexOf(entity);
					const next = slides[(currentIdx + 1) % slides.length];
					next.setValue(CarouselSlide, 'isActive', true);

					const portalId = next.getValue(CarouselSlide, 'portalId');
					this.globals.onCarouselAdvance?.(portalId);
				}
				entity.setValue(CarouselSlide, 'cycleTimer', timer);
			}

			// Fade opacity toward active state
			let opacity = entity.getValue(CarouselSlide, 'opacity');
			const target = isActive ? 1 : 0;
			opacity += (target - opacity) * 0.05;
			entity.setValue(CarouselSlide, 'opacity', opacity);

			const mesh = entity.object3D;
			if (mesh && mesh.material) {
				mesh.material.opacity = opacity;
				mesh.visible = opacity > 0.01;
			}
		}
	}
};

// ─── Bumper System (priority 0, runs once) ──────────────────────────
// Brand bumper: particle convergence → patrouch.ca wordmark hold → shatter → done.
// Renders "patrouch.ca" + hero tagline via canvas texture during hold phase.
// Query self-empties when phase = 'done', so cost drops to zero.
const BUMPER_TAGLINES = {
	en: 'A Playful Space for Serious Writing',
	es: 'Un Espacio Lúdico para Escritura Seria',
	fr: "Un Espace Ludique pour l'Écriture Sérieuse",
};

function createBumperTexture(locale) {
	const canvas = document.createElement('canvas');
	canvas.width = 1024;
	canvas.height = 512;
	const ctx = canvas.getContext('2d');

	ctx.clearRect(0, 0, 1024, 512);

	// patrouch.ca — large, centered, gold
	ctx.fillStyle = '#c9a87c';
	ctx.font = 'bold 72px Inter, system-ui, sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('patrouch.ca', 512, 200);

	// Hero tagline — locale-aware
	ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
	ctx.font = '300 24px Inter, system-ui, sans-serif';
	ctx.fillText(BUMPER_TAGLINES[locale] || BUMPER_TAGLINES.en, 512, 280);

	const texture = new THREE.CanvasTexture(canvas);
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	return texture;
}

export const BumperSystem = class extends createSystem({
	bumper: { required: [BumperPhase] },
}, {
	convergeDuration: { type: 'Float32', default: 1.0 },
	holdDuration:     { type: 'Float32', default: 1.6 },
	shatterDuration:  { type: 'Float32', default: 0.7 },
}) {
	init() {
		// Particle system for bumper
		this.particleCount = 200;
		const geo = new THREE.BufferGeometry();
		const positions = new Float32Array(this.particleCount * 3);
		this.velocities = new Float32Array(this.particleCount * 3);
		this.startPositions = new Float32Array(this.particleCount * 3);

		for (let i = 0; i < this.particleCount; i++) {
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			const r = 3 + Math.random() * 2;
			this.startPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
			this.startPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
			this.startPositions[i * 3 + 2] = r * Math.cos(phi);
		}

		geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

		this.bumperMat = new THREE.PointsMaterial({
			color: 0xc9a87c,
			size: 0.02,
			transparent: true,
			opacity: 0,
			sizeAttenuation: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		});

		this.bumperParticles = new THREE.Points(geo, this.bumperMat);
		this.bumperParticles.frustumCulled = false;
		this.world.scene.add(this.bumperParticles);

		// Wordmark plane — hidden until hold phase
		const bumperLocale = this.globals.locale || 'es';
		this.wordTex = createBumperTexture(bumperLocale);
		const wordMat = new THREE.MeshBasicMaterial({
			map: this.wordTex,
			transparent: true,
			opacity: 0,
			depthTest: false,
			depthWrite: false,
			side: THREE.DoubleSide,
		});
		const wordGeo = new THREE.PlaneGeometry(1.5, 0.75);
		this.wordmark = new THREE.Mesh(wordGeo, wordMat);
		this.wordmark.position.set(0, 0, 0);
		this.wordmark.renderOrder = 999;
		this.world.scene.add(this.wordmark);

		this.cleanupFuncs.push(() => {
			this.world.scene.remove(this.bumperParticles);
			this.world.scene.remove(this.wordmark);
			geo.dispose();
			this.bumperMat.dispose();
			wordGeo.dispose();
			this.wordTex.dispose();
		});
	}

	update(delta) {
		for (const entity of this.queries.bumper.entities) {
			const phase = entity.getValue(BumperPhase, 'phase');
			let elapsed = entity.getValue(BumperPhase, 'elapsed') + delta;
			entity.setValue(BumperPhase, 'elapsed', elapsed);

			const positions = this.bumperParticles.geometry.attributes.position;
			const mat = this.bumperMat;
			const t = elapsed;

			if (phase === 'converge') {
				const convergeDur = this.config.convergeDuration.value;
				const progress = Math.min(t / convergeDur, 1);
				const eased = 1 - Math.pow(1 - progress, 3);

				for (let i = 0; i < this.particleCount; i++) {
					positions.array[i * 3]     = this.startPositions[i * 3] * (1 - eased);
					positions.array[i * 3 + 1] = this.startPositions[i * 3 + 1] * (1 - eased);
					positions.array[i * 3 + 2] = this.startPositions[i * 3 + 2] * (1 - eased);
				}
				mat.opacity = eased * 0.8;

				if (progress >= 1) {
					entity.setValue(BumperPhase, 'phase', 'hold');
				}
			} else if (phase === 'hold') {
				const holdDur = this.config.holdDuration.value;
				const holdStart = this.config.convergeDuration.value;
				const holdElapsed = t - holdStart;

				// Wordmark fades in over first 300ms, holds, fades out last 300ms
				const wordFadeIn = Math.min(holdElapsed / 0.3, 1);
				const wordFadeOut = holdElapsed > holdDur - 0.3
					? Math.max(0, 1 - (holdElapsed - (holdDur - 0.3)) / 0.3)
					: 1;
				this.wordmark.material.opacity = wordFadeIn * wordFadeOut;

				// Particles dim during hold, wordmark takes center
				const pulse = Math.sin(t * 8) * 0.05 + 0.25;
				mat.opacity = pulse * (1 - wordFadeIn * 0.7);
				mat.size = 0.02 + Math.sin(t * 5) * 0.003;

				if (t >= holdStart + holdDur) {
					entity.setValue(BumperPhase, 'phase', 'shatter');
					// Assign outward velocities for shatter
					for (let i = 0; i < this.particleCount; i++) {
						const px = positions.array[i * 3];
						const py = positions.array[i * 3 + 1];
						const pz = positions.array[i * 3 + 2];
						const len = Math.sqrt(px * px + py * py + pz * pz) || 1;
						const speed = 2 + Math.random() * 3;
						this.velocities[i * 3]     = (px / len) * speed;
						this.velocities[i * 3 + 1] = (py / len) * speed;
						this.velocities[i * 3 + 2] = (pz / len) * speed;
					}
				}
			} else if (phase === 'shatter') {
				const shatterDur = this.config.shatterDuration.value;
				const shatterStart = this.config.convergeDuration.value + this.config.holdDuration.value;
				const progress = Math.min((t - shatterStart) / shatterDur, 1);

				for (let i = 0; i < this.particleCount; i++) {
					positions.array[i * 3]     += this.velocities[i * 3] * delta;
					positions.array[i * 3 + 1] += this.velocities[i * 3 + 1] * delta;
					positions.array[i * 3 + 2] += this.velocities[i * 3 + 2] * delta;
					this.velocities[i * 3 + 1] -= 2 * delta; // gravity
				}
				mat.opacity = 0.8 * (1 - progress);

				if (progress >= 1) {
					entity.setValue(BumperPhase, 'phase', 'done');
					mat.opacity = 0;
					this.bumperParticles.visible = false;
					this.wordmark.visible = false;
					this.globals.onBumperComplete?.();
				}
			}

			positions.needsUpdate = true;
		}
	}
};

// ─── Portal Input System (priority -5) ──────────────────────────────
// Raycasts pointer/touch events against tab meshes. Updates PortalGate state.
export const PortalInputSystem = class extends createSystem({
	portals: { required: [PortalGate, TabLayout, Transform] },
}) {
	init() {
		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();
		this._onPointerDown = (e) => this._handlePointer(e.clientX, e.clientY);
		this._onPointerMove = (e) => this._handleHover(e.clientX, e.clientY);
		this.world.renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
		this.world.renderer.domElement.addEventListener('pointermove', this._onPointerMove);
		this.cleanupFuncs.push(() => {
			this.world.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown);
			this.world.renderer.domElement.removeEventListener('pointermove', this._onPointerMove);
		});
	}

	_ndc(clientX, clientY) {
		const rect = this.world.renderer.domElement.getBoundingClientRect();
		this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
	}

	_handlePointer(clientX, clientY) {
		this._ndc(clientX, clientY);
		this.raycaster.setFromCamera(this.pointer, this.world.camera);
		let hitEntity = null;
		let minDist = Infinity;

		for (const entity of this.queries.portals.entities) {
			const mesh = entity.object3D;
			if (!mesh) continue;
			const intersects = this.raycaster.intersectObject(mesh, false);
			if (intersects.length > 0 && intersects[0].distance < minDist) {
				minDist = intersects[0].distance;
			hitEntity = entity;
			}
		}

		if (hitEntity) {
			const focusedId = hitEntity.getValue(PortalGate, 'portalId');
			for (const entity of this.queries.portals.entities) {
				if (entity === hitEntity) {
					entity.setValue(PortalGate, 'state', 'focused');
				} else {
					const current = entity.getValue(PortalGate, 'state');
					if (current === 'focused' || current === 'entering') {
						entity.setValue(PortalGate, 'state', 'idle');
						entity.setValue(PortalGate, 'focusTimer', 0);
					}
				}
			}
			this.globals.onPortalFocus?.(focusedId);
		}
	}

	_handleHover(clientX, clientY) {
		this._ndc(clientX, clientY);
		this.raycaster.setFromCamera(this.pointer, this.world.camera);

		for (const entity of this.queries.portals.entities) {
			const mesh = entity.object3D;
			if (!mesh) continue;
			const intersects = this.raycaster.intersectObject(mesh, false);
			entity.setValue(TabLayout, 'isHovered', intersects.length > 0);
		}
	}

	update() {
		// Apply hover effects — emissive glow on hovered tabs
		for (const entity of this.queries.portals.entities) {
			const hovered = entity.getValue(TabLayout, 'isHovered');
			const mesh = entity.object3D;
			if (!mesh) continue;

			const targetEmissive = hovered ? 0.3 : 0.05;
			if (mesh.material && mesh.material.emissiveIntensity !== undefined) {
				mesh.material.emissiveIntensity += (targetEmissive - mesh.material.emissiveIntensity) * 0.1;
			}
		}
	}
};

// ─── Focus Hold System (priority -4) ────────────────────────────────
// Counts how long user holds focus on a portal. When the hold threshold
// is reached, triggers mode transition to portal interior. This replaces
// the old menu/button approach — user just touches and holds.
export const FocusHoldSystem = class extends createSystem({
	focused: {
		required: [PortalGate, TabLayout],
		where: [eq(PortalGate, 'state', 'focused')],
	},
	mode: { required: [WorldMode] },
}) {
	update(delta) {
		const modeEntity = this.queries.mode.entities.values().next().value;
		if (!modeEntity) return;
		const mode = modeEntity.getValue(WorldMode, 'mode');
		if (mode !== 'index') return;

		for (const entity of this.queries.focused.entities) {
			let timer = entity.getValue(PortalGate, 'focusTimer') + delta;
			const threshold = entity.getValue(PortalGate, 'holdThreshold');
			entity.setValue(PortalGate, 'focusTimer', timer);

			// Visual feedback: scale grows as hold progresses
			const progress = Math.min(timer / threshold, 1);
			const scaleView = entity.getVectorView(Transform, 'scale');
			const baseScale = 1.0;
			const targetScale = baseScale + progress * 0.3;
			scaleView[0] += (targetScale - scaleView[0]) * 0.15;
			scaleView[1] += (targetScale - scaleView[1]) * 0.15;

			// Emissive intensifies
			const mesh = entity.object3D;
			if (mesh?.material?.emissiveIntensity !== undefined) {
				mesh.material.emissiveIntensity = 0.05 + progress * 0.5;
			}

			if (timer >= threshold) {
				entity.setValue(PortalGate, 'state', 'entering');
				const portalId = entity.getValue(PortalGate, 'portalId');
				modeEntity.setValue(WorldMode, 'mode', 'transitioning');
				modeEntity.setValue(WorldMode, 'activePortalId', portalId);
				modeEntity.setValue(WorldMode, 'transitionProgress', 0);
				this.globals.onPortalEnter?.(portalId);
			}
		}
	}
};

// ─── Narrative System (priority 0, interior mode) ──────────────────
// The conductor. Derives 3 lighting palettes from the portal's base color.
// State advances on crystal interaction. Each state shifts hue, intensity,
// and fog density. Immediate visual payoff — tap crystal, world changes mood.
export const NarrativeSystem = class extends createSystem({
	narrative: { required: [NarrativeState] },
	mode: { required: [WorldMode] },
}) {
	init() {
		this.ambientLight = null;
		this.directionalLight = null;
		this.currentColor = new THREE.Color(0x2d4a3e);
		this.targetColor = new THREE.Color(0x2d4a3e);
		this.currentIntensity = 0.5;
		this.targetIntensity = 0.5;
		this.currentFog = 0.0;
		this.targetFog = 0.0;
	}

	update(delta) {
		const modeEntity = this.queries.mode.entities.values().next().value;
		if (!modeEntity) return;
		const mode = modeEntity.getValue(WorldMode, 'mode');
		if (mode !== 'interior') return;

		const narrEntity = this.queries.narrative.entities.values().next().value;
		if (!narrEntity) return;

		// Smooth transition progress
		let tProgress = narrEntity.getValue(NarrativeState, 'transitionProgress');
		const tSpeed = narrEntity.getValue(NarrativeState, 'transitionSpeed');
		tProgress = Math.min(tProgress + delta * tSpeed, 1);
		narrEntity.setValue(NarrativeState, 'transitionProgress', tProgress);

		// Snap target when transition starts
		const targetIdx = narrEntity.getValue(NarrativeState, 'targetStateIndex');
		const currentIdx = narrEntity.getValue(NarrativeState, 'stateIndex');

		if (targetIdx !== currentIdx && tProgress >= 0.5) {
			narrEntity.setValue(NarrativeState, 'stateIndex', targetIdx);
		}

		// Derive palette from state index
		const stateIdx = currentIdx;
		const baseHex = this.globals.portalBaseColor || '#c9a87c';
		const baseColor = new THREE.Color(baseHex);
		const hsl = baseColor.getHSL({});

		// Each state: hue shift + intensity multiplier + fog multiplier
		// Uses scene config narrative_states if provided by Mistral, else derived defaults
		const sceneStates = this.globals.narrativeStates;
		const stateConfigs = (sceneStates && sceneStates.length >= 2) ? sceneStates : [
			{ hueShift: 0,    intensityMul: 1.0, fogMul: 1.0 },
			{ hueShift: 0.083, intensityMul: 1.3, fogMul: 0.4 },
			{ hueShift: 0.667, intensityMul: 0.6, fogMul: 3.0 },
		];
		const cfg = stateConfigs[stateIdx] || stateConfigs[0];

		this.targetColor.setHSL(
			(hsl.h + cfg.hueShift) % 1,
			hsl.s,
			Math.min(hsl.l * cfg.intensityMul, 0.9)
		);
		this.targetIntensity = 0.4 + cfg.intensityMul * 0.3;
		this.targetFog = Math.min(0.03 * cfg.fogMul, 0.08);

		// Lerp current toward target
		const lerpFactor = 1 - Math.exp(-tSpeed * delta);
		this.currentColor.lerp(this.targetColor, lerpFactor);
		this.currentIntensity += (this.targetIntensity - this.currentIntensity) * lerpFactor;
		this.currentFog += (this.targetFog - this.currentFog) * lerpFactor;

		// Apply to lights
		if (this.ambientLight) {
			this.ambientLight.color.copy(this.currentColor);
			this.ambientLight.intensity = this.currentIntensity;
		}
		if (this.directionalLight) {
			this.directionalLight.color.copy(this.currentColor).lerp(new THREE.Color(0xffffff), 0.3);
		}

		// Apply fog
		if (this.scene.fog) {
			this.scene.fog.density = this.currentFog;
		} else if (this.currentFog > 0.001) {
			this.scene.fog = new THREE.FogExp2(this.currentColor.getHex(), this.currentFog);
		}
	}

	setLights(ambient, directional) {
		this.ambientLight = ambient;
		this.directionalLight = directional;
	}

	advance() {
		const narrEntity = this.queries.narrative.entities.values().next().value;
		if (!narrEntity) return;
		const maxStates = narrEntity.getValue(NarrativeState, 'maxStates');
		const currentTarget = narrEntity.getValue(NarrativeState, 'targetStateIndex');
		const next = (currentTarget + 1) % maxStates;
		narrEntity.setValue(NarrativeState, 'targetStateIndex', next);
		narrEntity.setValue(NarrativeState, 'transitionProgress', 0);
	}
};

// ─── Proximity Ring System (priority 0, interior mode) ─────────────
// Camera distance drives ring scale, emissive, pulse speed.
// Cross triggerDistance → auto-transition (VR or cinematic).
export const ProximityRingSystem = class extends createSystem({
	rings: { required: [PortalRing, Transform] },
	mode: { required: [WorldMode] },
}) {
	update(delta) {
		const modeEntity = this.queries.mode.entities.values().next().value;
		if (!modeEntity) return;
		const mode = modeEntity.getValue(WorldMode, 'mode');
		if (mode !== 'interior') return;

		const cameraPos = this.camera.position;

		for (const entity of this.queries.rings.entities) {
			const ringPos = entity.getVectorView(Transform, 'position');
			const dx = cameraPos.x - ringPos[0];
			const dy = cameraPos.y - ringPos[1];
			const dz = cameraPos.z - ringPos[2];
			const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

			const activationRadius = entity.getValue(PortalRing, 'activationRadius');
			const triggerDistance = entity.getValue(PortalRing, 'triggerDistance');

			// Proximity: 0 = far, 1 = at trigger distance
			const proximity = THREE.MathUtils.clamp(
				1 - (distance - triggerDistance) / (activationRadius - triggerDistance),
				0, 1
			);
			entity.setValue(PortalRing, 'proximity', proximity);

			// Scale: grows as you approach
			const baseScale = 1.0;
			const scaleBoost = proximity * 0.5;
			const scale = baseScale + scaleBoost;
			const scaleView = entity.getVectorView(Transform, 'scale');
			scaleView[0] += (scale - scaleView[0]) * 0.1;
			scaleView[1] += (scale - scaleView[1]) * 0.1;
			scaleView[2] += (scale - scaleView[2]) * 0.1;

			// Pulse: faster as you approach
			let pulse = entity.getValue(PortalRing, 'pulsePhase');
			const pulseSpeed = 2 + proximity * 8;
			pulse += delta * pulseSpeed;
			entity.setValue(PortalRing, 'pulsePhase', pulse);

			const pulseScale = 1 + Math.sin(pulse) * (0.02 + proximity * 0.08);
			scaleView[0] *= pulseScale;
			scaleView[1] *= pulseScale;

			// Emissive intensity
			const mesh = entity.object3D;
			if (mesh) {
				mesh.traverse((child) => {
					if (child.material && child.material.emissiveIntensity !== undefined) {
						child.material.emissiveIntensity = 0.3 + proximity * 0.7;
					}
				});
			}

			// Auto-transition on threshold cross
			if (distance < triggerDistance) {
				modeEntity.setValue(WorldMode, 'mode', 'transitioning');
				modeEntity.setValue(WorldMode, 'transitionProgress', 0);
				this.globals.onProximityTrigger?.();
			}
		}
	}
};

// ─── Entry Cinematic System (priority 0, interior mode) ────────────
// On entering interior mode, everything materializes from scale 0 / opacity 0
// in sequence: ring → particles → crystals → pillars → ambient sound fades in.
export const EntryCinematicSystem = class extends createSystem({
	mode: { required: [WorldMode] },
	decorations: { required: [InteriorDecoration, Transform] },
}) {
	update(delta) {
		const modeEntity = this.queries.mode.entities.values().next().value;
		if (!modeEntity) return;
		const mode = modeEntity.getValue(WorldMode, 'mode');

		if (mode !== 'interior' && mode !== 'transitioning') return;

		let timer = modeEntity.getValue(WorldMode, 'cinematicTimer');
		if (mode === 'interior' || mode === 'transitioning') {
			timer += delta;
			modeEntity.setValue(WorldMode, 'cinematicTimer', timer);
		}

		for (const entity of this.queries.decorations.entities) {
			const delay = entity.getValue(InteriorDecoration, 'spawnDelay');
			const localTime = Math.max(timer - delay, 0);
			const matDuration = 0.8;
			let materialized = Math.min(localTime / matDuration, 1);
			// Ease out cubic
			materialized = 1 - Math.pow(1 - materialized, 3);
			entity.setValue(InteriorDecoration, 'materialized', materialized);

			// Scale from 0
			const scaleView = entity.getVectorView(Transform, 'scale');
			scaleView[0] = materialized;
			scaleView[1] = materialized;
			scaleView[2] = materialized;

			// Opacity
			const mesh = entity.object3D;
			if (mesh) {
				mesh.traverse((child) => {
					if (child.material) {
						child.material.transparent = materialized < 1;
						child.material.opacity = materialized;
					}
				});
			}

			// Float animation (only after materialized)
			if (materialized > 0.5) {
				const baseY = entity.getValue(InteriorDecoration, 'baseY');
				const amp = entity.getValue(InteriorDecoration, 'floatAmp');
				const speed = entity.getValue(InteriorDecoration, 'floatSpeed');
				const phase = entity.getValue(InteriorDecoration, 'floatPhase');
				const pos = entity.getVectorView(Transform, 'position');
				pos[1] = baseY + Math.sin(timer * speed + phase) * amp;
			}
		}
	}
};

// ─── Crystal Interaction System (priority -4, interior mode) ────────
// Detects clicks/touches on crystal meshes via manual raycast.
// On hit: calls advanceNarrative(), spawns a particle burst, dispatches event.
// Works without InputSystem (which only activates inside XR sessions).
export const CrystalInteractionSystem = class extends createSystem({
	crystals: {
		required: [InteriorDecoration, Transform],
		where: [eq(InteriorDecoration, 'decoType', 'crystal')],
	},
	mode: { required: [WorldMode] },
}) {
	init() {
		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();
		this.lastTapTime = 0;
		this.bursts = []; // active particle bursts

		this._onPointerDown = (e) => this._handleTap(e.clientX, e.clientY);
		this.world.renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
		this.cleanupFuncs.push(() => {
			this.world.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown);
		});
	}

	_handleTap(clientX, clientY) {
		const modeEntity = this.queries.mode.entities.values().next().value;
		if (!modeEntity) return;
		const mode = modeEntity.getValue(WorldMode, 'mode');
		if (mode !== 'interior') return;

		// Throttle — prevent rapid multi-tap
		const now = performance.now();
		if (now - this.lastTapTime < 400) return;

		const rect = this.world.renderer.domElement.getBoundingClientRect();
		this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, this.world.camera);

		for (const entity of this.queries.crystals.entities) {
			const mesh = entity.object3D;
			if (!mesh) continue;
			// Only tap fully materialized crystals
			if (entity.getValue(InteriorDecoration, 'materialized') < 0.8) continue;

			const intersects = this.raycaster.intersectObject(mesh, false);
			if (intersects.length > 0) {
				this.lastTapTime = now;
				this._spawnBurst(mesh.position);
				this._advanceNarrative();

				// Visual: crystal flashes
				if (mesh.material) {
					const origEmissive = mesh.material.emissiveIntensity || 0.3;
					mesh.material.emissiveIntensity = 2.0;
					setTimeout(() => {
						if (mesh.material) mesh.material.emissiveIntensity = origEmissive;
					}, 300);
				}

				window.dispatchEvent(new CustomEvent('crystal-tapped', {
					detail: { position: [mesh.position.x, mesh.position.y, mesh.position.z] }
				}));
				break;
			}
		}
	}

	_advanceNarrative() {
		for (const sys of this.world.systems) {
			if (sys instanceof NarrativeSystem) {
				sys.advance();
				return;
			}
		}
	}

	_spawnBurst(position) {
		const count = 25;
		const geo = new THREE.BufferGeometry();
		const positions = new Float32Array(count * 3);
		const velocities = [];

		for (let i = 0; i < count; i++) {
			positions[i * 3] = position.x;
			positions[i * 3 + 1] = position.y;
			positions[i * 3 + 2] = position.z;
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(2 * Math.random() - 1);
			const speed = 0.5 + Math.random() * 1.5;
			velocities.push([
				Math.sin(phi) * Math.cos(theta) * speed,
				Math.sin(phi) * Math.sin(theta) * speed,
				Math.cos(phi) * speed,
			]);
		}

		geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		const mat = new THREE.PointsMaterial({
			color: 0xffffff,
			size: 0.03,
			transparent: true,
			opacity: 1,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			sizeAttenuation: true,
		});

		const points = new THREE.Points(geo, mat);
		this.scene.add(points);
		this.bursts.push({ points, geo, mat, velocities, age: 0, duration: 1.0 });
	}

	update(delta) {
		// Update active bursts
		for (let i = this.bursts.length - 1; i >= 0; i--) {
			const burst = this.bursts[i];
			burst.age += delta;
			const positions = burst.geo.attributes.position;

			for (let j = 0; j < burst.velocities.length; j++) {
				positions.array[j * 3] += burst.velocities[j][0] * delta;
				positions.array[j * 3 + 1] += burst.velocities[j][1] * delta;
				positions.array[j * 3 + 2] += burst.velocities[j][2] * delta;
				// Gravity
				burst.velocities[j][1] -= 2 * delta;
			}
			positions.needsUpdate = true;

			const lifeRatio = burst.age / burst.duration;
			burst.mat.opacity = Math.max(0, 1 - lifeRatio);
			burst.mat.size = 0.03 * (1 - lifeRatio * 0.5);

			if (burst.age >= burst.duration) {
				this.scene.remove(burst.points);
				burst.geo.dispose();
				burst.mat.dispose();
				this.bursts.splice(i, 1);
			}
		}
	}
};
