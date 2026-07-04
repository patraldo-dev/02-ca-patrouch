// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict JS type-checking (see jsconfig.json).
// ═══════════════════════════════════════════════════════════
//  lithograph-scene.js — cross-hatched engraving world.
//
//  The scene is rendered as if it were a 19th-century engraving: ink-on-paper
//  cross-hatching rather than flat color. Two techniques compose the look:
//
//  1. A custom ShaderMaterial on the backdrop plane that procedurally generates
//     cross-hatch lines (three directional passes) whose density is driven by a
//     vignette + flowing noise — dark centers get dense hatching, edges stay
//     sparse. The hatch angle + density shift over time so the engraving
//     "breathes." Tinted to the portal's palette (so a forest portal's
//     engraving reads greenish, a memory portal sepia).
//
//  2. Foreground silhouettes (drawn on CanvasTextures — trees, arches,
//     urns — the engraver's subject matter) rendered in pure black-on-paper
//     with their OWN fine hatch overlay, drifting slowly.
//
//  Gateway objects are ink-well orbs — dark circles with a single highlight,
//     like drops of ink — that pulse and carry the destination portal's color
//     as a faint aura. Tap to navigate (same contract as every scene).
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';
import { installNavigation } from './worlds-navigation.js';

function makeTextSprite(text, color) {
	const canvas = document.createElement('canvas');
	canvas.width = 256; canvas.height = 64;
	const ctx = canvas.getContext('2d');
	ctx.font = 'bold 28px Georgia, serif';
	ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
	ctx.shadowColor = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 6;
	ctx.fillStyle = '#' + color.getHexString();
	ctx.fillText(text, 128, 32);
	const tex = new THREE.CanvasTexture(canvas);
	tex.colorSpace = THREE.SRGBColorSpace;
	return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.35, depthWrite: false }));
}

// ── Cross-hatch GLSL ───────────────────────────────────────
// Three directional hatch passes at different angles. Each turns the
// continuous vignette/noise field into discrete lines via a step function.
// `uDensity` modulates how many lines appear; `uFlow` shifts them over time.
const HATCH_VERTEX = `
	varying vec2 vUv;
	varying vec3 vPos;
	void main() {
		vUv = uv;
		vPos = position;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const HATCH_FRAGMENT = `
	precision highp float;
	varying vec2 vUv;
	varying vec3 vPos;
	uniform vec3 uInkColor;
	uniform vec3 uPaperColor;
	uniform float uTime;
	uniform float uDensity;

	// hash + value noise for organic flow
	float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
	float vnoise(vec2 p) {
		vec2 i = floor(p), f = fract(p);
		float a = hash(i), b = hash(i + vec2(1.0, 0.0));
		float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
		vec2 u = f * f * (3.0 - 2.0 * f);
		return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
	}

	// One directional hatch pass. angle sets line direction, freq line spacing.
	float hatchPass(vec2 uv, float angle, float freq, float threshold) {
		float s = sin(angle), c = cos(angle);
		vec2 rotated = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
		float lines = abs(fract(rotated.x * freq) - 0.5);
		// sharpen into thin strokes
		float stroke = smoothstep(threshold, threshold * 0.5, lines);
		return stroke;
	}

	void main() {
		// Vignette: darker (denser hatching) toward center-bottom, lighter at edges.
		float dist = distance(vUv, vec2(0.5, 0.35));
		float vignette = smoothstep(0.8, 0.1, dist);

		// Flowing noise field that drifts the hatch density slowly.
		float n = vnoise(vUv * 3.0 + vec2(uTime * 0.02, uTime * 0.015));
		float field = clamp(vignette * 0.7 + n * 0.4, 0.0, 1.0);

		// Three hatch passes at 0°, 60°, 120°. Density scales line frequency;
		// each pass only contributes where the field is dark enough.
		float freq = 80.0 * uDensity;
		float ink = 0.0;
		ink += hatchPass(vUv, 0.0,           freq, 0.45) * smoothstep(0.15, 0.5, field);
		ink += hatchPass(vUv, 1.0472,        freq, 0.45) * smoothstep(0.35, 0.7, field);
		ink += hatchPass(vUv, 2.0944,        freq, 0.45) * smoothstep(0.55, 0.9, field);
		ink = clamp(ink, 0.0, 1.0);

		// Paper shows through where there's no ink; ink darkens toward uInkColor.
		vec3 col = mix(uPaperColor, uInkColor, ink * 0.85);

		// Subtle paper grain
		float grain = (hash(vUv * 500.0 + uTime) - 0.5) * 0.04;
		col += grain;

		gl_FragColor = vec4(col, 1.0);
	}
