// ═══════════════════════════════════════════════════════════
//  worlds-navigation.js
//  Shared in-world navigation: a floating "worlds compass" panel + a
//  per-scene diegetic "home" gateway. Both live inside the 3D world — no
//  flat DOM overlay.
//
//  The compass is a billboarded CanvasTexture plane showing every portal as
//  a colored row. Tap a row → onNavigate(portalId). It follows the camera at
//  a fixed distance and faces the viewer.
//
//  The home gateway is a distinctive native object per scene theme (set via
//  buildHomeGateway's `theme` arg). Tap it → onNavigate('__random__'), which
//  rebuildScene resolves to a fresh random world.
//
//  Both are designed to slot into a scene's existing tapTargets/track/update
//  structure with one call each.
// ═══════════════════════════════════════════════════════════
import * as THREE from 'three';

// Sentinel id meaning "take me somewhere random." rebuildScene treats this as
// "pick a random world other than the current one."
export const RANDOM_WORLD = '__random__';

// ── Canvas texture helpers ──────────────────────────────────

function drawCompassTexture(canvas, portals, lang, hoveredIdx) {
	const ctx = canvas.getContext('2d');
	const W = canvas.width, H = canvas.height;
	ctx.clearRect(0, 0, W, H);

	// Panel background — dark glass
	ctx.fillStyle = 'rgba(8, 6, 16, 0.82)';
	ctx.fillRect(0, 0, W, H);
	// Border glow
	ctx.strokeStyle = 'rgba(180, 160, 255, 0.35)';
	ctx.lineWidth = 3;
	ctx.strokeRect(4, 4, W - 8, H - 8);

	// Title
	ctx.fillStyle = 'rgba(220, 210, 255, 0.7)';
	ctx.font = 'bold 22px Georgia, serif';
	ctx.textAlign = 'center';
	ctx.fillText('✦ Mundos', W / 2, 30);

	const rowH = 34;
	const startY = 50;
	portals.forEach((p, i) => {
		const y = startY + i * rowH;
		const isHovered = i === hoveredIdx;
		// Row background on hover
		if (isHovered) {
			ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
			ctx.fillRect(8, y - rowH + 8, W - 16, rowH - 4);
		}
		// Color swatch
		ctx.fillStyle = p.color;
		ctx.beginPath();
		ctx.arc(24, y - 6, 8, 0, Math.PI * 2);
		ctx.fill();
		// Portal name
		ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(230, 225, 245, 0.9)';
		ctx.font = `${isHovered ? 'bold ' : ''}18px Georgia, serif`;
		ctx.textAlign = 'left';
		const name = p.names?.[lang] || p.names?.es || p.id;
		ctx.fillText(name, 42, y);
	});

	return canvas.texture || null;
}

// ── Worlds Compass ──────────────────────────────────────────

/**
 * Build the floating worlds compass panel.
 *
 * @param {object} opts
 * @param {THREE.Scene} opts.scene
 * @param {object} opts.world        - IWSDK world (for camera reference)
 * @param {object[]} opts.portals    - [{ id, names, color }] sorted display order
 * @param {function} opts.onNavigate - (portalId) => void
 * @param {string} opts.lang         - 'es' | 'en' | 'fr'
 * @returns {{ mesh, update, dispose, hitTarget }}
 */
