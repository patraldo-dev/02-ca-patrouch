// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict JS type-checking (see jsconfig.json).
// ═══════════════════════════════════════════════════════════
//  parallax-scene.js — Mistral-composed layered diorama world.
//
//  The scene config carries a `layers` array (composed by Mistral, validated
//  by the normalizer). Each layer is rendered as a CanvasTexture silhouette
//  on a plane at a Z-depth derived from layer.depth. The orbiting camera
//  drives parallax: nearer layers shift more, distant layers barely move.
//
//  Gateway orbs (destination portals) float between the midground and
//  foreground layers, embedded in the diorama rather than overlaid.
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';
import { installNavigation } from './worlds-navigation.js';

// ── Label helper (matches the pattern in other scenes) ──
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
	return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.35, depthWrite: false }));
}

// ═══ Layer renderers — each draws a silhouette on a 2D canvas ═══
// Every renderer takes (ctx, W, H, layer, color) and draws into the canvas.
// The canvas becomes a CanvasTexture on a Three.js plane.

function drawLayer(ctx, W, H, layer, color) {
	const hex = '#' + color.getHexString();
	const yBase = layer.position === 'top' ? H * 0.15
		: layer.position === 'horizon' ? H * 0.55
		: layer.position === 'floating' ? H * 0.4
		: H * 0.85; // bottom
	const h = H * layer.height;
	const density = layer.density;

	ctx.clearRect(0, 0, W, H);
	ctx.fillStyle = hex;

	switch (layer.kind) {
		case 'mountains': return drawMountains(ctx, W, H, yBase, h, density, layer.silhouette);
		case 'treeline':  return drawTreeline(ctx, W, H, yBase, h, density);
		case 'skyline':   return drawSkyline(ctx, W, H, yBase, h, density);
		case 'waves':     return drawWaves(ctx, W, H, yBase, h, density);
		case 'clouds':    return drawClouds(ctx, W, H, yBase, h, density);
		case 'ferns':     return drawFerns(ctx, W, H, yBase, h, density);
		case 'grasses':   return drawGrasses(ctx, W, H, yBase, h, density);
		case 'stars':     return drawStars(ctx, W, H, density, hex);
		case 'arch':      return drawArch(ctx, W, H, yBase, h, hex);
		case 'geometry':  return drawGeometry(ctx, W, H, yBase, h, density, layer.silhouette);
		default:          return drawMountains(ctx, W, H, yBase, h, density, layer.silhouette);
	}
}

function drawMountains(ctx, W, H, yBase, h, density, silhouette) {
	ctx.beginPath();
	ctx.moveTo(0, H);
	ctx.lineTo(0, yBase);
	const peaks = Math.max(3, Math.floor(density * 12));
	const step = W / peaks;
	for (let i = 0; i <= peaks; i++) {
		const x = i * step;
		const variance = silhouette === 'jagged' ? 0.9 : silhouette === 'pointed' ? 1.0 : 0.5;
		const peakH = h * (0.4 + Math.random() * 0.6 * variance);
		ctx.lineTo(x - step / 2, yBase - peakH * 0.4);
		ctx.lineTo(x, yBase - peakH);
	}
	ctx.lineTo(W, yBase);
	ctx.lineTo(W, H);
	ctx.closePath();
	ctx.fill();
}

function drawTreeline(ctx, W, H, yBase, h, density) {
	ctx.beginPath();
	ctx.moveTo(0, H);
	ctx.lineTo(0, yBase);
	const trees = Math.max(5, Math.floor(density * 20));
	const step = W / trees;
	for (let i = 0; i <= trees; i++) {
		const x = i * step;
		const treeH = h * (0.5 + Math.random() * 0.5);
		// bumpy rounded canopy
		ctx.quadraticCurveTo(x - step / 2, yBase - treeH * 0.7, x, yBase - treeH);
		ctx.quadraticCurveTo(x + step / 2, yBase - treeH * 0.7, x + step, yBase);
	}
	ctx.lineTo(W, H);
	ctx.closePath();
	ctx.fill();
}

function drawSkyline(ctx, W, H, yBase, h, density) {
	const buildings = Math.max(4, Math.floor(density * 16));
	const step = W / buildings;
	let x = 0;
	while (x < W) {
		const bw = step * (0.7 + Math.random() * 0.5);
		const bh = h * (0.4 + Math.random() * 0.6);
		ctx.fillRect(x, yBase - bh, bw, bh + (H - yBase));
		x += bw;
	}
}

