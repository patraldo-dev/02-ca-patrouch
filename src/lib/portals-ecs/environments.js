// ═══════════════════════════════════════════════════════════
//  environments.js — Unique atmospheric builders per portal
//  Each portal gets completely different geometry + particles
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';

/**
 * @returns {{ update(dt, time, lights) }} per-frame animation handle
 */
export function buildEnvironment(config, scene, track) {
	const type = config.environment?.type || 'space';
	const builders = {
		ocean:       buildOcean,
		forest:      buildForest,
		celebration: buildCelebration,
		space:       buildCosmos,
		city:        buildCity,
		dream:       buildDream,
		theater:     buildTheater,
		memory:      buildMemory,
	};
	const builder = builders[type] || buildCosmos;
	return builder(config, scene, track);
}

// ── Ocean: rising bubbles + animated water surface + caustic lights ──
function buildOcean(config, scene, track) {
	const p = config.palette;
	const count = 600;

	// Bubble particles rising upward
	const geo = new THREE.BufferGeometry();
	const positions = new Float32Array(count * 3);
	const speeds = new Float32Array(count);
	const sways = new Float32Array(count);

	for (let i = 0; i < count; i++) {
		positions[i * 3]     = (Math.random() - 0.5) * 12;
		positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
		positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
		speeds[i] = 0.4 + Math.random() * 0.6;
		sways[i] = Math.random() * Math.PI * 2;
	}
	geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

	const mat = new THREE.PointsMaterial({
		color: new THREE.Color(0x33ccff),
		size: 0.12, transparent: true, opacity: 0.6,
		blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	});
	const bubbles = new THREE.Points(geo, mat);
	scene.add(bubbles); track(bubbles);

	// Water surface above
	const waterGeo = new THREE.PlaneGeometry(16, 16, 24, 24);
	const waterMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color(p.primary),
		transparent: true, opacity: 0.15,
		side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
	});
	const water = new THREE.Mesh(waterGeo, waterMat);
	water.rotation.x = -Math.PI / 2;
	water.position.y = 4;
	scene.add(water); track(water);
	const waterBase = new Float32Array(waterGeo.attributes.position.array);

	return {
		update(dt, time, lights) {
			const tt = time / 1000;
			const pos = geo.attributes.position.array;
			for (let i = 0; i < count; i++) {
				pos[i * 3 + 1] += speeds[i] * dt;
				pos[i * 3]     += Math.sin(tt * 0.8 + sways[i]) * 0.008;
				pos[i * 3 + 2] += Math.cos(tt * 0.6 + sways[i] * 1.3) * 0.008;
				if (pos[i * 3 + 1] > 5) {
					pos[i * 3 + 1] = -4;
					pos[i * 3]     = (Math.random() - 0.5) * 12;
					pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
				}
			}
			geo.attributes.position.needsUpdate = true;

			const wp = waterGeo.attributes.position.array;
			for (let i = 0; i < wp.length; i += 3) {
				const x = waterBase[i], y = waterBase[i + 1];
				wp[i + 2] = Math.sin(x * 0.4 + tt * 1.2) * 0.15 + Math.cos(y * 0.4 + tt) * 0.1;
			}
			waterGeo.attributes.position.needsUpdate = true;

			if (lights.key) {
				lights.key.position.x = Math.sin(tt * 0.2) * 3;
				lights.key.position.z = Math.cos(tt * 0.2) * 3;
			}
		},
	};
}

