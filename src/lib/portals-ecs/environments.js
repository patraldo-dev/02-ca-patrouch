// environments.js — Static composed scenes per portal type
// Theatrical flats, ground planes, silhouette skylines.
// No particle systems. Each portal is a recognizable PLACE.
import * as THREE from 'three';

export function buildEnvironment(config, scene, track) {
	const type = config.environment?.type || 'space';
	const builders = {
		ocean: buildOcean, forest: buildForest, celebration: buildCelebration,
		space: buildCosmos, city: buildCity, dream: buildDream,
		theater: buildTheater, memory: buildMemory,
	};
	return (builders[type] || buildCosmos)(config, scene, track);
}

// Helper: large backdrop plane
function backdrop(scene, track, color, w, h, z) {
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(w || 40, h || 16),
		new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.8, depthWrite: false }),
	);
	m.position.set(0, h/2 - 2, z || -12);
	scene.add(m); track(m);
	return m;
}

// Helper: ground plane
function ground(scene, track, color) {
	const m = new THREE.Mesh(
		new THREE.PlaneGeometry(40, 40),
		new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.6 }),
	);
	m.rotation.x = -Math.PI/2; m.position.y = -1.5;
	scene.add(m); track(m);
	return m;
}

// ═══ OCEAN ═══
function buildOcean(config, scene, track) {
	const p = config.palette;
	backdrop(scene, track, 0x004488, 40, 18, -14);
	ground(scene, track, 0x1a4050);

	// Light shafts from surface
	for (let i = 0; i < 4; i++) {
		const shaft = new THREE.Mesh(
			new THREE.PlaneGeometry(0.6, 6),
			new THREE.MeshBasicMaterial({ color: 0x66bbff, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
		);
		shaft.position.set(-3 + i*2, 1.5, -8);
		shaft.rotation.y = (Math.random()-0.5)*0.3;
		scene.add(shaft); track(shaft);
	}

	// Coral mounds
	for (let i = 0; i < 5; i++) {
		const a = (i/5)*Math.PI*2 - Math.PI/2;
		const r = 4 + Math.random()*2;
		for (let b = 0; b < 3; b++) {
			const h = 0.8 + Math.random()*1.5;
			const c = new THREE.Mesh(
				new THREE.ConeGeometry(0.15+Math.random()*0.1, h, 6),
				new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(Math.random()*0.12, 0.7, 0.45), transparent: true, opacity: 0.7 }),
			);
			c.position.set(Math.cos(a)*r + (Math.random()-0.5)*0.6, -1.5+h/2, Math.sin(a)*r + (Math.random()-0.5)*0.6);
			c.rotation.set((Math.random()-0.5)*0.4, Math.random()*Math.PI, (Math.random()-0.5)*0.3);
			scene.add(c); track(c);
		}
	}

	// Static fish shapes (frozen mid-swim)
	const fishColors = [0xff6b35, 0xffd700, 0x00ced1, 0xff4466];
	for (let i = 0; i < 8; i++) {
		const fc = fishColors[i % 4];
		const fg = new THREE.SphereGeometry(0.18, 8, 6); fg.scale(1.8, 0.8, 0.4);
		const fm = new THREE.MeshBasicMaterial({ color: fc, transparent: true, opacity: 0.65 });
		const fish = new THREE.Mesh(fg, fm);
		const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 4), fm);
		tail.position.x = -0.28; tail.rotation.z = Math.PI/2; fish.add(tail);
		fish.position.set((Math.random()-0.5)*10, -0.5+Math.random()*3, -2-Math.random()*6);
		fish.rotation.y = Math.random()*Math.PI*2;
		scene.add(fish); track(fish);
	}

	// Boat hull silhouette at surface
	const hull = new THREE.Mesh(
		new THREE.BoxGeometry(2, 0.3, 0.6),
		new THREE.MeshBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.5 }),
	);
	hull.position.set(2, 3.5, -4); hull.rotation.z = 0.03;
	scene.add(hull); track(hull);
	const mast = new THREE.Mesh(
		new THREE.CylinderGeometry(0.025, 0.025, 1.8, 4),
		new THREE.MeshBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.4 }),
	);
	mast.position.set(2, 4.5, -4);
	scene.add(mast); track(mast);

	// Seaweed strips
	for (let i = 0; i < 6; i++) {
		const a = Math.random()*Math.PI*2, r = 3+Math.random()*4, h = 1.5+Math.random()*1.5;
		const sw = new THREE.Mesh(
			new THREE.PlaneGeometry(0.1, h),
			new THREE.MeshBasicMaterial({ color: 0x2d8a3e, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
		);
		sw.position.set(Math.cos(a)*r, -1.5+h/2, Math.sin(a)*r);
		sw.rotation.z = (Math.random()-0.5)*0.2;
		scene.add(sw); track(sw);
	}

	return { update() {} };
}

// ═══ FOREST ═══
function buildForest(config, scene, track) {
	const p = config.palette;
	backdrop(scene, track, 0x1a3a18, 40, 18, -14);
	ground(scene, track, 0x1a2810);

	// Tree silhouettes — trunk + cone canopy
	for (let i = 0; i < 10; i++) {
		const a = (i/10)*Math.PI*2 + Math.random()*0.15;
		const r = 3 + Math.random()*5;
		const tx = Math.cos(a)*r, tz = Math.sin(a)*r;
		const h = 4 + Math.random()*4;

		// Trunk
		const trunk = new THREE.Mesh(
			new THREE.CylinderGeometry(0.15, 0.3, h, 6),
			new THREE.MeshBasicMaterial({ color: 0x2a1a08, transparent: true, opacity: 0.85 }),
		);
		trunk.position.set(tx, h/2-1.5, tz);
		scene.add(trunk); track(trunk);

		// Cantry: stacked cones
		const cColor = new THREE.Color().setHSL(0.27+Math.random()*0.08, 0.4, 0.18+Math.random()*0.07);
		for (let c = 0; c < 3; c++) {
			const cone = new THREE.Mesh(
				new THREE.ConeGeometry(1.0-c*0.25, 1.5, 6),
				new THREE.MeshBasicMaterial({ color: cColor, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending }),
			);
			cone.position.set(tx, h-1.5+c*0.8, tz);
			scene.add(cone); track(cone);
		}
	}

	// Bushes (low spheres)
	for (let i = 0; i < 8; i++) {
		const a = Math.random()*Math.PI*2, r = 1.5+Math.random()*4;
		const bush = new THREE.Mesh(
			new THREE.SphereGeometry(0.3+Math.random()*0.2, 6, 5),
			new THREE.MeshBasicMaterial({ color: 0x1a3010, transparent: true, opacity: 0.5 }),
		);
		bush.position.set(Math.cos(a)*r, -1.2, Math.sin(a)*r);
		bush.scale.y = 0.6;
		scene.add(bush); track(bush);
	}

	// Glowing firefly dots (static, not particles)
	for (let i = 0; i < 15; i++) {
		const ff = new THREE.Mesh(
			new THREE.SphereGeometry(0.04, 4, 4),
			new THREE.MeshBasicMaterial({ color: 0xffee66, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }),
		);
		ff.position.set((Math.random()-0.5)*10, Math.random()*4, (Math.random()-0.5)*10);
		scene.add(ff); track(ff);
	}

	return { update() {} };
}

// ═══ CELEBRATION ═══
function buildCelebration(config, scene, track) {
	backdrop(scene, track, 0x3a1500, 40, 18, -14);
	ground(scene, track, 0x2a1000);

	// Lantern strings (chains of glowing spheres in arcs)
	for (let chain = 0; chain < 3; chain++) {
		const y = 1.5 + chain * 1.2;
		const r = 4 + chain * 0.8;
		for (let i = 0; i < 12; i++) {
			const a = (i/12)*Math.PI*2;
			const c = new THREE.Color().setHSL(0.05+Math.random()*0.12, 0.95, 0.6);
			const l = new THREE.Mesh(
				new THREE.SphereGeometry(0.15, 8, 8),
				new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }),
			);
			l.position.set(Math.cos(a)*r, y + Math.sin(i*0.6)*0.4, Math.sin(a)*r);
			scene.add(l); track(l);
		}
	}

	// Banner strips (colored rectangles hanging)
	for (let i = 0; i < 8; i++) {
		const a = (i/8)*Math.PI*2, r = 5;
		const c = new THREE.Color().setHSL(Math.random(), 0.8, 0.5);
		const banner = new THREE.Mesh(
			new THREE.PlaneGeometry(0.15, 1.5),
			new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
		);
		banner.position.set(Math.cos(a)*r, 2, Math.sin(a)*r);
		banner.lookAt(0, 2, 0);
		scene.add(banner); track(banner);
	}

	// Table silhouette
	const table = new THREE.Mesh(
		new THREE.BoxGeometry(1.5, 0.1, 0.8),
		new THREE.MeshBasicMaterial({ color: 0x4a2810, transparent: true, opacity: 0.5 }),
	);
	table.position.set(0, -0.8, -2);
	scene.add(table); track(table);

	return { update() {} };
}

