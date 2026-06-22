/**
 * ECS System Definitions for the Portals Page
 *
 * Systems contain ALL logic. Components are pure data.
 * Systems read component data via queries, mutate via vector views / setValue.
 *
 * Frame budget priorities (negative = before game logic, positive = after):
 *   -5  PortalInputSystem    — pointer/touch → state changes
 *   -3  TabSystem            — spring physics on tab positions
 *    0  BumperSystem         — brand bumper (runs only during intro)
 *    0  CarouselSystem       — cycle active slide
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
					if (current === 'focused') {
						entity.setValue(PortalGate, 'state', 'idle');
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
