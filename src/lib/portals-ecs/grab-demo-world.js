// @ts-nocheck — IWSDK/Three.js ECS code
// ═══════════════════════════════════════════════════════════
//  grab-demo-world.js
//  A proper ECS scene demonstrating grabbable/collectible objects
//  using IWSDK's World + elics component system. Same architecture
//  as the real portal engine, so this code integrates directly.
//
//  Pattern follows the IWSDK Three.js interop best practices:
//  - ECS owns the data (Transform components are source of truth)
//  - Systems handle logic at priority 0 (before TransformSystem)
//  - createTransformEntity(mesh) links ECS + Three.js
//  - Three.js for mesh/material creation only
// ═══════════════════════════════════════════════════════════
// All imports are dynamic inside bootGrabDemo() to avoid bundler TDZ issues
// when this module is dynamically imported via await import().

const CF_IMAGES_HASH = '4bRSwPonOXfEIBVZiDXg0w';
const BG_IMAGE_ID = 'e9fd4477-84f5-4a57-ac67-aba89d28b000';
// WS URL now points at THIS worker's own GrabDemoRoom DO (no cross-domain
// booty-chat-worker dependency). Level is passed as a query param so the DO
// route picks the right room instance (level-1, level-2, ...).
const WS_URL = `${typeof location !== 'undefined'
	? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
	: ''}/api/grab-demo/ws`;

// Module-level refs set by boot function
let _onPlayerHit = null;
let world_camera = null;
let _Collectible = null;  // set lazily inside bootGrabDemo

// CollectionSystem: plain class (not ECS). References _Collectible at runtime.
class CollectionSystem {
	constructor() {
		this.raycaster = null;  // set in bootGrabDemo after THREE import
		this.pointer = null;
		this.collectibles = [];
		this._onCollect = null;
		this._onCollectRemote = null;
	}

	registerCollectible(entity) {
		this.collectibles.push(entity);
	}

	setOnCollect(cb) {
		this._onCollect = cb;
	}

	_tryCollect(clientX, clientY) {
		if (!this.collectibles.length || !this.raycaster) return;
		this.pointer.x = (clientX / window.innerWidth) * 2 - 1;
		this.pointer.y = -(clientY / window.innerHeight) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, world_camera);
		this.raycaster.far = 10;

		const meshes = this.collectibles
			.filter((e) => !e.getValue(_Collectible, 'collected'))
			.map((e) => e.object3D)
			.filter(Boolean);

		const hits = this.raycaster.intersectObjects(meshes, true);
		if (hits.length > 0) {
			let obj = hits[0].object;
			while (obj && !this.collectibles.some((e) => e.object3D === obj)) {
				obj = obj.parent;
			}
			if (obj) {
				const entity = this.collectibles.find((e) => e.object3D === obj);
				if (entity && !entity.getValue(_Collectible, 'collected')) {
					entity.setValue(_Collectible, 'collected', true);
					entity.setValue(_Collectible, 'collectTime', performance.now());
					entity.setValue(_Collectible, 'collectBy', 'you');
					this.collectedCount = (this.collectedCount || 0) + 1;
					if (this._onCollect) this._onCollect(this.collectedCount);
					if (this._onCollectRemote) {
						this._onCollectRemote(entity.getValue(_Collectible, 'entityId'));
					}
				}
			}
		}
	}

	update(dt) {
		for (let i = this.collectibles.length - 1; i >= 0; i--) {
			const entity = this.collectibles[i];
			if (entity.getValue(_Collectible, 'collected')) {
				const obj = entity.object3D;
				if (!obj) {
					// Already destroyed — drop from our tracking list.
					this.collectibles.splice(i, 1);
					continue;
				}
				// Trigger the behavior-specific departure effect ONCE (when
				// collection is first observed). Uses a _departing marker so
				// we don't re-trigger every frame.
				if (!entity._departing) {
					entity._departing = true;
					const behavior = entity.getValue(_Collectible, 'behavior') || 'passive';
					// Departure duration varies by type — scatter takes longer than pop.
					const durations = { attack: 0.7, evade: 0.5, hide: 0.6, passive: 0.35 };
					entity._departDuration = durations[behavior] || 0.4;
					entity._departStart = performance.now();
					if (this.departEffects) {
						this.departEffects.spawn(behavior, obj, this._glowFor(behavior));
					}
				}
				// Release the entity once its departure animation completes.
				const departElapsed = (performance.now() - entity._departStart) / 1000;
				if (departElapsed >= entity._departDuration) {
					try { entity.destroy(); } catch (e) { /* already gone */ }
					this.collectibles.splice(i, 1);
				}
			}
		}
	}

	// Map behavior → glow color (matches BEHAVIOR_GLOWS in bootGrabDemo).
	_glowFor(behavior) {
		const map = {
			passive: 0x88ff88, evade: 0xffcc44, attack: 0xff4444,
			hide: 0x88ccff, follow: 0xcc88ff,
		};
		return map[behavior] || 0x88ff88;
	}
}