// ═══ COSMOS ═══
function buildCosmos(config, scene, track) {
	const p = config.palette;
	backdrop(scene, track, 0x000410, 40, 20, -16);

	// Large ringed planet
	const planet = new THREE.Mesh(
		new THREE.SphereGeometry(2.5, 32, 32),
		new THREE.MeshBasicMaterial({ color: new THREE.Color(p.primary), transparent: true, opacity: 0.18 }),
	);
	planet.position.set(-5, 3, -12);
	scene.add(planet); track(planet);
	const ring = new THREE.Mesh(
		new THREE.RingGeometry(3.5, 5, 64),
		new THREE.MeshBasicMaterial({ color: new THREE.Color(p.primary), transparent: true, opacity: 0.1, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
	);
	ring.position.copy(planet.position); ring.rotation.x = -0.4;
	scene.add(ring); track(ring);

	// Small moon
	const moon = new THREE.Mesh(
		new THREE.SphereGeometry(0.5, 16, 16),
		new THREE.MeshBasicMaterial({ color: 0x9999aa, transparent: true, opacity: 0.2 }),
	);
	moon.position.set(4, -1, -8);
	scene.add(moon); track(moon);

	// Distant star dots (static points, not animated)
	const sg = new THREE.BufferGeometry();
	const sp = new Float32Array(200*3);
	const sc = new Float32Array(200*3);
	for (let i = 0; i < 200; i++) {
		sp[i*3] = (Math.random()-0.5)*30; sp[i*3+1] = (Math.random()-0.5)*16; sp[i*3+2] = -10-Math.random()*8;
		const c = new THREE.Color().setHSL(0.6+Math.random()*0.15, 0.3, 0.7);
		sc[i*3]=c.r; sc[i*3+1]=c.g; sc[i*3+2]=c.b;
	}
	sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
	sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
	const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 0.04, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
	scene.add(stars); track(stars);

	return { update() {} };
}

// ═══ CITY (Manhattan) ═══
function buildCity(config, scene, track) {
	const p = config.palette;
	backdrop(scene, track, 0x111122, 40, 20, -15);
	ground(scene, track, 0x0a0a12);

	// Street markings
	for (let i = -2; i <= 2; i++) {
		const s = new THREE.Mesh(
			new THREE.PlaneGeometry(0.06, 20),
			new THREE.MeshBasicMaterial({ color: 0x444455, transparent: true, opacity: 0.2 }),
		);
		s.rotation.x = -Math.PI/2; s.position.set(i*4, -1.49, 0);
		scene.add(s); track(s);
	}

	// Solid skyscrapers with window grids
	for (let i = 0; i < 16; i++) {
		const angle = (i/16)*Math.PI*2;
		const r = 4 + Math.random()*4;
		const w = 1+Math.random()*1.5, h = 5+Math.random()*8, d = 1+Math.random()*1.5;
		const bx = Math.cos(angle)*r, bz = Math.sin(angle)*r;

		// Solid building
		const b = new THREE.Mesh(
			new THREE.BoxGeometry(w, h, d),
			new THREE.MeshBasicMaterial({ color: 0x0a0a16, transparent: true, opacity: 0.85 }),
		);
		b.position.set(bx, h/2-1.5, bz);
		scene.add(b); track(b);

		// Edge outline
		const edges = new THREE.EdgesGeometry(b.geometry);
		const el = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: new THREE.Color(p.primary).multiplyScalar(0.5), transparent: true, opacity: 0.3 }));
		el.position.copy(b.position);
		scene.add(el); track(el);

		// Window grid
		for (let wr = 0; wr < Math.floor(h/0.5); wr++) {
			for (let wc = 0; wc < Math.floor(w/0.4); wc++) {
				if (Math.random() < 0.35) continue;
				const lit = Math.random() > 0.4;
				const win = new THREE.Mesh(
					new THREE.PlaneGeometry(0.1, 0.1),
					new THREE.MeshBasicMaterial({ color: lit ? 0xffdd66 : 0x222244, transparent: true, opacity: lit ? 0.55 : 0.12, blending: lit ? THREE.AdditiveBlending : THREE.NormalBlending }),
				);
				win.position.set(bx - w/2 + 0.2 + wc*0.35, -1.5 + 0.3 + wr*0.45, bz + d/2 + 0.01);
				scene.add(win); track(win);
			}
		}
	}

	// Moon
	const moon = new THREE.Mesh(
		new THREE.CircleGeometry(0.9, 32),
		new THREE.MeshBasicMaterial({ color: 0xddeeff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending }),
	);
	moon.position.set(-5, 5, -10);
	scene.add(moon); track(moon);

	// Parked vehicles (static)
	for (let i = 0; i < 3; i++) {
		const v = new THREE.Mesh(
			new THREE.BoxGeometry(0.7, 0.25, 0.35),
			new THREE.MeshBasicMaterial({ color: i === 0 ? 0xffcc00 : (i === 1 ? 0xff6633 : 0xcccccc), transparent: true, opacity: 0.55 }),
		);
		v.position.set((i-1)*4, -1.3, 3);
		scene.add(v); track(v);
	}

	return { update() {} };
}

