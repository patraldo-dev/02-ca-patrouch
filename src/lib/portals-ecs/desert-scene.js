// desert-scene.js — Desert scene builder for portal engine
// Accepts an existing world, adds desert objects + sound to its scene.
// Does NOT call World.create — the world already exists.

import * as THREE from 'three';

// ── Audio helpers (procedural, no files) ──
let audioCtx = null;
function getAudioCtx() {
	if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	return audioCtx;
}

function createWindSound(ctx) {
	const bufferSize = ctx.sampleRate * 4;
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
	const noise = ctx.createBufferSource();
	noise.buffer = buffer; noise.loop = true;
	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass'; filter.frequency.value = 400; filter.Q.value = 0.5;
	const gain = ctx.createGain(); gain.gain.value = 0.08;
	noise.connect(filter).connect(gain);
	return { output: gain, start: () => noise.start(), filter };
}

function createChirpSound(ctx, freq = 2000) {
	const osc = ctx.createOscillator();
	osc.type = 'sine'; osc.frequency.value = freq;
	const gain = ctx.createGain(); gain.gain.value = 0;
	osc.connect(gain); osc.start();
	return {
		output: gain,
		chirp: () => {
			const now = ctx.currentTime;
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
			osc.frequency.setValueAtTime(freq, now);
			osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.1);
		},
	};
}

function createDroneSound(ctx) {
	const osc1 = ctx.createOscillator();
	osc1.type = 'sine'; osc1.frequency.value = 55;
	const osc2 = ctx.createOscillator();
	osc2.type = 'sine'; osc2.frequency.value = 82.5;
	const gain = ctx.createGain(); gain.gain.value = 0.04;
	osc1.connect(gain); osc2.connect(gain);
	osc1.start(); osc2.start();
	return { output: gain };
}

/**
 * Build a desert scene in an existing world's scene.
 * @param {World} world - Already-created IWSDK world
 * @param {Object} config - Scene config (palette, etc.)
 * @returns {{ cleanup: () => void }} cleanup handle
 */