// ── Forest: floating pollen + tree trunks + god rays ──
function buildForest(config, scene, track) {
	const count = 350;
	const geo = new THREE.BufferGeometry();
	const positions = new Float32Array(count * 3);
	const phases = new Float32Array(count);

	for (let i = 0; i < count; i++) {
		positions[i * 3]     = (Math.random() - 0.5) * 10;
		positions[i * 3 + 1] = Math.random() * 5;
		positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
		phases[i] = Math.random() * Math.PI * 2;
	}
	geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

	const mat = new THREE.PointsMaterial({
		color: new THREE.Color(0xffdd44),
		size: 0.08, transparent: true, opacity: 0.8,
		blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	});
	const pollen = new THREE.Points(geo, mat);
	scene.add(pollen); track(pollen);

	// Tree trunks
	for (let i = 0; i < 6; i++) {
		const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
		const r = 4 + Math.random() * 2;
		const h = 3 + Math.random() * 3;
		const tg = new THREE.CylinderGeometry(0.15, 0.25, h, 6);
		const tm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2a3a18), transparent: true, opacity: 0.7 });
		const trunk = new THREE.Mesh(tg, tm);
		trunk.position.set(Math.cos(angle) * r, h / 2 - 1.5, Math.sin(angle) * r);
		trunk.rotation.z = (Math.random() - 0.5) * 0.15;
		scene.add(trunk); track(trunk);
	}

	// Vertical light shafts
	const shaftGeo = new THREE.PlaneGeometry(0.6, 6);
	for (let i = 0; i < 3; i++) {
		const angle = Math.random() * Math.PI * 2;
		const r = 2 + Math.random();
		const sm = new THREE.MeshBasicMaterial({
			color: new THREE.Color(0x88ff66),
			transparent: true, opacity: 0.04,
			blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
		});
		const shaft = new THREE.Mesh(shaftGeo, sm);
		shaft.position.set(Math.cos(angle) * r, 2, Math.sin(angle) * r);
		shaft.lookAt(0, 2, 0);
		scene.add(shaft); track(shaft);
	}

	return {
		update(dt, time) {
			const tt = time / 1000;
			const pos = geo.attributes.position.array;
			for (let i = 0; i < count; i++) {
				pos[i * 3 + 1] -= 0.15 * dt;
				pos[i * 3]     += Math.sin(tt * 0.5 + phases[i]) * 0.006;
				pos[i * 3 + 2] += Math.cos(tt * 0.4 + phases[i] * 1.2) * 0.006;
				if (pos[i * 3 + 1] < -1) {
					pos[i * 3 + 1] = 5;
					pos[i * 3]     = (Math.random() - 0.5) * 10;
					pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
				}
			}
			geo.attributes.position.needsUpdate = true;
		},
	};
}

// ── Celebration: confetti + lanterns + rhythmic pulse ──
function buildCelebration(config, scene, track) {
	const count = 500;
	const geo = new THREE.BufferGeometry();
	const positions = new Float32Array(count * 3);
	const colors = new Float32Array(count * 3);
	const vel = [];

	for (let i = 0; i < count; i++) {
		positions[i * 3]     = (Math.random() - 0.5) * 10;
		positions[i * 3 + 1] = Math.random() * 8;
		positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
		const c = new THREE.Color().setHSL(Math.random(), 0.9, 0.6);
		colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
		vel.push({
			vx: (Math.random() - 0.5) * 0.5,
			vy: -0.3 - Math.random() * 0.4,
			vz: (Math.random() - 0.5) * 0.5,
		});
	}
	geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

	const mat = new THREE.PointsMaterial({
		size: 0.12, vertexColors: true, transparent: true, opacity: 0.9,
		blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	});
	const confetti = new THREE.Points(geo, mat);
	scene.add(confetti); track(confetti);

	// Floating lantern spheres
	const lanterns = [];
	for (let i = 0; i < 5; i++) {
		const lg = new THREE.SphereGeometry(0.15, 8, 8);
		const lm = new THREE.MeshBasicMaterial({
			color: new THREE.Color().setHSL(0.05 + Math.random() * 0.08, 0.9, 0.65),
			transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending,
		});
		const lantern = new THREE.Mesh(lg, lm);
		lantern.position.set(
			(Math.random() - 0.5) * 8,
			1 + Math.random() * 3,
			(Math.random() - 0.5) * 8,
		);
		lantern.userData = { baseY: lantern.position.y, phase: Math.random() * Math.PI * 2 };
		scene.add(lantern); track(lantern);
		lanterns.push(lantern);
	}

	return {
		update(dt, time, lights) {
			const tt = time / 1000;
			const pos = geo.attributes.position.array;
			for (let i = 0; i < count; i++) {
				const v = vel[i];
				pos[i * 3]     += v.vx * dt;
				pos[i * 3 + 1] += v.vy * dt;
				pos[i * 3 + 2] += v.vz * dt;
				v.vy -= 0.5 * dt;
				if (pos[i * 3 + 1] < -3) {
					pos[i * 3]     = (Math.random() - 0.5) * 10;
					pos[i * 3 + 1] = 5 + Math.random() * 3;
					pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
					v.vy = -0.3 - Math.random() * 0.4;
					v.vx = (Math.random() - 0.5) * 0.5;
					v.vz = (Math.random() - 0.5) * 0.5;
				}
			}
			geo.attributes.position.needsUpdate = true;

			for (const l of lanterns) {
				l.position.y = l.userData.baseY + Math.sin(tt + l.userData.phase) * 0.3;
			}

			// Rhythmic pulse at ~120 BPM
			const beat = Math.max(0, Math.sin(tt * Math.PI * 4));
			if (lights.key) lights.key.intensity = config.lighting.key_light.intensity + beat * 3;
			if (lights.under) lights.under.intensity = config.lighting.under_light.intensity + beat * 2;
		},
	};
}

