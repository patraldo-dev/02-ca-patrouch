// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict JS type-checking (see jsconfig.json).
// dream-scene.js — Surreal floating dreamscape
// Purple void with floating doorways (gateways), drifting fog, and orbiting crystals.

import * as THREE from 'three';

let audioCtx = null;
function getAudioCtx() {
	if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	return audioCtx;
}

function createDreamPad(ctx) {
	const freqs = [130.81, 196.00, 261.63, 329.63]; // C3, G3, C4, E4
	const gain = ctx.createGain(); gain.gain.value = 0;
	const oscs = [];
	for (const f of freqs) {
		const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f;
		const detune = ctx.createOscillator(); detune.type = 'sine'; detune.frequency.value = f * 1.005;
		const og = ctx.createGain(); og.gain.value = 0.25;
		osc.connect(og); detune.connect(og);
		og.connect(gain);
		osc.start(); detune.start();
		oscs.push(osc, detune);
	}
	// Slow swell
	gain.gain.setValueAtTime(0, ctx.currentTime);
	gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 3);
	return { output: gain };
}

function createChimeSound(ctx) {
	const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 880;
	const gain = ctx.createGain(); gain.gain.value = 0;
	osc.connect(gain); osc.start();
	return {
		output: gain,
		chime: (freq = 880) => {
			const now = ctx.currentTime;
			osc.frequency.setValueAtTime(freq, now);
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
		},
	};
}

