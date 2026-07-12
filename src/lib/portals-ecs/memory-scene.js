// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict JS type-checking (see jsconfig.json).
// ═══════════════════════════════════════════════════════════
//  memory-scene.js — Memory scene builder for portal engine
//  Sepia twilight, floating photograph frames as gateways, golden dust,
//  a soft music-box drone. Nostalgias / passage-to-the-past.
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';
import { installNavigation } from './worlds-navigation.js';

// ── Label helper (matches the pattern in other scenes) ──
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

// ── Procedural music-box drone (no audio files) ──
function createMusicBox(ctx) {
	const masterGain = ctx.createGain();
	masterGain.gain.value = 0;
	masterGain.connect(ctx.destination);

	// Soft drone: two detuned sine oscillators through a lowpass
	const droneGain = ctx.createGain();
	droneGain.gain.value = 0.04;
	droneGain.connect(masterGain);
	const filt = ctx.createBiquadFilter();
	filt.type = 'lowpass'; filt.frequency.value = 600;
	filt.connect(droneGain);
	for (const f of [110, 110.5, 165]) {
		const osc = ctx.createOscillator();
		osc.type = 'sine'; osc.frequency.value = f;
		osc.connect(filt); osc.start();
	}

	// Music-box plink: a triangle wave with a fast decay, scheduled randomly
	function plink() {
		if (masterGain.gain.value < 0.01) return;
		const notes = [523.25, 587.33, 659.25, 783.99, 880.00]; // C5 D5 E5 G5 A5
		const f = notes[Math.floor(Math.random() * notes.length)];
		const osc = ctx.createOscillator();
		osc.type = 'triangle'; osc.frequency.value = f;
		const g = ctx.createGain();
		const now = ctx.currentTime;
		g.gain.setValueAtTime(0, now);
		g.gain.linearRampToValueAtTime(0.05, now + 0.01);
		g.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
		osc.connect(g).connect(masterGain);
		osc.start(now);
		osc.stop(now + 2);
	}

	return { output: masterGain, plink };
}

