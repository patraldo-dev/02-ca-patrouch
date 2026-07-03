// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict JS type-checking (see jsconfig.json).
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
// Create floating text label as a sprite
function makeTextSprite(text, color) {
	const canvas = document.createElement('canvas');
	canvas.width = 256; canvas.height = 64;
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = 'rgba(0,0,0,0)';
	ctx.fillRect(0, 0, 256, 64);
	ctx.font = 'bold 28px Georgia, serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	const hex = '#' + color.getHexString();
	ctx.shadowColor = 'rgba(0,0,0,0.8)';
	ctx.shadowBlur = 8;
	ctx.fillStyle = hex;
	ctx.fillText(text, 128, 32);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false });
	return new THREE.Sprite(mat);
}

export function buildDesertScene(world, config = {}, allConfigs = {}, onNavigate = null) {
	const scene = world.scene;
	const track = [];
	const swayItems = [];
	const soundMarkers = [];
	const chirpSounds = [];
	const audioNodes = [];
	const tapTargets = []; // cacti that are gateways
	const labels = []; // floating text sprites
	const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';

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

	// ═══ CACTI — each is a gateway to another portal ═══
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

	// Assign portal IDs to cacti — each cactus is a gateway
	const portalIds = Object.keys(allConfigs).filter(id => id !== (config.portal?.id));
	const cactiPositions = [
		{ x: -3, z: -5, s: 1.2 }, { x: 4, z: -8, s: 0.9 }, { x: -6, z: -12, s: 1.5 },
		{ x: 7, z: -6, s: 0.7 }, { x: 0, z: -15, s: 1.1 }, { x: -10, z: -8, s: 0.8 },
	];

	for (let i = 0; i < cactiPositions.length; i++) {
		const c = cactiPositions[i];
		const cactus = makeCactus(c.x, c.z, c.s);
		const portalId = portalIds[i % portalIds.length];
		const portalConfig = allConfigs[portalId];
		const portalColor = portalConfig ? new THREE.Color(portalConfig.palette?.primary || 0x88ff88) : new THREE.Color(0x88ff88);
		const portalName = portalConfig ? (portalConfig.portal?.names?.[lang] || portalConfig.portal?.names?.es || portalId) : portalId;

		// Glow halo at base (destination portal color)
		const glow = new THREE.Mesh(
			new THREE.RingGeometry(0.5 * c.s, 0.8 * c.s, 24),
			new THREE.MeshBasicMaterial({ color: portalColor, transparent: true, opacity: 0.25, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
		);
		glow.rotation.x = -Math.PI / 2;
		glow.position.set(c.x, -1.48, c.z);
		scene.add(glow); track.push(glow);

		// Glow sphere at top (pulses)
		const topGlow = new THREE.Mesh(
			new THREE.SphereGeometry(0.1 * c.s, 8, 8),
			new THREE.MeshBasicMaterial({ color: portalColor, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }),
		);
		topGlow.position.set(c.x, -1.5 + 1.7 * c.s, c.z);
		scene.add(topGlow); track.push(topGlow);

		// Hover label (hidden by default, shows on proximity)
		const label = makeTextSprite(portalName, portalColor);
		label.position.set(c.x, -1.5 + 2.3 * c.s, c.z);
		label.scale.set(1.2, 0.3, 1);
		label.material.opacity = 0; // hidden until hover
		scene.add(label); track.push(label);

		cactus.userData = { portalId, isGateway: true };
		for (const child of cactus.children) child.userData = cactus.userData;
		scene.add(cactus); track.push(cactus);
		tapTargets.push(cactus);
		labels.push({ sprite: label, baseY: label.position.y, phase: Math.random() * Math.PI * 2, glow: topGlow, baseOpacity: 0.6 });
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

	// ═══ TURTLE — slowly walking through the desert ═══
	const turtle = new THREE.Group();
	// Shell
	const shell = new THREE.Mesh(
		new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI*2, 0, Math.PI/2),
		new THREE.MeshBasicMaterial({ color: 0x4a7a3a, transparent: true, opacity: 0.7 }),
	);
	shell.scale.set(1, 0.5, 1.2);
	shell.position.y = 0.08;
	turtle.add(shell);
	// Shell pattern (hexagon dots)
	for (let hx = -1; hx <= 1; hx++) {
		for (let hz = -1; hz <= 1; hz++) {
			if (Math.abs(hx) + Math.abs(hz) > 1) continue;
			const dot = new THREE.Mesh(
				new THREE.CircleGeometry(0.04, 6),
				new THREE.MeshBasicMaterial({ color: 0x2a4a1a, transparent: true, opacity: 0.6 }),
			);
			dot.rotation.x = -Math.PI/2;
			dot.position.set(hx * 0.1, 0.14, hz * 0.1);
			turtle.add(dot);
		}
	}
	// Head
	const head = new THREE.Mesh(
		new THREE.SphereGeometry(0.08, 8, 6),
		new THREE.MeshBasicMaterial({ color: 0x5a8a4a, transparent: true, opacity: 0.7 }),
	);
	head.position.set(0.3, 0.05, 0);
	turtle.add(head);
	// Legs
	for (let lx = -1; lx <= 1; lx += 2) {
		for (let lz = -1; lz <= 1; lz += 2) {
			const leg = new THREE.Mesh(
				new THREE.SphereGeometry(0.06, 6, 4),
				new THREE.MeshBasicMaterial({ color: 0x4a6a3a, transparent: true, opacity: 0.6 }),
			);
			leg.position.set(lx * 0.15, -0.02, lz * 0.15);
			leg.scale.set(0.8, 0.5, 1.2);
			turtle.add(leg);
		}
	}
	turtle.position.set(3, -1.45, -3);
	scene.add(turtle); track.push(turtle);
	const turtleState = { angle: 0, radius: 3.5, legPhase: 0 };

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

	// Reset camera to level forward-facing position
	if (world.camera) {
		world.camera.position.set(0, 1.5, 5);
		world.camera.lookAt(0, 0, -5);
		world.camera.rotation.z = 0;
	}

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

	// ═══ TAP HANDLER — tap a cactus to navigate ═══
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
				console.log('[desert] Navigating to', target.userData.portalId);
				if (onNavigate) onNavigate(target.userData.portalId);
			}
		}
	}
	world.renderer.domElement.addEventListener('pointerdown', onPointerDown);
	world.renderer.domElement.addEventListener('touchstart', onPointerDown);

	// ═══ HOVER — show label when pointing near a gateway ═══
	let hoveredTarget = null;
	const hoverRaycaster = new THREE.Raycaster();
	function onPointerMove(event) {
		const x = (event.clientX !== undefined ? event.clientX : 0) / window.innerWidth * 2 - 1;
		const y = -((event.clientY !== undefined ? event.clientY : 0) / window.innerHeight) * 2 + 1;
		hoverRaycaster.setFromCamera({ x, y }, world.camera);
		const hits = hoverRaycaster.intersectObjects(tapTargets, true);
		let newHovered = null;
		if (hits.length > 0) {
			let t = hits[0].object;
			while (t && !t.userData?.portalId) t = t.parent;
			newHovered = t;
		}
		if (newHovered !== hoveredTarget) {
			hoveredTarget = newHovered;
		}
	}
	world.renderer.domElement.addEventListener('pointermove', onPointerMove);

	// ═══ UPDATE LOOP (sway + chirps + pulse + label float) ═══
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
		// Turtle walking slowly in a circle
		turtleState.angle += delta * 0.08;
		turtle.position.x = Math.cos(turtleState.angle) * turtleState.radius;
		turtle.position.z = Math.sin(turtleState.angle) * turtleState.radius;
		turtle.rotation.y = -turtleState.angle + Math.PI / 2;
		// Turtle bob
		turtle.position.y = -1.45 + Math.abs(Math.sin(turtleState.legPhase) * 0.02);
		turtleState.legPhase += delta * 2;

		// Label hover fade + glow pulse
		for (const l of labels) {
			const isHovered = hoveredTarget && tapTargets.includes(hoveredTarget) && tapTargets.indexOf(hoveredTarget) === labels.indexOf(l);
			const targetOp = isHovered ? 0.85 : 0;
			l.sprite.material.opacity += (targetOp - l.sprite.material.opacity) * 0.15;
			l.sprite.position.y = l.baseY + Math.sin(tt * 0.8 + l.phase) * 0.08;
			l.glow.material.opacity = l.baseOpacity + Math.sin(tt * 2 + l.phase) * 0.25;
			l.glow.scale.setScalar(0.9 + Math.sin(tt * 2 + l.phase) * 0.15);
		}
	};

	console.log('[desert] Scene built with', track.length, 'objects, cacti gateways active');

	return {
		cleanup() {
			for (const obj of track) scene.remove(obj);
			if (windModulator) clearInterval(windModulator);
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