function drawWaves(ctx, W, H, yBase, h, density) {
	ctx.beginPath();
	ctx.moveTo(0, H);
	ctx.lineTo(0, yBase);
	const waves = Math.max(3, Math.floor(density * 8));
	const amp = h * 0.4;
	for (let x = 0; x <= W; x += 4) {
		const y = yBase - amp * Math.sin((x / W) * waves * Math.PI * 2) - h * 0.3;
		ctx.lineTo(x, y);
	}
	ctx.lineTo(W, H);
	ctx.closePath();
	ctx.fill();
}

function drawClouds(ctx, W, H, yBase, h, density) {
	const clouds = Math.max(2, Math.floor(density * 6));
	for (let i = 0; i < clouds; i++) {
		const cx = (i + 0.5) * (W / clouds) + (Math.random() - 0.5) * 40;
		const cy = yBase + (Math.random() - 0.5) * h * 0.5;
		const r = h * (0.3 + Math.random() * 0.4);
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.arc(cx + r * 0.7, cy + r * 0.1, r * 0.8, 0, Math.PI * 2);
		ctx.arc(cx - r * 0.7, cy + r * 0.1, r * 0.7, 0, Math.PI * 2);
		ctx.fill();
	}
}

function drawFerns(ctx, W, H, yBase, h, density) {
	const ferns = Math.max(4, Math.floor(density * 14));
	for (let i = 0; i < ferns; i++) {
		const x = (i + 0.5) * (W / ferns) + (Math.random() - 0.5) * 20;
		const fh = h * (0.6 + Math.random() * 0.4);
		ctx.beginPath();
		ctx.moveTo(x, yBase);
		ctx.quadraticCurveTo(x - fh * 0.2, yBase - fh * 0.5, x, yBase - fh);
		ctx.quadraticCurveTo(x + fh * 0.2, yBase - fh * 0.5, x, yBase);
		ctx.fill();
		// side fronds
		for (let f = 1; f <= 3; f++) {
			const fy = yBase - (fh * f / 4);
			ctx.beginPath();
			ctx.ellipse(x - fh * 0.15, fy, fh * 0.12, fh * 0.04, -0.6, 0, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.ellipse(x + fh * 0.15, fy, fh * 0.12, fh * 0.04, 0.6, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}

function drawGrasses(ctx, W, H, yBase, h, density) {
	const blades = Math.max(10, Math.floor(density * 40));
	for (let i = 0; i < blades; i++) {
		const x = Math.random() * W;
		const bh = h * (0.4 + Math.random() * 0.6);
		ctx.beginPath();
		ctx.moveTo(x, yBase);
		ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 8, yBase - bh * 0.6, x + (Math.random() - 0.5) * 12, yBase - bh);
		ctx.lineWidth = 2;
		ctx.strokeStyle = ctx.fillStyle;
		ctx.stroke();
	}
}

function drawStars(ctx, W, H, density, hex) {
	const count = Math.floor(density * 80);
	ctx.fillStyle = hex;
	for (let i = 0; i < count; i++) {
		const x = Math.random() * W;
		const y = Math.random() * H * 0.6;
		const r = Math.random() * 1.5 + 0.3;
		ctx.globalAlpha = 0.4 + Math.random() * 0.5;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
}

function drawArch(ctx, W, H, yBase, h, hex) {
	ctx.strokeStyle = hex;
	ctx.lineWidth = W * 0.04;
	ctx.beginPath();
	ctx.moveTo(W * 0.3, H);
	ctx.lineTo(W * 0.3, yBase - h * 0.4);
	ctx.quadraticCurveTo(W * 0.5, yBase - h, W * 0.7, yBase - h * 0.4);
	ctx.lineTo(W * 0.7, H);
	ctx.stroke();
}

function drawGeometry(ctx, W, H, yBase, h, density, silhouette) {
	const shapes = Math.max(3, Math.floor(density * 10));
	for (let i = 0; i < shapes; i++) {
		const cx = Math.random() * W;
		const cy = yBase - Math.random() * h;
		const s = h * (0.1 + Math.random() * 0.3);
		const sides = silhouette === 'pointed' ? 3 : silhouette === 'flat' ? 4 : 5 + Math.floor(Math.random() * 3);
		ctx.beginPath();
		for (let a = 0; a <= sides; a++) {
			const ang = (a / sides) * Math.PI * 2;
			const px = cx + Math.cos(ang) * s;
			const py = cy + Math.sin(ang) * s;
			if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
		}
		ctx.closePath();
		ctx.fill();
	}
}

// ═══ Scene builder ═══

export function buildParallaxScene(world, config = {}, allConfigs = {}, onNavigate = null) {
	const scene = world.scene;
	const track = [];
	const tapTargets = [];
	const labels = [];
	const layerMeshes = []; // for parallax motion
	const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';

	// ── Palette + layers ──
	const palette = config.palette || {};
	const primary = new THREE.Color(palette.primary || '#5a6a8a');
	const { h: baseHue, s: baseSat } = primary.getHSL({});
	const layers = config.layers || [];

	// ── Background + fog (palette-driven) ──
	const oldBg = scene.background;
	scene.background = new THREE.Color(palette.background || new THREE.Color().setHSL(baseHue, 0.4, 0.03).getHex());
	scene.fog = new THREE.FogExp2(new THREE.Color().setHSL(baseHue, 0.4, 0.05).getHex(), palette.fog_density ?? 0.015);

	// ── Render each layer as a CanvasTexture plane ──
	const CANVAS_W = 1024, CANVAS_H = 512;
	layers.forEach((layer) => {
		// Tint: shift the base hue by layer.tint_shift, darken by depth (farther = darker)
		const layerHue = (baseHue + (layer.tint_shift || 0) + 1) % 1;
		const depthDarken = 0.5 + layer.depth * 0.5; // far=0.5 lightness factor, near=1.0
		const layerColor = new THREE.Color().setHSL(layerHue, Math.min(1, baseSat + 0.2), Math.min(0.7, 0.25 * depthDarken));

		const canvas = document.createElement('canvas');
		canvas.width = CANVAS_W; canvas.height = CANVAS_H;
		const ctx = canvas.getContext('2d');
		drawLayer(ctx, CANVAS_W, CANVAS_H, layer, layerColor);

		const tex = new THREE.CanvasTexture(canvas);
		tex.colorSpace = THREE.SRGBColorSpace;

		// Z-depth: far (depth=0) → z=-15, near (depth=1) → z=-2
		const z = -15 + layer.depth * 13;
		const planeW = 30 + layer.depth * 8; // nearer layers slightly wider (perspective feel)
		const planeH = planeW * (CANVAS_H / CANVAS_W);

		const mat = new THREE.MeshBasicMaterial({
			map: tex, transparent: true,
			opacity: 0.7 + layer.depth * 0.25, // nearer = more opaque
			depthWrite: false, side: THREE.DoubleSide,
		});
		const mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), mat);
		mesh.position.set(0, 0, z);
		scene.add(mesh); track.push(mesh);
		layerMeshes.push({ mesh, depth: layer.depth, baseY: 0, phase: Math.random() * Math.PI * 2 });
	});

	// ── Gateway orbs (destination portals) — float between midground + foreground ──
	const portalIds = Object.keys(allConfigs).filter((id) => id !== (config.portal?.id));
	const gatewayZ = -5; // in front of distant layers, behind near foreground
	const gatewayPositions = [
		{ x: -3, y: 0.5 }, { x: 0, y: 1.2 }, { x: 3, y: 0.3 },
		{ x: -1.5, y: -0.3 }, { x: 1.5, y: 0.8 }, { x: -4, y: 1.5 },
	];

	for (let i = 0; i < gatewayPositions.length; i++) {
		const pid = portalIds[i % portalIds.length];
		const pcfg = allConfigs[pid];
		if (!pcfg) continue;
		const pcolor = new THREE.Color(pcfg.palette?.primary || '#c9a87c');
		const pname = pcfg.portal?.names?.[lang] || pcfg.portal?.names?.es || pid;
		const gp = gatewayPositions[i];

		// Glowing orb — inner core + outer halo
		const orbGroup = new THREE.Group();
		const core = new THREE.Mesh(
			new THREE.SphereGeometry(0.18, 16, 16),
			new THREE.MeshBasicMaterial({ color: pcolor, transparent: true, opacity: 0.85 }),
		);
		orbGroup.add(core);
		const halo = new THREE.Mesh(
			new THREE.SphereGeometry(0.35, 16, 16),
			new THREE.MeshBasicMaterial({ color: pcolor, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false }),
		);
		orbGroup.add(halo);
		orbGroup.position.set(gp.x, gp.y, gatewayZ);
		orbGroup.userData = { portalId: pid, isGateway: true };
		for (const child of orbGroup.children) child.userData = orbGroup.userData;
		scene.add(orbGroup); track.push(orbGroup); tapTargets.push(orbGroup);

		// Hover label
		const label = makeTextSprite(pname, pcolor);
		label.position.set(gp.x, gp.y + 0.6, gatewayZ);
		label.scale.set(1.2, 0.3, 1);
		scene.add(label); track.push(label);
		labels.push({ sprite: label, baseY: label.position.y, phase: Math.random() * Math.PI * 2, halo, baseOpacity: 0.15 });
	}

	// ── Lighting (subtle — most of the look is the canvas textures) ──
	const ambient = new THREE.AmbientLight(new THREE.Color().setHSL(baseHue, 0.3, 0.4).getHex(), 0.6);
	scene.add(ambient); track.push(ambient);

	// ── Worlds navigation (compass + home gateway + narration) ──
	const nav = installNavigation({ scene, world, allConfigs, config, track, tapTargets, onNavigate, theme: 'forest' });

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
			if (target?.userData?.portalId) {
				if (onNavigate) onNavigate(target.userData.portalId);
			}
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

	// ── Update loop: parallax motion + label breathing + orb pulse ──
	const prevUpdate = world.update.bind(world);
	world.update = function (delta, time) {
		prevUpdate(delta, time);
		nav.update(delta, time);
		const tt = time / 1000;
		const camX = world.camera.position.x;
		const camY = world.camera.position.y;

		// Parallax: each layer offsets opposite to camera, scaled by depth.
		// Nearer layers (depth→1) move more; distant (depth→0) barely move.
		for (const lm of layerMeshes) {
			lm.mesh.position.x = -camX * lm.depth * 2.5;
			lm.mesh.position.y = lm.baseY - camY * lm.depth * 0.8 + Math.sin(tt * 0.4 + lm.phase) * 0.08;
		}

		// Gateway orb pulse + label breathing
		for (const l of labels) {
			const isHovered = hoveredTarget && tapTargets.indexOf(hoveredTarget) === labels.indexOf(l);
			const targetOp = isHovered ? 0.9 : 0.35 + Math.sin(tt * 1.5 + l.phase) * 0.15;
			l.sprite.material.opacity += (targetOp - l.sprite.material.opacity) * 0.15;
			l.sprite.position.y = l.baseY + Math.sin(tt * 0.8 + l.phase) * 0.06;
			l.halo.scale.setScalar(0.9 + Math.sin(tt * 2 + l.phase) * 0.2);
			l.halo.material.opacity = l.baseOpacity + Math.sin(tt * 2 + l.phase) * 0.08;
		}
	};

	console.log('[parallax] Scene built with', layers.length, 'layers,', portalIds.length, 'gateways');

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

// Standalone boot for localhost dev
export async function bootParallaxScene(container) {
	const { World } = await import('@iwsdk/core');
	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});
	const config = {
		portal: { id: 'diorama-test', names: { es: 'Diorama' } },
		palette: { primary: '#5a6a8a', background: '#070912', fog_density: 0.015 },
		layers: [
			{ depth: 0.0, kind: 'stars', silhouette: 'flat', density: 0.6, height: 0.6, position: 'top', tint_shift: 0 },
			{ depth: 0.3, kind: 'mountains', silhouette: 'jagged', density: 0.5, height: 0.45, position: 'horizon', tint_shift: -0.05 },
			{ depth: 0.6, kind: 'treeline', silhouette: 'rounded', density: 0.7, height: 0.3, position: 'bottom', tint_shift: 0 },
			{ depth: 1.0, kind: 'ferns', silhouette: 'pointed', density: 0.8, height: 0.25, position: 'bottom', tint_shift: 0.05 },
		],
	};
	const allConfigs = { 'diorama-test': config };
	buildParallaxScene(world, config, allConfigs);
	return world;
}