function createWhoosh(ctx) {
	const bufferSize = ctx.sampleRate * 2;
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
	const gain = ctx.createGain(); gain.gain.value = 0.02;
	const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 600; filter.Q.value = 0.5;
	return {
		output: gain,
		play: () => {
			const src = ctx.createBufferSource(); src.buffer = buffer;
			src.connect(filter).connect(gain); src.start();
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

export function buildDreamScene(world, config = {}, allConfigs = {}, onNavigate = null) {
	const scene = world.scene;
	const track = [];
	const swayItems = [];
	const audioNodes = [];
	const tapTargets = [];
	const labels = [];
	const orbitCrystals = [];
	const fogParticles = [];
	const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';
	let chime = null;
	let whoosh = null;
	let chimeInterval = null;

	// ═══ SKY — deep purple gradient ═══
	const skyMat = new THREE.ShaderMaterial({
		uniforms: {
			topColor: { value: new THREE.Color(0x0a0220) },
			bottomColor: { value: new THREE.Color(0x2a0848) },
		},
		vertexShader: `varying vec3 vWorldPos; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
		fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vWorldPos; void main() { float h = normalize(vWorldPos).y; float t = clamp(h * 0.5 + 0.5, 0.0, 1.0); gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0); }`,
		side: THREE.BackSide, depthWrite: false,
	});
	const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat);
	scene.add(sky); track.push(sky);

	// ═══ FLOATING ISLAND — ground fragment ═══
	const islandGeo = new THREE.CylinderGeometry(4, 2, 0.4, 16);
	const island = new THREE.Mesh(
		islandGeo,
		new THREE.MeshBasicMaterial({ color: 0x1a0a30, transparent: true, opacity: 0.5 }),
	);
	island.position.y = -1.5;
	scene.add(island); track.push(island);

	// Island underside crystals (pointing down)
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * Math.PI * 2;
		const r = 2 + Math.random();
		const c = new THREE.Mesh(
			new THREE.ConeGeometry(0.2, 0.8 + Math.random() * 0.6, 4),
			new THREE.MeshBasicMaterial({ color: 0x4a2070, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending }),
		);
		c.position.set(Math.cos(a) * r, -1.9, Math.sin(a) * r);
		c.rotation.x = Math.PI;
		scene.add(c); track.push(c);
	}

	// ═══ FLOATING DOORWAYS — gateway objects ═══
	const portalIds = Object.keys(allConfigs).filter(id => id !== (config.portal?.id));
	const doorPositions = [
		{ x: -4, y: 0.5, z: -5 }, { x: 4, y: 1, z: -6 },
		{ x: -5, y: -0.5, z: -10 }, { x: 5, y: 0, z: -10 },
		{ x: 0, y: 1.5, z: -14 }, { x: -3, y: 2, z: -8 },
	];

	for (let i = 0; i < doorPositions.length; i++) {
		const d = doorPositions[i];
		const portalId = portalIds[i % portalIds.length];
		const portalConfig = allConfigs[portalId];
		const portalColor = portalConfig ? new THREE.Color(portalConfig.palette?.primary || 0x9944ff) : new THREE.Color(0x9944ff);
		const portalName = portalConfig ? (portalConfig.portal?.names?.[lang] || portalConfig.portal?.names?.es || portalId) : portalId;

		// Doorway torus (portal frame)
		const doorGroup = new THREE.Group();
		const frame = new THREE.Mesh(
			new THREE.TorusGeometry(0.6, 0.04, 8, 6),
			new THREE.MeshBasicMaterial({ color: portalColor, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending }),
		);
		frame.scale.set(0.7, 1.3, 1);
		doorGroup.add(frame);

		// Inner glow plane
		const inner = new THREE.Mesh(
			new THREE.PlaneGeometry(0.7, 1.4),
			new THREE.MeshBasicMaterial({ color: portalColor, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
		);
		doorGroup.add(inner);

		// Runes around the door (small floating dots)
		for (let r = 0; r < 6; r++) {
			const angle = (r / 6) * Math.PI * 2;
			const rune = new THREE.Mesh(
				new THREE.SphereGeometry(0.03, 6, 4),
				new THREE.MeshBasicMaterial({ color: portalColor, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }),
			);
			rune.position.set(Math.cos(angle) * 0.7, Math.sin(angle) * 1.1, 0);
			rune.userData = { angle, radius: 0.7, hRadius: 1.1, doorGroup };
			doorGroup.add(rune);
		}

		doorGroup.position.set(d.x, d.y, d.z);
		doorGroup.rotation.y = Math.random() * Math.PI * 2;
		doorGroup.rotation.z = (Math.random() - 0.5) * 0.3;

		// Label
		const label = makeTextSprite(portalName, portalColor);
		label.position.set(d.x, d.y + 1.2, d.z);
		label.scale.set(1.2, 0.3, 1);
		label.material.opacity = 0.35; // visible by default, breathes in update loop
		scene.add(label); track.push(label);

		doorGroup.userData = { portalId, isGateway: true };
		for (const child of doorGroup.children) child.userData = doorGroup.userData;
		scene.add(doorGroup); track.push(doorGroup);
		tapTargets.push(doorGroup);
		labels.push({ sprite: label, baseY: label.position.y, phase: Math.random() * Math.PI * 2 });
		swayItems.push({ obj: doorGroup, phase: Math.random() * Math.PI * 2, amp: 0.03, spd: 0.4 + Math.random() * 0.2, baseY: d.y });
	}

	// ═══ ORBITING CRYSTALS — the living element ═══
	const crystalGeos = [
		new THREE.IcosahedronGeometry(0.3, 0),
		new THREE.OctahedronGeometry(0.35),
		new THREE.TetrahedronGeometry(0.4),
		new THREE.DodecahedronGeometry(0.25),
	];
	for (let i = 0; i < 5; i++) {
		const c = new THREE.Color().setHSL(0.75 + Math.random() * 0.15, 0.6, 0.45);
		const crystal = new THREE.Mesh(
			crystalGeos[i % crystalGeos.length],
			new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
		);
		crystal.position.set((Math.random() - 0.5) * 8, Math.random() * 3, (Math.random() - 0.5) * 6 - 2);
		scene.add(crystal); track.push(crystal);
		orbitCrystals.push({
			mesh: crystal,
			angle: Math.random() * Math.PI * 2,
			radius: 2 + Math.random() * 3,
			height: Math.random() * 3,
			speed: 0.15 + Math.random() * 0.2,
			rotX: Math.random() * 0.3,
			rotY: Math.random() * 0.4,
			rotZ: Math.random() * 0.2,
		});
	}

	// ═══ AMBIENT FOG PARTICLES — drifting wisps ═══
	const fogGeo = new THREE.BufferGeometry();
	const fogPos = new Float32Array(80 * 3);
	for (let i = 0; i < 80; i++) {
		fogPos[i * 3] = (Math.random() - 0.5) * 20;
		fogPos[i * 3 + 1] = (Math.random() - 0.5) * 6;
		fogPos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 3;
	}
	fogGeo.setAttribute('position', new THREE.BufferAttribute(fogPos, 3));
	const fogMat = new THREE.PointsMaterial({
		size: 0.25, color: 0x6a30a0, transparent: true, opacity: 0.08,
		blending: THREE.AdditiveBlending, depthWrite: false,
	});
	const fogPoints = new THREE.Points(fogGeo, fogMat);
	scene.add(fogPoints); track.push(fogPoints);
	for (let i = 0; i < 80; i++) {
		fogParticles.push({
			vx: (Math.random() - 0.5) * 0.003,
			vy: (Math.random() - 0.5) * 0.002,
			vz: (Math.random() - 0.5) * 0.003,
		});
	}

	// ═══ SOFT GLOW ORBS ═══
	for (let i = 0; i < 10; i++) {
		const c = new THREE.Color().setHSL(0.78 + Math.random() * 0.12, 0.7, 0.5);
		const orb = new THREE.Mesh(
			new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 8, 8),
			new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending }),
		);
		orb.position.set((Math.random() - 0.5) * 10, Math.random() * 4 - 1, (Math.random() - 0.5) * 8 - 2);
		scene.add(orb); track.push(orb);
		swayItems.push({ obj: orb, phase: Math.random() * Math.PI * 2, amp: 0.02, spd: 0.3 + Math.random() * 0.3, baseY: orb.position.y });
	}

	// ═══ LIGHTING ═══
	const ambient = new THREE.AmbientLight(0x6644aa, 0.3);
	scene.add(ambient); track.push(ambient);
	const centerLight = new THREE.PointLight(0xaa66ff, 0.6, 20);
	centerLight.position.set(0, 1, -5);
	scene.add(centerLight); track.push(centerLight);
	const rimLight = new THREE.PointLight(0x4488ff, 0.3, 15);
	rimLight.position.set(-4, 2, 2);
	scene.add(rimLight); track.push(rimLight);

	scene.fog = new THREE.FogExp2(0x1a0838, 0.025);
	const oldBg = scene.background;
	scene.background = new THREE.Color(0x100428);

	if (world.camera) {
		world.camera.position.set(0, 1.5, 5);
		world.camera.lookAt(0, 0, -5);
		world.camera.rotation.z = 0;
	}

	// ═══ SOUND ═══
	try {
		const ctx = getAudioCtx();
		const pad = createDreamPad(ctx);
		pad.output.connect(ctx.destination);
		audioNodes.push(pad.output);

		chime = createChimeSound(ctx);
		chime.output.connect(ctx.destination);
		audioNodes.push(chime.output);

		whoosh = createWhoosh(ctx);
		whoosh.output.connect(ctx.destination);
		audioNodes.push(whoosh.output);

		const chimeFreqs = [523, 659, 784, 988, 1175];
		chimeInterval = setInterval(() => {
			if (Math.random() < 0.3 && chime) chime.chime(chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)]);
			if (Math.random() < 0.1 && whoosh) whoosh.play();
		}, 4000);

		console.log('[dream] Sound: pad + chimes + whoosh');
	} catch (e) {
		console.warn('[dream] Audio setup failed:', e.message);
	}

	// ═══ TAP + HOVER ═══
	const raycaster = new THREE.Raycaster();
	function getNDC(event) {
		const x = (event.clientX !== undefined ? event.clientX : event.touches?.[0]?.clientX) / window.innerWidth * 2 - 1;
		const y = -((event.clientY !== undefined ? event.clientY : event.touches?.[0]?.clientY) / window.innerHeight) * 2 + 1;
		return { x, y };
	}
	function onPointerDown(event) {
		const { x, y } = getNDC(event);
		raycaster.setFromCamera({ x, y }, world.camera);
		const hits = raycaster.intersectObjects(tapTargets, true);
		if (hits.length > 0) {
			let target = hits[0].object;
			while (target && !target.userData?.portalId) target = target.parent;
			if (target?.userData?.portalId && onNavigate) onNavigate(target.userData.portalId);
		}
	}

	let hoveredTarget = null;
	const hoverRaycaster = new THREE.Raycaster();
	function onPointerMove(event) {
		const { x, y } = getNDC(event);
		hoverRaycaster.setFromCamera({ x, y }, world.camera);
		const hits = hoverRaycaster.intersectObjects(tapTargets, true);
		hoveredTarget = null;
		if (hits.length > 0) {
			let t = hits[0].object;
			while (t && !t.userData?.portalId) t = t.parent;
			hoveredTarget = t;
		}
	}

	world.renderer.domElement.addEventListener('pointerdown', onPointerDown);
	world.renderer.domElement.addEventListener('touchstart', onPointerDown);
	world.renderer.domElement.addEventListener('pointermove', onPointerMove);

	// ═══ UPDATE LOOP ═══
	const prevUpdate = world.update.bind(world);
	world.update = function(delta, time) {
		prevUpdate(delta, time);
		const tt = time / 1000;

		// Floating sway
		for (const s of swayItems) {
			if (s.obj) {
				s.obj.position.y = (s.baseY ?? s.obj.position.y) + Math.sin(tt * s.spd + s.phase) * s.amp;
				s.obj.rotation.z = Math.sin(tt * s.spd * 0.7 + s.phase) * s.amp * 0.5;
			}
		}

		// Orbiting crystals
		for (const oc of orbitCrystals) {
			oc.angle += delta * oc.speed;
			oc.mesh.position.x = Math.cos(oc.angle) * oc.radius;
			oc.mesh.position.y = oc.height + Math.sin(oc.angle * 0.5) * 0.5;
			oc.mesh.position.z = Math.sin(oc.angle) * oc.radius - 4;
			oc.mesh.rotation.x += oc.rotX * delta;
			oc.mesh.rotation.y += oc.rotY * delta;
			oc.mesh.rotation.z += oc.rotZ * delta;
		}

		// Fog drift
		const positions = fogGeo.attributes.position.array;
		for (let i = 0; i < fogParticles.length; i++) {
			positions[i * 3] += fogParticles[i].vx;
			positions[i * 3 + 1] += fogParticles[i].vy;
			positions[i * 3 + 2] += fogParticles[i].vz;
			// Wrap
			if (Math.abs(positions[i * 3]) > 10) fogParticles[i].vx *= -1;
			if (Math.abs(positions[i * 3 + 1]) > 3) fogParticles[i].vy *= -1;
			if (Math.abs(positions[i * 3 + 2] + 3) > 7) fogParticles[i].vz *= -1;
		}
		fogGeo.attributes.position.needsUpdate = true;

		// Labels
		for (const l of labels) {
			const idx = labels.indexOf(l);
			const isHovered = hoveredTarget && tapTargets.includes(hoveredTarget) && tapTargets.indexOf(hoveredTarget) === idx;
			const targetOp = isHovered ? 0.9 : 0.35 + Math.sin(tt * 1.5 + l.phase) * 0.15;
			l.sprite.material.opacity += (targetOp - l.sprite.material.opacity) * 0.15;
			l.sprite.position.y = l.baseY + Math.sin(tt * 0.5 + l.phase) * 0.1;
		}

		// Rune rotation around doors
		for (const target of tapTargets) {
			for (const child of target.children) {
				if (child.userData?.angle !== undefined) {
					child.userData.angle += delta * 0.5;
					child.position.x = Math.cos(child.userData.angle) * child.userData.radius;
					child.position.y = Math.sin(child.userData.angle) * child.userData.hRadius;
				}
			}
		}
	};

	console.log('[dream] Scene built with', track.length, 'objects');

	return {
		cleanup() {
			for (const obj of track) scene.remove(obj);
			if (chimeInterval) clearInterval(chimeInterval);
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

export async function bootDreamScene(container) {
	const { World } = await import('@iwsdk/core');
	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});
	buildDreamScene(world);
	return world;
}