// DepartureEffects is now imported from the shared module
// (src/lib/portals-ecs/departure-effects.js) inside bootGrabDemo via
// dynamic import, so it can be reused by Oz and future game worlds.
// Previously this was an inline class — extracted to share with Oz.

// Helper: create a text label as a THREE.Sprite
function createTextSprite(THREE, text, color = '#ffffff') {
	const canvas = document.createElement('canvas');
	canvas.width = 256;
	canvas.height = 64;
	const ctx = canvas.getContext('2d');
	ctx.font = 'bold 24px sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = color;
	ctx.fillText(text, 128, 32);
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
	const sprite = new THREE.Sprite(material);
	sprite.scale.set(1.5, 0.4, 1);
	return sprite;
}

// ── Boot function ──
export async function bootGrabDemo(container, onCollect, options = {}) {
	if (!container) throw new Error('bootGrabDemo: container is null');
	console.log('[grab-demo] boot starting...');

	// Dynamic imports — avoid bundler TDZ issues
	const THREE = await import('three');
	const { World } = await import('@iwsdk/core');
	const { createComponent, createSystem, Types, ComponentRegistry } = await import('elics');
	const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
	const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
	const { DepartureEffects, BEHAVIOR_GLOWS } = await import('./departure-effects.js');
	console.log('[grab-demo] imports resolved, creating World...');

	// Create component now that elics is loaded
	_Collectible = ComponentRegistry.has('_Collectible')
		? ComponentRegistry.getById('_Collectible')
		: createComponent('_Collectible', {
			entityId:    { type: Types.Int32, default: 0 },
			collected:   { type: Types.Boolean, default: false },
			collectTime: { type: Types.Float32, default: 0 },
			collectBy:   { type: Types.String, default: '' },
			spinSpeed:   { type: Types.Float32, default: 0.5 },
			bobPhase:    { type: Types.Float32, default: 0 },
			baseY:       { type: Types.Float32, default: 0.6 },
			modelIndex:  { type: Types.Int32, default: 0 },
			points:      { type: Types.Int32, default: 1 },
			behavior:    { type: Types.String, default: 'passive' },
			baseX:       { type: Types.Float32, default: 0 },
			baseZ:       { type: Types.Float32, default: 0 },
			fleeSpeed:   { type: Types.Float32, default: 2.0 },
			chaseSpeed:  { type: Types.Float32, default: 1.5 },
			hitCooldown: { type: Types.Float32, default: 0 },
		});

	// AnimationSystem defined after elics loads
	const AnimationSystem = class extends createSystem({
		items: { required: [_Collectible] },
	}) {
		update(dt) {
			const time = performance.now() / 1000;
			const cam = this.world?.camera;
			const pp = cam ? cam.position : null;
			for (const entity of this.queries.items.entities) {
				if (entity.getValue(_Collectible, 'collected')) continue;
				const obj = entity.object3D;
				if (!obj) continue;
				const behavior = entity.getValue(_Collectible, 'behavior');
				const spin = entity.getValue(_Collectible, 'spinSpeed');
				const phase = entity.getValue(_Collectible, 'bobPhase');
				const baseY = entity.getValue(_Collectible, 'baseY');
				obj.rotation.y += spin * dt;
				if (behavior === 'evade' && pp) {
					const dx = obj.position.x - pp.x, dz = obj.position.z - pp.z;
					const dist = Math.hypot(dx, dz);
					if (dist < 4 && dist > 0.01) {
						const fs = entity.getValue(_Collectible, 'fleeSpeed');
						obj.position.x += (dx / dist) * fs * dt;
						obj.position.z += (dz / dist) * fs * dt;
					} else {
						obj.position.x += (entity.getValue(_Collectible, 'baseX') - obj.position.x) * 0.5 * dt;
						obj.position.z += (entity.getValue(_Collectible, 'baseZ') - obj.position.z) * 0.5 * dt;
					}
					obj.position.y = baseY + Math.sin(time * 3 + phase) * 0.2;
				} else if (behavior === 'attack' && pp) {
					const dx = pp.x - obj.position.x, dz = pp.z - obj.position.z;
					const dist = Math.hypot(dx, dz);
					const cs = entity.getValue(_Collectible, 'chaseSpeed');
					const cd = entity.getValue(_Collectible, 'hitCooldown');
					// Chase the player (normalized direction × speed)
					if (dist > 0.5) { obj.position.x += (dx / dist) * cs * dt; obj.position.z += (dz / dist) * cs * dt; }

					// SEPARATION: repel from other nearby attackers so they
					// don't stack into one blob. Each attacker pushes away from
					// others within 1.5 units. This creates a ring/surround
					// formation instead of all occupying the same point.
					const SEP_RADIUS = 1.5;
					const SEP_STRENGTH = 2.0;
					let sepX = 0, sepZ = 0;
					for (const other of this.queries.items.entities) {
						if (other === entity) continue;
						if (other.getValue(_Collectible, 'collected')) continue;
						if (other.getValue(_Collectible, 'behavior') !== 'attack') continue;
						const oobj = other.object3D;
						if (!oobj) continue;
						const sdx = obj.position.x - oobj.position.x;
						const sdz = obj.position.z - oobj.position.z;
						const sd = Math.hypot(sdx, sdz);
						if (sd > 0.01 && sd < SEP_RADIUS) {
							// Inverse-distance weighting: closer = stronger push
							const force = (1 - sd / SEP_RADIUS) * SEP_STRENGTH;
							sepX += (sdx / sd) * force * dt;
							sepZ += (sdz / sd) * force * dt;
						}
					}
					obj.position.x += sepX;
					obj.position.z += sepZ;

					obj.position.y = baseY + Math.sin(time * 4 + phase) * 0.15;
					if (dist < 1.0 && cd <= 0 && _onPlayerHit) {
						entity.setValue(_Collectible, 'hitCooldown', 2.0);
						_onPlayerHit(entity.getValue(_Collectible, 'points'));
					}
					if (cd > 0) entity.setValue(_Collectible, 'hitCooldown', cd - dt);
				} else {
					obj.position.y = baseY + Math.sin(time * 2 + phase) * 0.15;
				}
			}
		}
	};

	const roomId = options.roomId || 'demo';  // kept for backwards compat, unused by new DO
	const level = options.level || 1;  // difficulty tier → selects the DO room instance
	const playerName = options.playerName || ('Player-' + Math.random().toString(36).slice(2, 6));
	const onScoreUpdate = options.onScoreUpdate || (() => {});
	const onPresenceUpdate = options.onPresenceUpdate || (() => {});
	const onRoundUpdate = options.onRoundUpdate || (() => {});

	// Multiplayer state — N-player (was 1 opponent; now a peers map).
	const myId = crypto.randomUUID();
	let mySessionId = null;          // assigned by the DO in the roster message
	const peers = new Map();         // sessionId → { name, score, x, y, z, yaw, avatarMesh, labelSprite }
	let myScore = 0;
	const entityById = new Map();    // entityId → ECS entity
	// Round state — driven by the DO.
	let roundActive = false;
	let roundEndTime = 0;

	// ── ECS World (creates its own scene, camera, renderer) ──
	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});

	// Use the World's scene + camera + renderer — NOT our own.
	const scene = world.scene;
	const camera = world.camera;
	const renderer = world.renderer;
	world_camera = camera; // for CollectionSystem access

	// Position the camera
	camera.position.set(0, 1.6, 5);

	// ── Skybox: closer + brighter so the image fills the view ──
	const skyboxTexture = new THREE.TextureLoader().load(
		`https://imagedelivery.net/${CF_IMAGES_HASH}/${BG_IMAGE_ID}/full`
	);
	skyboxTexture.colorSpace = THREE.SRGBColorSpace;
	const skybox = new THREE.Mesh(
		new THREE.SphereGeometry(30, 32, 16),
		new THREE.MeshBasicMaterial({ map: skyboxTexture, side: THREE.BackSide, depthWrite: false, fog: false })
	);
	scene.add(skybox);
	scene.fog = new THREE.Fog(0x1a1020, 25, 60);

	// Lighting
	scene.add(new THREE.AmbientLight(0x8888aa, 0.6));
	const keyLight = new THREE.DirectionalLight(0xc9a87c, 0.8);
	keyLight.position.set(5, 10, 5);
	scene.add(keyLight);
	const rimLight = new THREE.DirectionalLight(0x4fc3f7, 0.3);
	rimLight.position.set(-5, 3, -5);
	scene.add(rimLight);

	// ── Textured ground ──
	const groundCanvas = document.createElement('canvas');
	groundCanvas.width = 256;
	groundCanvas.height = 256;
	const gctx = groundCanvas.getContext('2d');
	gctx.fillStyle = '#1a1520';
	gctx.fillRect(0, 0, 256, 256);
	gctx.strokeStyle = '#2a2535';
	gctx.lineWidth = 2;
	for (let i = 0; i <= 256; i += 32) {
		gctx.beginPath(); gctx.moveTo(i, 0); gctx.lineTo(i, 256); gctx.stroke();
		gctx.beginPath(); gctx.moveTo(0, i); gctx.lineTo(256, i); gctx.stroke();
	}
	for (let i = 0; i < 200; i++) {
		const x = Math.random() * 256;
		const y = Math.random() * 256;
		const c = Math.random() * 30 + 20;
		gctx.fillStyle = `rgb(${c + 10},${c + 5},${c + 15})`;
		gctx.fillRect(x, y, 2, 2);
	}
	const groundTexture = new THREE.CanvasTexture(groundCanvas);
	groundTexture.wrapS = THREE.RepeatWrapping;
	groundTexture.wrapT = THREE.RepeatWrapping;
	groundTexture.repeat.set(12, 12);

	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry(50, 50),
		new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 0.9 })
	);
	ground.rotation.x = -Math.PI / 2;
	scene.add(ground);

	// ── Fetch models tagged for this game from the asset library ──
	let gameModels = [];
	try {
		const res = await fetch(`/api/assets/library?game=grab-demo`);
		const data = await res.json();
		if (data.models && data.models.length > 0) {
			gameModels = data.models.map((m) => ({
				url: m.url,
				count: 10,
				label: m.label,
				game_behavior: m.game_behavior || 'passive',
				game_points: m.game_points || 1,
			}));
		}
	} catch (e) {
		console.warn('[grab-demo] fetchGameModels failed, using fallback:', e?.message);
	}
	if (gameModels.length === 0) {
		gameModels = [
			{ url: '/api/assets/models/spirit.glb', count: 10, label: 'Spirit', game_behavior: 'passive', game_points: 1 },
			{ url: '/api/assets/models/hombre-amarillo.glb', count: 10, label: 'Hombre', game_behavior: 'evade', game_points: 3 },
			{ url: '/api/assets/models/antoine/mujer-musa.glb', count: 10, label: 'Mujer Musa', game_behavior: 'attack', game_points: 5 },
		];
	}

	console.log('[grab-demo] loading GLB templates:', gameModels.map(m => m.url));
	// ── Load GLB templates from the fetched model list ──
	// CRITICAL: each loader.load MUST have an error callback. Without it, a
	// single failed GLB (404, decompression error, network) leaves the Promise
	// unresolved forever — Promise.all hangs, the boot never completes, no
	// pointer handlers attach, no console output appears. The whole scene is
	// dead. On error we resolve with a fallback primitive so the game boots.
	const loader = new GLTFLoader();
	loader.setMeshoptDecoder(MeshoptDecoder);
	const templates = await Promise.all(
		gameModels.map((m) =>
			new Promise((resolve) => {
				loader.load(
					m.url,
					(gltf) => {
						gltf.scene.traverse((child) => {
							if (child.isMesh && child.material) {
								child.material.transparent = true;
								child.material.opacity = 0.9;
								child.material.depthWrite = true;
								child.material.side = THREE.DoubleSide;
							}
						});
						resolve(gltf.scene);
					},
					undefined,  // onProgress (unused)
					(err) => {
						console.warn('[grab-demo] GLB load failed, using fallback primitive:', m.url, err?.message || err);
						// Fallback: a simple colored box so the game still spawns
						// something at that model's positions. Better than hanging.
						const fallback = new THREE.Mesh(
							new THREE.BoxGeometry(0.4, 0.6, 0.4),
							new THREE.MeshStandardMaterial({
								color: 0x888888, transparent: true, opacity: 0.9,
								emissive: 0x222222, side: THREE.DoubleSide,
							})
						);
						resolve(fallback);
					}
				);
			})
		)
	);
	console.log('[grab-demo] templates loaded:', templates.length, '— booting scene...');

	// Register components + systems
	world.registerComponent(_Collectible);

	const collectionSys = new CollectionSystem();
	// THREE is only available inside bootGrabDemo (dynamic import), so the
	// raycaster + pointer vector must be created here — the CollectionSystem
	// constructor runs before THREE is loaded. Without this, _tryCollect
	// early-returns on every click (raycaster stays null) and nothing collects.
	collectionSys.raycaster = new THREE.Raycaster();
	collectionSys.pointer = new THREE.Vector2();
	collectionSys.setOnCollect(onCollect);

	// DepartureEffects: behavior-specific collection animations (pop/deflate/
	// scatter/dissolve + sparkle burst). Needs THREE + scene, so init here.
	const departEffects = new DepartureEffects();
	departEffects.init(THREE, scene);
	collectionSys.departEffects = departEffects;

	_onPlayerHit = (points) => {
		myScore = Math.max(0, myScore - 2);
		updateScore();
		if (onCollect) onCollect(myScore);
	};
	world.registerSystem(AnimationSystem, { priority: 0 });

	// WASD look controls (simple — no OrbitControls, just yaw + pitch)
	let yaw = 0;
	let pitch = 0;
	let lookActive = false;
	let lookMoved = false;
	let mouseDownPos = null;

	const onPointerDown = (e) => {
		lookActive = true;
		lookMoved = false;
		mouseDownPos = { x: e.clientX, y: e.clientY };
	};
	const onPointerUp = (e) => {
		if (lookActive && !lookMoved && mouseDownPos) {
			collectionSys._tryCollect(mouseDownPos.x, mouseDownPos.y);
		}
		lookActive = false;
		mouseDownPos = null;
	};
	const onPointerMove = (e) => {
		if (lookActive && e.buttons > 0) {
			if (mouseDownPos && (Math.abs(e.clientX - mouseDownPos.x) > 5 || Math.abs(e.clientY - mouseDownPos.y) > 5)) {
				lookMoved = true;
			}
			if (lookMoved) {
				yaw -= e.movementX * 0.003;
				pitch -= e.movementY * 0.003;
				pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
			}
		}
	};
	renderer.domElement.addEventListener('pointerdown', onPointerDown);
	window.addEventListener('pointerup', onPointerUp);
	window.addEventListener('pointermove', onPointerMove);

	// ── Spawn collectibles from the fetched models ──
	// Behavior + points come from the asset library (game_behavior, game_points).
	// BEHAVIOR_GLOWS is imported from departure-effects.js (shared with Oz).

	let entityIdCounter = 0;
	const totalModels = gameModels.length;

	// Difficulty scaling: each level beyond 1 makes entities faster and adds
	// +1 attacker per level. Applied per-entity below.
	const speedMul = 1 + (level - 1) * 0.1;

	// Spawn one collectible at a deterministic position derived from entityId.
	// The DO uses the same formula so all clients agree on placement without
	// per-entity position sync. Called both for the initial pool and for
	// entity_spawn messages (mid-round respawns).
	function spawnCollectibleAt(entityId, modelIndex) {
		const mi = (modelIndex !== undefined) ? modelIndex : (entityId % Math.max(1, totalModels));
		const template = templates[mi % templates.length];
		const cfg = gameModels[mi % gameModels.length] || { game_behavior: 'passive', game_points: 1 };
		const behavior = cfg.game_behavior || 'passive';
		const points = cfg.game_points || 1;
		const glow = BEHAVIOR_GLOWS[behavior] || 0x88ff88;

		const clone = template.clone(true);
		const box = new THREE.Box3().setFromObject(clone);
		const size = new THREE.Vector3();
		box.getSize(size);
		if (size.y > 0) clone.scale.setScalar(1.2 / size.y);

		// Glow halo — named `halo` not `glow` to avoid the TDZ shadow bug.
		const halo = new THREE.Mesh(
			new THREE.SphereGeometry(0.5, 12, 8),
			new THREE.MeshBasicMaterial({
				color: glow,
				transparent: true,
				opacity: 0.15,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
			})
		);
		clone.add(halo);

		const group = new THREE.Group();
		group.add(clone);

		// Position MUST match the DO's _spawnEntities formula exactly:
		// angle = (entityId/30)*PI*2 + (entityId%3)*0.3, radius = 4 + (entityId%3)*3
		const angle = (entityId / 30) * Math.PI * 2 + (entityId % 3) * 0.3;
		const radius = 4 + (entityId % 3) * 3;
		const x = Math.cos(angle) * radius;
		const z = Math.sin(angle) * radius;
		group.position.set(x, 0.6, z);
		group.rotation.y = entityId * 0.4;

		const entity = world.createTransformEntity(group);
		entity.addComponent(_Collectible, {
			entityId,
			collected: false,
			collectTime: 0,
			spinSpeed: (0.3 + (entityId % 5) * 0.1) * speedMul,
			bobPhase: entityId * 0.7,
			baseY: 0.6,
			modelIndex: mi,
			behavior,
			points,
			baseX: x,
			baseZ: z,
			fleeSpeed: (2.0 + (entityId % 3) * 0.3) * speedMul,
			chaseSpeed: (1.2 + (entityId % 2) * 0.4) * speedMul,
			hitCooldown: 0,
		});

		entityById.set(entityId, entity);
		collectionSys.registerCollectible(entity);
		return entity;
	}

	// Initial pool: spawn one round of each model. The total count is driven
	// by gameModels (each cfg.count). The DO will send entity_spawn messages
	// if the pool needs to grow (more players) or respawn mid-round.
	for (let mi = 0; mi < templates.length; mi++) {
		const cfg = gameModels[mi] || { count: 10 };
		for (let i = 0; i < (cfg.count || 10); i++) {
			spawnCollectibleAt(entityIdCounter++, mi);
		}
	}

	// ── Multiplayer: WebSocket connection ──
	// (Peer avatars are created lazily in ensurePeer() on first roster/join,
	//  rather than a single hardcoded opponentAvatar — supports N players.)
	function connectWS() {
		const params = new URLSearchParams({
			user: myId,
			name: playerName,
			level: String(level),
		});
		const ws = new WebSocket(`${WS_URL}?${params.toString()}`);

		ws.onopen = () => {
			console.log('[grab-demo] WS connected to level', level);
		};

		ws.onmessage = (event) => {
			try {
				const msg = JSON.parse(event.data);
				handleWSMessage(msg);
			} catch (e) { /* ignore malformed */ }
		};

		ws.onclose = () => {
			console.log('[grab-demo] WS disconnected, reconnecting in 2s...');
			setTimeout(connectWS, 2000);
		};

		ws.onerror = () => { ws.close(); };
		_ws = ws;
	}

	function handleWSMessage(msg) {
		// GrabDemoRoom protocol — N-player presence + shared game state.
		switch (msg.type) {
			case 'roster': {
				// Initial snapshot from the DO on connect.
				mySessionId = msg.sessionId;
				roundActive = !!msg.roundActive;
				roundEndTime = msg.roundEnd || 0;
				// Register existing peers + spawn their avatars.
				for (const p of (msg.peers || [])) {
					ensurePeer(p.sessionId, p.name, p.x, p.y, p.z);
					const peer = peers.get(p.sessionId);
					if (peer) peer.score = p.score || 0;
				}
				// Entities the DO has spawned (non-collected). Our local spawn
				// loop may already have placed some — sync collected state.
				for (const ent of (msg.entities || [])) {
					const localEntity = entityById.get(ent.entityId);
					if (localEntity) localEntity.setValue(_Collectible, 'collected', !!ent.collected);
				}
				broadcastPresence();
				onRoundUpdate({ active: roundActive, endMs: roundEndTime, level });
				updateScore();
				break;
			}
			case 'peer_joined': {
				ensurePeer(msg.sessionId, msg.name, msg.x, msg.y, msg.z);
				broadcastPresence();
				break;
			}
			case 'peer_left': {
				removePeer(msg.sessionId);
				broadcastPresence();
				break;
			}
			case 'peer_pose': {
				const peer = peers.get(msg.sessionId);
				if (peer && peer.avatarMesh) {
					peer.avatarMesh.position.set(msg.x, msg.y, msg.z);
					peer.labelSprite.position.set(msg.x, msg.y + 0.8, msg.z);
					peer.avatarMesh.rotation.y = msg.yaw || 0;
				}
				break;
			}
			case 'peer_collect': {
				// Another player collected an entity — hide it locally.
				const entity = entityById.get(msg.entityId);
				if (entity && !entity.getValue(_Collectible, 'collected')) {
					entity.setValue(_Collectible, 'collected', true);
					entity.setValue(_Collectible, 'collectTime', performance.now());
					entity.setValue(_Collectible, 'collectBy', msg.sessionId);
				}
				const peer = peers.get(msg.sessionId);
				if (peer) peer.score = msg.score || peer.score;
				updateScore();
				break;
			}
			case 'peer_score': {
				const peer = peers.get(msg.sessionId);
				if (peer) peer.score = msg.score;
				updateScore();
				break;
			}
			case 'entity_spawn': {
				// Mid-round respawn from the DO. Spawn a new local collectible
				// at the DO-assigned position so all clients agree on placement.
				spawnCollectibleAt(msg.entityId, msg.x, msg.z, msg.modelIndex);
				break;
			}
			case 'round_start': {
				roundActive = true;
				roundEndTime = msg.roundEnd;
				// Re-sync entity collected flags (fresh round = all uncollected).
				for (const ent of (msg.entities || [])) {
					const localEntity = entityById.get(ent.entityId);
					if (localEntity) localEntity.setValue(_Collectible, 'collected', !!ent.collected);
				}
				onRoundUpdate({ active: true, endMs: roundEndTime, level });
				break;
			}
			case 'round_end': {
				roundActive = false;
				// Show the round-end overlay if there was a winner; skip if solo.
				if (msg.winner === null) {
					onRoundUpdate({ active: false, endMs: 0, level });
				} else {
					onRoundUpdate({
						active: false,
						endMs: 0,
						level,
						winner: msg.winnerName,
						winnerIsMe: msg.winner === mySessionId,
						scores: msg.scores || [],
					});
				}
				break;
			}
			// 'promote' is intentionally NOT handled for now — the single-room
			// model doesn't redirect players. The pool-hall model will replace
			// this when implemented (per-player difficulty, not room changes).
		}
	}

	// ── N-player peer avatar management ──
	function ensurePeer(sessionId, name, x = 0, y = 1.5, z = 3) {
		if (peers.has(sessionId)) return peers.get(sessionId);
		// Lazy-create avatar mesh + label on first sight.
		const avatarMesh = new THREE.Mesh(
			new THREE.SphereGeometry(0.3, 16, 12),
			new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.7 })
		);
		avatarMesh.position.set(x, y, z);
		scene.add(avatarMesh);
		const labelSprite = createTextSprite(THREE, name || 'Player', '#4fc3f7');
		labelSprite.position.set(x, y + 0.8, z);
		scene.add(labelSprite);
		const peer = { name: name || 'Player', score: 0, x, y, z, yaw: 0, avatarMesh, labelSprite };
		peers.set(sessionId, peer);
		return peer;
	}

	function removePeer(sessionId) {
		const peer = peers.get(sessionId);
		if (!peer) return;
		if (peer.avatarMesh) { scene.remove(peer.avatarMesh); peer.avatarMesh.geometry?.dispose(); peer.avatarMesh.material?.dispose(); }
		if (peer.labelSprite) { scene.remove(peer.labelSprite); peer.labelSprite.material?.dispose(); }
		peers.delete(sessionId);
	}

	function broadcastPresence() {
		// Emit a DOM event so the Svelte HUD can render the roster.
		const roster = [...peers.values()].map((p) => ({ name: p.name, score: p.score }));
		const count = peers.size + 1;  // include self
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('grab-demo-presence', {
				detail: { type: 'roster', count, roster, myName: playerName, myScore },
			}));
		}
		onPresenceUpdate({ count, roster });
	}

	function updateScore() {
		// Aggregate all peer scores for the HUD.
		const allScores = [{ name: playerName, score: myScore, isMe: true }];
		for (const p of peers.values()) allScores.push({ name: p.name, score: p.score });
		allScores.sort((a, b) => b.score - a.score);
		onScoreUpdate({ scores: allScores, level });
		broadcastPresence();
	}

	// Wire collection broadcast — adds the entity's point value.
	// The DO stamps the sender (it knows our sessionId), so we don't send
	// playerId — just the entityId + our cumulative score.
	collectionSys._onCollectRemote = (entityId) => {
		const entity = entityById.get(entityId);
		const pts = entity ? entity.getValue(_Collectible, 'points') : 1;
		myScore += pts;
		updateScore();
		if (_ws?.readyState === WebSocket.OPEN) {
			_ws.send(JSON.stringify({
				type: 'collect',
				entityId,
				score: myScore,
			}));
		}
	};

	let _ws = null;
	let lastPoseSent = 0;
	connectWS();

	// ── WASD + touch thumbstick movement ──
	const keys = {};
	const onKeyDown = (e) => { keys[e.code] = true; };
	const onKeyUp = (e) => { keys[e.code] = false; };
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);

	// Touch thumbstick (left half of screen) + drag look (right half)
	// touchInput is exposed via the returned `touch` handle so the Svelte
	// page's visible thumbstick overlay can drive movement directly. The
	// look-zone overlay calls applyTouchLook(dx, dy) each move tick.
	const touchInput = { x: 0, y: 0 }; // -1..1 for movement
	let touchLookId = null;
	let thumbstickId = null;
	let thumbstickStart = null;

	// Called by the Svelte look-zone overlay on touch drag (deltas in pixels).
	function applyTouchLook(dxPx, dyPx) {
		yaw -= dxPx * 0.005;
		pitch -= dyPx * 0.005;
		pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
	}

	const isTouch = 'ontouchstart' in window;
	if (isTouch) {
		renderer.domElement.addEventListener('touchstart', (e) => {
			for (const t of e.changedTouches) {
				if (t.clientX < window.innerWidth / 2 && thumbstickId === null) {
					// Left half = thumbstick
					thumbstickId = t.identifier;
					thumbstickStart = { x: t.clientX, y: t.clientY };
				} else if (touchLookId === null) {
					// Right half = look
					touchLookId = t.identifier;
				}
			}
		}, { passive: true });

		renderer.domElement.addEventListener('touchmove', (e) => {
			for (const t of e.changedTouches) {
				if (t.identifier === thumbstickId && thumbstickStart) {
					// Thumbstick movement
					const dx = t.clientX - thumbstickStart.x;
					const dy = t.clientY - thumbstickStart.y;
					touchInput.x = Math.max(-1, Math.min(1, dx / 60));
					touchInput.y = Math.max(-1, Math.min(1, dy / 60));
				} else if (t.identifier === touchLookId) {
					// Look (yaw + pitch)
					yaw -= t.clientX * 0.001; // approximate
				}
			}
		}, { passive: true });

		renderer.domElement.addEventListener('touchend', (e) => {
			for (const t of e.changedTouches) {
				if (t.identifier === thumbstickId) {
					thumbstickId = null;
					thumbstickStart = null;
					touchInput.x = 0;
					touchInput.y = 0;
				} else if (t.identifier === touchLookId) {
					touchLookId = null;
				}
			}
		}, { passive: true });
	}

	// ── Animation loop: movement + look + collection + WS ──
	// World handles ECS system execution + rendering internally.
	let animationId;
	const moveDir = new THREE.Vector3();

	function animate() {
		animationId = requestAnimationFrame(animate);
		const dt = 0.016;

		// Apply look
		camera.rotation.order = 'YXZ';
		camera.rotation.y = yaw;
		camera.rotation.x = pitch;

		// Movement: keyboard OR touch thumbstick
		moveDir.set(0, 0, 0);
		if (keys['KeyW'] || keys['ArrowUp']) moveDir.z -= 1;
		if (keys['KeyS'] || keys['ArrowDown']) moveDir.z += 1;
		if (keys['KeyA'] || keys['ArrowLeft']) moveDir.x -= 1;
		if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1;
		// Touch thumbstick overrides if active
		if (touchInput.x !== 0 || touchInput.y !== 0) {
			moveDir.x = touchInput.x;
			moveDir.z = touchInput.y;
		}
		if (moveDir.lengthSq() > 0) {
			moveDir.normalize().applyEuler(new THREE.Euler(0, yaw, 0));
			camera.position.x += moveDir.x * 3 * dt;
			camera.position.z += moveDir.z * 3 * dt;
			camera.position.y = 1.6;
		}

		// Collection + behavior-specific departure effects
		collectionSys.update(dt);
		departEffects.update(dt);

		// Broadcast pose to the DO (throttled) — it relays as peer_pose.
		// The DO stamps the sender sessionId, so we just send position + yaw.
		const now = performance.now();
		if (_ws?.readyState === WebSocket.OPEN && now - lastPoseSent > 100) {
			lastPoseSent = now;
			_ws.send(JSON.stringify({
				type: 'pose',
				x: camera.position.x, y: camera.position.y, z: camera.position.z,
				yaw: yaw,
			}));
		}
	}
	animate();
	console.log('[grab-demo] boot complete —', entityById.size, 'collectibles, pointer handlers attached');

	// Return cleanup + touch handle
	return {
		// Exposed for the Svelte page's visible thumbstick/look overlays.
		// Movement: write x/y in -1..1. Look: call applyTouchLook(dxPx, dyPx)
		// per drag tick. Tap-to-collect: call tryCollectAt(clientX, clientY).
		touch: {
			input: touchInput,
			applyLook: applyTouchLook,
			tryCollectAt: (x, y) => collectionSys._tryCollect(x, y),
		},
		destroy() {
			cancelAnimationFrame(animationId);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			if (collectionSys._cleanupInput) collectionSys._cleanupInput();
			if (_ws) { _ws.close(); _ws = null; }
			renderer.domElement.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointermove', onPointerMove);
			// The World owns the renderer — don't dispose it here.
			// Calling world.destroy() if needed in the future.
		},
	};
}
