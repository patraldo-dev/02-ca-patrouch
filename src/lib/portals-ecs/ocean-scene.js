// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict JS type-checking (see jsconfig.json).
// ocean-scene.js — Underwater world for portal engine
// Accepts an existing world, adds ocean objects + sound.
// Navigation: tap coral formations to travel to other portals.

import * as THREE from 'three';

// ── Audio helpers ──
let audioCtx = null;
function getAudioCtx() {
	if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	return audioCtx;
}

// Underwater ambient: low filtered noise + bubble pops
function createWaterAmbient(ctx) {
	// Deep water rumble
	const bufSize = ctx.sampleRate * 4;
	const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
	const data = buf.getChannelData(0);
	for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.2;
	const noise = ctx.createBufferSource();
	noise.buffer = buf; noise.loop = true;
	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass'; filter.frequency.value = 200; filter.Q.value = 0.3;
	const gain = ctx.createGain(); gain.gain.value = 0.06;
	noise.connect(filter).connect(gain);
	return { output: gain, start: () => noise.start(), filter };
}

// Bubble pop sound
function createBubbleSound(ctx) {
	const osc = ctx.createOscillator();
	osc.type = 'sine';
	const gain = ctx.createGain(); gain.gain.value = 0;
	osc.connect(gain); osc.start();
	return {
		output: gain,
		pop: () => {
			const now = ctx.currentTime;
			const freq = 300 + Math.random() * 600;
			osc.frequency.setValueAtTime(freq, now);
			osc.frequency.exponentialRampToValueAtTime(freq * 0.3, now + 0.08);
			gain.gain.setValueAtTime(0.08, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
		},
	};
}

// Whale song (long low sweeps)
function createWhaleSound(ctx) {
	const osc = ctx.createOscillator();
	osc.type = 'sine'; osc.frequency.value = 80;
	const gain = ctx.createGain(); gain.gain.value = 0;
	const filter = ctx.createBiquadFilter();
	filter.type = 'bandpass'; filter.frequency.value = 200; filter.Q.value = 2;
	osc.connect(filter).connect(gain); osc.start();
	return {
		output: gain,
		call: () => {
			const now = ctx.currentTime;
			const startFreq = 60 + Math.random() * 40;
			osc.frequency.setValueAtTime(startFreq, now);
			osc.frequency.linearRampToValueAtTime(startFreq * 2, now + 1.5);
			osc.frequency.linearRampToValueAtTime(startFreq * 0.8, now + 3);
			filter.frequency.setValueAtTime(startFreq * 3, now);
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(0.06, now + 0.5);
			gain.gain.linearRampToValueAtTime(0.06, now + 2.5);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
		},
	};
}

// Floating text label
function makeTextSprite(text, color) {
	const canvas = document.createElement('canvas');
	canvas.width = 256; canvas.height = 64;
	const ctx = canvas.getContext('2d');
	ctx.font = 'bold 28px Georgia, serif';
	ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
	ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
	ctx.fillStyle = '#' + color.getHexString();
	ctx.fillText(text, 128, 32);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false }));
}