`;

// ── Foreground silhouette renderer (canvas → texture) ─────
function drawSilhouette(ctx, W, H, kind, ink) {
	ctx.clearRect(0, 0, W, H);
	ctx.fillStyle = ink;
	const baseY = H * 0.92;

	if (kind === 'trees') {
		const trees = 5;
		for (let i = 0; i < trees; i++) {
			const x = (i + 0.5) * (W / trees) + (Math.random() - 0.5) * 30;
			const h = H * (0.35 + Math.random() * 0.3);
			// gnarled trunk
			ctx.lineWidth = W * 0.012;
			ctx.strokeStyle = ink;
			ctx.beginPath();
			ctx.moveTo(x, baseY);
			ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 20, baseY - h * 0.6, x + (Math.random() - 0.5) * 10, baseY - h);
			ctx.stroke();
			// bristled canopy — small circles like engraved leaves
			for (let b = 0; b < 12; b++) {
				const bx = x + (Math.random() - 0.5) * h * 0.4;
				const by = baseY - h + (Math.random() - 0.5) * h * 0.3;
				ctx.beginPath();
				ctx.arc(bx, by, h * 0.05 + Math.random() * h * 0.04, 0, Math.PI * 2);
				ctx.fill();
			}
		}
	} else if (kind === 'arch') {
		// classical ruined arch
		ctx.lineWidth = W * 0.025;
		ctx.strokeStyle = ink;
		ctx.beginPath();
		ctx.moveTo(W * 0.28, H);
		ctx.lineTo(W * 0.28, H * 0.55);
		ctx.quadraticCurveTo(W * 0.5, H * 0.25, W * 0.72, H * 0.55);
		ctx.lineTo(W * 0.72, H);
		ctx.stroke();
		// cracks
		for (let c = 0; c < 4; c++) {
			ctx.lineWidth = 1;
			ctx.beginPath();
			const sx = W * (0.3 + Math.random() * 0.4);
			ctx.moveTo(sx, H * 0.6);
			ctx.lineTo(sx + (Math.random() - 0.5) * 30, H * 0.85);
			ctx.stroke();
		}
	} else if (kind === 'urn') {
		// funerary urn silhouette
		const cx = W * 0.5;
		const uy = H * 0.6;
		ctx.beginPath();
		ctx.ellipse(cx, uy, W * 0.08, H * 0.12, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillRect(cx - W * 0.02, uy - H * 0.18, W * 0.04, H * 0.08);
		ctx.beginPath();
		ctx.arc(cx, uy - H * 0.2, W * 0.025, 0, Math.PI * 2);
		ctx.fill();
	} else {
		// generic rolling hills — bumpy horizon
		ctx.beginPath();
		ctx.moveTo(0, H);
		ctx.lineTo(0, baseY);
		for (let x = 0; x <= W; x += 8) {
			const y = baseY - Math.sin(x * 0.01) * H * 0.05 - Math.random() * H * 0.03;
			ctx.lineTo(x, y);
		}
		ctx.lineTo(W, H);
		ctx.closePath();
		ctx.fill();
	}
}

// ═══ Scene builder ═══

export function buildLithographScene(world, config = {}, allConfigs = {}, onNavigate = null) {
	const scene = world.scene;
	const track = [];
	const tapTargets = [];
	const labels = [];
	const swayItems = [];
	const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';

	// ── Palette: ink + paper from the portal's primary hue ──
	const palette = config.palette || {};
	const primary = new THREE.Color(palette.primary || '#3a4a5a');
	const { h: hue, s: sat } = primary.getHSL({});
	// Ink: very dark, desaturated version of the portal hue (sepia for warm,
	// graphite for cool). Paper: warm off-white, faintly tinted.
	const inkColor = new THREE.Color().setHSL(hue, Math.min(0.4, sat * 0.5), 0.08);
	const paperColor = new THREE.Color().setHSL(hue, 0.08, 0.92);

	const oldBg = scene.background;
	scene.background = paperColor.clone();
	scene.fog = new THREE.FogExp2(paperColor.clone().lerp(inkColor, 0.3), palette.fog_density ?? 0.008);

	// ── Backdrop: the cross-hatched shader plane ──
	const hatchUniforms = {
		uInkColor: { value: inkColor },
		uPaperColor: { value: paperColor },
		uTime: { value: 0 },
		uDensity: { value: 0.9 + sat * 0.3 },
	};
	const hatchMat = new THREE.ShaderMaterial({
		uniforms: hatchUniforms,
		vertexShader: HATCH_VERTEX,
		fragmentShader: HATCH_FRAGMENT,
		depthWrite: false,
	});
	const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(40, 22), hatchMat);
	backdrop.position.set(0, 1, -14);
	scene.add(backdrop); track.push(backdrop);

	// ── Foreground silhouettes (engraved subject matter) ──
	// Pick 2-3 silhouette kinds based on the portal's themes for variety.
	const silhouetteKinds = ['trees', 'arch', 'urn', 'hills'];
	const silhouettePositions = [
		{ x: -6, z: -6, kind: silhouetteKinds[Math.floor(Math.random() * silhouetteKinds.length)] },
		{ x: 6, z: -7, kind: silhouetteKinds[Math.floor(Math.random() * silhouetteKinds.length)] },
		{ x: 0, z: -10, kind: 'hills' },
	];
	const inkHex = '#' + inkColor.getHexString();
	for (const sp of silhouettePositions) {
		const canvas = document.createElement('canvas');
		canvas.width = 512; canvas.height = 256;
		drawSilhouette(canvas.getContext('2d'), 512, 256, sp.kind, inkHex);
		const tex = new THREE.CanvasTexture(canvas);
		tex.colorSpace = THREE.SRGBColorSpace;
		const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false });
		const mesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), mat);
		mesh.position.set(sp.x, -0.5, sp.z);
		scene.add(mesh); track.push(mesh);
		swayItems.push({ mesh, baseX: sp.x, phase: Math.random() * Math.PI * 2, amp: 0.08, spd: 0.2 });
	}

	// ── Gateway ink-well orbs ──
	const portalIds = Object.keys(allConfigs).filter((id) => id !== (config.portal?.id));
	const orbPositions = [
		{ x: -3, y: 0.8, z: -4 }, { x: 3, y: 1.4, z: -5 },
		{ x: 0, y: 0.2, z: -3 }, { x: -4.5, y: 1.8, z: -6 },
		{ x: 4.5, y: 0.5, z: -4 }, { x: 1.5, y: 2.2, z: -7 },
	];

	for (let i = 0; i < orbPositions.length; i++) {
		const pid = portalIds[i % portalIds.length];
		const pcfg = allConfigs[pid];
		if (!pcfg) continue;
		const pcolor = new THREE.Color(pcfg.palette?.primary || '#5a6a7a');
		const pname = pcfg.portal?.names?.[lang] || pcfg.portal?.names?.es || pid;
		const op = orbPositions[i];

		// Ink-drop: dark sphere with a faint colored aura (the destination's hue)
		const orbGroup = new THREE.Group();
		const drop = new THREE.Mesh(
			new THREE.SphereGeometry(0.22, 20, 20),
			new THREE.MeshBasicMaterial({ color: inkColor, transparent: true, opacity: 0.92 }),
		);
		orbGroup.add(drop);
		// Single highlight — like a light catching the ink
		const highlight = new THREE.Mesh(
			new THREE.SphereGeometry(0.05, 8, 8),
			new THREE.MeshBasicMaterial({ color: paperColor }),
		);
		highlight.position.set(-0.07, 0.07, 0.18);
		orbGroup.add(highlight);
		// Colored aura (faint — the engraving is monochrome, but the aura hints
		// at where you're going)
		const aura = new THREE.Mesh(
			new THREE.RingGeometry(0.28, 0.5, 24),
			new THREE.MeshBasicMaterial({ color: pcolor, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
		);
		orbGroup.add(aura);
		orbGroup.position.set(op.x, op.y, op.z);
		orbGroup.userData = { portalId: pid, isGateway: true };
		for (const child of orbGroup.children) child.userData = orbGroup.userData;
		scene.add(orbGroup); track.push(orbGroup); tapTargets.push(orbGroup);

		const label = makeTextSprite(pname, pcolor);
		label.position.set(op.x, op.y + 0.6, op.z);
		label.scale.set(1.2, 0.3, 1);
		scene.add(label); track.push(label);
		labels.push({ sprite: label, baseY: label.position.y, phase: Math.random() * Math.PI * 2, aura, baseOpacity: 0.12 });
	}

	// ── Lighting (minimal — the look comes from the shader + textures) ──
	const ambient = new THREE.AmbientLight(0xffffff, 0.5);
	scene.add(ambient); track.push(ambient);

	// ── Worlds navigation ──
	const nav = installNavigation({ scene, world, allConfigs, config, track, tapTargets, onNavigate, theme: 'memory' });

	// ── Tap handler ──
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

	// ── Hover ──
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

	// ── Update loop ──
	const prevUpdate = world.update.bind(world);
	world.update = function (delta, time) {
		prevUpdate(delta, time);
		nav.update(delta, time);
		const tt = time / 1000;
		// Drive the hatch shader's time uniform so the engraving breathes
		hatchUniforms.uTime.value = tt;

		// Silhouette gentle sway
		for (const s of swayItems) {
			if (!s.mesh) continue;
			s.mesh.position.x = s.baseX + Math.sin(tt * s.spd + s.phase) * s.amp;
			s.mesh.rotation.z = Math.sin(tt * 0.15 + s.phase) * 0.02;
		}

		// Orb pulse + label breathing
		for (const l of labels) {
			const isHovered = hoveredTarget && tapTargets.indexOf(hoveredTarget) === labels.indexOf(l);
			const targetOp = isHovered ? 0.9 : 0.35 + Math.sin(tt * 1.5 + l.phase) * 0.15;
			l.sprite.material.opacity += (targetOp - l.sprite.material.opacity) * 0.15;
			l.sprite.position.y = l.baseY + Math.sin(tt * 0.8 + l.phase) * 0.06;
			l.aura.scale.setScalar(0.9 + Math.sin(tt * 1.8 + l.phase) * 0.2);
			l.aura.material.opacity = l.baseOpacity + Math.sin(tt * 1.8 + l.phase) * 0.08;
		}
	};

	console.log('[lithograph] Scene built — engraved world,', portalIds.length, 'gateways');

	return {
		cleanup() {
			nav.dispose();
			for (const obj of track) {
				scene.remove(obj);
				if (obj.geometry) obj.geometry.dispose();
				if (obj.material) {
					if (obj.material.map) obj.material.map.dispose();
					if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
					else obj.material.dispose();
				}
			}
			scene.background = oldBg;
			scene.fog = null;
			world.update = prevUpdate;
			world.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
			world.renderer.domElement.removeEventListener('touchstart', onPointerDown);
			world.renderer.domElement.removeEventListener('pointermove', onPointerMove);
		},
	};
}

export async function bootLithographScene(container) {
	const { World } = await import('@iwsdk/core');
	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});
	const config = {
		portal: { id: 'engraving-test', names: { es: 'Grabado' } },
		palette: { primary: '#3a4a5a', background: '#e8e4dc', fog_density: 0.008 },
	};
	const allConfigs = { 'engraving-test': config };
	buildLithographScene(world, config, allConfigs);
	return world;
}