export function buildDesertScene(world, config = {}) {
	const scene = world.scene;
	const track = [];
	const swayItems = [];
	const soundMarkers = [];
	const chirpSounds = [];
	const audioNodes = [];

	// ═══ SKY ═══
	const skyMat = new THREE.ShaderMaterial({
		uniforms: {
			topColor: { value: new THREE.Color(0xff7733) },
			bottomColor: { value: new THREE.Color(0xffdd44) },
		},
		vertexShader: `varying vec3 vWorldPos; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
		fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vWorldPos; void main() { float h = normalize(vWorldPos).y; float t = clamp(h * 0.5 + 0.5, 0.0, 1.0); gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0); }`,
		side: THREE.BackSide, depthWrite: false,
	});
	const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat);
	scene.add(sky); track.push(sky);

	// ═══ SUN ═══
	const sunGroup = new THREE.Group();
	const sunCore = new THREE.Mesh(
		new THREE.CircleGeometry(3, 32),
		new THREE.MeshBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0.9 }),
	);
	sunGroup.add(sunCore);
	for (let r = 0; r < 3; r++) {
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(3 + r * 0.8, 3.5 + r * 0.8, 32),
			new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffaa44).lerp(new THREE.Color(0xffdd66), r / 3), transparent: true, opacity: 0.15 - r * 0.04, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
		);
		sunGroup.add(ring);
	}
	sunGroup.position.set(0, 4, -30);
	scene.add(sunGroup); track.push(sunGroup);

	// ═══ GROUND ═══
	const groundGeo = new THREE.PlaneGeometry(80, 80, 32, 32);
	const gPos = groundGeo.attributes.position;
	for (let i = 0; i < gPos.count; i++) {
		const x = gPos.getX(i), y = gPos.getY(i);
		const dist = Math.sqrt(x * x + y * y);
		gPos.setZ(i, Math.sin(x * 0.15) * 0.4 + Math.cos(y * 0.12) * 0.3 + Math.sin(dist * 0.08) * 0.2);
	}
	gPos.needsUpdate = true; groundGeo.computeVertexNormals();
	const ground = new THREE.Mesh(groundGeo, new THREE.MeshBasicMaterial({ color: 0xe8a830, transparent: true, opacity: 0.85 }));
	ground.rotation.x = -Math.PI / 2; ground.position.y = -1.5;
	scene.add(ground); track.push(ground);

	// ═══ DUNES ═══
	const dunePositions = [
		{ x: -12, z: -15, rx: 8, rz: 6, h: 3, color: 0xd49520 },
		{ x: 14, z: -18, rx: 10, rz: 7, h: 4, color: 0xc88810 },
		{ x: -8, z: -25, rx: 12, rz: 8, h: 5, color: 0xb8780a },
		{ x: 20, z: -10, rx: 6, rz: 5, h: 2.5, color: 0xdca030 },
	];
	for (const d of dunePositions) {
		const duneGeo = new THREE.SphereGeometry(1, 24, 12); duneGeo.scale(d.rx, d.h, d.rz);
		const dune = new THREE.Mesh(duneGeo, new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.7 }));
		dune.position.set(d.x, -1.5, d.z);
		scene.add(dune); track.push(dune);
	}

	// ═══ CACTI ═══
	function makeCactus(x, z, scale = 1) {
		const group = new THREE.Group();
		const green = 0x2d6a2d;
		for (let s = 0; s < 3; s++) {
			const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.18*scale, 0.22*scale, 0.6*scale, 8), new THREE.MeshBasicMaterial({ color: green }));
			seg.position.y = s * 0.55 * scale;
			group.add(seg);
			for (let r = 0; r < 4; r++) {
				const rib = new THREE.Mesh(new THREE.BoxGeometry(0.02*scale, 0.55*scale, 0.04*scale), new THREE.MeshBasicMaterial({ color: 0x3a8a3a }));
				const a = (r/4)*Math.PI*2;
				rib.position.set(Math.cos(a)*0.2*scale, s*0.55*scale, Math.sin(a)*0.2*scale);
				group.add(rib);
			}
		}
		const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.1*scale, 0.12*scale, 0.5*scale, 6), new THREE.MeshBasicMaterial({ color: green }));
		armL.position.set(-0.25*scale, 0.8*scale, 0); armL.rotation.z = 0.8; group.add(armL);
		const armL2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1*scale, 0.12*scale, 0.4*scale, 6), new THREE.MeshBasicMaterial({ color: green }));
		armL2.position.set(-0.45*scale, 1.1*scale, 0); group.add(armL2);
		const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.1*scale, 0.12*scale, 0.6*scale, 6), new THREE.MeshBasicMaterial({ color: green }));
		armR.position.set(0.25*scale, 1.0*scale, 0); armR.rotation.z = -0.8; group.add(armR);
		const armR2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1*scale, 0.12*scale, 0.45*scale, 6), new THREE.MeshBasicMaterial({ color: green }));
		armR2.position.set(0.5*scale, 1.35*scale, 0); group.add(armR2);
		const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18*scale, 8, 6, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshBasicMaterial({ color: 0x2a5a2a }));
		cap.position.y = 1.65*scale; group.add(cap);
		group.position.set(x, -1.5, z);
		return group;
	}

	for (const c of [
		{ x: -3, z: -5, s: 1.2 }, { x: 4, z: -8, s: 0.9 }, { x: -6, z: -12, s: 1.5 },
		{ x: 7, z: -6, s: 0.7 }, { x: 0, z: -15, s: 1.1 }, { x: -10, z: -8, s: 0.8 },
	]) {
		const cactus = makeCactus(c.x, c.z, c.s);
		scene.add(cactus); track.push(cactus);
		swayItems.push({ obj: cactus, phase: Math.random()*Math.PI*2, amp: 0.015, spd: 0.5+Math.random()*0.3 });
	}

	// ═══ ROCKS ═══
	for (let i = 0; i < 5; i++) {
		const rockGeo = new THREE.DodecahedronGeometry(0.4+Math.random()*0.3, 0);
		rockGeo.scale(1.2, 0.7, 1.0);
		const rock = new THREE.Mesh(rockGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.08, 0.3, 0.25+Math.random()*0.1) }));
		const a = Math.random()*Math.PI*2, r = 3+Math.random()*8;
		rock.position.set(Math.cos(a)*r, -1.2, Math.sin(a)*r);
		rock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
		scene.add(rock); track.push(rock);
	}

	// ═══ DRIED BUSHES ═══
	for (let i = 0; i < 4; i++) {
		const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), new THREE.MeshBasicMaterial({ color: 0x8a5a20, transparent: true, opacity: 0.6, wireframe: true }));
		bush.scale.set(1.2, 0.8, 1.2);
		const a = Math.random()*Math.PI*2, r = 4+Math.random()*6;
		bush.position.set(Math.cos(a)*r, -1.2, Math.sin(a)*r);
		scene.add(bush); track.push(bush);
	}

	// ═══ LIGHTING ═══
	const ambient = new THREE.AmbientLight(0xffaa66, 0.5);
	scene.add(ambient); track.push(ambient);
	const sunLight = new THREE.DirectionalLight(0xffeeaa, 0.8);
	sunLight.position.set(0, 5, -10);
	scene.add(sunLight); track.push(sunLight);
	const fillLight = new THREE.PointLight(0xff8844, 0.5, 30);
	fillLight.position.set(5, 3, 5);
	scene.add(fillLight); track.push(fillLight);

	scene.fog = new THREE.FogExp2(0xffaa44, 0.02);
	const oldBg = scene.background;
	scene.background = new THREE.Color(0xff9933);

	// ═══ SOUND OBJECTS ═══
	let windModulator = null;
	try {
		const ctx = getAudioCtx();
		const wind = createWindSound(ctx);
		wind.output.connect(ctx.destination); wind.start();
		windModulator = setInterval(() => { wind.filter.frequency.linearRampToValueAtTime(300+Math.random()*400, ctx.currentTime+2); }, 3000);
		audioNodes.push(wind.output);

		for (let i = 0; i < 3; i++) {
			const a = Math.random()*Math.PI*2, r = 3+Math.random()*5;
			const marker = new THREE.Mesh(
				new THREE.IcosahedronGeometry(0.12, 0),
				new THREE.MeshBasicMaterial({ color: 0xff6644, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }),
			);
			marker.position.set(Math.cos(a)*r, -1.2, Math.sin(a)*r);
			marker.userData = { phase: Math.random()*Math.PI*2 };
			scene.add(marker); track.push(marker);
			soundMarkers.push(marker);

			const chirp = createChirpSound(ctx, 1500+Math.random()*1500);
			chirp.output.connect(ctx.destination);
			chirpSounds.push(chirp);
			audioNodes.push(chirp.output);
		}

		const obelisk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.5, 0.3), new THREE.MeshBasicMaterial({ color: 0x1a0a30, transparent: true, opacity: 0.6 }));
		obelisk.position.set(5, -0.25, -3); obelisk.rotation.y = 0.3;
		scene.add(obelisk); track.push(obelisk);
		const obTop = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color: 0x8844ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }));
		obTop.position.set(5, 1.1, -3);
		scene.add(obTop); track.push(obTop);

		const drone = createDroneSound(ctx);
		drone.output.connect(ctx.destination);
		audioNodes.push(drone.output);

		console.log('[desert] Sound: wind + 3 chirp rocks + drone obelisk');
	} catch (e) {
		console.warn('[desert] Audio setup failed:', e.message);
	}

	// ═══ UPDATE LOOP (sway + chirps + pulse) ═══
	const prevUpdate = world.update.bind(world);
	world.update = function(delta, time) {
		prevUpdate(delta, time);
		const tt = time / 1000;
		for (const s of swayItems) { if (s.obj) s.obj.rotation.z = Math.sin(tt*s.spd + s.phase) * s.amp; }
		if (chirpSounds.length > 0 && Math.random() < 0.005) {
			chirpSounds[Math.floor(Math.random()*chirpSounds.length)].chirp();
		}
		for (const m of soundMarkers) {
			const pulse = 0.6 + Math.sin(tt*3 + m.userData.phase)*0.3;
			m.material.opacity = pulse;
			m.scale.setScalar(0.8 + pulse*0.4);
		}
	};

	console.log('[desert] Scene built with', track.length, 'objects');

	return {
		cleanup() {
			for (const obj of track) scene.remove(obj);
			if (windModulator) clearInterval(windModulator);
			for (const node of audioNodes) { try { node.disconnect(); } catch {} }
			scene.background = oldBg;
			scene.fog = null;
			world.update = prevUpdate;
		},
	};
}

// Standalone boot (for localhost dev only)
export async function bootDesertScene(container) {
	const { World } = await import('@iwsdk/core');
	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});
	buildDesertScene(world);
	return world;
}
