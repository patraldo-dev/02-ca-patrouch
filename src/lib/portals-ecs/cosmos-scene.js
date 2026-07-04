// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict JS type-checking (see jsconfig.json).
// cosmos-scene.js — Deep space world for portal engine
// Navigation: tap glowing planets to travel.

import * as THREE from 'three';
import { installNavigation } from './worlds-navigation.js';

let audioCtx = null;
function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }

function createSpaceDrone(ctx) {
	const osc1 = ctx.createOscillator(); osc1.type = 'sine'; osc1.frequency.value = 40;
	const osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = 60;
	const osc3 = ctx.createOscillator(); osc3.type = 'triangle'; osc3.frequency.value = 120;
	const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 300;
	const gain = ctx.createGain(); gain.gain.value = 0.03;
	osc1.connect(filter); osc2.connect(filter); osc3.connect(filter); filter.connect(gain);
	osc1.start(); osc2.start(); osc3.start();
	return { output: gain, filter };
}

function createEMChirp(ctx) {
	const osc = ctx.createOscillator(); osc.type = 'sawtooth';
	const gain = ctx.createGain(); gain.gain.value = 0;
	const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 2000; filter.Q.value = 5;
	osc.connect(filter).connect(gain); osc.start();
	return {
		output: gain,
		chirp: () => {
			const now = ctx.currentTime;
			const freq = 800 + Math.random() * 3000;
			filter.frequency.setValueAtTime(freq, now);
			osc.frequency.setValueAtTime(freq * 0.5, now);
			gain.gain.setValueAtTime(0.04, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
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

export function buildCosmosScene(world, config = {}, allConfigs = {}, onNavigate = null) {
	const scene = world.scene;
	const track = []; const tapTargets = []; const labels = [];
	const audioNodes = []; const shootingStars = []; let emChirps = []; let droneFilter = null; let droneModulator = null;

	// ═══ DEEP SPACE BACKDROP ═══
	const bgGeo = new THREE.BufferGeometry();
	const starCount = 2000;
	const bgPos = new Float32Array(starCount * 3), bgCol = new Float32Array(starCount * 3);
	for (let i = 0; i < starCount; i++) {
		const r = 15 + Math.random() * 30, theta = Math.random() * Math.PI * 2, phi = Math.acos(2*Math.random()-1);
		bgPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
		bgPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
		bgPos[i*3+2] = r * Math.cos(phi);
		const c = new THREE.Color().setHSL(0.6 + Math.random() * 0.2, 0.3, 0.5 + Math.random() * 0.5);
		bgCol[i*3] = c.r; bgCol[i*3+1] = c.g; bgCol[i*3+2] = c.b;
	}
	bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
	bgGeo.setAttribute('color', new THREE.BufferAttribute(bgCol, 3));
	const starfield = new THREE.Points(bgGeo, new THREE.PointsMaterial({ size: 0.08, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
	scene.add(starfield); track.push(starfield);

	// ═══ NEBULA CLOUDS ═══
	for (let i = 0; i < 8; i++) {
		const nebGeo = new THREE.BufferGeometry();
		const np = new Float32Array(3);
		np[0] = (Math.random()-0.5) * 30; np[1] = (Math.random()-0.5) * 15; np[2] = -10 - Math.random() * 10;
		nebGeo.setAttribute('position', new THREE.BufferAttribute(np, 3));
		const c = new THREE.Color().setHSL(0.7 + Math.random() * 0.15, 0.8, 0.4);
		const neb = new THREE.Points(nebGeo, new THREE.PointsMaterial({ size: 4 + Math.random() * 3, color: c, transparent: true, opacity: 0.05 + Math.random() * 0.05, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
		scene.add(neb); track.push(neb);
	}

	// ═══ PLANETS (navigation gateways) ═══
	const portalIds = Object.keys(allConfigs).filter(id => id !== (config.portal?.id));
	const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';
	const planetSpots = [
		{ x: -5, y: 1, z: -6, r: 0.8 }, { x: 5, y: 2, z: -8, r: 0.6 },
		{ x: -3, y: -1, z: -10, r: 1.0 }, { x: 6, y: -0.5, z: -5, r: 0.5 },
		{ x: 0, y: 3, z: -12, r: 0.9 }, { x: -7, y: 0, z: -7, r: 0.7 },
	];

	for (let i = 0; i < planetSpots.length; i++) {
		const p = planetSpots[i];
		const pid = portalIds[i % portalIds.length];
		const pcfg = allConfigs[pid];
		const pcolor = pcfg ? new THREE.Color(pcfg.palette?.primary || 0xaa88ff) : new THREE.Color(0xaa88ff);
		const pname = pcfg ? (pcfg.portal?.names?.[lang] || pcfg.portal?.names?.es || pid) : pid;

		// Planet sphere
		const planet = new THREE.Mesh(
			new THREE.SphereGeometry(p.r, 24, 24),
			new THREE.MeshBasicMaterial({ color: pcolor, transparent: true, opacity: 0.3 }),
		);
		planet.position.set(p.x, p.y, p.z);
		planet.userData = { portalId: pid, isGateway: true };
		scene.add(planet); track.push(planet); tapTargets.push(planet);

		// Ring
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(p.r * 1.3, p.r * 1.6, 48),
			new THREE.MeshBasicMaterial({ color: pcolor, transparent: true, opacity: 0.15, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
		);
		ring.position.copy(planet.position); ring.rotation.x = -0.4 + Math.random() * 0.3; ring.rotation.y = Math.random() * 0.5;
		scene.add(ring); track.push(ring);

		// Glow halo
		const glow = new THREE.Mesh(
			new THREE.SphereGeometry(p.r * 1.15, 16, 16),
			new THREE.MeshBasicMaterial({ color: pcolor, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false }),
		);
		glow.position.copy(planet.position);
		scene.add(glow); track.push(glow);

		// Label
		const label = makeTextSprite(pname, pcolor);
		label.position.set(p.x, p.y + p.r + 0.4, p.z); label.scale.set(1.2, 0.3, 1);
		label.material.opacity = 0.35; // visible by default, breathes in update loop
		scene.add(label); track.push(label);
		labels.push({ sprite: label, baseY: label.position.y, phase: Math.random() * Math.PI * 2, planet: planet, baseRot: 0 });
	}

	// ═══ SHOOTING STARS ═══
	for (let i = 0; i < 4; i++) {
		const sg = new THREE.BufferGeometry();
		sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
		const sl = new THREE.Line(sg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
		scene.add(sl); track.push(sl);
		shootingStars.push({ line: sl, next: Math.random() * 5 + 2, active: false, life: 0, start: new THREE.Vector3(), dir: new THREE.Vector3() });
	}

	// ═══ LIGHTING ═══
	const ambient = new THREE.AmbientLight(0x3322aa, 0.3); scene.add(ambient); track.push(ambient);
	const key = new THREE.PointLight(0x8866ff, 0.5, 30); key.position.set(0, 2, 0); scene.add(key); track.push(key);

	// Palette-driven void so two space portals look distinct.
	const cPalette = config.palette || {};
	const cPrimary = new THREE.Color(cPalette.primary || '#5a3aff');
	const { h: cHue } = cPrimary.getHSL({});
	const oldFog = scene.fog; const oldBg = scene.background;
	scene.background = new THREE.Color(cPalette.background || new THREE.Color().setHSL(cHue, 0.6, 0.02));

	if (world.camera) { world.camera.position.set(0, 0, 8); world.camera.lookAt(0, 0, -5); world.camera.rotation.z = 0; }

	// ═══ SOUND ═══
	try {
		const ctx = getAudioCtx();
		const drone = createSpaceDrone(ctx); drone.output.connect(ctx.destination);
		audioNodes.push(drone.output); droneFilter = drone.filter;
		droneModulator = setInterval(() => { droneFilter.frequency.linearRampToValueAtTime(200 + Math.random() * 400, ctx.currentTime + 4); }, 5000);

		for (let i = 0; i < 3; i++) { const c = createEMChirp(ctx); c.output.connect(ctx.destination); emChirps.push(c); audioNodes.push(c.output); }

		if (world.renderer?.domElement) world.renderer.domElement.addEventListener('click', () => { if (ctx.state === 'suspended') ctx.resume(); }, { once: true });
		console.log('[cosmos] Sound: space drone + EM chirps');
	} catch (e) { console.warn('[cosmos] Audio failed:', e.message); }

	// ═══ WORLDS NAVIGATION — floating compass + home gateway ═══
	const nav = installNavigation({ scene, world, allConfigs, config, track, tapTargets, onNavigate, theme: 'cosmos' });

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
			if (target?.userData?.portalId) { console.log('[cosmos] Navigating to', target.userData.portalId); if (onNavigate) onNavigate(target.userData.portalId); }
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
			nav.update(delta, time);
		const tt = time / 1000;
		starfield.rotation.y += delta * 0.003;

		// Shooting stars
		for (const ss of shootingStars) {
			if (!ss.active) {
				ss.next -= delta;
				if (ss.next <= 0) {
					ss.active = true; ss.life = 1.0;
					ss.start.set((Math.random()-0.5)*20, 4+Math.random()*6, -5-Math.random()*10);
					ss.dir.set((Math.random()-0.5)*3, -1-Math.random(), (Math.random()-0.5)*3).normalize();
					ss.next = 5 + Math.random() * 10;
				}
			} else {
				ss.life -= delta * 0.8;
				if (ss.life <= 0) { ss.active = false; ss.line.material.opacity = 0; }
				else {
					const pos = ss.line.geometry.attributes.position.array;
					pos[0]=ss.start.x; pos[1]=ss.start.y; pos[2]=ss.start.z;
					pos[3]=ss.start.x+ss.dir.x*4; pos[4]=ss.start.y+ss.dir.y*4; pos[5]=ss.start.z+ss.dir.z*4;
					ss.line.geometry.attributes.position.needsUpdate = true;
					ss.line.material.opacity = ss.life * 0.6;
				}
			}
		}

		// EM chirps
		if (emChirps.length > 0 && Math.random() < 0.003) emChirps[Math.floor(Math.random()*emChirps.length)].chirp();

		for (let li = 0; li < labels.length; li++) {
			const l = labels[li];
			const isHovered = hoveredTarget && tapTargets.indexOf(hoveredTarget) === li;
			const targetOp = isHovered ? 0.9 : 0.35 + Math.sin(tt * 1.5 + l.phase) * 0.15;
			l.sprite.material.opacity += (targetOp - l.sprite.material.opacity) * 0.15;
			l.sprite.position.y = l.baseY + Math.sin(tt * 0.5 + l.phase) * 0.1;
			l.planet.rotation.y += delta * 0.1;
		}
	};

	console.log('[cosmos] Scene built with', track.length, 'objects');
	return {
		cleanup() {
			nav.dispose();
			for (const obj of track) scene.remove(obj);
			if (droneModulator) clearInterval(droneModulator);
			for (const node of audioNodes) { try { node.disconnect(); } catch {} }
			scene.background = oldBg; scene.fog = oldFog;
			world.update = prevUpdate;
			world.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
			world.renderer.domElement.removeEventListener('touchstart', onPointerDown);
			world.renderer.domElement.removeEventListener('pointermove', onPointerMove);
		},
	};
}
