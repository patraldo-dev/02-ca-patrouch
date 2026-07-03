// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict JS type-checking (see jsconfig.json).
// celebration-scene.js — Festive plaza scene builder
// Twilight celebration with piñatas, lanterns, and fireworks.

import * as THREE from 'three';

let audioCtx = null;
function getAudioCtx() {
	if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	return audioCtx;
}

function createFestiveDrone(ctx) {
	const osc1 = ctx.createOscillator(); osc1.type = 'triangle'; osc1.frequency.value = 220;
	const osc2 = ctx.createOscillator(); osc2.type = 'triangle'; osc2.frequency.value = 330;
	const gain = ctx.createGain(); gain.gain.value = 0.03;
	osc1.connect(gain); osc2.connect(gain);
	osc1.start(); osc2.start();
	return { output: gain };
}

function createTrumpet(ctx) {
	const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 440;
	const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 800; filter.Q.value = 2;
	const gain = ctx.createGain(); gain.gain.value = 0;
	osc.connect(filter).connect(gain); osc.start();
	return {
		output: gain,
		blare: (note = 440) => {
			const now = ctx.currentTime;
			osc.frequency.setValueAtTime(note, now);
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
		},
	};
}

function createCrackle(ctx) {
	const bufferSize = ctx.sampleRate * 0.3;
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
	const gain = ctx.createGain(); gain.gain.value = 0.12;
	return {
		output: gain,
		play: () => {
			const src = ctx.createBufferSource(); src.buffer = buffer;
			src.connect(gain); src.start();
		},
	};
}

function makeTextSprite(text, color) {
	const canvas = document.createElement('canvas');
	canvas.width = 256; canvas.height = 64;
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = 'rgba(0,0,0,0)';
	ctx.fillRect(0, 0, 256, 64);
	ctx.font = 'bold 28px Georgia, serif';
	ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
	const hex = '#' + color.getHexString();
	ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
	ctx.fillStyle = hex; ctx.fillText(text, 128, 32);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false });
	return new THREE.Sprite(mat);
}

