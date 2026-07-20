// @ts-nocheck — Three.js animation helper, excluded from type-checking
// ═══════════════════════════════════════════════════════════
//  departure-effects.js
//  Shared collection-departure animations. Used by grab-demo, Oz, and
//  future game worlds. When a collectible is collected, it doesn't "die" —
//  it departs. Each behavior type has a signature way of leaving the scene:
//    passive → POP (squash-and-stretch to zero, playful bounce)
//    evade    → DEFLATE (Z collapses first, balloon letting out air)
//    attack   → SCATTER (meshes disperse outward, drifting apart)
//    hide     → DISSOLVE (scale up + opacity to zero, ghostly)
//    monkey   → SCATTER (alias for attack — flying monkeys disperse)
//  All departures also spawn a small sparkle burst (colored by behavior glow).
//
//  Managed as raw THREE objects (not ECS entities) — updated each frame
//  via update(dt), disposed when all particles expire. No game-specific
//  dependencies — pass THREE + scene at init(), call spawn() on collection,
//  call update(dt) each frame.
// ═══════════════════════════════════════════════════════════

export class DepartureEffects {
	constructor() {
		this.THREE = null;
		this.scene = null;
		this.effects = [];  // [{ update(dt) → done?, dispose() }]
	}

	init(THREE, scene) {
		this.THREE = THREE;
		this.scene = scene;
	}

	// Spawn the behavior-appropriate departure at the entity's position.
	// `obj` is the collected entity's object3D (Group containing the GLB clone).
	spawn(behavior, obj, glowColor) {
		if (!this.THREE || !this.scene) return;
		const pos = obj.position.clone();
		// Always spawn a sparkle burst (consistent feedback across departures).
		this._sparkleBurst(pos, glowColor);
		switch (behavior) {
			case 'attack':  this._scatter(obj, glowColor); break;
			case 'monkey':  this._scatter(obj, glowColor); break;  // alias
			case 'evade':   this._deflate(obj); break;
			case 'hide':    this._dissolve(obj); break;
			default:        this._pop(obj); break;  // passive + unknown
		}
	}

	// ── POP: squash-and-stretch to zero. Classic cartoon collect. ──
	_pop(obj) {
		const startScale = obj.scale.x;
		this.effects.push({
			t: 0,
			update(dt) {
				this.t += dt;
				const p = Math.min(1, this.t / 0.35);
				// Stretch up briefly, then squash to zero
				if (p < 0.2) {
					const s = startScale * (1 + p * 1.5);
					obj.scale.set(s * 0.8, s * 1.3, s * 0.8);
				} else {
					const q = (p - 0.2) / 0.8;
					const s = startScale * (1 - q) * (1 + Math.sin(q * Math.PI * 2) * 0.1);
					obj.scale.set(s * 1.3, s * 0.4, s * 1.3);  // flat splat
				}
				obj.rotation.y += dt * 8;
				return p >= 1;
			},
			dispose() { /* obj destroyed by caller */ },
		});
	}

	// ── DEFLATE: Z collapses first (flatten), then the rest shrinks. ──
	_deflate(obj) {
		const startScale = obj.scale.x;
		this.effects.push({
			t: 0,
			update(dt) {
				this.t += dt;
				const p = Math.min(1, this.t / 0.5);
				if (p < 0.4) {
					// Flatten on Z first (balloon losing air)
					const z = startScale * (1 - p / 0.4);
					obj.scale.set(startScale, startScale, Math.max(0.01, z));
				} else {
					// Then shrink all axes with a wobble
					const q = (p - 0.4) / 0.6;
					const s = startScale * (1 - q);
					obj.scale.set(s, s * 0.5, s * 0.1);
				}
				obj.rotation.z += dt * 3;
				return p >= 1;
			},
			dispose() {},
		});
	}

