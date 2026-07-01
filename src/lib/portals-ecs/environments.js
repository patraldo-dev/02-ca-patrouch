// environments.js — Unique atmospheric builders per portal
// Each portal has signature geometry: fish, coral, trunks,
// buildings, planets, curtains, doorways, clocks, etc.
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

// ═══ OCEAN ═══
function buildOcean(config, scene, track) {
	const p = config.palette;
	const bc = 400;
	const bGeo = new THREE.BufferGeometry();
	const bPos = new Float32Array(bc * 3), bSpd = new Float32Array(bc), bSway = new Float32Array(bc);
	for (let i = 0; i < bc; i++) {
		bPos[i*3]=((Math.random()-0.5)*12); bPos[i*3+1]=((Math.random()-0.5)*8); bPos[i*3+2]=((Math.random()-0.5)*12);
		bSpd[i]=0.4+Math.random()*0.6; bSway[i]=Math.random()*Math.PI*2;
	}
	bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
	const bubbles = new THREE.Points(bGeo, new THREE.PointsMaterial({ color: 0x33ccff, size: 0.12, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
	scene.add(bubbles); track(bubbles);

	const waterGeo = new THREE.PlaneGeometry(16, 16, 24, 24);
	const water = new THREE.Mesh(waterGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(p.primary), transparent: true, opacity: 0.15, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
	water.rotation.x = -Math.PI/2; water.position.y = 4;
	scene.add(water); track(water);
	const waterBase = new Float32Array(waterGeo.attributes.position.array);

	// Coral
	for (let i = 0; i < 8; i++) {
		const a = (i/8)*Math.PI*2+Math.random()*0.3, r = 3+Math.random()*3;
		const cx = Math.cos(a)*r, cz = Math.sin(a)*r;
		for (let b = 0; b < 3+Math.floor(Math.random()*3); b++) {
			const h = 0.5+Math.random()*1.2;
			const bg = new THREE.ConeGeometry(0.08+Math.random()*0.08, h, 5);
			const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(Math.random()*0.1, 0.8, 0.4+Math.random()*0.2), transparent: true, opacity: 0.6 });
			const branch = new THREE.Mesh(bg, bm);
			branch.position.set(cx+(Math.random()-0.5)*0.4, -1.5+h/2, cz+(Math.random()-0.5)*0.4);
			branch.rotation.set((Math.random()-0.5)*0.6, Math.random()*Math.PI, (Math.random()-0.5)*0.4);
			scene.add(branch); track(branch);
		}
	}

	// Fish schools
	const fish = [];
	const fCol = [0xff6b35, 0xffd700, 0x00ced1, 0xff69b4];
	for (let s = 0; s < 4; s++) {
		const sa = (s/4)*Math.PI*2, sr = 3+s*0.5;
		for (let f = 0; f < 6; f++) {
			const fg = new THREE.SphereGeometry(0.12, 6, 4); fg.scale(1.6, 0.7, 0.5);
			const fm = new THREE.MeshBasicMaterial({ color: fCol[s], transparent: true, opacity: 0.7 });
			const m = new THREE.Mesh(fg, fm);
			const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 4), fm);
			tail.position.x = -0.2; tail.rotation.z = Math.PI/2; m.add(tail);
			m.position.set(Math.cos(sa)*sr+(Math.random()-0.5)*1.5, (Math.random()-0.5)*2, Math.sin(sa)*sr+(Math.random()-0.5)*1.5);
			scene.add(m); track(m);
			fish.push({ mesh: m, angle: sa+(f/6)*0.3, radius: sr+(Math.random()-0.5)*0.5, yOff: m.position.y, speed: 0.3+Math.random()*0.2, phase: Math.random()*Math.PI*2 });
		}
	}

	// Seaweed
	const seaweeds = [];
	for (let i = 0; i < 5; i++) {
		const a = Math.random()*Math.PI*2, r = 2+Math.random()*4, h = 1.5+Math.random()*1.5;
		const sg = new THREE.PlaneGeometry(0.08, h, 1, 4);
		const sm = new THREE.MeshBasicMaterial({ color: 0x2d8a3e, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
		const sw = new THREE.Mesh(sg, sm);
		sw.position.set(Math.cos(a)*r, -1.5+h/2, Math.sin(a)*r);
		scene.add(sw); track(sw);
		seaweeds.push({ mesh: sw, phase: Math.random()*Math.PI*2 });
	}

	return {
		update(dt, time, lights) {
			const tt = time/1000;
			const bp = bGeo.attributes.position.array;
			for (let i = 0; i < bc; i++) {
				bp[i*3+1] += bSpd[i]*dt;
				bp[i*3] += Math.sin(tt*0.8+bSway[i])*0.008;
				bp[i*3+2] += Math.cos(tt*0.6+bSway[i]*1.3)*0.008;
				if (bp[i*3+1] > 5) { bp[i*3+1]=-4; bp[i*3]=(Math.random()-0.5)*12; bp[i*3+2]=(Math.random()-0.5)*12; }
			}
			bGeo.attributes.position.needsUpdate = true;
			const wp = waterGeo.attributes.position.array;
			for (let i = 0; i < wp.length; i += 3)
				wp[i+2] = Math.sin(waterBase[i]*0.4+tt*1.2)*0.15 + Math.cos(waterBase[i+1]*0.4+tt)*0.1;
			waterGeo.attributes.position.needsUpdate = true;
			for (const f of fish) {
				f.angle += f.speed*dt;
				f.mesh.position.x = Math.cos(f.angle)*f.radius;
				f.mesh.position.z = Math.sin(f.angle)*f.radius;
				f.mesh.position.y = f.yOff + Math.sin(tt*1.5+f.phase)*0.3;
				f.mesh.rotation.y = -f.angle+Math.PI/2;
				f.mesh.rotation.z = Math.sin(tt*4+f.phase)*0.15;
			}
			for (const s of seaweeds) {
				s.mesh.rotation.z = Math.sin(tt*0.8+s.phase)*0.2;
				s.mesh.rotation.x = Math.cos(tt*0.6+s.phase)*0.15;
			}
			if (lights.key) { lights.key.position.x = Math.sin(tt*0.2)*3; lights.key.position.z = Math.cos(tt*0.2)*3; }
		},
	};
}

// ═══ FOREST ═══
function buildForest(config, scene, track) {
	const pc = 300;
	const pGeo = new THREE.BufferGeometry();
	const pPos = new Float32Array(pc*3), pPh = new Float32Array(pc);
	for (let i = 0; i < pc; i++) { pPos[i*3]=(Math.random()-0.5)*10; pPos[i*3+1]=Math.random()*5; pPos[i*3+2]=(Math.random()-0.5)*10; pPh[i]=Math.random()*Math.PI*2; }
	pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
	const pollen = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffdd44, size: 0.08, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
	scene.add(pollen); track(pollen);

	for (let i = 0; i < 7; i++) {
		const a = (i/7)*Math.PI*2+Math.random()*0.3, r = 3.5+Math.random()*2.5, h = 3+Math.random()*2.5;
		const tx = Math.cos(a)*r, tz = Math.sin(a)*r;
		const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, h, 6), new THREE.MeshBasicMaterial({ color: 0x3a2818, transparent: true, opacity: 0.8 }));
		trunk.position.set(tx, h/2-1.5, tz); trunk.rotation.z = (Math.random()-0.5)*0.1;
		scene.add(trunk); track(trunk);
		const cc = new THREE.Color().setHSL(0.28+Math.random()*0.08, 0.5, 0.2+Math.random()*0.1);
		for (let c = 0; c < 2+Math.floor(Math.random()*2); c++) {
			const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.7+Math.random()*0.4, 8, 6), new THREE.MeshBasicMaterial({ color: cc, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
			canopy.position.set(tx+(Math.random()-0.5)*0.5, h-1.5+Math.random()*0.4, tz+(Math.random()-0.5)*0.5);
			scene.add(canopy); track(canopy);
		}
	}

	const shaftGeo = new THREE.PlaneGeometry(0.8, 7);
	for (let i = 0; i < 4; i++) {
		const a = Math.random()*Math.PI*2, r = 1.5+Math.random()*2;
		const sh = new THREE.Mesh(shaftGeo, new THREE.MeshBasicMaterial({ color: 0xaaff88, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
		sh.position.set(Math.cos(a)*r, 2, Math.sin(a)*r); sh.lookAt(0, 2, 0);
		scene.add(sh); track(sh);
	}

	const fc = 30;
	const fGeo = new THREE.BufferGeometry();
	const fPos = new Float32Array(fc*3), fPh = new Float32Array(fc);
	for (let i = 0; i < fc; i++) { fPos[i*3]=(Math.random()-0.5)*8; fPos[i*3+1]=Math.random()*4; fPos[i*3+2]=(Math.random()-0.5)*8; fPh[i]=Math.random()*Math.PI*2; }
	fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
	const fireflies = new THREE.Points(fGeo, new THREE.PointsMaterial({ color: 0xffff88, size: 0.15, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
	scene.add(fireflies); track(fireflies);

	return {
		update(dt, time) {
			const tt = time/1000;
			const pp = pGeo.attributes.position.array;
			for (let i = 0; i < pc; i++) {
				pp[i*3+1] -= 0.15*dt; pp[i*3] += Math.sin(tt*0.5+pPh[i])*0.006; pp[i*3+2] += Math.cos(tt*0.4+pPh[i]*1.2)*0.006;
				if (pp[i*3+1] < -1) { pp[i*3+1]=5; pp[i*3]=(Math.random()-0.5)*10; pp[i*3+2]=(Math.random()-0.5)*10; }
			}
			pGeo.attributes.position.needsUpdate = true;
			const fp = fGeo.attributes.position.array;
			for (let i = 0; i < fc; i++) { fp[i*3] += Math.sin(tt*0.3+fPh[i])*0.01; fp[i*3+1] += Math.cos(tt*0.25+fPh[i]*1.3)*0.008; fp[i*3+2] += Math.sin(tt*0.2+fPh[i]*0.7)*0.01; }
			fGeo.attributes.position.needsUpdate = true;
			fireflies.material.opacity = 0.5 + Math.sin(tt*2)*0.4;
		},
	};
}

// ═══ CELEBRATION ═══
function buildCelebration(config, scene, track) {
	const cc = 400;
	const cGeo = new THREE.BufferGeometry();
	const cPos = new Float32Array(cc*3), cCol = new Float32Array(cc*3);
	const cVel = [];
	for (let i = 0; i < cc; i++) {
		cPos[i*3]=(Math.random()-0.5)*10; cPos[i*3+1]=Math.random()*8; cPos[i*3+2]=(Math.random()-0.5)*10;
		const c = new THREE.Color().setHSL(Math.random(), 0.9, 0.6); cCol[i*3]=c.r; cCol[i*3+1]=c.g; cCol[i*3+2]=c.b;
		cVel.push({ vx: (Math.random()-0.5)*0.5, vy: -0.3-Math.random()*0.4, vz: (Math.random()-0.5)*0.5 });
	}
	cGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
	cGeo.setAttribute('color', new THREE.BufferAttribute(cCol, 3));
	const confetti = new THREE.Points(cGeo, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
	scene.add(confetti); track(confetti);

	const lanterns = [];
	for (let i = 0; i < 6; i++) {
		const l = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.05+Math.random()*0.1, 0.9, 0.65), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
		l.position.set((Math.random()-0.5)*8, 1+Math.random()*3, (Math.random()-0.5)*8);
		l.userData = { baseY: l.position.y, phase: Math.random()*Math.PI*2 };
		scene.add(l); track(l); lanterns.push(l);
	}

	const ribbons = [];
	for (let i = 0; i < 8; i++) {
		const pts = [], len = 2+Math.random()*1.5, seg = 8;
		for (let s = 0; s <= seg; s++) pts.push(new THREE.Vector3(0, -s*(len/seg), 0));
		const rg = new THREE.BufferGeometry().setFromPoints(pts);
		const r = new THREE.Line(rg, new THREE.LineBasicMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.8, 0.55), transparent: true, opacity: 0.5 }));
		const a = (i/8)*Math.PI*2, rad = 3+Math.random()*2;
		r.position.set(Math.cos(a)*rad, 3, Math.sin(a)*rad);
		scene.add(r); track(r);
		ribbons.push({ mesh: r, phase: Math.random()*Math.PI*2, pts });
	}

	return {
		update(dt, time, lights) {
			const tt = time/1000;
			const cp = cGeo.attributes.position.array;
			for (let i = 0; i < cc; i++) {
				const v = cVel[i];
				cp[i*3]+=v.vx*dt; cp[i*3+1]+=v.vy*dt; cp[i*3+2]+=v.vz*dt; v.vy -= 0.5*dt;
				if (cp[i*3+1]<-3) { cp[i*3]=(Math.random()-0.5)*10; cp[i*3+1]=5+Math.random()*3; cp[i*3+2]=(Math.random()-0.5)*10; v.vy=-0.3-Math.random()*0.4; v.vx=(Math.random()-0.5)*0.5; v.vz=(Math.random()-0.5)*0.5; }
			}
			cGeo.attributes.position.needsUpdate = true;
			for (const l of lanterns) l.position.y = l.userData.baseY + Math.sin(tt+l.userData.phase)*0.3;
			for (const rib of ribbons) {
				const pos = rib.mesh.geometry.attributes.position.array;
				for (let s = 1; s < rib.pts.length; s++) pos[s*3] = Math.sin(tt*1.5+rib.phase+s*0.3)*0.08;
				rib.mesh.geometry.attributes.position.needsUpdate = true;
			}
			const beat = Math.max(0, Math.sin(tt*Math.PI*4));
			if (lights.key) lights.key.intensity = config.lighting.key_light.intensity + beat*3;
			if (lights.under) lights.under.intensity = config.lighting.under_light.intensity + beat*2;
		},
	};
}

// ═══ COSMOS ═══
function buildCosmos(config, scene, track) {
	const p = config.palette;
	const sc = 2000;
	const sGeo = new THREE.BufferGeometry();
	const sPos = new Float32Array(sc*3), sCol = new Float32Array(sc*3);
	for (let i = 0; i < sc; i++) {
		const r = 5+Math.random()*20, theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
		sPos[i*3]=r*Math.sin(phi)*Math.cos(theta); sPos[i*3+1]=r*Math.sin(phi)*Math.sin(theta)*0.6; sPos[i*3+2]=r*Math.cos(phi);
		const c = new THREE.Color().setHSL(0.6+Math.random()*0.15, 0.3, 0.6+Math.random()*0.4);
		sCol[i*3]=c.r; sCol[i*3+1]=c.g; sCol[i*3+2]=c.b;
	}
	sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
	sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
	const stars = new THREE.Points(sGeo, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
	scene.add(stars); track(stars);

	const nc = 12;
	const nGeo = new THREE.BufferGeometry();
	const nPos = new Float32Array(nc*3), nCol = new Float32Array(nc*3);
	for (let i = 0; i < nc; i++) {
		nPos[i*3]=(Math.random()-0.5)*16; nPos[i*3+1]=(Math.random()-0.5)*8; nPos[i*3+2]=-5-Math.random()*10;
		const c = new THREE.Color().setHSL(0.7+Math.random()*0.15, 0.8, 0.4);
		nCol[i*3]=c.r; nCol[i*3+1]=c.g; nCol[i*3+2]=c.b;
	}
	nGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
	nGeo.setAttribute('color', new THREE.BufferAttribute(nCol, 3));
	const nebula = new THREE.Points(nGeo, new THREE.PointsMaterial({ size: 3.0, vertexColors: true, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
	scene.add(nebula); track(nebula);

	const planet = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.primary), transparent: true, opacity: 0.12 }));
	planet.position.set(-4, 2, -10); scene.add(planet); track(planet);
	const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.2, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.primary), transparent: true, opacity: 0.08, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
	ring.position.copy(planet.position); ring.rotation.x = -0.4; scene.add(ring); track(ring);

	const shoots = [];
	for (let i = 0; i < 3; i++) {
		const sg = new THREE.BufferGeometry();
		sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
		const sl = new THREE.Line(sg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
		scene.add(sl); track(sl);
		shoots.push({ line: sl, next: Math.random()*5+2, active: false, life: 0, start: new THREE.Vector3(), dir: new THREE.Vector3() });
	}

	return {
		update(dt) {
			stars.rotation.y += dt*0.005; nebula.rotation.y -= dt*0.002;
			planet.rotation.y += dt*0.02; ring.rotation.z += dt*0.01;
			for (const ss of shoots) {
				if (!ss.active) {
					ss.next -= dt;
					if (ss.next <= 0) { ss.active = true; ss.life = 1.0; ss.start.set((Math.random()-0.5)*16, 3+Math.random()*4, -3-Math.random()*5); ss.dir.set((Math.random()-0.5)*2, -1-Math.random(), (Math.random()-0.5)*2).normalize(); ss.next = 3+Math.random()*6; }
				} else {
					ss.life -= dt*1.5;
					if (ss.life <= 0) { ss.active = false; ss.line.material.opacity = 0; }
					else {
						const pos = ss.line.geometry.attributes.position.array;
						pos[0]=ss.start.x; pos[1]=ss.start.y; pos[2]=ss.start.z;
						pos[3]=ss.start.x+ss.dir.x*3; pos[4]=ss.start.y+ss.dir.y*3; pos[5]=ss.start.z+ss.dir.z*3;
						ss.line.geometry.attributes.position.needsUpdate = true;
						ss.line.material.opacity = ss.life*0.8;
					}
				}
			}
		},
	};
}

// ═══ CITY ═══
function buildCity(config, scene, track) {
	const p = config.palette;
	const winMeshes = [];
	for (let i = 0; i < 14; i++) {
		const w = 0.8+Math.random()*1.2, h = 2+Math.random()*5, d = 0.8+Math.random()*1.2;
		const boxGeo = new THREE.BoxGeometry(w, h, d);
		const edges = new THREE.EdgesGeometry(boxGeo);
		const b = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: new THREE.Color(p.primary).multiplyScalar(0.5+Math.random()*0.3), transparent: true, opacity: 0.3+Math.random()*0.2 }));
		const a = (i/14)*Math.PI*2, r = 3+Math.random()*4;
		b.position.set(Math.cos(a)*r, h/2-1.5, Math.sin(a)*r);
		scene.add(b); track(b); boxGeo.dispose();
		for (let wi = 0; wi < Math.floor(h*3); wi++) {
			const lit = Math.random() > 0.4;
			const wm = new THREE.MeshBasicMaterial({ color: lit ? 0xffdd66 : 0x222233, transparent: true, opacity: lit ? 0.7 : 0.2, blending: lit ? THREE.AdditiveBlending : THREE.NormalBlending });
			const win = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), wm);
			const face = Math.floor(Math.random()*4), off = w/2+0.01, wy = -1.5+Math.random()*h;
			if (face===0) win.position.set(b.position.x+off, wy, b.position.z+(Math.random()-0.5)*d);
			else if (face===1) win.position.set(b.position.x-off, wy, b.position.z+(Math.random()-0.5)*d);
			else if (face===2) { win.position.set(b.position.x+(Math.random()-0.5)*w, wy, b.position.z+off); win.rotation.y = Math.PI/2; }
			else { win.position.set(b.position.x+(Math.random()-0.5)*w, wy, b.position.z-off); win.rotation.y = Math.PI/2; }
			scene.add(win); track(win);
			if (lit) winMeshes.push({ mesh: win, baseOp: 0.7 });
		}
	}
	const moon = new THREE.Mesh(new THREE.CircleGeometry(0.8, 32), new THREE.MeshBasicMaterial({ color: 0xddeeff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
	moon.position.set(-5, 4, -8); scene.add(moon); track(moon);

	const rc = 400;
	const rGeo = new THREE.BufferGeometry();
	const rPos = new Float32Array(rc*3), rSpd = new Float32Array(rc);
	for (let i = 0; i < rc; i++) { rPos[i*3]=(Math.random()-0.5)*14; rPos[i*3+1]=Math.random()*10; rPos[i*3+2]=(Math.random()-0.5)*14; rSpd[i]=3+Math.random()*2; }
	rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
	const rain = new THREE.Points(rGeo, new THREE.PointsMaterial({ color: 0x88aacc, size: 0.06, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
	scene.add(rain); track(rain);

	return {
		update(dt, time, lights) {
			const rp = rGeo.attributes.position.array;
			for (let i = 0; i < rc; i++) { rp[i*3+1] -= rSpd[i]*dt; if (rp[i*3+1]<-3) { rp[i*3]=(Math.random()-0.5)*14; rp[i*3+1]=6+Math.random()*4; rp[i*3+2]=(Math.random()-0.5)*14; } }
			rGeo.attributes.position.needsUpdate = true;
			for (const w of winMeshes) if (Math.random() > 0.99) w.mesh.material.opacity = w.baseOp * (Math.random() > 0.5 ? 0.3 : 1.2);
			if (lights.under) lights.under.intensity = config.lighting.under_light.intensity + (Math.random() > 0.95 ? 4 : 0);
		},
	};
}

// ═══ DREAM ═══
function buildDream(config, scene, track) {
	const oc = 150;
	const oGeo = new THREE.BufferGeometry();
	const oPos = new Float32Array(oc*3), oCol = new Float32Array(oc*3), oPh = new Float32Array(oc), oRad = new Float32Array(oc);
	for (let i = 0; i < oc; i++) {
		oRad[i]=2+Math.random()*5; oPh[i]=Math.random()*Math.PI*2;
		oPos[i*3]=Math.cos(oPh[i])*oRad[i]; oPos[i*3+1]=(Math.random()-0.5)*6; oPos[i*3+2]=Math.sin(oPh[i])*oRad[i];
		const c = new THREE.Color().setHSL(0.78+Math.random()*0.12, 0.8, 0.6+Math.random()*0.3);
		oCol[i*3]=c.r; oCol[i*3+1]=c.g; oCol[i*3+2]=c.b;
	}
	oGeo.setAttribute('position', new THREE.BufferAttribute(oPos, 3));
	oGeo.setAttribute('color', new THREE.BufferAttribute(oCol, 3));
	const orbs = new THREE.Points(oGeo, new THREE.PointsMaterial({ size: 0.35, vertexColors: true, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
	scene.add(orbs); track(orbs);

	const doors = [];
	for (let i = 0; i < 5; i++) {
		const dg = new THREE.TorusGeometry(0.6, 0.03, 4, 3); dg.scale(0.7, 1.3, 1);
		const dm = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.8+Math.random()*0.1, 0.6, 0.4), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
		dm.position.set((Math.random()-0.5)*7, (Math.random()-0.5)*3, (Math.random()-0.5)*5-1);
		dm.rotation.y = Math.random()*Math.PI*2;
		dm.userData = { baseY: dm.position.y, phase: Math.random()*Math.PI*2, rotSpd: (Math.random()-0.5)*0.3 };
		scene.add(dm); track(dm); doors.push(dm);
	}

	const cryst = [];
	const cgs = [new THREE.IcosahedronGeometry(0.3, 0), new THREE.OctahedronGeometry(0.35), new THREE.TetrahedronGeometry(0.4)];
	for (let i = 0; i < 4; i++) {
		const cm = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.8+Math.random()*0.1, 0.7, 0.5), transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
		const c = new THREE.Mesh(cgs[i%3], cm);
		c.position.set((Math.random()-0.5)*6, Math.random()*3, (Math.random()-0.5)*6);
		c.userData = { baseY: c.position.y, phase: Math.random()*Math.PI*2, rx: Math.random()*0.3, ry: Math.random()*0.3 };
		scene.add(c); track(c); cryst.push(c);
	}

	return {
		update(dt, time) {
			const tt = time/1000;
			const op = oGeo.attributes.position.array;
			for (let i = 0; i < oc; i++) { oPh[i]+=dt*0.15; op[i*3]=Math.cos(oPh[i])*oRad[i]; op[i*3+1]+=Math.sin(tt*0.3+oPh[i])*0.005; op[i*3+2]=Math.sin(oPh[i])*oRad[i]; }
			oGeo.attributes.position.needsUpdate = true;
			for (const d of doors) { d.rotation.y += d.userData.rotSpd*dt; d.position.y = d.userData.baseY + Math.sin(tt*0.4+d.userData.phase)*0.25; }
			for (const c of cryst) { c.rotation.x += c.userData.rx*dt; c.rotation.y += c.userData.ry*dt; c.position.y = c.userData.baseY + Math.sin(tt*0.5+c.userData.phase)*0.2; }
		},
	};
}

// ═══ THEATER ═══
function buildTheater(config, scene, track) {
	const cone = new THREE.Mesh(new THREE.ConeGeometry(2.5, 5, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
	cone.position.set(0, 1.5, 0); scene.add(cone); track(cone);

	const dc = 200;
	const dGeo = new THREE.BufferGeometry();
	const dPos = new Float32Array(dc*3), dPh = new Float32Array(dc);
	for (let i = 0; i < dc; i++) {
		const t = Math.random(), radius = t*1.8, a = Math.random()*Math.PI*2;
		dPos[i*3]=Math.cos(a)*radius; dPos[i*3+1]=-1+t*4; dPos[i*3+2]=Math.sin(a)*radius; dPh[i]=Math.random()*Math.PI*2;
	}
	dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
	const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: 0xffdd88, size: 0.05, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
	scene.add(dust); track(dust);

	const stage = new THREE.Mesh(new THREE.CircleGeometry(2, 32), new THREE.MeshBasicMaterial({ color: 0x1a1208, transparent: true, opacity: 0.6 }));
	stage.rotation.x = -Math.PI/2; stage.position.y = -1.5; scene.add(stage); track(stage);

	// Curtains (wavy planes on left and right)
	const curtains = [];
	for (let side = 0; side < 2; side++) {
		const cg = new THREE.PlaneGeometry(1.5, 4, 6, 1);
		const cm = new THREE.MeshBasicMaterial({ color: 0x661111, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
		const cur = new THREE.Mesh(cg, cm);
		cur.position.set(side === 0 ? -2.8 : 2.8, 0.5, -0.5);
		scene.add(cur); track(cur);
		curtains.push({ mesh: cur, basePos: cur.position.clone(), geo: cg, side });
	}

	// Mic stand silhouette
	const micPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 4), new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.3 }));
	micPole.position.set(0.6, -0.75, 0.8); scene.add(micPole); track(micPole);
	const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.4 }));
	micHead.position.set(0.6, 0, 0.8); scene.add(micHead); track(micHead);

	return {
		update(dt, time, lights) {
			const tt = time/1000;
			const dp = dGeo.attributes.position.array;
			for (let i = 0; i < dc; i++) { dp[i*3]+=Math.sin(tt*0.3+dPh[i])*0.003; dp[i*3+1]+=Math.cos(tt*0.2+dPh[i]*1.5)*0.002; dp[i*3+2]+=Math.cos(tt*0.25+dPh[i])*0.003; }
			dGeo.attributes.position.needsUpdate = true;
			for (const c of curtains) {
				const pos = c.geo.attributes.position.array;
				for (let i = 0; i < pos.length; i += 3) pos[i] += Math.sin(tt*0.5+i*0.1+c.side)*0.001;
				c.geo.attributes.position.needsUpdate = true;
			}
			if (lights.key) lights.key.intensity = config.lighting.key_light.intensity + Math.sin(tt*3)*0.5 + Math.sin(tt*7)*0.3;
		},
	};
}

// ═══ MEMORY ═══
function buildMemory(config, scene, track) {
	const dc = 300;
	const dGeo = new THREE.BufferGeometry();
	const dPos = new Float32Array(dc*3), dPh = new Float32Array(dc);
	for (let i = 0; i < dc; i++) { dPos[i*3]=(Math.random()-0.5)*10; dPos[i*3+1]=Math.random()*6-1; dPos[i*3+2]=(Math.random()-0.5)*10; dPh[i]=Math.random()*Math.PI*2; }
	dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
	const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: 0xddb870, size: 0.04, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
	scene.add(dust); track(dust);

	// Floating photo frames
	const photos = [];
	for (let i = 0; i < 5; i++) {
		const pg = new THREE.PlaneGeometry(0.6, 0.8);
		const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6d82ad).multiplyScalar(0.5), transparent: true, opacity: 0.12, side: THREE.DoubleSide });
		const ph = new THREE.Mesh(pg, pm);
		ph.position.set((Math.random()-0.5)*6, 0.5+Math.random()*2, (Math.random()-0.5)*4-1);
		ph.rotation.set((Math.random()-0.5)*0.3, Math.random()*Math.PI*2, (Math.random()-0.5)*0.2);
		ph.userData = { baseY: ph.position.y, phase: Math.random()*Math.PI*2, rotY: ph.rotation.y };
		scene.add(ph); track(ph); photos.push(ph);
	}

	// Clock faces (frozen time)
	const clocks = [];
	for (let i = 0; i < 3; i++) {
		const cg = new THREE.RingGeometry(0.2, 0.25, 24);
		const cm = new THREE.MeshBasicMaterial({ color: 0xb8a070, transparent: true, opacity: 0.15, side: THREE.DoubleSide });
		const clk = new THREE.Mesh(cg, cm);
		clk.position.set((Math.random()-0.5)*5, 1+Math.random()*1.5, -2-Math.random()*2);
		clk.lookAt(0, clk.position.y, 0);
		scene.add(clk); track(clk);
		// Hour hand
		const hg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0.15,0)]);
		const hand = new THREE.Line(hg, new THREE.LineBasicMaterial({ color: 0xb8a070, transparent: true, opacity: 0.2 }));
		hand.position.copy(clk.position);
		scene.add(hand); track(hand);
		clocks.push({ hand, baseRot: Math.random()*Math.PI*2 });
	}

	return {
		update(dt, time) {
			const tt = time/1000;
			const dp = dGeo.attributes.position.array;
			for (let i = 0; i < dc; i++) { dp[i*3]+=Math.sin(tt*0.2+dPh[i])*0.004; dp[i*3+1]+=Math.cos(tt*0.15+dPh[i]*1.3)*0.003; dp[i*3+2]+=Math.sin(tt*0.18+dPh[i]*0.7)*0.004; }
			dGeo.attributes.position.needsUpdate = true;
			for (const ph of photos) { ph.position.y = ph.userData.baseY + Math.sin(tt*0.3+ph.userData.phase)*0.15; ph.rotation.y = ph.userData.rotY + Math.sin(tt*0.1+ph.userData.phase)*0.1; }
			for (const c of clocks) c.hand.rotation.z = c.baseRot + Math.sin(tt*0.05)*0.1;
		},
	};
}