// ═══ DREAM ═══
function buildDream(config, scene, track) {
	backdrop(scene, track, 0x200838, 40, 20, -14);

	// Floating doorway frames
	for (let i = 0; i < 6; i++) {
		const dg = new THREE.TorusGeometry(0.7, 0.04, 6, 4);
		dg.scale(0.6, 1.4, 1);
		const c = new THREE.Color().setHSL(0.78+Math.random()*0.12, 0.6, 0.35);
		const door = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending }));
		door.position.set((Math.random()-0.5)*10, (Math.random()-0.5)*3, -3-Math.random()*5);
		door.rotation.y = Math.random()*Math.PI*2;
		door.rotation.z = (Math.random()-0.5)*0.4;
		scene.add(door); track(door);
	}

	// Floating crystal shapes
	const cgs = [new THREE.IcosahedronGeometry(0.4, 0), new THREE.OctahedronGeometry(0.45), new THREE.TetrahedronGeometry(0.5)];
	for (let i = 0; i < 6; i++) {
		const c = new THREE.Color().setHSL(0.8+Math.random()*0.1, 0.6, 0.4);
		const crystal = new THREE.Mesh(cgs[i%3], new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
		crystal.position.set((Math.random()-0.5)*8, Math.random()*3-1, (Math.random()-0.5)*6-1);
		crystal.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
		scene.add(crystal); track(crystal);
	}

	// Large soft glow orbs (static, not particles)
	for (let i = 0; i < 8; i++) {
		const c = new THREE.Color().setHSL(0.78+Math.random()*0.12, 0.7, 0.5);
		const orb = new THREE.Mesh(
			new THREE.SphereGeometry(0.15+Math.random()*0.2, 8, 8),
			new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending }),
		);
		orb.position.set((Math.random()-0.5)*10, Math.random()*4-1, (Math.random()-0.5)*8);
		scene.add(orb); track(orb);
	}

	return { update() {} };
}

