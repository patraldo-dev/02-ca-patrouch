// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict JS type-checking (see jsconfig.json).
// city-scene.js — Urban canyon scene builder
// Night city with skyscrapers, neon signs (gateways), and driving cars.

import * as THREE from 'three';
import { installNavigation } from './worlds-navigation.js';

let audioCtx = null;
function getAudioCtx() {
	if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	return audioCtx;
}

function createCityRumble(ctx) {
	const bufferSize = ctx.sampleRate * 4;
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
	const noise = ctx.createBufferSource();
	noise.buffer = buffer; noise.loop = true;
	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass'; filter.frequency.value = 120; filter.Q.value = 0.5;
	const gain = ctx.createGain(); gain.gain.value = 0.05;
	noise.connect(filter).connect(gain);
	return { output: gain, start: () => noise.start() };
}

function createHornSound(ctx) {
	const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = 300;
	const gain = ctx.createGain(); gain.gain.value = 0;
	osc.connect(gain); osc.start();
	return {
		output: gain,
		honk: () => {
			const now = ctx.currentTime;
			osc.frequency.setValueAtTime(300, now);
			gain.gain.setValueAtTime(0, now);
			gain.gain.linearRampToValueAtTime(0.04, now + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
		},
	};
}

function createNeonHum(ctx) {
	const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 60;
	const gain = ctx.createGain(); gain.gain.value = 0.02;
	osc.connect(gain); osc.start();
	return { output: gain };
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

export function buildCityScene(world, config = {}, allConfigs = {}, onNavigate = null) {
	const scene = world.scene;
	const track = [];
	const swayItems = [];
	const audioNodes = [];
	const tapTargets = [];
	const labels = [];
	const cars = [];
	const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';
	let horn = null;
	let hornInterval = null;

	// ═══ PALETTE — derive the city's whole identity from this portal's primary ═══
	// Two city portals (urbano=steel-blue, mysterious-market=bright-blue) must
	// look distinct, so the neon palette, building tint, moon, and lighting all
	// shift to the portal's hue rather than a fixed pink/teal skyline.
	const ciPalette = config.palette || {};
	const ciPrimary = new THREE.Color(ciPalette.primary || '#546e7a');
	const { h: ciHue } = ciPrimary.getHSL({});
	// Neon palette: 6 hues spread around the portal's primary hue, so each city
	// has its own neon character (a mysterious market glows differently than a
	// sterile downtown). Saturation/lightness kept high for neon punch.
	const neonColors = [
		new THREE.Color().setHSL(ciHue, 1.0, 0.55).getHex(),
		new THREE.Color().setHSL((ciHue + 0.15) % 1, 1.0, 0.5).getHex(),
		new THREE.Color().setHSL((ciHue + 0.5) % 1, 0.9, 0.55).getHex(),
		new THREE.Color().setHSL((ciHue + 0.33) % 1, 1.0, 0.5).getHex(),
		new THREE.Color().setHSL((ciHue + 0.66) % 1, 0.95, 0.55).getHex(),
		new THREE.Color().setHSL((ciHue + 0.08) % 1, 1.0, 0.6).getHex(),
	];
	const buildingTint = new THREE.Color().setHSL(ciHue, 0.3, 0.06).getHex();
	const moonTint = new THREE.Color().setHSL(ciHue, 0.4, 0.85).getHex();
	const windowLit = new THREE.Color().setHSL((ciHue + 0.08) % 1, 0.7, 0.7).getHex();
	const groundColor = new THREE.Color().setHSL(ciHue, 0.2, 0.04).getHex();
	const skyTop = new THREE.Color().setHSL(ciHue, 0.4, 0.025);
	const skyBottom = new THREE.Color().setHSL(ciHue, 0.5, 0.09);

	// ═══ SKY — deep night, tinted to portal hue ═══
	const skyMat = new THREE.ShaderMaterial({
		uniforms: {
			topColor: { value: skyTop },
			bottomColor: { value: skyBottom },
		},
		vertexShader: `varying vec3 vWorldPos; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
		fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vWorldPos; void main() { float h = normalize(vWorldPos).y; float t = clamp(h * 0.5 + 0.5, 0.0, 1.0); gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0); }`,
		side: THREE.BackSide, depthWrite: false,
	});
	const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat);
	scene.add(sky); track.push(sky);

	// ═══ MOON — tinted to portal hue ═══
	const moon = new THREE.Mesh(
		new THREE.CircleGeometry(1.2, 32),
		new THREE.MeshBasicMaterial({ color: moonTint, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending }),
	);
	moon.position.set(-8, 6, -20);
	scene.add(moon); track.push(moon);
	const moonGlow = new THREE.Mesh(
		new THREE.RingGeometry(1.2, 2, 32),
		new THREE.MeshBasicMaterial({ color: moonTint, transparent: true, opacity: 0.08, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
	);
	moonGlow.position.copy(moon.position);
	scene.add(moonGlow); track.push(moonGlow);

	// ═══ GROUND — asphalt, tinted ═══
	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry(60, 60),
		new THREE.MeshBasicMaterial({ color: groundColor, transparent: true, opacity: 0.9 }),
	);
	ground.rotation.x = -Math.PI / 2; ground.position.y = -1.5;
	scene.add(ground); track.push(ground);

	// ═══ ROAD — lighter strip with lane markings ═══
	const road = new THREE.Mesh(
		new THREE.PlaneGeometry(4, 40),
		new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(ciHue, 0.2, 0.07).getHex(), transparent: true, opacity: 0.8 }),
	);
	road.rotation.x = -Math.PI / 2; road.position.set(0, -1.49, 0);
	scene.add(road); track.push(road);

	// Lane markings (dashed)
	for (let i = -18; i <= 18; i += 2) {
		const dash = new THREE.Mesh(
			new THREE.PlaneGeometry(0.08, 0.6),
			new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(ciHue, 0.3, 0.2).getHex(), transparent: true, opacity: 0.3 }),
		);
		dash.rotation.x = -Math.PI / 2; dash.position.set(0, -1.48, i);
		scene.add(dash); track.push(dash);
	}

	// ═══ SKYSCRAPERS WITH NEON SIGNS — gateway objects ═══
	const portalIds = Object.keys(allConfigs).filter(id => id !== (config.portal?.id));
	const buildingPositions = [
		{ x: -6, z: -6, w: 1.5, h: 8 }, { x: 6, z: -6, w: 1.8, h: 10 },
		{ x: -8, z: -12, w: 1.3, h: 6 }, { x: 8, z: -12, w: 1.6, h: 9 },
		{ x: 0, z: -16, w: 2.0, h: 12 }, { x: -10, z: -8, w: 1.2, h: 7 },
	];

	for (let i = 0; i < buildingPositions.length; i++) {
		const b = buildingPositions[i];
		const portalId = portalIds[i % portalIds.length];
		const portalConfig = allConfigs[portalId];
		const portalColor = portalConfig ? new THREE.Color(portalConfig.palette?.primary || neonColors[i]) : new THREE.Color(neonColors[i]);
		const portalName = portalConfig ? (portalConfig.portal?.names?.[lang] || portalConfig.portal?.names?.es || portalId) : portalId;
		const neonColor = neonColors[i % neonColors.length];

		// Building body — tinted to portal hue
		const building = new THREE.Mesh(
			new THREE.BoxGeometry(b.w, b.h, b.w * 0.8),
			new THREE.MeshBasicMaterial({ color: buildingTint, transparent: true, opacity: 0.9 }),
		);
		building.position.set(b.x, -1.5 + b.h / 2, b.z);
		scene.add(building); track.push(building);

		// Edge outline
		const edges = new THREE.EdgesGeometry(building.geometry);
		const outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: neonColor, transparent: true, opacity: 0.3 }));
		outline.position.copy(building.position);
		scene.add(outline); track.push(outline);

		// Window grid — lit windows tinted to portal hue
		const floors = Math.floor(b.h / 0.6);
		const cols = Math.floor(b.w / 0.35);
		for (let fr = 0; fr < floors; fr++) {
			for (let fc = 0; fc < cols; fc++) {
				if (Math.random() < 0.4) continue;
				const lit = Math.random() > 0.5;
				const win = new THREE.Mesh(
					new THREE.PlaneGeometry(0.08, 0.08),
					new THREE.MeshBasicMaterial({
						color: lit ? windowLit : new THREE.Color().setHSL(ciHue, 0.3, 0.15).getHex(),
						transparent: true,
						opacity: lit ? 0.5 : 0.1,
						blending: lit ? THREE.AdditiveBlending : THREE.NormalBlending,
					}),
				);
				const wx = b.x - b.w / 2 + 0.15 + fc * 0.3;
				const wy = -1.5 + 0.3 + fr * 0.55;
				const wz = b.z + b.w * 0.4 + 0.01;
				win.position.set(wx, wy, wz);
				scene.add(win); track.push(win);
			}
		}

		// Neon sign (vertical strip with portal color)
		const signGroup = new THREE.Group();
		const signBg = new THREE.Mesh(
			new THREE.PlaneGeometry(0.3, b.h * 0.4),
			new THREE.MeshBasicMaterial({ color: neonColor, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
		);
		signGroup.add(signBg);

		// Neon border tube
		for (let edge = 0; edge < 2; edge++) {
			const tube = new THREE.Mesh(
				new THREE.BoxGeometry(0.02, b.h * 0.4, 0.02),
				new THREE.MeshBasicMaterial({ color: neonColor, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }),
			);
			tube.position.set(edge === 0 ? -0.16 : 0.16, 0, 0.01);
			signGroup.add(tube);
		}

		signGroup.position.set(b.x + b.w / 2 + 0.18, -1.5 + b.h * 0.5, b.z);
		scene.add(signGroup); track.push(signGroup);
		swayItems.push({ obj: signGroup, phase: Math.random() * Math.PI * 2, amp: 0.005, spd: 4 + Math.random() * 2 }); // neon flicker effect

		// Glow at base
		const glow = new THREE.Mesh(
			new THREE.RingGeometry(0.5, 0.8, 24),
			new THREE.MeshBasicMaterial({ color: portalColor, transparent: true, opacity: 0.25, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
		);
		glow.rotation.x = -Math.PI / 2;
		glow.position.set(b.x, -1.48, b.z);
		scene.add(glow); track.push(glow);

		// Top beacon
		const beacon = new THREE.Mesh(
			new THREE.SphereGeometry(0.06, 8, 8),
			new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }),
		);
		beacon.position.set(b.x, -1.5 + b.h + 0.15, b.z);
		scene.add(beacon); track.push(beacon);

		// Label
		const label = makeTextSprite(portalName, portalColor);
		label.position.set(b.x, -1.5 + b.h + 0.5, b.z);
		label.scale.set(1.2, 0.3, 1);
		label.material.opacity = 0.35; // visible by default, breathes in update loop
		scene.add(label); track.push(label);

		building.userData = { portalId, isGateway: true };
		const revTexts = portalConfig?.narrative_texts?.[lang] || portalConfig?.narrative_texts?.es || [];
		const revText = revTexts[i % revTexts.length] || portalConfig?.portal?.names?.[lang] || '';
		if (revText) building.userData.revelation = { text: revText };
		signGroup.userData = building.userData;
		tapTargets.push(building, signGroup);
		labels.push({ sprite: label, baseY: label.position.y, phase: Math.random() * Math.PI * 2, glow: beacon, baseOpacity: 0.8 });
	}

	// ═══ STREETLAMPS ═══
	for (let i = -2; i <= 2; i += 2) {
		const pole = new THREE.Mesh(
			new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6),
			new THREE.MeshBasicMaterial({ color: 0x333344, transparent: true, opacity: 0.5 }),
		);
		pole.position.set(i * 3, -0.25, -2);
		scene.add(pole); track.push(pole);

		const lamp = new THREE.Mesh(
			new THREE.SphereGeometry(0.08, 8, 6),
			new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }),
		);
		lamp.position.set(i * 3, 1, -2);
		scene.add(lamp); track.push(lamp);
	}

	// ═══ CARS — driving through the scene (living element) ═══
	const carColors = [0xffcc00, 0xff3333, 0x33aaff, 0xcccccc, 0xff6600];
	for (let i = 0; i < 3; i++) {
		const carGroup = new THREE.Group();
		const cc = carColors[i % carColors.length];
		// Body
		const body = new THREE.Mesh(
			new THREE.BoxGeometry(0.7, 0.22, 0.35),
			new THREE.MeshBasicMaterial({ color: cc, transparent: true, opacity: 0.65 }),
		);
		body.position.y = 0.08;
		carGroup.add(body);
		// Cabin
		const cabin = new THREE.Mesh(
			new THREE.BoxGeometry(0.35, 0.15, 0.3),
			new THREE.MeshBasicMaterial({ color: cc, transparent: true, opacity: 0.5 }),
		);
		cabin.position.set(-0.05, 0.22, 0);
		carGroup.add(cabin);
		// Headlights
		const hl = new THREE.Mesh(
			new THREE.SphereGeometry(0.04, 6, 4),
			new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }),
		);
		hl.position.set(0.35, 0.1, 0.1);
		carGroup.add(hl);
		const hl2 = hl.clone(); hl2.position.z = -0.1; carGroup.add(hl2);
		// Taillights
		const tl = new THREE.Mesh(
			new THREE.SphereGeometry(0.03, 6, 4),
			new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }),
		);
		tl.position.set(-0.35, 0.1, 0.1);
		carGroup.add(tl);
		const tl2 = tl.clone(); tl2.position.z = -0.1; carGroup.add(tl2);

		// Start at random position on the road
		const lane = i % 2 === 0 ? 0.8 : -0.8;
		carGroup.position.set(lane, -1.38, -15 + i * 10);
		carGroup.rotation.y = lane > 0 ? 0 : Math.PI;
		scene.add(carGroup); track.push(carGroup);

		cars.push({
			group: carGroup,
			lane,
			speed: 1.5 + Math.random() * 0.8,
			offset: Math.random() * 20,
		});
	}

	// ═══ LIGHTING — tinted to portal hue ═══
	const ambient = new THREE.AmbientLight(new THREE.Color().setHSL(ciHue, 0.4, 0.18).getHex(), 0.4);
	scene.add(ambient); track.push(ambient);
	const streetLight = new THREE.PointLight(windowLit, 0.5, 15);
	streetLight.position.set(0, 1, -3);
	scene.add(streetLight); track.push(streetLight);
	const neonLight = new THREE.PointLight(neonColors[0], 0.3, 20);
	neonLight.position.set(5, 3, -8);
	scene.add(neonLight); track.push(neonLight);

	// Palette-driven fog/bg (ciHue + ciPalette already derived at top of build)
	scene.fog = new THREE.FogExp2(new THREE.Color().setHSL(ciHue, 0.4, 0.06), ciPalette.fog_density ?? 0.03);
	const oldBg = scene.background;
	scene.background = new THREE.Color(ciPalette.background || new THREE.Color().setHSL(ciHue, 0.4, 0.04));

	if (world.camera) {
		world.camera.position.set(0, 1.5, 5);
		world.camera.lookAt(0, 0, -5);
		world.camera.rotation.z = 0;
	}

	// ═══ SOUND ═══
	try {
		const ctx = getAudioCtx();
		const rumble = createCityRumble(ctx);
		rumble.output.connect(ctx.destination); rumble.start();
		audioNodes.push(rumble.output);

		horn = createHornSound(ctx);
		horn.output.connect(ctx.destination);
		audioNodes.push(horn.output);

		const hum = createNeonHum(ctx);
		hum.output.connect(ctx.destination);
		audioNodes.push(hum.output);

		hornInterval = setInterval(() => {
			if (Math.random() < 0.15 && horn) horn.honk();
		}, 5000);

		console.log('[city] Sound: rumble + horn + neon hum');
	} catch (e) {
		console.warn('[city] Audio setup failed:', e.message);
	}

	// ═══ WORLDS NAVIGATION — floating compass + home gateway ═══
	const nav = installNavigation({ scene, world, allConfigs, config, track, tapTargets, onNavigate, theme: 'city' });

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
			nav.update(delta, time);
		const tt = time / 1000;

		// Neon flicker
		for (const s of swayItems) {
			if (s.obj) {
				const flicker = 0.005 + Math.abs(Math.sin(tt * s.spd + s.phase)) * s.amp;
				s.obj.children.forEach(c => { if (c.material) c.material.opacity = 0.4 + flicker * 30; });
			}
		}

		// Cars driving
		for (const car of cars) {
			car.group.position.z += car.speed * delta * (car.lane > 0 ? 1 : -1);
			// Wrap around
			if (car.lane > 0 && car.group.position.z > 15) car.group.position.z = -15;
			if (car.lane < 0 && car.group.position.z < -15) car.group.position.z = 15;
		}

		// Labels
		for (const l of labels) {
			const isHovered = hoveredTarget && tapTargets.includes(hoveredTarget) && labels.indexOf(l) === tapTargets.indexOf(hoveredTarget) % labels.length;
			const targetOp = isHovered ? 0.9 : 0.35 + Math.sin(tt * 1.5 + l.phase) * 0.15;
			l.sprite.material.opacity += (targetOp - l.sprite.material.opacity) * 0.15;
			l.sprite.position.y = l.baseY + Math.sin(tt * 0.8 + l.phase) * 0.08;
			l.glow.material.opacity = l.baseOpacity * (0.5 + Math.sin(tt * 3 + l.phase) * 0.5);
		}
	};

	console.log('[city] Scene built with', track.length, 'objects');

	return {
		cleanup() {
			nav.dispose();
			for (const obj of track) scene.remove(obj);
			if (hornInterval) clearInterval(hornInterval);
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

export async function bootCityScene(container) {
	const { World } = await import('@iwsdk/core');
	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});
	buildCityScene(world);
	return world;
}