export function buildWorldsCompass({ scene, world, portals, onNavigate, lang = 'es' }) {
	const ROW_H = 34;
	const PANEL_W = 280;
	const PANEL_H = 50 + portals.length * ROW_H + 16;
	const canvas = document.createElement('canvas');
	canvas.width = PANEL_W;
	canvas.height = PANEL_H;
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	canvas.texture = texture; // stashed for redraw

	const material = new THREE.MeshBasicMaterial({
		map: texture, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
	});
	const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_W / 100, PANEL_H / 100), material);
	mesh.position.set(0, 0, -3); // placed in front of camera; billboarded each frame
	mesh.renderOrder = 999;
	scene.add(mesh);

	// Hit detection: we raycast against the plane and map the hit point to a row.
	// Store row layout on userData so the scene's tap handler can resolve taps.
	mesh.userData.isCompass = true;
	mesh.userData.portalIds = portals.map((p) => p.id);

	let hoveredIdx = -1;
	let revealed = false;
	let revealTimer = 0;

	function redraw() {
		drawCompassTexture(canvas, portals, lang, hoveredIdx);
		texture.needsUpdate = true;
	}
	redraw();

	// Billboard + follow camera, fade in/out
	const cam = world.camera;
	function update(dt, time) {
		// Position: float at upper-left of view, fixed distance
		const dist = 3.2;
		const offset = new THREE.Vector3(-1.1, 0.7, 0).multiplyScalar(dist);
		const target = cam.position.clone().add(offset.applyQuaternion(cam.quaternion));
		mesh.position.lerp(target, 0.08);
		// Billboard: face the camera
		mesh.lookAt(cam.position);
		// Gentle bob
		mesh.position.y += Math.sin(time / 1000 * 0.8) * 0.04;
		// Reveal fade-in (slow, ethereal)
		const targetOp = revealed ? 0.88 : 0;
		material.opacity += (targetOp - material.opacity) * 0.06;
	}

	// Tap resolution: given a raycast hit on the plane, which row?
	function resolveTap(hit) {
		if (!hit) return null;
		// hit.uv is in [0,1]; map V (top=1) to row index
		const v = hit.uv?.y ?? 0.5;
		const idxFromTop = Math.floor((1 - v) * PANEL_H);
		const row = Math.floor((idxFromTop - 50) / ROW_H);
		if (row >= 0 && row < portals.length) return portals[row].id;
		return null;
	}

	function setHover(idx) {
		if (idx !== hoveredIdx) {
			hoveredIdx = idx;
			redraw();
		}
	}

	function setRevealed(v) { revealed = v; }

	function dispose() {
		scene.remove(mesh);
		mesh.geometry.dispose();
		material.dispose();
		texture.dispose();
	}

	return { mesh, update, dispose, resolveTap, setHover, setRevealed, hitTarget: mesh };
}

// ── Diegetic Home Gateway ───────────────────────────────────