// ═══ THEATER ═══
function buildTheater(config, scene, track) {
	backdrop(scene, track, 0x1a0e00, 40, 18, -14);

	// Stage floor (circular, elevated feel)
	const stage = new THREE.Mesh(
		new THREE.CircleGeometry(3, 32),
		new THREE.MeshBasicMaterial({ color: 0x2a1a08, transparent: true, opacity: 0.5 }),
	);
	stage.rotation.x = -Math.PI/2; stage.position.y = -1.4;
	scene.add(stage); track(stage);

	// Spotlight cone
	const cone = new THREE.Mesh(
		new THREE.ConeGeometry(2, 5, 24, 1, true),
		new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
	);
	cone.position.set(0, 1.5, 0);
	scene.add(cone); track(cone);

	// Curtains (heavy draped shapes)
	for (let side = 0; side < 2; side++) {
		for (let fold = 0; fold < 3; fold++) {
			const cw = 0.5;
			const curtain = new THREE.Mesh(
				new THREE.PlaneGeometry(cw, 4),
				new THREE.MeshBasicMaterial({ color: new THREE.Color(0x440808).multiplyScalar(1 - fold*0.15), transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
			);
			curtain.position.set(side === 0 ? -3 + fold*0.4 : 3 - fold*0.4, 0.5, -1);
			curtain.rotation.z = (side === 0 ? 0.05 : -0.05) * (fold+1);
			scene.add(curtain); track(curtain);
		}
	}

	// Mic stand
	const pole = new THREE.Mesh(
		new THREE.CylinderGeometry(0.025, 0.025, 1.5, 4),
		new THREE.MeshBasicMaterial({ color: 0x666677, transparent: true, opacity: 0.35 }),
	);
	pole.position.set(0.5, -0.75, 0.5);
	scene.add(pole); track(pole);
	const head = new THREE.Mesh(
		new THREE.SphereGeometry(0.07, 8, 8),
		new THREE.MeshBasicMaterial({ color: 0x888899, transparent: true, opacity: 0.4 }),
	);
	head.position.set(0.5, 0, 0.5);
	scene.add(head); track(head);

	// Audience chairs (small box rows)
	for (let row = 0; row < 3; row++) {
		for (let seat = 0; seat < 6; seat++) {
			const chair = new THREE.Mesh(
				new THREE.BoxGeometry(0.25, 0.3, 0.25),
				new THREE.MeshBasicMaterial({ color: 0x1a1208, transparent: true, opacity: 0.4 }),
			);
			chair.position.set(-1.5 + seat*0.6, -1.2, 2 + row*0.8);
			scene.add(chair); track(chair);
		}
	}

	return { update() {} };
}

// ═══ MEMORY ═══
function buildMemory(config, scene, track) {
	backdrop(scene, track, 0x2a1e10, 40, 18, -14);
	ground(scene, track, 0x1e1810);

	// Floating photo frames
	for (let i = 0; i < 7; i++) {
		const w = 0.5 + Math.random()*0.3, h = 0.7 + Math.random()*0.3;
		const frame = new THREE.Mesh(
			new THREE.PlaneGeometry(w, h),
			new THREE.MeshBasicMaterial({ color: 0x8a7050, transparent: true, opacity: 0.15, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
		);
		frame.position.set((Math.random()-0.5)*8, Math.random()*3-0.5, (Math.random()-0.5)*6-1);
		frame.rotation.set((Math.random()-0.5)*0.4, Math.random()*Math.PI*2, (Math.random()-0.5)*0.3);
		scene.add(frame); track(frame);

		// Frame border (slightly larger plane behind)
		const border = new THREE.Mesh(
			new THREE.PlaneGeometry(w+0.06, h+0.06),
			new THREE.MeshBasicMaterial({ color: 0x6a5030, transparent: true, opacity: 0.1, side: THREE.DoubleSide }),
		);
		border.position.copy(frame.position); border.rotation.copy(frame.rotation);
		border.position.x += 0.01; // avoid z-fight
		scene.add(border); track(border);
	}

	// Clock faces (frozen)
	for (let i = 0; i < 4; i++) {
		const clock = new THREE.Mesh(
			new THREE.RingGeometry(0.2, 0.25, 24),
			new THREE.MeshBasicMaterial({ color: 0xb8a070, transparent: true, opacity: 0.2, side: THREE.DoubleSide }),
		);
		clock.position.set((Math.random()-0.5)*8, 1+Math.random()*1.5, -2-Math.random()*3);
		clock.lookAt(0, clock.position.y, 0);
		scene.add(clock); track(clock);

		// Static hour hand
		const hg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0.15,0)]);
		const hand = new THREE.Line(hg, new THREE.LineBasicMaterial({ color: 0xb8a070, transparent: true, opacity: 0.25 }));
		hand.position.copy(clock.position);
		hand.rotation.z = Math.random()*Math.PI*2;
		scene.add(hand); track(hand);
	}

	// Hanging light bulbs (static glow)
	for (let i = 0; i < 6; i++) {
		const bulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.05, 6, 6),
			new THREE.MeshBasicMaterial({ color: 0xddbb77, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }),
		);
		bulb.position.set((Math.random()-0.5)*8, 3+Math.random()*0.5, (Math.random()-0.5)*4);
		scene.add(bulb); track(bulb);

		// Wire
		const wire = new THREE.Mesh(
			new THREE.CylinderGeometry(0.003, 0.003, 1.5, 3),
			new THREE.MeshBasicMaterial({ color: 0x332210, transparent: true, opacity: 0.2 }),
		);
		wire.position.set(bulb.position.x, bulb.position.y + 0.75, bulb.position.z);
		scene.add(wire); track(wire);
	}

	return { update() {} };
}
