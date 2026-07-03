// forest-scene.js — Forest world for portal engine
// Navigation: tap glowing tree trunks to travel.

import * as THREE from 'three';

let audioCtx = null;
function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }

function createWindRustle(ctx) {
	const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
	const data = buf.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = (Math.random()*2-1) * 0.15;
	const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
	const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 600; filter.Q.value = 0.5;
	const gain = ctx.createGain(); gain.gain.value = 0.04;
	noise.connect(filter).connect(gain);
	return { output: gain, start: () => noise.start(), filter };
}

function createBirdCall(ctx) {
	const osc = ctx.createOscillator(); osc.type = 'triangle';
	const gain = ctx.createGain(); gain.gain.value = 0;
	osc.connect(gain); osc.start();
	return {
		output: gain,
		call: () => {
			const now = ctx.currentTime;
			const base = 1500 + Math.random() * 2000;
			osc.frequency.setValueAtTime(base, now);
			osc.frequency.linearRampToValueAtTime(base * 1.3, now + 0.05);
			osc.frequency.linearRampToValueAtTime(base * 0.9, now + 0.1);
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
		},
	};
}

function createCricketSound(ctx) {
	const osc = ctx.createOscillator(); osc.type = 'square';
	const gain = ctx.createGain(); gain.gain.value = 0;
	const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 4000;
	osc.connect(filter).connect(gain); osc.frequency.value = 4500; osc.start();
	return {
		output: gain,
		chirp: () => {
			const now = ctx.currentTime;
			gain.gain.setValueAtTime(0.03, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
		},
	};
}

function makeTextSprite(text, color) {
	const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
	const ctx = canvas.getContext('2d');
	ctx.font = 'bold 28px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
	ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
	ctx.fillStyle = '#' + color.getHexString();
	ctx.fillText(text, 128, 32);
	const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
	return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false }));
}