export function buildCelebrationScene(world, config = {}, allConfigs = {}, onNavigate = null) {
	const scene = world.scene;
	const track = [];
	const swayItems = [];
	const audioNodes = [];
	const tapTargets = [];
	const labels = [];
	const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';
	const fireworks = [];
	let trumpet = null;
	let crackle = null;

	// ═══ SKY — twilight gradient ═══
	const skyMat = new THREE.ShaderMaterial({
		uniforms: {
			topColor: { value: new THREE.Color(0x1a0a3a) },
			bottomColor: { value: new THREE.Color(0xff6633) },
		},
		vertexShader: `varying vec3 vWorldPos; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
		fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vWorldPos; void main() { float h = normalize(vWorldPos).y; float t = clamp(h * 0.5 + 0.5, 0.0, 1.0); gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0); }`,
		side: THREE.BackSide, depthWrite: false,
	});
	const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat);
	scene.add(sky); track.push(sky);

	// ═══ GROUND — cobblestone plaza ═══
	const groundGeo = new THREE.PlaneGeometry(60, 60, 20, 20);
	const gPos = groundGeo.attributes.position;
	for (let i = 0; i < gPos.count; i++) {
		const x = gPos.getX(i), y = gPos.getY(i);
		gPos.setZ(i, Math.sin(x * 0.5) * 0.03 + Math.cos(y * 0.4) * 0.02);
	}
	gPos.needsUpdate = true;
	const ground = new THREE.Mesh(groundGeo, new THREE.MeshBasicMaterial({ color: 0x4a3a2a, transparent: true, opacity: 0.8 }));
	ground.rotation.x = -Math.PI / 2; ground.position.y = -1.5;
	scene.add(ground); track.push(ground);

	// ═══ PLAZA TILES — decorative circle ═══
	const tileRing = new THREE.Mesh(
		new THREE.RingGeometry(3, 5, 32),
		new THREE.MeshBasicMaterial({ color: 0x6a5a4a, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
	);
	tileRing.rotation.x = -Math.PI / 2; tileRing.position.y = -1.48;
	scene.add(tileRing); track.push(tileRing);

	// ═══ PIÑATAS — gateway objects ═══
	const portalIds = Object.keys(allConfigs).filter(id => id !== (config.portal?.id));
	const pinataColors = [0xff3366, 0xffdd00, 0x00ccff, 0xff8800, 0x88ff44, 0xcc44ff];
	const pinataPositions = [
		{ x: -3.5, z: -5, h: 2 }, { x: 3.5, z: -5, h: 2.2 },
		{ x: -5, z: -10, h: 1.8 }, { x: 5, z: -10, h: 2.1 },
		{ x: 0, z: -14, h: 2.5 }, { x: -7, z: -7, h: 1.9 },
	];

	for (let i = 0; i < pinataPositions.length; i++) {
		const p = pinataPositions[i];
		const portalId = portalIds[i % portalIds.length];
		const portalConfig = allConfigs[portalId];
		const portalColor = portalConfig ? new THREE.Color(portalConfig.palette?.primary || pinataColors[i]) : new THREE.Color(pinataColors[i]);
		const portalName = portalConfig ? (portalConfig.portal?.names?.[lang] || portalConfig.portal?.names?.es || portalId) : portalId;

		// Post
		const post = new THREE.Mesh(
			new THREE.CylinderGeometry(0.04, 0.04, p.h + 2, 6),
			new THREE.MeshBasicMaterial({ color: 0x4a3020, transparent: true, opacity: 0.5 }),
		);
		post.position.set(p.x, -1.5 + (p.h + 2) / 2, p.z);
		scene.add(post); track.push(post);

		// Crossbar
		const crossbar = new THREE.Mesh(
			new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6),
			new THREE.MeshBasicMaterial({ color: 0x4a3020, transparent: true, opacity: 0.5 }),
		);
		crossbar.position.set(p.x, -1.5 + p.h + 1.5, p.z);
		crossbar.rotation.z = Math.PI / 2;
		scene.add(crossbar); track.push(crossbar);

		// Piñata body (multi-colored sphere clusters)
		const pinataGroup = new THREE.Group();
		const baseColor = pinataColors[i % pinataColors.length];
		const mainBody = new THREE.Mesh(
			new THREE.SphereGeometry(0.35, 12, 10),
			new THREE.MeshBasicMaterial({ color: baseColor, transparent: true, opacity: 0.75 }),
		);
		mainBody.scale.set(1, 1.3, 0.8);
		pinataGroup.add(mainBody);

		// Decorative spikes (cone fringe)
		for (let s = 0; s < 8; s++) {
			const angle = (s / 8) * Math.PI * 2;
			const spike = new THREE.Mesh(
				new THREE.ConeGeometry(0.05, 0.15, 4),
				new THREE.MeshBasicMaterial({ color: pinataColors[(s + i) % pinataColors.length], transparent: true, opacity: 0.7 }),
			);
			spike.position.set(Math.cos(angle) * 0.3, -0.35, Math.sin(angle) * 0.25);
			spike.rotation.set(Math.PI, 0, angle);
			pinataGroup.add(spike);
		}

		// Hanging string
		pinataGroup.position.set(p.x, -1.5 + p.h, p.z);

		// Glow halo
		const glow = new THREE.Mesh(
			new THREE.RingGeometry(0.4, 0.6, 24),
			new THREE.MeshBasicMaterial({ color: portalColor, transparent: true, opacity: 0.25, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
		);
		glow.rotation.x = -Math.PI / 2;
		glow.position.set(p.x, -1.48, p.z);
		scene.add(glow); track.push(glow);

		// Top glow
		const topGlow = new THREE.Mesh(
			new THREE.SphereGeometry(0.08, 8, 8),
			new THREE.MeshBasicMaterial({ color: portalColor, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }),
		);
		topGlow.position.set(p.x, -1.5 + p.h + 0.5, p.z);
		scene.add(topGlow); track.push(topGlow);

		// Label
		const label = makeTextSprite(portalName, portalColor);
		label.position.set(p.x, -1.5 + p.h + 0.8, p.z);
		label.scale.set(1.2, 0.3, 1);
		label.material.opacity = 0;
		scene.add(label); track.push(label);

		pinataGroup.userData = { portalId, isGateway: true };
		for (const child of pinataGroup.children) child.userData = pinataGroup.userData;
		scene.add(pinataGroup); track.push(pinataGroup);
		tapTargets.push(pinataGroup);
		labels.push({ sprite: label, baseY: label.position.y, phase: Math.random() * Math.PI * 2, glow: topGlow, baseOpacity: 0.6 });
		swayItems.push({ obj: pinataGroup, phase: Math.random() * Math.PI * 2, amp: 0.04, spd: 0.6 + Math.random() * 0.3 });
	}

	// ═══ LANTERN STRINGS — criss-crossing overhead ═══
	for (let chain = 0; chain < 4; chain++) {
		const y = 2.5 + chain * 0.5;
		const radius = 5 + chain * 0.8;
		for (let i = 0; i < 14; i++) {
			const angle = (i / 14) * Math.PI * 2;
			const c = new THREE.Color().setHSL(0.05 + Math.random() * 0.12, 0.9, 0.55);
			const lantern = new THREE.Mesh(
				new THREE.SphereGeometry(0.12, 8, 6),
				new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }),
			);
			lantern.position.set(Math.cos(angle) * radius, y + Math.sin(i * 0.5) * 0.2, Math.sin(angle) * radius);
			scene.add(lantern); track.push(lantern);
			swayItems.push({ obj: lantern, phase: Math.random() * Math.PI * 2, amp: 0.02, spd: 1 + Math.random() * 0.5 });
		}
	}

	// ═══ DECORATIVE — market stalls ═══
	for (let i = 0; i < 4; i++) {
		const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
		const r = 8;
		const stallGroup = new THREE.Group();
		// Table
		const table = new THREE.Mesh(
			new THREE.BoxGeometry(1.2, 0.08, 0.6),
			new THREE.MeshBasicMaterial({ color: 0x5a3a20, transparent: true, opacity: 0.6 }),
		);
		table.position.y = -0.8;
		stallGroup.add(table);
		// Awning
		const awning = new THREE.Mesh(
			new THREE.PlaneGeometry(1.4, 0.8),
			new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(i / 4, 0.7, 0.4), transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
		);
		awning.position.set(0, -0.2, -0.3);
		awning.rotation.x = -0.4;
		stallGroup.add(awning);
		// Posts
		for (let j = -1; j <= 1; j += 2) {
			const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), new THREE.MeshBasicMaterial({ color: 0x4a2810, transparent: true, opacity: 0.4 }));
			pole.position.set(j * 0.6, -0.4, -0.3);
			stallGroup.add(pole);
		}
		stallGroup.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
		stallGroup.lookAt(0, 0, 0);
		scene.add(stallGroup); track.push(stallGroup);
	}

	// ═══ FIREWORKS — periodic bursts (living element) ═══
	function launchFirework() {
		const x = (Math.random() - 0.5) * 14;
		const y = 4 + Math.random() * 3;
		const z = -8 - Math.random() * 6;
		const burstColor = new THREE.Color().setHSL(Math.random(), 0.85, 0.6);
		const particles = [];

		for (let i = 0; i < 40; i++) {
			const angle = (i / 40) * Math.PI * 2;
			const elevation = Math.random() * Math.PI;
			const speed = 0.04 + Math.random() * 0.03;
			const p = new THREE.Mesh(
				new THREE.SphereGeometry(0.03, 4, 4),
				new THREE.MeshBasicMaterial({ color: burstColor, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }),
			);
			p.position.set(x, y, z);
			p.userData = {
				vx: Math.cos(angle) * Math.sin(elevation) * speed,
				vy: Math.cos(elevation) * speed,
				vz: Math.sin(angle) * Math.sin(elevation) * speed,
				life: 1,
			};
			scene.add(p); track.push(p);
			particles.push(p);
		}

		fireworks.push({ particles, age: 0 });

		// Sound
		try { if (crackle) crackle.play(); } catch {}
	}

	// ═══ LIGHTING ═══
	const ambient = new THREE.AmbientLight(0xff8844, 0.4);
	scene.add(ambient); track.push(ambient);
	const warmLight = new THREE.PointLight(0xff6633, 0.8, 25);
	warmLight.position.set(0, 3, -5);
	scene.add(warmLight); track.push(warmLight);
	const fillLight = new THREE.PointLight(0x66aaff, 0.3, 20);
	fillLight.position.set(-5, 2, 5);
	scene.add(fillLight); track.push(fillLight);

	scene.fog = new THREE.FogExp2(0x663322, 0.02);
	const oldBg = scene.background;
	scene.background = new THREE.Color(0x3a1a30);

	if (world.camera) {
		world.camera.position.set(0, 1.5, 5);
		world.camera.lookAt(0, 0, -5);
		world.camera.rotation.z = 0;
	}

	// ═══ SOUND ═══
	let trumpetInterval = null;
	try {
		const ctx = getAudioCtx();
		const drone = createFestiveDrone(ctx);
		drone.output.connect(ctx.destination);
		audioNodes.push(drone.output);

		trumpet = createTrumpet(ctx);
		trumpet.output.connect(ctx.destination);
		audioNodes.push(trumpet.output);

		crackle = createCrackle(ctx);
		crackle.output.connect(ctx.destination);
		audioNodes.push(crackle.output);

		const notes = [440, 523, 587, 659, 698];
		trumpetInterval = setInterval(() => {
			if (Math.random() < 0.4 && trumpet) trumpet.blare(notes[Math.floor(Math.random() * notes.length)]);
		}, 3000);

		console.log('[celebration] Sound: festive drone + trumpet + firework crackle');
	} catch (e) {
		console.warn('[celebration] Audio setup failed:', e.message);
	}

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
			if (target?.userData?.portalId && onNavigate) onNavigate(target.userData.portalId);
		}
	}
	world.renderer.domElement.addEventListener('pointerdown', onPointerDown);
	world.renderer.domElement.addEventListener('touchstart', onPointerDown);

	// ═══ HOVER ═══
	let hoveredTarget = null;
	const hoverRaycaster = new THREE.Raycaster();
	function onPointerMove(event) {
		const x = (event.clientX !== undefined ? event.clientX : 0) / window.innerWidth * 2 - 1;
		const y = -((event.clientY !== undefined ? event.clientY : 0) / window.innerHeight) * 2 + 1;
		hoverRaycaster.setFromCamera({ x, y }, world.camera);
		const hits = hoverRaycaster.intersectObjects(tapTargets, true);
		hoveredTarget = null;
		if (hits.length > 0) {
			let t = hits[0].object;
			while (t && !t.userData?.portalId) t = t.parent;
			hoveredTarget = t;
		}
	}
	world.renderer.domElement.addEventListener('pointermove', onPointerMove);

	// ═══ UPDATE LOOP ═══
	let fireworkTimer = 2;
	const prevUpdate = world.update.bind(world);
	world.update = function(delta, time) {
		prevUpdate(delta, time);
		const tt = time / 1000;

		// Sway items
		for (const s of swayItems) { if (s.obj) s.obj.rotation.z = Math.sin(tt * s.spd + s.phase) * s.amp; }

		// Fireworks
		fireworkTimer -= delta;
		if (fireworkTimer <= 0) {
			launchFirework();
			fireworkTimer = 3 + Math.random() * 4;
		}

		// Update firework particles
		for (let fw = fireworks.length - 1; fw >= 0; fw--) {
			const f = fireworks[fw];
			f.age += delta;
			let allDead = true;
			for (const p of f.particles) {
				if (p.userData.life > 0) {
					allDead = false;
					p.position.x += p.userData.vx;
					p.position.y += p.userData.vy;
					p.position.z += p.userData.vz;
					p.userData.vy -= 0.001; // gravity
					p.userData.life -= delta * 0.6;
					p.material.opacity = Math.max(0, p.userData.life);
				}
			}
			if (allDead || f.age > 4) {
				for (const p of f.particles) {
					if (p.parent) p.parent.remove(p);
					if (p.geometry) p.geometry.dispose();
					if (p.material) p.material.dispose();
				}
				fireworks.splice(fw, 1);
			}
		}

		// Labels
		for (const l of labels) {
			const isHovered = hoveredTarget && tapTargets.includes(hoveredTarget) && tapTargets.indexOf(hoveredTarget) === labels.indexOf(l);
			const targetOp = isHovered ? 0.85 : 0;
			l.sprite.material.opacity += (targetOp - l.sprite.material.opacity) * 0.15;
			l.sprite.position.y = l.baseY + Math.sin(tt * 0.8 + l.phase) * 0.08;
			l.glow.material.opacity = l.baseOpacity + Math.sin(tt * 2 + l.phase) * 0.25;
			l.glow.scale.setScalar(0.9 + Math.sin(tt * 2 + l.phase) * 0.15);
		}
	};

	console.log('[celebration] Scene built with', track.length, 'objects');

	return {
		cleanup() {
			for (const obj of track) scene.remove(obj);
			if (trumpetInterval) clearInterval(trumpetInterval);
			for (const node of audioNodes) { try { node.disconnect(); } catch {} }
			scene.background = oldBg;
			scene.fog = null;
			world.update = prevUpdate;
			world.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
			world.renderer.domElement.removeEventListener('touchstart', onPointerDown);
			world.renderer.domElement.removeEventListener('pointermove', onPointerMove);
		},
	};
}

export async function bootCelebrationScene(container) {
	const { World } = await import('@iwsdk/core');
	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});
	buildCelebrationScene(world);
	return world;
}