// Per-theme geometry builders. Each returns a THREE.Group with a glowing,
// distinctive "home" object. The caller adds it to the scene + tapTargets.
const HOME_BUILDERS = {
	desert: () => {
		// Glowing obelisk — a shard of purple crystal rising from the sand
		const g = new THREE.Group();
		const shard = new THREE.Mesh(
			new THREE.ConeGeometry(0.25, 1.8, 5),
			new THREE.MeshBasicMaterial({ color: 0x9c6bff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending }),
		);
		shard.position.y = 0.4;
		g.add(shard);
		const glow = new THREE.Mesh(
			new THREE.SphereGeometry(0.4, 12, 12),
			new THREE.MeshBasicMaterial({ color: 0x9c6bff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending }),
		);
		glow.position.y = 0.4;
		g.add(glow);
		g.userData._glow = glow;
		return g;
	},
	ocean: () => {
		// Bioluminescent jelly — a glowing dome with trailing tendrils
		const g = new THREE.Group();
		const bell = new THREE.Mesh(
			new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
			new THREE.MeshBasicMaterial({ color: 0x66ffee, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }),
		);
		bell.position.y = 0.3;
		g.add(bell);
		for (let i = 0; i < 5; i++) {
			const tendril = new THREE.Mesh(
				new THREE.CylinderGeometry(0.015, 0.005, 0.6, 4),
				new THREE.MeshBasicMaterial({ color: 0x66ffee, transparent: true, opacity: 0.3 }),
			);
			tendril.position.set((Math.random() - 0.5) * 0.3, -0.05, (Math.random() - 0.5) * 0.3);
			g.add(tendril);
		}
		g.userData._glow = bell;
		return g;
	},
	forest: () => {
		// Glowing mushroom — a luminescent cap on a stump
		const g = new THREE.Group();
		const stem = new THREE.Mesh(
			new THREE.CylinderGeometry(0.08, 0.12, 0.4, 6),
			new THREE.MeshBasicMaterial({ color: 0x4a3a2a, transparent: true, opacity: 0.7 }),
		);
		stem.position.y = 0.0;
		g.add(stem);
		const cap = new THREE.Mesh(
			new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
			new THREE.MeshBasicMaterial({ color: 0x88ff99, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }),
		);
		cap.position.y = 0.2;
		cap.scale.y = 0.6;
		g.add(cap);
		g.userData._glow = cap;
		return g;
	},
	cosmos: () => {
		// Pulsar — a bright core with an accretion ring
		const g = new THREE.Group();
		const core = new THREE.Mesh(
			new THREE.SphereGeometry(0.18, 16, 16),
			new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }),
		);
		g.add(core);
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(0.3, 0.45, 32),
			new THREE.MeshBasicMaterial({ color: 0xb090ff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
		);
		ring.rotation.x = Math.PI / 2.5;
		g.add(ring);
		g.userData._glow = core;
		g.userData._ring = ring;
		return g;
	},
	celebration: () => {
		// Floating lantern — a glowing paper-lantern sphere
		const g = new THREE.Group();
		const lamp = new THREE.Mesh(
			new THREE.SphereGeometry(0.28, 12, 10),
			new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending }),
		);
		lamp.scale.y = 1.3;
		g.add(lamp);
		g.userData._glow = lamp;
		return g;
	},
	city: () => {
		// Neon sign — a glowing rectangular frame
		const g = new THREE.Group();
		const frame = new THREE.Mesh(
			new THREE.TorusGeometry(0.28, 0.04, 8, 4),
			new THREE.MeshBasicMaterial({ color: 0xff44aa, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }),
		);
		frame.scale.set(1, 1.4, 1);
		g.add(frame);
		g.userData._glow = frame;
		return g;
	},
	dream: () => {
		// Floating door — a translucent doorway ring
		const g = new THREE.Group();
		const door = new THREE.Mesh(
			new THREE.TorusGeometry(0.3, 0.04, 8, 16),
			new THREE.MeshBasicMaterial({ color: 0xcc88ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending }),
		);
		door.scale.set(0.7, 1.4, 1);
		g.add(door);
		g.userData._glow = door;
		return g;
	},
	theater: () => {
		// Floating script — a glowing scroll (cylinder)
		const g = new THREE.Group();
		const scroll = new THREE.Mesh(
			new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8),
			new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }),
		);
		scroll.rotation.z = Math.PI / 2;
		g.add(scroll);
		g.userData._glow = scroll;
		return g;
	},
};

/**
 * Build a diegetic "home" gateway object suited to the scene's theme.
 * Tapping it navigates to a random world. Returns the group (caller adds to
 * scene + tapTargets + track) and a per-frame updater.
 *
 * @param {string} theme - one of HOME_BUILDERS keys
 * @param {function} onNavigate
 * @returns {{ group, update }}
 */
export function buildHomeGateway(theme, onNavigate) {
	const builder = HOME_BUILDERS[theme] || HOME_BUILDERS.cosmos;
	const group = builder();
	group.userData.portalId = RANDOM_WORLD;
	group.userData.isHomeGateway = true;
	// propagate userData to children so raycast walk-up finds it
	for (const child of group.children) child.userData = group.userData;

	function update(dt, time) {
		const tt = time / 1000;
		// Gentle float
		group.position.y += Math.sin(tt * 0.7) * 0.0015;
		group.rotation.y += dt * 0.15;
		// Glow pulse
		const glow = group.userData._glow;
		if (glow?.material) {
			glow.material.opacity = 0.4 + Math.sin(tt * 1.5) * 0.2;
		}
		// Cosmos ring spin
		if (group.userData._ring) {
			group.userData._ring.rotation.z += dt * 0.3;
		}
	}

	return { group, update };
}

// ── One-call installer for scenes ───────────────────────────

