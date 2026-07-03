// theater-scene.js — Theatrical stage scene builder
// Stage with curtains, spotlights, masks (gateways), and a rippling curtain.

import * as THREE from 'three';

let audioCtx = null;
function getAudioCtx() {
	if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	return audioCtx;
}

function createOrchestraDrone(ctx) {
	const freqs = [110, 164.81, 220]; // A2, E3, A3
	const gain = ctx.createGain(); gain.gain.value = 0.03;
	const oscs = [];
	for (const f of freqs) {
		const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = f;
		const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 300; filter.Q.value = 1;
		const og = ctx.createGain(); og.gain.value = 0.33;
		osc.connect(filter).connect(og).connect(gain);
		osc.start();
		oscs.push(osc);
	}
	return { output: gain };
}

function createCelloNote(ctx) {
	const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 220;
	const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 800; filter.Q.value = 2;
	const gain = ctx.createGain(); gain.gain.value = 0;
	osc.connect(filter).connect(gain); osc.start();
	return {
		output: gain,
		play: (freq = 220) => {
			const now = ctx.currentTime;
			osc.frequency.setValueAtTime(freq, now);
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
		},
	};
}

function createApplause(ctx) {
	const bufferSize = ctx.sampleRate * 2;
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) {
		const clap = Math.random() > 0.992 ? (Math.random() * 2 - 1) * 0.5 : 0;
		data[i] = clap + (Math.random() * 2 - 1) * 0.02;
	}
	const gain = ctx.createGain(); gain.gain.value = 0.04;
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