export function buildForestScene(world, config = {}, allConfigs = {}, onNavigate = null) {
	const scene = world.scene;
	const track = []; const tapTargets = []; const labels = []; const swayItems = [];
	const audioNodes = []; const fireflies = []; let birdCalls = []; let cricketSounds = []; let windModulator = null;

	// ═══ SKY (canopy-filtered green twilight) ═══
	const skyMat = new THREE.ShaderMaterial({
		uniforms: { top: { value: new THREE.Color(0x224411) }, bottom: { value: new THREE.Color(0x446622) } },
		vertexShader: `varying vec3 vP; void main() { vec4 wp = modelMatrix * vec4(position,1.0); vP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
		fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main() { float h = normalize(vP).y; float t = clamp(h*0.5+0.5,0.0,1.0); gl_FragColor = vec4(mix(bottom,top,t),1.0); }`,
		side: THREE.BackSide,
	});
	scene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat)); track.push(scene.children[scene.children.length-1]);

	// ═══ GROUND ═══
	const floorGeo = new THREE.PlaneGeometry(50, 50, 24, 24);
	const fPos = floorGeo.attributes.position;
	for (let i = 0; i < fPos.count; i++) { const x = fPos.getX(i), y = fPos.getY(i); fPos.setZ(i, Math.sin(x*0.2)*0.15 + Math.cos(y*0.15)*0.1); }
	fPos.needsUpdate = true;
	const floor = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({ color: 0x1a2810, transparent: true, opacity: 0.7 }));
	floor.rotation.x = -Math.PI/2; floor.position.y = -1.5;
	scene.add(floor); track.push(floor);

	// ═══ TREES (navigation gateways) ═══
	const portalIds = Object.keys(allConfigs).filter(id => id !== (config.portal?.id));
	const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';
	const treeSpots = [
		{ x: -4, z: -5, s: 1.3 }, { x: 4, z: -7, s: 1.0 }, { x: -7, z: -10, s: 1.5 },
		{ x: 7, z: -5, s: 0.9 }, { x: 0, z: -12, s: 1.2 }, { x: -3, z: -14, s: 1.1 },
	];

	for (let i = 0; i < treeSpots.length; i++) {
		const t = treeSpots[i];
		const pid = portalIds[i % portalIds.length];
		const pcfg = allConfigs[pid];
		const pcolor = pcfg ? new THREE.Color(pcfg.palette?.primary || 0x88ff66) : new THREE.Color(0x88ff66);
		const pname = pcfg ? (pcfg.portal?.names?.[lang] || pcfg.portal?.names?.es || pid) : pid;
		const h = (4 + Math.random()*3) * t.s;

		// Trunk
		const trunk = new THREE.Mesh(
			new THREE.CylinderGeometry(0.15*t.s, 0.3*t.s, h, 6),
			new THREE.MeshBasicMaterial({ color: 0x2a1a08, transparent: true, opacity: 0.85 }),
		);
		trunk.position.set(t.x, h/2-1.5, t.z);
		trunk.userData = { portalId: pid, isGateway: true };
		scene.add(trunk); track.push(trunk); tapTargets.push(trunk);

		// Canopy (stacked cones)
		const cColor = new THREE.Color().setHSL(0.27+Math.random()*0.08, 0.4, 0.15+Math.random()*0.08);
		for (let c = 0; c < 3; c++) {
			const cone = new THREE.Mesh(
				new THREE.ConeGeometry((1.0-c*0.25)*t.s, 1.5*t.s, 6),
				new THREE.MeshBasicMaterial({ color: cColor, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending }),
			);
			cone.position.set(t.x, h-1.5+c*0.8*t.s, t.z);
			scene.add(cone); track.push(cone);
		}

		// Glow at trunk base
		const glow = new THREE.Mesh(
			new THREE.RingGeometry(0.4*t.s, 0.6*t.s, 20),
			new THREE.MeshBasicMaterial({ color: pcolor, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
		);
		glow.rotation.x = -Math.PI/2; glow.position.set(t.x, -1.48, t.z);
		scene.add(glow); track.push(glow);

		// Label
		const label = makeTextSprite(pname, pcolor);
		label.material.opacity = 0;
		label.position.set(t.x, h+0.3, t.z); label.scale.set(1.2, 0.3, 1);
		scene.add(label); track.push(label);
		labels.push({ sprite: label, baseY: label.position.y, phase: Math.random()*Math.PI*2, glow });
	}

	// ═══ BUSHES ═══
	for (let i = 0; i < 10; i++) {
		const a = Math.random()*Math.PI*2, r = 1.5+Math.random()*5;
		const bush = new THREE.Mesh(
			new THREE.SphereGeometry(0.25+Math.random()*0.2, 6, 5),
			new THREE.MeshBasicMaterial({ color: 0x1a3010, transparent: true, opacity: 0.5 }),
		);
		bush.position.set(Math.cos(a)*r, -1.2, Math.sin(a)*r); bush.scale.y = 0.6;
		scene.add(bush); track.push(bush);
	}

	// ═══ FIREFLIES ═══
	for (let i = 0; i < 25; i++) {
		const ff = new THREE.Mesh(
			new THREE.SphereGeometry(0.04, 4, 4),
			new THREE.MeshBasicMaterial({ color: 0xffee66, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }),
		);
		ff.position.set((Math.random()-0.5)*12, Math.random()*4, (Math.random()-0.5)*12);
		ff.userData = { phase: Math.random()*Math.PI*2 };
		scene.add(ff); track.push(ff);
		fireflies.push({ mesh: ff, baseY: ff.position.y, phase: Math.random()*Math.PI*2 });
	}

	// ═══ GOD RAYS ═══
	for (let i = 0; i < 4; i++) {
		const a = Math.random()*Math.PI*2, r = 1+Math.random()*3;
		const shaft = new THREE.Mesh(
			new THREE.PlaneGeometry(0.8, 8),
			new THREE.MeshBasicMaterial({ color: 0x88ff66, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
		);
		shaft.position.set(Math.cos(a)*r, 2.5, Math.sin(a)*r); shaft.lookAt(0, 2.5, 0);
		scene.add(shaft); track.push(shaft);
	}

	// ═══ FIREPIT WITH SMOKE ═══
	// Stone ring
	for (let i = 0; i < 8; i++) {
		const a = (i/8) * Math.PI * 2;
		const stone = new THREE.Mesh(
			new THREE.DodecahedronGeometry(0.12, 0),
			new THREE.MeshBasicMaterial({ color: 0x554433, transparent: true, opacity: 0.7 }),
		);
		stone.position.set(Math.cos(a) * 0.5, -1.35, Math.sin(a) * 0.5);
		scene.add(stone); track.push(stone);
	}
	// Fire glow
	const fireGlow = new THREE.Mesh(
		new THREE.SphereGeometry(0.15, 8, 8),
		new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }),
	);
	fireGlow.position.set(0, -1.2, 0);
	scene.add(fireGlow); track.push(fireGlow);
	const fireLight = new THREE.PointLight(0xff6622, 1.5, 5);
	fireLight.position.set(0, -1, 0);
	scene.add(fireLight); track.push(fireLight);
	// Smoke particles
	const smokeCount = 40;
	const smokeGeo = new THREE.BufferGeometry();
	const smokePos = new Float32Array(smokeCount * 3);
	const smokeLife = new Float32Array(smokeCount);
	for (let i = 0; i < smokeCount; i++) {
		smokePos[i*3] = (Math.random()-0.5) * 0.1; smokePos[i*3+1] = -1 + Math.random() * 4; smokePos[i*3+2] = (Math.random()-0.5) * 0.1;
		smokeLife[i] = Math.random();
	}
	smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
	const smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({
		color: 0x999999, size: 0.2, transparent: true, opacity: 0.15,
		blending: THREE.NormalBlending, depthWrite: false, sizeAttenuation: true,
	}));
	scene.add(smoke); track.push(smoke);

	// ═══ LIGHTING ═══
	const ambient = new THREE.AmbientLight(0x445522, 0.4); scene.add(ambient); track.push(ambient);
	const key = new THREE.PointLight(0x88ff44, 0.6, 20); key.position.set(0, 4, 0); scene.add(key); track.push(key);
	const fill = new THREE.PointLight(0x224411, 0.3, 15); fill.position.set(-3, 1, 3); scene.add(fill); track.push(fill);

	const oldFog = scene.fog; const oldBg = scene.background;
	scene.fog = new THREE.FogExp2(0x1a2a10, 0.025);
	scene.background = new THREE.Color(0x0a1a08);

	if (world.camera) { world.camera.position.set(0, 1.5, 6); world.camera.lookAt(0, 0, -5); world.camera.rotation.z = 0; }

	// ═══ SOUND ═══
	try {
		const ctx = getAudioCtx();
		const wind = createWindRustle(ctx); wind.output.connect(ctx.destination); wind.start();
		audioNodes.push(wind.output);
		windModulator = setInterval(() => { wind.filter.frequency.linearRampToValueAtTime(400+Math.random()*600, ctx.currentTime+3); }, 3500);

		for (let i = 0; i < 3; i++) { const b = createBirdCall(ctx); b.output.connect(ctx.destination); birdCalls.push(b); audioNodes.push(b.output); }
		for (let i = 0; i < 4; i++) { const c = createCricketSound(ctx); c.output.connect(ctx.destination); cricketSounds.push(c); audioNodes.push(c.output); }

		if (world.renderer?.domElement) world.renderer.domElement.addEventListener('click', () => { if (ctx.state === 'suspended') ctx.resume(); }, { once: true });
		console.log('[forest] Sound: wind + birds + crickets');
	} catch (e) { console.warn('[forest] Audio failed:', e.message); }

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
			if (target?.userData?.portalId) { console.log('[forest] Navigating to', target.userData.portalId); if (onNavigate) onNavigate(target.userData.portalId); }
		}
	}
	world.renderer.domElement.addEventListener('pointerdown', onPointerDown);
	world.renderer.domElement.addEventListener('touchstart', onPointerDown);

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
		if (birdCalls.length > 0 && Math.random() < 0.008) birdCalls[Math.floor(Math.random()*birdCalls.length)].call();
		if (cricketSounds.length > 0 && Math.random() < 0.02) cricketSounds[Math.floor(Math.random()*cricketSounds.length)].chirp();

		// Firepit flicker
		fireGlow.material.opacity = 0.5 + Math.sin(tt * 8) * 0.2 + Math.sin(tt * 13) * 0.1;
		fireGlow.scale.setScalar(0.8 + Math.sin(tt * 6) * 0.15);
		fireLight.intensity = 1.2 + Math.sin(tt * 7) * 0.4;

		// Smoke rising
		const sPos = smokeGeo.attributes.position.array;
		for (let i = 0; i < smokeCount; i++) {
			sPos[i*3+1] += delta * 0.4;
			sPos[i*3] += Math.sin(tt + i) * 0.008;
			smokeLife[i] -= delta * 0.15;
			if (smokeLife[i] <= 0 || sPos[i*3+1] > 4) {
				sPos[i*3] = (Math.random()-0.5) * 0.1;
				sPos[i*3+1] = -1;
				sPos[i*3+2] = (Math.random()-0.5) * 0.1;
				smokeLife[i] = 1.0;
			}
		}
		smokeGeo.attributes.position.needsUpdate = true;
		smoke.material.opacity = 0.1 + Math.sin(tt * 0.5) * 0.05;
		for (const f of fireflies) {
			f.mesh.position.y = f.baseY + Math.sin(tt*0.5+f.phase)*0.3;
			f.mesh.position.x += Math.sin(tt*0.3+f.phase)*0.005;
			f.mesh.material.opacity = 0.4 + Math.sin(tt*2+f.phase)*0.4;
		}
		for (let li = 0; li < labels.length; li++) {
			const l = labels[li];
			const isHovered = hoveredTarget && tapTargets.indexOf(hoveredTarget) === li;
			const targetOp = isHovered ? 0.85 : 0;
			l.sprite.material.opacity += (targetOp - l.sprite.material.opacity) * 0.15;
			l.sprite.position.y = l.baseY + Math.sin(tt*0.8+l.phase)*0.06;
			l.glow.material.opacity = 0.15 + Math.sin(tt*2+l.phase)*0.1;
			l.glow.scale.setScalar(0.9 + Math.sin(tt*2+l.phase)*0.15);
		}
	};

	console.log('[forest] Scene built with', track.length, 'objects');
	return {
		cleanup() {
			for (const obj of track) scene.remove(obj);
			if (windModulator) clearInterval(windModulator);
			for (const node of audioNodes) { try { node.disconnect(); } catch {} }
			scene.background = oldBg; scene.fog = oldFog;
			world.update = prevUpdate;
			world.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
			world.renderer.domElement.removeEventListener('touchstart', onPointerDown);
			world.renderer.domElement.removeEventListener('pointermove', onPointerMove);
		},
	};
}