// ── Cosmos: dense starfield + nebula clouds + planet ──
function buildCosmos(config, scene, track) {
	const p = config.palette;
	const count = 2500;

	const geo = new THREE.BufferGeometry();
	const positions = new Float32Array(count * 3);
	const colors = new Float32Array(count * 3);

	for (let i = 0; i < count; i++) {
		const r = 5 + Math.random() * 20;
		const theta = Math.random() * Math.PI * 2;
		const phi = Math.acos(2 * Math.random() - 1);
		positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
		positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
		positions[i * 3 + 2] = r * Math.cos(phi);
		const c = new THREE.Color().setHSL(0.6 + Math.random() * 0.15, 0.3, 0.6 + Math.random() * 0.4);
		colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
	}
	geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

	const mat = new THREE.PointsMaterial({
		size: 0.05, vertexColors: true, transparent: true, opacity: 0.95,
		blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	});
	const stars = new THREE.Points(geo, mat);
	scene.add(stars); track(stars);

	// Nebula clouds
	const nebCount = 12;
	const nebGeo = new THREE.BufferGeometry();
	const nebPos = new Float32Array(nebCount * 3);
	const nebCol = new Float32Array(nebCount * 3);
	for (let i = 0; i < nebCount; i++) {
		nebPos[i * 3]     = (Math.random() - 0.5) * 16;
		nebPos[i * 3 + 1] = (Math.random() - 0.5) * 8;
		nebPos[i * 3 + 2] = -5 - Math.random() * 10;
		const c = new THREE.Color().setHSL(0.7 + Math.random() * 0.15, 0.8, 0.4);
		nebCol[i * 3] = c.r; nebCol[i * 3 + 1] = c.g; nebCol[i * 3 + 2] = c.b;
	}
	nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
	nebGeo.setAttribute('color', new THREE.BufferAttribute(nebCol, 3));

	const nebMat = new THREE.PointsMaterial({
		size: 3.0, vertexColors: true, transparent: true, opacity: 0.06,
		blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	});
	const nebula = new THREE.Points(nebGeo, nebMat);
	scene.add(nebula); track(nebula);

	// Distant planet
	const planetGeo = new THREE.SphereGeometry(1.2, 24, 24);
	const planetMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color(p.primary), transparent: true, opacity: 0.15,
	});
	const planet = new THREE.Mesh(planetGeo, planetMat);
	planet.position.set(-4, 2, -10);
	scene.add(planet); track(planet);

	return {
		update(dt) {
			stars.rotation.y += dt * 0.005;
			nebula.rotation.y -= dt * 0.002;
			planet.rotation.y += dt * 0.02;
		},
	};
}

// ── City: wireframe buildings + rain + neon flicker ──
function buildCity(config, scene, track) {
	const p = config.palette;

	// Wireframe building silhouettes
	for (let i = 0; i < 12; i++) {
		const w = 0.8 + Math.random() * 1.2;
		const h = 2 + Math.random() * 5;
		const d = 0.8 + Math.random() * 1.2;
		const boxGeo = new THREE.BoxGeometry(w, h, d);
		const edges = new THREE.EdgesGeometry(boxGeo);
		const lm = new THREE.LineBasicMaterial({
			color: new THREE.Color(p.primary).multiplyScalar(0.6 + Math.random() * 0.4),
			transparent: true, opacity: 0.3 + Math.random() * 0.2,
		});
		const building = new THREE.LineSegments(edges, lm);
		const angle = (i / 12) * Math.PI * 2;
		const r = 3 + Math.random() * 4;
		building.position.set(Math.cos(angle) * r, h / 2 - 1.5, Math.sin(angle) * r);
		scene.add(building); track(building);
		boxGeo.dispose();
	}

	// Rain
	const count = 400;
	const geo = new THREE.BufferGeometry();
	const positions = new Float32Array(count * 3);
	const speeds = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		positions[i * 3]     = (Math.random() - 0.5) * 14;
		positions[i * 3 + 1] = Math.random() * 10;
		positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
		speeds[i] = 3 + Math.random() * 2;
	}
	geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

	const mat = new THREE.PointsMaterial({
		color: new THREE.Color(0x88aacc),
		size: 0.06, transparent: true, opacity: 0.5,
		blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	});
	const rain = new THREE.Points(geo, mat);
	scene.add(rain); track(rain);

	return {
		update(dt, time, lights) {
			const pos = geo.attributes.position.array;
			for (let i = 0; i < count; i++) {
				pos[i * 3 + 1] -= speeds[i] * dt;
				if (pos[i * 3 + 1] < -3) {
					pos[i * 3]     = (Math.random() - 0.5) * 14;
					pos[i * 3 + 1] = 6 + Math.random() * 4;
					pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
				}
			}
			geo.attributes.position.needsUpdate = true;

			// Neon flicker
			if (lights.under) {
				lights.under.intensity = config.lighting.under_light.intensity + (Math.random() > 0.95 ? 4 : 0);
			}
		},
	};
}