export function buildMemoryScene(world, config = {}, allConfigs = {}, onNavigate = null) {
	const scene = world.scene;
	const track = [];
	const tapTargets = [];
	const labels = [];
	const swayItems = [];
	const audioNodes = [];
	const dustMotes = [];
	const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';
	let musicBox = null;
	let plinkInterval = null;

	// ═══ PALETTE — sepia/nostalgia tinted to this portal's identity ═══
	const palette = config.palette || {};
	const primary = new THREE.Color(palette.primary || '#b88a4a');
	const { h: baseHue } = primary.getHSL({});
	const sepia = new THREE.Color().setHSL(baseHue, 0.35, 0.30);
	const sepiaDark = new THREE.Color().setHSL(baseHue, 0.40, 0.08);

	// ═══ BACKDROP — warm sepia haze ═══
	const backdrop = new THREE.Mesh(
		new THREE.PlaneGeometry(40, 22),
		new THREE.MeshBasicMaterial({ color: sepiaDark, transparent: true, opacity: 0.95 }),
	);
	backdrop.position.set(0, 6, -16);
	scene.add(backdrop); track.push(backdrop);

	// ═══ GROUND — worn wooden floor with a soft vignette ═══
	const floorCanvas = document.createElement('canvas');
	floorCanvas.width = 256; floorCanvas.height = 256;
	const fctx = floorCanvas.getContext('2d');
	const grad = fctx.createRadialGradient(128, 128, 40, 128, 128, 180);
	grad.addColorStop(0, '#' + sepia.clone().multiplyScalar(0.5).getHexString());
	grad.addColorStop(1, '#' + sepiaDark.getHexString());
	fctx.fillStyle = grad;
	fctx.fillRect(0, 0, 256, 256);
	// Faint plank lines
	for (let i = 0; i < 8; i++) {
		fctx.strokeStyle = 'rgba(0,0,0,0.15)';
		fctx.lineWidth = 1;
		fctx.beginPath(); fctx.moveTo(0, i * 32); fctx.lineTo(256, i * 32); fctx.stroke();
	}
	const floorTex = new THREE.CanvasTexture(floorCanvas);
	floorTex.colorSpace = THREE.SRGBColorSpace;
	const floor = new THREE.Mesh(
		new THREE.PlaneGeometry(30, 30),
		new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, opacity: 0.8 }),
	);
	floor.rotation.x = -Math.PI / 2; floor.position.y = -1.5;
	scene.add(floor); track.push(floor);

	// ═══ FLOATING PHOTOGRAPH FRAMES — navigation gateways ═══
	const portalIds = Object.keys(allConfigs).filter(id => id !== (config.portal?.id));
	const frameSpots = [
		{ x: -4, y: 0.5, z: -4, r: 0.3 }, { x: 4, y: 1.2, z: -5, r: -0.2 },
		{ x: -5, y: -0.2, z: -2, r: 0.15 }, { x: 5, y: 0.8, z: -2, r: -0.15 },
		{ x: -2, y: 2.0, z: -7, r: 0.25 }, { x: 2, y: -0.5, z: -6, r: -0.1 },
	];

	for (let i = 0; i < frameSpots.length; i++) {
		const sp = frameSpots[i];
		const pid = portalIds[i % portalIds.length];
		const pcfg = allConfigs[pid];
		const pcolor = pcfg ? new THREE.Color(pcfg.palette?.primary || 0xddbb77) : new THREE.Color(0xddbb77);
		const pname = pcfg ? (pcfg.portal?.names?.[lang] || pcfg.portal?.names?.es || pid) : pid;

		const frameGroup = new THREE.Group();

		// Photo "image" — a sepia-tinted plane with the destination's color glow
		const imgW = 0.9, imgH = 1.15;
		const image = new THREE.Mesh(
			new THREE.PlaneGeometry(imgW, imgH),
			new THREE.MeshBasicMaterial({ color: sepia.clone().lerp(pcolor, 0.25), transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
		);
		frameGroup.add(image);

		// Wooden frame border (slightly larger plane behind)
		const border = new THREE.Mesh(
			new THREE.PlaneGeometry(imgW + 0.12, imgH + 0.12),
			new THREE.MeshBasicMaterial({ color: 0x5a3e22, transparent: true, opacity: 0.7 }),
		);
		border.position.z = -0.01;
		frameGroup.add(border);

		frameGroup.position.set(sp.x, sp.y, sp.z);
		frameGroup.rotation.y = sp.r;
		frameGroup.rotation.z = (Math.random() - 0.5) * 0.15;
		frameGroup.userData = { portalId: pid, isGateway: true };
		for (const child of frameGroup.children) child.userData = frameGroup.userData;
		scene.add(frameGroup); track.push(frameGroup); tapTargets.push(frameGroup);

		// Glow behind the frame (destination color)
		const glow = new THREE.Mesh(
			new THREE.PlaneGeometry(imgW + 0.5, imgH + 0.5),
			new THREE.MeshBasicMaterial({ color: pcolor, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }),
		);
		glow.position.set(sp.x, sp.y, sp.z - 0.05);
		scene.add(glow); track.push(glow);

		// Hover label (floats above the frame)
		const label = makeTextSprite(pname, pcolor);
		label.material.opacity = 0.35; // visible by default, breathes in update loop
		label.position.set(sp.x, sp.y + 0.95, sp.z);
		label.scale.set(1.2, 0.3, 1);
		scene.add(label); track.push(label);
		labels.push({ sprite: label, baseY: label.position.y, phase: Math.random() * Math.PI * 2, glow, baseOpacity: 0.12 });

		swayItems.push({ obj: frameGroup, basePos: frameGroup.position.clone(), baseRot: frameGroup.rotation.z, phase: Math.random() * Math.PI * 2, amp: 0.04, spd: 0.3 + Math.random() * 0.2 });
	}

	// ═══ GOLDEN DUST MOTES (drifting particles) ═══
	const dustCount = 60;
	const dustGeo = new THREE.BufferGeometry();
	const dustPos = new Float32Array(dustCount * 3);
	const dustVel = [];
	for (let i = 0; i < dustCount; i++) {
		dustPos[i * 3] = (Math.random() - 0.5) * 16;
		dustPos[i * 3 + 1] = Math.random() * 5 - 1;
		dustPos[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
		dustVel.push({ x: (Math.random() - 0.5) * 0.08, y: 0.02 + Math.random() * 0.04, z: (Math.random() - 0.5) * 0.04, phase: Math.random() * Math.PI * 2 });
	}
	dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
	const dustMat = new THREE.PointsMaterial({ color: new THREE.Color().setHSL(baseHue, 0.5, 0.6), size: 0.06, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
	const dust = new THREE.Points(dustGeo, dustMat);
	scene.add(dust); track.push(dust);

	// ═══ HANGING LIGHT BULBS (warm, flickering) ═══
	for (let i = 0; i < 5; i++) {
		const x = -6 + i * 3;
		const bulb = new THREE.Mesh(
			new THREE.SphereGeometry(0.06, 8, 8),
			new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(baseHue, 0.6, 0.7), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }),
		);
		bulb.position.set(x, 3.2, -3);
		scene.add(bulb); track.push(bulb);
		// Wire
		const wire = new THREE.Mesh(
			new THREE.CylinderGeometry(0.004, 0.004, 1.2, 3),
			new THREE.MeshBasicMaterial({ color: 0x3a2a18, transparent: true, opacity: 0.3 }),
		);
		wire.position.set(x, 3.8, -3);
		scene.add(wire); track.push(wire);
		dustMotes.push({ bulb, baseOp: 0.7, phase: Math.random() * Math.PI * 2 }); // reuse array for bulb flicker
	}

	// ═══ LIGHTING ═══
	const ambient = new THREE.AmbientLight(sepia, 0.5); scene.add(ambient); track.push(ambient);
	const key = new THREE.PointLight(new THREE.Color().setHSL(baseHue, 0.5, 0.5), 0.8, 20); key.position.set(0, 4, -2); scene.add(key); track.push(key);
	const fill = new THREE.PointLight(sepiaDark, 0.3, 15); fill.position.set(-4, 1, 4); scene.add(fill); track.push(fill);

	// ═══ AUDIO — soft music-box drone ═══
	const oldBg = scene.background;
	try {
		const ctx = new (window.AudioContext || window.webkitAudioContext)();
		musicBox = createMusicBox(ctx);
		musicBox.output.connect(ctx.destination);
		audioNodes.push(musicBox.output);
		// Fade in
		musicBox.output.gain.setValueAtTime(0, ctx.currentTime);
		musicBox.output.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 3);
		// Random plinks
		plinkInterval = setInterval(() => { if (Math.random() < 0.3) musicBox.plink(); }, 2500);
		console.log('[memory] Sound: music-box drone + plinks');
	} catch (e) { console.warn('[memory] Audio setup failed:', e.message); }

	scene.background = new THREE.Color(palette.background || sepiaDark);
	scene.fog = new THREE.FogExp2(sepiaDark, palette.fog_density ?? 0.025);

	// ═══ WORLDS NAVIGATION — floating compass + home gateway ═══
	const nav = installNavigation({ scene, world, allConfigs, config, track, tapTargets, onNavigate, theme: 'memory' });

	// ═══ TAP HANDLER — tap a photo frame to navigate ═══
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
				console.log('[memory] Navigating to', target.userData.portalId);
				if (onNavigate) onNavigate(target.userData.portalId);
			}
		}
	}
	world.renderer.domElement.addEventListener('pointerdown', onPointerDown);
	world.renderer.domElement.addEventListener('touchstart', onPointerDown);

	// ═══ HOVER — show label when pointing near a frame ═══
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
		if (newHovered !== hoveredTarget) hoveredTarget = newHovered;
	}
	world.renderer.domElement.addEventListener('pointermove', onPointerMove);

	// ═══ UPDATE LOOP (sway + dust drift + bulb flicker + label float) ═══
	const prevUpdate = world.update.bind(world);
	world.update = function(delta, time) {
		prevUpdate(delta, time);
		nav.update(delta, time);
		const tt = time / 1000;

		// Frame sway (gentle drift, like memories hanging in air)
		for (const s of swayItems) {
			if (!s.obj) continue;
			s.obj.position.x = s.basePos.x + Math.sin(tt * s.spd + s.phase) * s.amp;
			s.obj.position.y = s.basePos.y + Math.cos(tt * s.spd * 0.7 + s.phase) * s.amp * 0.6;
			s.obj.rotation.z = s.baseRot + Math.sin(tt * 0.4 + s.phase) * 0.05;
		}

		// Dust drift upward, wrap around
		const positions = dust.geometry.attributes.position.array;
		for (let i = 0; i < dustCount; i++) {
			positions[i * 3] += dustVel[i].x * delta + Math.sin(tt * 0.5 + dustVel[i].phase) * 0.002;
			positions[i * 3 + 1] += dustVel[i].y * delta;
			positions[i * 3 + 2] += dustVel[i].z * delta;
			if (positions[i * 3 + 1] > 4) {
				positions[i * 3 + 1] = -1;
				positions[i * 3] = (Math.random() - 0.5) * 16;
			}
		}
		dust.geometry.attributes.position.needsUpdate = true;

		// Bulb flicker
		for (const m of dustMotes) {
			if (m.bulb) m.bulb.material.opacity = m.baseOp + Math.sin(tt * 4 + m.phase) * 0.15 + (Math.random() < 0.02 ? -0.3 : 0);
		}

		// Label hover fade + glow pulse
		for (const l of labels) {
			const isHovered = hoveredTarget && tapTargets.indexOf(hoveredTarget) === labels.indexOf(l);
			const targetOp = isHovered ? 0.9 : 0.35 + Math.sin(tt * 1.5 + l.phase) * 0.15;
			l.sprite.material.opacity += (targetOp - l.sprite.material.opacity) * 0.15;
			l.sprite.position.y = l.baseY + Math.sin(tt * 0.8 + l.phase) * 0.06;
			l.glow.material.opacity = l.baseOpacity + Math.sin(tt * 2 + l.phase) * 0.08;
		}
	};

	console.log('[memory] Scene built with', track.length, 'objects, photo-frame gateways active');

	return {
		cleanup() {
			nav.dispose();
			for (const obj of track) scene.remove(obj);
			if (plinkInterval) clearInterval(plinkInterval);
			for (const node of audioNodes) { try { node.disconnect(); } catch {} }
			scene.background = oldBg;
			scene.fog = null;
			world.update = prevUpdate;
			world.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
			world.renderer.domElement.removeEventListener('touchstart', onPointerDown);
			world.renderer.domElement.removeEventListener('pointermove', onPointerMove);
		},
		tapTargets,
	};
}

// Standalone boot for localhost dev (not used in production)
export async function bootMemoryScene(container) {
	const { World } = await import('@iwsdk/core');
	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});
	const resp = await fetch('/scenes/nostalgias.json');
	const config = await resp.json();
	const allConfigs = { nostalgias: config };
	buildMemoryScene(world, config, allConfigs);
	return world;
}