export function buildOceanScene(world, config = {}, allConfigs = {}, onNavigate = null) {
	const scene = world.scene;
	const track = [];
	const tapTargets = [];
	const labels = [];
	const swayItems = [];
	const audioNodes = [];
	let bubbleSounds = [];
	let waterModulator = null;
	let whaleSound = null;

	// ═══ SKY (water surface seen from below) ═══
	const ceilingMat = new THREE.ShaderMaterial({
		uniforms: {
			surfaceColor: { value: new THREE.Color(0x4488cc) },
			deepColor: { value: new THREE.Color(0x002244) },
			time: { value: 0 },
		},
		vertexShader: `varying vec3 vWorldPos; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
		fragmentShader: `uniform vec3 surfaceColor; uniform vec3 deepColor; uniform float time; varying vec3 vWorldPos; void main() { float h = normalize(vWorldPos).y; float t = clamp(h, 0.0, 1.0); float ripple = sin(vWorldPos.x * 2.0 + time * 1.5) * 0.05 + sin(vWorldPos.z * 3.0 + time) * 0.05; vec3 col = mix(deepColor, surfaceColor, t + ripple); gl_FragColor = vec4(col, 0.6); }`,
		side: THREE.BackSide, transparent: true, depthWrite: false,
	});
	const ceiling = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), ceilingMat);
	scene.add(ceiling); track.push(ceiling);

	// ═══ GROUND (sandy ocean floor) ═══
	const floorGeo = new THREE.PlaneGeometry(60, 60, 32, 32);
	const fPos = floorGeo.attributes.position;
	for (let i = 0; i < fPos.count; i++) {
		const x = fPos.getX(i), y = fPos.getY(i);
		fPos.setZ(i, Math.sin(x * 0.1) * 0.3 + Math.cos(y * 0.08) * 0.2);
	}
	fPos.needsUpdate = true; floorGeo.computeVertexNormals();
	const floor = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({ color: 0x2a4a3a, transparent: true, opacity: 0.7 }));
	floor.rotation.x = -Math.PI / 2; floor.position.y = -2.5;
	scene.add(floor); track.push(floor);

	// ═══ LIGHT SHAFTS from surface ═══
	for (let i = 0; i < 5; i++) {
		const shaft = new THREE.Mesh(
			new THREE.PlaneGeometry(0.8, 8),
			new THREE.MeshBasicMaterial({ color: 0x66bbff, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
		);
		shaft.position.set(-4 + i * 2 + Math.random(), 1.5, -3 - Math.random() * 4);
		shaft.rotation.y = (Math.random() - 0.5) * 0.2;
		shaft.rotation.x = 0.05;
		scene.add(shaft); track.push(shaft);
	}

	// ═══ CORAL FORMATIONS (navigation gateways) ═══
	function makeCoral(x, z, scale, color) {
		const group = new THREE.Group();
		const branchCount = 4 + Math.floor(Math.random() * 3);
		for (let b = 0; b < branchCount; b++) {
			const h = 0.6 + Math.random() * 1.4;
			const r = 0.1 + Math.random() * 0.1;
			const bg = new THREE.ConeGeometry(r * scale, h * scale, 6);
			const bm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
			const branch = new THREE.Mesh(bg, bm);
			branch.position.set((Math.random()-0.5)*0.5*scale, -2.5 + h*scale/2, (Math.random()-0.5)*0.5*scale);
			branch.rotation.set((Math.random()-0.5)*0.5, Math.random()*Math.PI, (Math.random()-0.5)*0.4);
			group.add(branch);
		}
		// Base mound
		const mound = new THREE.Mesh(
			new THREE.SphereGeometry(0.4 * scale, 8, 6, 0, Math.PI*2, 0, Math.PI/2),
			new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 }),
		);
		mound.position.y = -2.5; mound.scale.y = 0.3;
		group.add(mound);
		group.position.set(x, 0, z);
		return group;
	}

	const portalIds = Object.keys(allConfigs).filter(id => id !== (config.portal?.id));
	const coralSpots = [
		{ x: -4, z: -5, s: 1.3 }, { x: 5, z: -7, s: 1.0 }, { x: -7, z: -10, s: 1.5 },
		{ x: 8, z: -4, s: 0.8 }, { x: 0, z: -12, s: 1.2 }, { x: -2, z: -8, s: 0.9 },
	];
	const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';

	for (let i = 0; i < coralSpots.length; i++) {
		const c = coralSpots[i];
		const pid = portalIds[i % portalIds.length];
		const pcfg = allConfigs[pid];
		const pcolor = pcfg ? new THREE.Color(pcfg.palette?.primary || 0x00ccff) : new THREE.Color(0x00ccff);
		const pname = pcfg ? (pcfg.portal?.names?.[lang] || pcfg.portal?.names?.es || pid) : pid;

		const coral = makeCoral(c.x, c.z, c.s, pcolor);
		coral.userData = { portalId: pid, isGateway: true };
		for (const child of coral.children) child.userData = coral.userData;
		scene.add(coral); track.push(coral);
		tapTargets.push(coral);

		// Glow at base
		const glow = new THREE.Mesh(
			new THREE.RingGeometry(0.5 * c.s, 0.8 * c.s, 24),
			new THREE.MeshBasicMaterial({ color: pcolor, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
		);
		glow.rotation.x = -Math.PI / 2; glow.position.set(c.x, -2.48, c.z);
		scene.add(glow); track.push(glow);

		// Floating label
		const label = makeTextSprite(pname, pcolor);
		label.position.set(c.x, -2.5 + 2.0 * c.s, c.z);
		label.scale.set(1.2, 0.3, 1);
		label.material.opacity = 0.35; // visible by default, breathes in update loop
		scene.add(label); track.push(label);
		labels.push({ sprite: label, baseY: label.position.y, phase: Math.random() * Math.PI * 2, glow });
	}

	// ═══ STATIC FISH ═══
	const fishColors = [0xff6b35, 0xffd700, 0x00ced1, 0xff4466, 0x66ff99];
	for (let i = 0; i < 12; i++) {
		const fc = fishColors[i % fishColors.length];
		const fg = new THREE.SphereGeometry(0.15, 8, 6); fg.scale(1.8, 0.8, 0.4);
		const fish = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: fc, transparent: true, opacity: 0.65 }));
		const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 4), new THREE.MeshBasicMaterial({ color: fc, transparent: true, opacity: 0.6 }));
		tail.position.x = -0.25; tail.rotation.z = Math.PI / 2; fish.add(tail);
		fish.position.set((Math.random()-0.5)*14, -0.5 + Math.random()*3, -2 - Math.random()*8);
		fish.rotation.y = Math.random() * Math.PI * 2;
		scene.add(fish); track.push(fish);
	}

	// ═══ SEAWEED ═══
	for (let i = 0; i < 10; i++) {
		const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 6, h = 1.5 + Math.random() * 2;
		const sw = new THREE.Mesh(
			new THREE.PlaneGeometry(0.08, h, 1, 4),
			new THREE.MeshBasicMaterial({ color: 0x2d8a3e, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
		);
		sw.position.set(Math.cos(a)*r, -2.5+h/2, Math.sin(a)*r);
		scene.add(sw); track.push(sw);
		swayItems.push({ obj: sw, phase: Math.random()*Math.PI*2, amp: 0.15, spd: 0.4+Math.random()*0.2 });
	}

	// ═══ BOAT HULL (silhouette at surface) ═══
	const hull = new THREE.Mesh(
		new THREE.BoxGeometry(2.5, 0.4, 0.8),
		new THREE.MeshBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.4 }),
	);
	hull.position.set(2, 4.5, -4);
	scene.add(hull); track.push(hull);

	// ═══ OCEAN CURRENT — flowing particles drifting in one direction ═══
	const currentCount = 150;
	const curGeo = new THREE.BufferGeometry();
	const curPos = new Float32Array(currentCount * 3);
	const curSpd = new Float32Array(currentCount);
	for (let i = 0; i < currentCount; i++) {
		curPos[i*3] = -8 - Math.random() * 6; // start from one side
		curPos[i*3+1] = -1 + Math.random() * 3;
		curPos[i*3+2] = (Math.random() - 0.5) * 14;
		curSpd[i] = 0.3 + Math.random() * 0.4;
	}
	curGeo.setAttribute('position', new THREE.BufferAttribute(curPos, 3));
	const current = new THREE.Points(curGeo, new THREE.PointsMaterial({
		color: 0x88ccff, size: 0.05, transparent: true, opacity: 0.4,
		blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
	}));
	scene.add(current); track.push(current);
	const currentGeo = curGeo; // ref for update loop

	// ═══ ROCKS ═══
	for (let i = 0; i < 6; i++) {
		const rg = new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.3, 0);
		rg.scale(1.3, 0.6, 1.0);
		const rock = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0x3a4a3a, transparent: true, opacity: 0.6 }));
		const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 6;
		rock.position.set(Math.cos(a)*r, -2.2, Math.sin(a)*r);
		scene.add(rock); track.push(rock);
	}

	// ═══ LIGHTING ═══
	const ambient = new THREE.AmbientLight(0x4488bb, 0.4);
	scene.add(ambient); track.push(ambient);
	const keyLight = new THREE.PointLight(0x66bbff, 0.8, 25);
	keyLight.position.set(0, 5, 0);
	scene.add(keyLight); track.push(keyLight);
	const fillLight = new THREE.PointLight(0x004488, 0.4, 20);
	fillLight.position.set(5, -1, 5);
	scene.add(fillLight); track.push(fillLight);

	const oldFog = scene.fog;
	const oldBg = scene.background;
	scene.fog = new THREE.FogExp2(0x004466, 0.03);
	scene.background = new THREE.Color(0x003355);

	// Camera reset
	if (world.camera) {
		world.camera.position.set(0, 1, 6);
		world.camera.lookAt(0, 0, -5);
		world.camera.rotation.z = 0;
	}

	// ═══ SOUND ═══
	try {
		const ctx = getAudioCtx();
		const ambient_s = createWaterAmbient(ctx);
		ambient_s.output.connect(ctx.destination); ambient_s.start();
		audioNodes.push(ambient_s.output);
		waterModulator = setInterval(() => {
			ambient_s.filter.frequency.linearRampToValueAtTime(150 + Math.random() * 200, ctx.currentTime + 3);
		}, 4000);

		for (let i = 0; i < 5; i++) {
			const b = createBubbleSound(ctx);
			b.output.connect(ctx.destination);
			bubbleSounds.push(b);
			audioNodes.push(b.output);
		}

		whaleSound = createWhaleSound(ctx);
		whaleSound.output.connect(ctx.destination);
		audioNodes.push(whaleSound.output);

		if (world.renderer?.domElement) {
			world.renderer.domElement.addEventListener('click', () => { if (ctx.state === 'suspended') ctx.resume(); }, { once: true });
		}

		console.log('[ocean] Sound: water ambient + bubbles + whale song');
	} catch (e) { console.warn('[ocean] Audio failed:', e.message); }

	// ═══ TAP HANDLER ═══
	const raycaster = new THREE.Raycaster();
	function onPointerDown(event) {
		const x = (event.clientX !== undefined ? event.clientX : event.touches?.[0]?.clientX) / window.innerWidth * 2 - 1;
		const y = -((event.clientY !== undefined ? event.clientY : event.touches?.[0]?.clientY) / window.innerHeight) * 2 + 1;
		raycaster.setFromCamera({ x, y }, world.camera);
		const hits = raycaster.intersectObjects(tapTargets, true);
		if (hits.length > 0) {
			let target = hits[0].object;
			while (target && !target.userData?.portalId) target = target.parent;
			if (target?.userData?.portalId) {
				console.log('[ocean] Navigating to', target.userData.portalId);
				if (onNavigate) onNavigate(target.userData.portalId);
			}
		}
	}
	world.renderer.domElement.addEventListener('pointerdown', onPointerDown);
	world.renderer.domElement.addEventListener('touchstart', onPointerDown);

	// Hover
	let hoveredTarget = null;
	const hoverRaycaster = new THREE.Raycaster();
	function onPointerMove(event) {
		const x = (event.clientX !== undefined ? event.clientX : 0) / window.innerWidth * 2 - 1;
		const y = -((event.clientY !== undefined ? event.clientY : 0) / window.innerHeight) * 2 + 1;
		hoverRaycaster.setFromCamera({ x, y }, world.camera);
		const hits = hoverRaycaster.intersectObjects(tapTargets, true);
		let t = null;
		if (hits.length > 0) { t = hits[0].object; while (t && !t.userData?.portalId) t = t.parent; }
		hoveredTarget = t;
	}
	world.renderer.domElement.addEventListener('pointermove', onPointerMove);

	// ═══ UPDATE LOOP ═══
	const prevUpdate = world.update.bind(world);
	world.update = function(delta, time) {
		prevUpdate(delta, time);
		const tt = time / 1000;

		// Animate water ceiling shader
		ceilingMat.uniforms.time.value = tt;

		// Ocean current flowing left to right
		const cp = currentGeo.attributes.position.array;
		for (let i = 0; i < currentCount; i++) {
			cp[i*3] += curSpd[i] * delta;
			cp[i*3+1] += Math.sin(tt * 0.5 + i) * 0.003;
			if (cp[i*3] > 10) { cp[i*3] = -8 - Math.random() * 4; cp[i*3+1] = -1 + Math.random() * 3; cp[i*3+2] = (Math.random()-0.5)*14; }
		}
		currentGeo.attributes.position.needsUpdate = true;

		// Seaweed swaying
		for (const s of swayItems) {
			if (s.obj) { s.obj.rotation.z = Math.sin(tt * s.spd + s.phase) * s.amp; s.obj.rotation.x = Math.cos(tt * s.spd * 0.7 + s.phase) * s.amp * 0.6; }
		}

		// Random bubbles
		if (bubbleSounds.length > 0 && Math.random() < 0.02) {
			bubbleSounds[Math.floor(Math.random() * bubbleSounds.length)].pop();
		}

		// Whale call every ~15 seconds
		if (whaleSound && Math.random() < 0.0015) {
			whaleSound.call();
		}

		// Label hover fade + glow pulse
		for (let li = 0; li < labels.length; li++) {
			const l = labels[li];
			const isHovered = hoveredTarget && tapTargets.indexOf(hoveredTarget) === li;
			const targetOp = isHovered ? 0.9 : 0.35 + Math.sin(tt * 1.5 + l.phase) * 0.15;
			l.sprite.material.opacity += (targetOp - l.sprite.material.opacity) * 0.15;
			l.sprite.position.y = l.baseY + Math.sin(tt * 0.8 + l.phase) * 0.08;
			l.glow.material.opacity = 0.15 + Math.sin(tt * 2 + l.phase) * 0.1;
			l.glow.scale.setScalar(0.9 + Math.sin(tt * 2 + l.phase) * 0.15);
		}
	};

	console.log('[ocean] Scene built with', track.length, 'objects, coral gateways active');

	return {
		cleanup() {
			for (const obj of track) scene.remove(obj);
			if (waterModulator) clearInterval(waterModulator);
			for (const node of audioNodes) { try { node.disconnect(); } catch {} }
			scene.background = oldBg;
			scene.fog = oldFog;
			world.update = prevUpdate;
			world.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
			world.renderer.domElement.removeEventListener('touchstart', onPointerDown);
			world.renderer.domElement.removeEventListener('pointermove', onPointerMove);
		},
	};
}