// ── Dream: swirling orbs + floating crystal shapes ──
function buildDream(config, scene, track) {
	const count = 200;
	const geo = new THREE.BufferGeometry();
	const positions = new Float32Array(count * 3);
	const colors = new Float32Array(count * 3);
	const phases = new Float32Array(count);
	const radii = new Float32Array(count);

	for (let i = 0; i < count; i++) {
		radii[i] = 2 + Math.random() * 5;
		phases[i] = Math.random() * Math.PI * 2;
		positions[i * 3]     = Math.cos(phases[i]) * radii[i];
		positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
		positions[i * 3 + 2] = Math.sin(phases[i]) * radii[i];
		const c = new THREE.Color().setHSL(0.78 + Math.random() * 0.12, 0.8, 0.6 + Math.random() * 0.3);
		colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
	}
	geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

	const mat = new THREE.PointsMaterial({
		size: 0.35, vertexColors: true, transparent: true, opacity: 0.4,
		blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	});
	const orbs = new THREE.Points(geo, mat);
	scene.add(orbs); track(orbs);

	// Floating translucent crystals
	const crystals = [];
	const crystalGeos = [
		new THREE.IcosahedronGeometry(0.3, 0),
		new THREE.OctahedronGeometry(0.35),
		new THREE.TetrahedronGeometry(0.4),
	];
	for (let i = 0; i < 4; i++) {
		const cg = crystalGeos[i % crystalGeos.length];
		const cm = new THREE.MeshBasicMaterial({
			color: new THREE.Color().setHSL(0.8 + Math.random() * 0.1, 0.7, 0.5),
			transparent: true, opacity: 0.15,
			blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
		});
		const crystal = new THREE.Mesh(cg, cm);
		crystal.position.set(
			(Math.random() - 0.5) * 6,
			Math.random() * 3,
			(Math.random() - 0.5) * 6,
		);
		crystal.userData = {
			baseY: crystal.position.y,
			phase: Math.random() * Math.PI * 2,
			rx: Math.random() * 0.3, ry: Math.random() * 0.3,
		};
		scene.add(crystal); track(crystal);
		crystals.push(crystal);
	}

	return {
		update(dt, time) {
			const tt = time / 1000;
			const pos = geo.attributes.position.array;
			for (let i = 0; i < count; i++) {
				phases[i] += dt * 0.15;
				pos[i * 3]     = Math.cos(phases[i]) * radii[i];
				pos[i * 3 + 1] += Math.sin(tt * 0.3 + phases[i]) * 0.005;
				pos[i * 3 + 2] = Math.sin(phases[i]) * radii[i];
			}
			geo.attributes.position.needsUpdate = true;

			for (const c of crystals) {
				c.rotation.x += c.userData.rx * dt;
				c.rotation.y += c.userData.ry * dt;
				c.position.y = c.userData.baseY + Math.sin(tt * 0.5 + c.userData.phase) * 0.2;
			}
		},
	};
}