/**
 * Build + wire both the worlds compass and a themed home gateway into a scene.
 * Slots into a scene's existing track / tapTargets / world.update structure.
 *
 * @param {object} opts
 * @param {THREE.Scene} opts.scene
 * @param {object} opts.world
 * @param {object} opts.allConfigs         - map of portalId → config
 * @param {object} opts.config             - the CURRENT portal's config (for theme + exclusion)
 * @param {Array}  opts.track              - scene's disposable-objects array (pushed to)
 * @param {Array}  opts.tapTargets         - scene's raycast targets (pushed to)
 * @param {function} opts.onNavigate       - scene's navigate callback
 * @param {string} opts.theme              - scene theme key for the home gateway
 * @returns {{ update(dt,time), dispose() }}
 */
export function installNavigation({ scene, world, allConfigs, config, track, tapTargets, onNavigate, theme }) {
	const lang = (typeof document !== 'undefined' && document.documentElement?.lang) || 'es';
	const currentId = config.portal?.id;

	// Build the portal list for the compass: all portals except the current one,
	// each with { id, names, color }.
	const portals = Object.keys(allConfigs)
		.filter((id) => id !== currentId)
		.map((id) => ({
			id,
			names: allConfigs[id].portal?.names || { es: id },
			color: allConfigs[id].palette?.primary || '#c9a87c',
		}));

	const compass = buildWorldsCompass({ scene, world, portals, onNavigate, lang });
	track.push(compass.mesh);

	// Home gateway — positioned bottom-right of the scene, distinct per theme
	const home = buildHomeGateway(theme, onNavigate);
	home.group.position.set(3.2, -0.6, -1.5);
	scene.add(home.group);
	track.push(home.group);
	tapTargets.push(home.group);

	// Compass tap + hover resolution. The scene's existing pointerdown/pointermove
	// raycast against tapTargets; we add the compass mesh there too and intercept
	// hits on it (translating UV → row → portalId) before the scene's own logic.
	tapTargets.push(compass.hitTarget);

	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();

	function resolveCompassHit(event) {
		const x = (event.clientX !== undefined ? event.clientX : event.touches?.[0]?.clientX) / window.innerWidth * 2 - 1;
		const y = -((event.clientY !== undefined ? event.clientY : event.touches?.[0]?.clientY) / window.innerHeight) * 2 + 1;
		pointer.set(x, y);
		raycaster.setFromCamera(pointer, world.camera);
		const hits = raycaster.intersectObject(compass.mesh, false);
		if (hits.length > 0) {
			return compass.resolveTap(hits[0]);
		}
		return null;
	}

	// Intercept pointer events at the canvas level (capture phase) so the compass
	// gets first dibs. If the tap lands on the compass, navigate; otherwise let
	// the scene's own handler run.
	const dom = world.renderer.domElement;
	function onDown(e) {
		const portalId = resolveCompassHit(e);
		if (portalId) {
			e.stopPropagation();
			onNavigate(portalId);
		}
	}
	function onMove(e) {
		const portalId = resolveCompassHit(e);
		const idx = portalId ? portals.findIndex((p) => p.id === portalId) : -1;
		compass.setHover(idx);
		compass.setRevealed(true); // hover anywhere reveals it
	}
	dom.addEventListener('pointerdown', onDown, true);
	dom.addEventListener('touchstart', onDown, true);
	dom.addEventListener('pointermove', onMove);

	// Auto-reveal the compass after a short delay even without hover, so it's
	// discoverable on touch (where pointermove only fires during a drag).
	const revealTimeout = setTimeout(() => compass.setRevealed(true), 2500);

	function update(dt, time) {
		compass.update(dt, time);
		home.update(dt, time);
	}

	function dispose() {
		clearTimeout(revealTimeout);
		dom.removeEventListener('pointerdown', onDown, true);
		dom.removeEventListener('touchstart', onDown, true);
		dom.removeEventListener('pointermove', onMove);
		compass.dispose();
	}

	return { update, dispose };
}