	// ── SCATTER: clone child meshes into fragments that disperse outward. ──
	_scatter(obj, glowColor) {
		const T = this.THREE;
		const color = glowColor || 0xff4444;
		const meshes = [];
		obj.traverse((c) => { if (c.isMesh) meshes.push(c); });
		if (meshes.length === 0) return;
		// Clone each mesh as a fragment, hide the original
		obj.visible = false;
		const fragments = [];
		const origin = obj.position.clone();
		for (const m of meshes.slice(0, 4)) {  // cap at 4 fragments for perf
			const frag = m.clone();
			frag.material = new T.MeshBasicMaterial({
				color, transparent: true, opacity: 0.85,
				blending: T.AdditiveBlending, depthWrite: false,
			});
			frag.position.copy(origin).add(new T.Vector3(
				(Math.random() - 0.5) * 0.3,
				(Math.random() - 0.5) * 0.3,
				(Math.random() - 0.5) * 0.3,
			));
			this.scene.add(frag);
			fragments.push({
				mesh: frag,
				vel: new T.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4),
				rotVel: new T.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8),
			});
		}
		this.effects.push({
			t: 0,
			update(dt) {
				this.t += dt;
				const gravity = -9.8;
				for (const f of fragments) {
					f.vel.y += gravity * dt;
					f.mesh.position.addScaledVector(f.vel, dt);
					f.mesh.rotation.x += f.rotVel.x * dt;
					f.mesh.rotation.y += f.rotVel.y * dt;
					f.mesh.rotation.z += f.rotVel.z * dt;
					f.mesh.material.opacity = Math.max(0, 0.85 - this.t * 1.2);
					f.mesh.scale.multiplyScalar(1 - dt * 0.8);
				}
				return this.t >= 0.7;
			},
			dispose() {
				for (const f of fragments) {
					f.mesh.parent?.remove(f.mesh);
					f.mesh.geometry?.dispose();
					f.mesh.material?.dispose();
				}
			},
		});
	}

	// ── DISSOLVE: scale up + opacity to zero. Ghostly departure for hiders. ──
	_dissolve(obj) {
		const startScale = obj.scale.x;
		const meshes = [];
		obj.traverse((c) => { if (c.isMesh && c.material) meshes.push(c); });
		this.effects.push({
			t: 0,
			update(dt) {
				this.t += dt;
				const p = Math.min(1, this.t / 0.6);
				const s = startScale * (1 + p * 0.5);  // grow as it fades
				obj.scale.setScalar(s);
				obj.rotation.y += dt * 2;
				for (const m of meshes) {
					if (m.material) m.material.opacity = Math.max(0, 0.9 * (1 - p));
				}
				return p >= 1;
			},
			dispose() {},
		});
	}

	// ── SPARKLE BURST: small colored particles radiating outward. ──
	// Shared across all departure types for consistent "I collected something" feedback.
	_sparkleBurst(pos, glowColor) {
		const T = this.THREE;
		const color = glowColor || 0xffffff;
		const COUNT = 12;
		const particles = [];
		const geo = new T.SphereGeometry(0.06, 6, 4);
		for (let i = 0; i < COUNT; i++) {
			const mat = new T.MeshBasicMaterial({
				color, transparent: true, opacity: 1,
				blending: T.AdditiveBlending, depthWrite: false,
			});
			const p = new T.Mesh(geo, mat);
			p.position.copy(pos);
			this.scene.add(p);
			const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.3;
			const up = Math.random() * 2 + 0.5;
			const speed = Math.random() * 2 + 1;
			particles.push({
				mesh: p,
				vel: new T.Vector3(Math.cos(angle) * speed, up, Math.sin(angle) * speed),
			});
		}
		this.effects.push({
			t: 0,
			update(dt) {
				this.t += dt;
				for (const p of particles) {
					p.vel.y -= 6 * dt;  // light gravity
					p.mesh.position.addScaledVector(p.vel, dt);
					p.mesh.material.opacity = Math.max(0, 1 - this.t * 2.5);
					p.mesh.scale.multiplyScalar(1 - dt * 1.5);
				}
				return this.t >= 0.45;
			},
			dispose() {
				for (const p of particles) {
					p.mesh.parent?.remove(p.mesh);
					p.mesh.material?.dispose();
				}
			},
		});
	}

	update(dt) {
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const fx = this.effects[i];
			if (fx.update(dt)) {
				fx.dispose();
				this.effects.splice(i, 1);
			}
		}
	}
}

// Map behavior → glow color (used by callers that don't have their own map).
export const BEHAVIOR_GLOWS = {
	passive: 0x88ff88,
	evade:   0xffcc44,
	attack:  0xff4444,
	hide:    0x88ccff,
	follow:  0xcc88ff,
	monkey:  0x8a44cc,  // purple — flying monkeys
};