// ── Theater: spotlight cone + dust motes + stage ──
function buildTheater(config, scene, track) {
	// Light beam cone
	const coneGeo = new THREE.ConeGeometry(2.5, 5, 24, 1, true);
	const coneMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color(0xffcc66),
		transparent: true, opacity: 0.04,
		blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
	});
	const cone = new THREE.Mesh(coneGeo, coneMat);
	cone.position.set(0, 1.5, 0);
	scene.add(cone); track(cone);

	// Dust motes in beam
	const count = 200;
	const geo = new THREE.BufferGeometry();
	const positions = new Float32Array(count * 3);
	const phases = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		const t = Math.random();
		const radius = t * 1.8;
		const angle = Math.random() * Math.PI * 2;
		positions[i * 3]     = Math.cos(angle) * radius;
		positions[i * 3 + 1] = -1 + t * 4;
		positions[i * 3 + 2] = Math.sin(angle) * radius;
		phases[i] = Math.random() * Math.PI * 2;
	}
	geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

	const mat = new THREE.PointsMaterial({
		color: new THREE.Color(0xffdd88),
		size: 0.05, transparent: true, opacity: 0.7,
		blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	});
	const dust = new THREE.Points(geo, mat);
	scene.add(dust); track(dust);

	// Stage floor
	const stageGeo = new THREE.CircleGeometry(2, 32);
	const stageMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color(0x1a1208), transparent: true, opacity: 0.6,
	});
	const stage = new THREE.Mesh(stageGeo, stageMat);
	stage.rotation.x = -Math.PI / 2;
	stage.position.y = -1.5;
	scene.add(stage); track(stage);

	return {
		update(dt, time, lights) {
			const tt = time / 1000;
			const pos = geo.attributes.position.array;
			for (let i = 0; i < count; i++) {
				pos[i * 3]     += Math.sin(tt * 0.3 + phases[i]) * 0.003;
				pos[i * 3 + 1] += Math.cos(tt * 0.2 + phases[i] * 1.5) * 0.002;
				pos[i * 3 + 2] += Math.cos(tt * 0.25 + phases[i]) * 0.003;
			}
			geo.attributes.position.needsUpdate = true;

			// Candle-like flicker
			if (lights.key) {
				lights.key.intensity = config.lighting.key_light.intensity
					+ Math.sin(tt * 3) * 0.5 + Math.sin(tt * 7) * 0.3;
			}
		},
	};
}

// ── Memory: sepia dust + floating photo planes ──
function buildMemory(config, scene, track) {
	const count = 300;
	const geo = new THREE.BufferGeometry();
	const positions = new Float32Array(count * 3);
	const phases = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		positions[i * 3]     = (Math.random() - 0.5) * 10;
		positions[i * 3 + 1] = Math.random() * 6 - 1;
		positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
		phases[i] = Math.random() * Math.PI * 2;
	}
	geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

	const mat = new THREE.PointsMaterial({
		color: new THREE.Color(0xddb870),
		size: 0.04, transparent: true, opacity: 0.5,
		blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	});
	const dust = new THREE.Points(geo, mat);
	scene.add(dust); track(dust);

	// Floating photo planes
	const photos = [];
	for (let i = 0; i < 4; i++) {
		const pg = new THREE.PlaneGeometry(0.6, 0.8);
		const pm = new THREE.MeshBasicMaterial({
			color: new THREE.Color(0x6d82ad).multiplyScalar(0.5),
			transparent: true, opacity: 0.12, side: THREE.DoubleSide,
		});
		const photo = new THREE.Mesh(pg, pm);
		photo.position.set(
			(Math.random() - 0.5) * 6,
			0.5 + Math.random() * 2,
			(Math.random() - 0.5) * 4 - 1,
		);
		photo.rotation.set(
			(Math.random() - 0.5) * 0.3,
			Math.random() * Math.PI * 2,
			(Math.random() - 0.5) * 0.2,
		);
		photo.userData = {
			baseY: photo.position.y,
			phase: Math.random() * Math.PI * 2,
			rotY: photo.rotation.y,
		};
		scene.add(photo); track(photo);
		photos.push(photo);
	}

	return {
		update(dt, time) {
			const tt = time / 1000;
			const pos = geo.attributes.position.array;
			for (let i = 0; i < count; i++) {
				pos[i * 3]     += Math.sin(tt * 0.2 + phases[i]) * 0.004;
				pos[i * 3 + 1] += Math.cos(tt * 0.15 + phases[i] * 1.3) * 0.003;
				pos[i * 3 + 2] += Math.sin(tt * 0.18 + phases[i] * 0.7) * 0.004;
			}
			geo.attributes.position.needsUpdate = true;

			for (const ph of photos) {
				ph.position.y = ph.userData.baseY + Math.sin(tt * 0.3 + ph.userData.phase) * 0.15;
				ph.rotation.y = ph.userData.rotY + Math.sin(tt * 0.1 + ph.userData.phase) * 0.1;
			}
		},
	};
}