export function buildTheaterScene(world, config = {}, allConfigs = {}, onNavigate = null) {
	const scene = world.scene;
	const track = [];
	const swayItems = [];
	const audioNodes = [];
	const tapTargets = [];
	const labels = [];
	const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';
	let cello = null;
	let applause = null;
	let celloInterval = null;

	// ═══ BACKDROP — dark velvet ═══
	const backdrop = new THREE.Mesh(
		new THREE.PlaneGeometry(30, 16),
		new THREE.MeshBasicMaterial({ color: 0x1a0808, transparent: true, opacity: 0.9 }),
	);
	backdrop.position.set(0, 6, -14);
	scene.add(backdrop); track.push(backdrop);

	// ═══ GROUND — wooden stage ═══
	const stageGeo = new THREE.PlaneGeometry(20, 20);
	// Subtle plank lines
	const stageCanvas = document.createElement('canvas');
	stageCanvas.width = 256; stageCanvas.height = 256;
	const sctx = stageCanvas.getContext('2d');
	sctx.fillStyle = '#2a1a08';
	sctx.fillRect(0, 0, 256, 256);
	for (let i = 0; i < 8; i++) {
		sctx.fillStyle = i % 2 === 0 ? '#2a1a08' : '#241406';
		sctx.fillRect(0, i * 32, 256, 30);
		sctx.strokeStyle = '#1a0e04';
		sctx.lineWidth = 1;
		sctx.beginPath(); sctx.moveTo(0, i * 32); sctx.lineTo(256, i * 32); sctx.stroke();
	}
	const stageTex = new THREE.CanvasTexture(stageCanvas);
	stageTex.colorSpace = THREE.SRGBColorSpace;
	const stage = new THREE.Mesh(
		stageGeo,
		new THREE.MeshBasicMaterial({ map: stageTex, transparent: true, opacity: 0.7 }),
	);
	stage.rotation.x = -Math.PI / 2; stage.position.y = -1.5;
	scene.add(stage); track.push(stage);

	// Stage edge (front lip)
	const stageLip = new THREE.Mesh(
		new THREE.BoxGeometry(8, 0.1, 0.3),
		new THREE.MeshBasicMaterial({ color: 0x4a2010, transparent: true, opacity: 0.6 }),
	);
	stageLip.position.set(0, -1.45, 2);
	scene.add(stageLip); track.push(stageLip);

	// ═══ CURTAINS — heavy draped shapes (living element: rippling) ═══
	const curtainGroups = [];
	for (let side = 0; side < 2; side++) {
		const sideGroup = new THREE.Group();
		for (let fold = 0; fold < 6; fold++) {
			const foldMesh = new THREE.Mesh(
				new THREE.PlaneGeometry(0.5, 7),
				new THREE.MeshBasicMaterial({
					color: new THREE.Color(0x660810).multiplyScalar(1 - fold * 0.08),
					transparent: true, opacity: 0.4, side: THREE.DoubleSide,
				}),
			);
			const xPos = side === 0 ? -3 + fold * 0.45 : 3 - fold * 0.45;
			foldMesh.position.set(xPos, 1, -1);
			foldMesh.rotation.z = (side === 0 ? 0.04 : -0.04) * (fold + 1);
			sideGroup.add(foldMesh);
		}
		// Curtain top valance
		const valance = new THREE.Mesh(
			new THREE.PlaneGeometry(3, 0.6),
			new THREE.MeshBasicMaterial({ color: 0x880818, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
		);
		valance.position.set(side === 0 ? -1.5 : 1.5, 4.5, -1);
		valance.rotation.z = side === 0 ? 0.05 : -0.05;
		sideGroup.add(valance);

		scene.add(sideGroup); track.push(sideGroup);
		curtainGroups.push({ group: sideGroup, side, folds: sideGroup.children.filter(c => c.geometry?.parameters?.width === 0.5) });
	}

	// ═══ CURTAIN ROD ═══
	const rod = new THREE.Mesh(
		new THREE.CylinderGeometry(0.05, 0.05, 7, 8),
		new THREE.MeshBasicMaterial({ color: 0xaa8844, transparent: true, opacity: 0.4 }),
	);
	rod.position.set(0, 4.8, -1);
	rod.rotation.z = Math.PI / 2;
	scene.add(rod); track.push(rod);

	// ═══ THEATER MASKS — gateway objects (comedy/tragedy masks on posts) ═══
	const portalIds = Object.keys(allConfigs).filter(id => id !== (config.portal?.id));
	const maskPositions = [
		{ x: -3, z: 1.5 }, { x: 3, z: 1.5 },
		{ x: -4.5, z: 0 }, { x: 4.5, z: 0 },
		{ x: -2, z: 3.5 }, { x: 2, z: 3.5 },
	];

	for (let i = 0; i < maskPositions.length; i++) {
		const m = maskPositions[i];
		const portalId = portalIds[i % portalIds.length];
		const portalConfig = allConfigs[portalId];
		const portalColor = portalConfig ? new THREE.Color(portalConfig.palette?.primary || 0xffcc44) : new THREE.Color(0xffcc44);
		const portalName = portalConfig ? (portalConfig.portal?.names?.[lang] || portalConfig.portal?.names?.es || portalId) : portalId;

		const maskGroup = new THREE.Group();
		const isComedy = i % 2 === 0;

		// Post
		const post = new THREE.Mesh(
			new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6),
			new THREE.MeshBasicMaterial({ color: 0x4a2810, transparent: true, opacity: 0.5 }),
		);
		post.position.y = -0.6;
		maskGroup.add(post);

		// Mask (oval)
		const maskColor = isComedy ? 0xffdd44 : 0xdd8844;
		const mask = new THREE.Mesh(
			new THREE.SphereGeometry(0.3, 12, 10),
			new THREE.MeshBasicMaterial({ color: maskColor, transparent: true, opacity: 0.65 }),
		);
		mask.scale.set(0.8, 1.1, 0.4);
		mask.position.y = 0.3;
		maskGroup.add(mask);

		// Eyes (dark ovals)
		for (let e = -1; e <= 1; e += 2) {
			const eye = new THREE.Mesh(
				new THREE.SphereGeometry(0.05, 6, 4),
				new THREE.MeshBasicMaterial({ color: 0x1a0a00 }),
			);
			eye.position.set(e * 0.1, 0.35, 0.15);
			eye.scale.set(0.8, 1.2, 0.5);
			maskGroup.add(eye);
		}

		// Mouth (smile or frown)
		const mouthGeo = new THREE.TorusGeometry(0.1, 0.02, 4, 8, Math.PI);
		const mouth = new THREE.Mesh(
			mouthGeo,
			new THREE.MeshBasicMaterial({ color: 0x1a0a00, transparent: true, opacity: 0.8 }),
		);
		mouth.position.set(0, isComedy ? 0.22 : 0.42, 0.15);
		mouth.rotation.z = isComedy ? 0 : Math.PI;
		maskGroup.add(mouth);

		// Glow ring at base
		const glow = new THREE.Mesh(
			new THREE.RingGeometry(0.3, 0.5, 24),
			new THREE.MeshBasicMaterial({ color: portalColor, transparent: true, opacity: 0.25, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
		);
		glow.rotation.x = -Math.PI / 2;
		glow.position.set(m.x, -1.48, m.z);
		scene.add(glow); track.push(glow);

		// Label
		const label = makeTextSprite(portalName, portalColor);
		label.position.set(m.x, 1.2, m.z);
		label.scale.set(1.2, 0.3, 1);
		label.material.opacity = 0;
		scene.add(label); track.push(label);

		maskGroup.position.set(m.x, -1.5, m.z);
		maskGroup.userData = { portalId, isGateway: true };
		for (const child of maskGroup.children) child.userData = maskGroup.userData;
		scene.add(maskGroup); track.push(maskGroup);
		tapTargets.push(maskGroup);
		labels.push({ sprite: label, baseY: label.position.y, phase: Math.random() * Math.PI * 2, glow: null, baseOpacity: 0 });
		swayItems.push({ obj: maskGroup, phase: Math.random() * Math.PI * 2, amp: 0.015, spd: 0.5 + Math.random() * 0.3 });
	}

	// ═══ SPOTLIGHT CONES ═══
	const spotlights = [];
	for (let i = 0; i < 3; i++) {
		const cone = new THREE.Mesh(
			new THREE.ConeGeometry(1.2, 4, 16, 1, true),
			new THREE.MeshBasicMaterial({ color: 0xffeeaa, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
		);
		cone.position.set(-2 + i * 2, 2, 0);
		scene.add(cone); track.push(cone);
		spotlights.push({ mesh: cone, baseX: -2 + i * 2, phase: Math.random() * Math.PI * 2 });

		// Light fixture
		const fixture = new THREE.Mesh(
			new THREE.CylinderGeometry(0.1, 0.06, 0.2, 6),
			new THREE.MeshBasicMaterial({ color: 0x332210, transparent: true, opacity: 0.5 }),
		);
		fixture.position.set(-2 + i * 2, 4.1, 0);
		scene.add(fixture); track.push(fixture);
	}

	// ═══ AUDIENCE CHAIRS ═══
	for (let row = 0; row < 4; row++) {
		for (let seat = 0; seat < 8; seat++) {
			const chair = new THREE.Mesh(
				new THREE.BoxGeometry(0.25, 0.35, 0.25),
				new THREE.MeshBasicMaterial({ color: 0x1a1208, transparent: true, opacity: 0.35 }),
			);
			chair.position.set(-3 + seat * 0.85, -1.2, 3 + row * 0.7);
			scene.add(chair); track.push(chair);
		}
	}

	// ═══ MICROPHONE STAND ═══
	const micPole = new THREE.Mesh(
		new THREE.CylinderGeometry(0.02, 0.02, 1.5, 4),
		new THREE.MeshBasicMaterial({ color: 0x666677, transparent: true, opacity: 0.4 }),
	);
	micPole.position.set(0.3, -0.75, 0.5);
	scene.add(micPole); track.push(micPole);
	const micHead = new THREE.Mesh(
		new THREE.SphereGeometry(0.06, 8, 8),
		new THREE.MeshBasicMaterial({ color: 0x888899, transparent: true, opacity: 0.4 }),
	);
	micHead.position.set(0.3, 0.05, 0.5);
	scene.add(micHead); track.push(micHead);

	// ═══ LIGHTING ═══
	const ambient = new THREE.AmbientLight(0x442200, 0.4);
	scene.add(ambient); track.push(ambient);
	const stageLight = new THREE.PointLight(0xffcc66, 0.7, 15);
	stageLight.position.set(0, 3, 0);
	scene.add(stageLight); track.push(stageLight);
	const sideLight = new THREE.PointLight(0xff4422, 0.3, 10);
	sideLight.position.set(-4, 1, 2);
	scene.add(sideLight); track.push(sideLight);

	scene.fog = new THREE.FogExp2(0x0a0402, 0.03);
	const oldBg = scene.background;
	scene.background = new THREE.Color(0x080402);

	if (world.camera) {
		world.camera.position.set(0, 1.5, 6);
		world.camera.lookAt(0, 0, -2);
		world.camera.rotation.z = 0;
	}

	// ═══ SOUND ═══
	try {
		const ctx = getAudioCtx();
		const drone = createOrchestraDrone(ctx);
		drone.output.connect(ctx.destination);
		audioNodes.push(drone.output);

		cello = createCelloNote(ctx);
		cello.output.connect(ctx.destination);
		audioNodes.push(cello.output);

		applause = createApplause(ctx);
		applause.output.connect(ctx.destination);
		audioNodes.push(applause.output);

		const celloNotes = [220, 246.94, 261.63, 293.66, 329.63];
		celloInterval = setInterval(() => {
			if (Math.random() < 0.35 && cello) cello.play(celloNotes[Math.floor(Math.random() * celloNotes.length)]);
			if (Math.random() < 0.05 && applause) applause.play();
		}, 3500);

		console.log('[theater] Sound: orchestra drone + cello + applause');
	} catch (e) {
		console.warn('[theater] Audio setup failed:', e.message);
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

		// Curtain rippling (living element)
		for (const cg of curtainGroups) {
			for (let fi = 0; fi < cg.folds.length; fi++) {
				const fold = cg.folds[fi];
				const waveOffset = Math.sin(tt * 1.5 + fi * 0.4) * 0.03;
				fold.rotation.z = (cg.side === 0 ? 0.04 : -0.04) * (fi + 1) + waveOffset;
				fold.position.x = (cg.side === 0 ? -3 + fi * 0.45 : 3 - fi * 0.45) + Math.sin(tt * 1.5 + fi * 0.4) * 0.02;
			}
		}

		// Mask sway
		for (const s of swayItems) { if (s.obj) s.obj.rotation.z = Math.sin(tt * s.spd + s.phase) * s.amp; }

		// Spotlight movement
		for (const sl of spotlights) {
			sl.mesh.rotation.x = Math.sin(tt * 0.3 + sl.phase) * 0.15;
			sl.mesh.rotation.z = Math.cos(tt * 0.2 + sl.phase) * 0.1;
			sl.mesh.material.opacity = 0.03 + Math.sin(tt * 0.5 + sl.phase) * 0.02;
		}

		// Labels
		for (const l of labels) {
			const idx = labels.indexOf(l);
			const isHovered = hoveredTarget && tapTargets.includes(hoveredTarget) && tapTargets.indexOf(hoveredTarget) === idx;
			const targetOp = isHovered ? 0.85 : 0;
			l.sprite.material.opacity += (targetOp - l.sprite.material.opacity) * 0.15;
			l.sprite.position.y = l.baseY + Math.sin(tt * 0.6 + l.phase) * 0.06;
		}
	};

	console.log('[theater] Scene built with', track.length, 'objects');

	return {
		cleanup() {
			for (const obj of track) scene.remove(obj);
			if (celloInterval) clearInterval(celloInterval);
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

export async function bootTheaterScene(container) {
	const { World } = await import('@iwsdk/core');
	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});
	buildTheaterScene(world);
	return world;
}
