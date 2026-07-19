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
const WS_URL = 'wss://booty-chat-worker.chef-tech.workers.dev/portal-ws/ws';

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
				const elapsed = (performance.now() - entity.getValue(_Collectible, 'collectTime')) / 400;
				const obj = entity.object3D;
				if (!obj) {
					// Already destroyed — drop from our tracking list.
					this.collectibles.splice(i, 1);
					continue;
				}
				if (elapsed >= 1) {
					// Animation done — destroy the entity properly so its
					// Transform is removed and TransformSystem stops tracking
					// it. Merely detaching the Object3D (obj.parent.remove)
					// left a dangling Transform, which caused the per-frame
					// "no valid parent entity" warning in TransformSystem.
					try { entity.destroy(); } catch (e) { /* already gone */ }
					this.collectibles.splice(i, 1);
				} else {
					obj.scale.setScalar(Math.max(0, 1 - elapsed));
					obj.position.y += 0.03;
					obj.rotation.y += 0.3;
				}
			}
		}
	}
}

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

	// Dynamic imports — avoid bundler TDZ issues
	const THREE = await import('three');
	const { World } = await import('@iwsdk/core');
	const { createComponent, createSystem, Types, ComponentRegistry } = await import('elics');
	const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
	const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');

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
					if (dist > 0.5) { obj.position.x += (dx / dist) * cs * dt; obj.position.z += (dz / dist) * cs * dt; }
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

	const roomId = options.roomId || 'demo';
	const playerName = options.playerName || ('Player-' + Math.random().toString(36).slice(2, 6));
	const onScoreUpdate = options.onScoreUpdate || (() => {});

	// Multiplayer state
	const myId = crypto.randomUUID();
	let opponentId = null;
	let opponentName = 'Waiting...';
	let myScore = 0;
	let opponentScore = 0;
	const entityById = new Map(); // entityId → ECS entity

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

	// ── Load GLB templates from the fetched model list ──
	const loader = new GLTFLoader();
	// Wire meshopt decoder so compressed GLBs (EXT_meshopt_compression) load.
	// Additive: uncompressed GLBs load identically.
	loader.setMeshoptDecoder(MeshoptDecoder);
	const templates = await Promise.all(
		gameModels.map((m) =>
			new Promise((resolve) => {
				loader.load(m.url, (gltf) => {
					gltf.scene.traverse((child) => {
						if (child.isMesh && child.material) {
							child.material.transparent = true;
							child.material.opacity = 0.9;
							child.material.depthWrite = true;
							child.material.side = THREE.DoubleSide;
						}
					});
					resolve(gltf.scene);
				});
			})
		)
	);

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
	// Behavior + points come from the asset library (game_behavior, game_points)
	const BEHAVIOR_GLOWS = {
		passive: 0x88ff88,
		evade:   0xffcc44,
		attack:  0xff4444,
		hide:    0x88ccff,
		follow:  0xcc88ff,
	};

	let entityIdCounter = 0;
	const totalModels = gameModels.length;
	for (let mi = 0; mi < templates.length; mi++) {
		const template = templates[mi];
		const cfg = gameModels[mi];
		const behavior = cfg.game_behavior || 'passive';
		const points = cfg.game_points || 1;
		const glow = BEHAVIOR_GLOWS[behavior] || 0x88ff88;
		for (let i = 0; i < cfg.count; i++) {
			const clone = template.clone(true);

			// Normalize scale
			const box = new THREE.Box3().setFromObject(clone);
			const size = new THREE.Vector3();
			box.getSize(size);
			if (size.y > 0) clone.scale.setScalar(1.2 / size.y);

			// Add a glow halo based on behavior type.
			// NOTE: named `halo` (not `glow`) to avoid shadowing the outer
			// `glow` color const — shadowing caused a TDZ because the inner
			// `const glow` Mesh was hoisted above the `color: glow` read in
			// its own initializer ("Cannot access 'z' before initialization").
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

			// Wrap in a group for positioning
			const group = new THREE.Group();
			group.add(clone);

			// Deterministic position based on entityId (both clients agree)
			const eid = entityIdCounter++;
			const angle = (eid / 30) * Math.PI * 2 + (mi * 0.3);
			const radius = 4 + (eid % 3) * 3;
			const x = Math.cos(angle) * radius;
			const z = Math.sin(angle) * radius;
			group.position.set(x, 0.6, z);
			group.rotation.y = eid * 0.4;

			// Create ECS entity linked to this mesh. createTransformEntity
			// auto-parents the group under the active level root — we must NOT
			// also scene.add(group), which would double-parent and conflict
			// with TransformSystem (the "no valid parent entity" warning).
			const entity = world.createTransformEntity(group);
			entity.addComponent(_Collectible, {
				entityId: eid,
				collected: false,
				collectTime: 0,
				spinSpeed: 0.3 + (eid % 5) * 0.1,
				bobPhase: eid * 0.7,
				baseY: 0.6,
				modelIndex: mi,
				behavior: behavior,
				points: points,
				baseX: x,
				baseZ: z,
				fleeSpeed: 2.0 + (eid % 3) * 0.3,
				chaseSpeed: 1.2 + (eid % 2) * 0.4,
				hitCooldown: 0,
			});

			entityById.set(eid, entity);
			collectionSys.registerCollectible(entity);
		}
	}

	// ── Opponent avatar (colored sphere that follows their position) ──
	const opponentAvatar = new THREE.Mesh(
		new THREE.SphereGeometry(0.3, 16, 12),
		new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.7 })
	);
	opponentAvatar.visible = false;
	scene.add(opponentAvatar);
	const opponentLabel = createTextSprite(THREE, 'Waiting...', '#4fc3f7');
	opponentLabel.visible = false;
	scene.add(opponentLabel);

	// ── Multiplayer: WebSocket connection ──
	function connectWS() {
		const params = new URLSearchParams({
			user: myId,
			name: playerName,
			room: roomId,
		});
		const ws = new WebSocket(`${WS_URL}?${params.toString()}`);

		ws.onopen = () => {
			console.log('[grab-demo] WS connected to room', roomId);
			// Announce presence
			ws.send(JSON.stringify({ type: 'join', playerId: myId, name: playerName, room: roomId }));
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
		// The PortalRoom broadcasts poses + custom messages. We handle:
		// - join/leave: track opponent
		// - collect: remote entity collected
		// - pose: move opponent avatar
		if (msg.type === 'join' && msg.playerId !== myId) {
			opponentId = msg.playerId;
			opponentName = msg.name || 'Opponent';
			opponentAvatar.visible = true;
			opponentLabel.visible = true;
			updateOpponentLabel();
			// Send our presence back (the room may not relay to existing members)
			if (_ws?.readyState === WebSocket.OPEN) {
				_ws.send(JSON.stringify({ type: 'join', playerId: myId, name: playerName }));
			}
			// Sync current state: send our score
			if (_ws?.readyState === WebSocket.OPEN) {
				_ws.send(JSON.stringify({ type: 'score', playerId: myId, score: myScore }));
			}
		} else if (msg.type === 'pose' && msg.playerId === opponentId) {
			// Move opponent avatar
			opponentAvatar.position.set(msg.x, msg.y, msg.z);
			opponentLabel.position.set(msg.x, msg.y + 0.8, msg.z);
		} else if (msg.type === 'collect' && msg.playerId !== myId) {
			// Opponent collected an entity — mark it locally
			const entity = entityById.get(msg.entityId);
			if (entity && !entity.getValue(_Collectible, 'collected')) {
				entity.setValue(_Collectible, 'collected', true);
				entity.setValue(_Collectible, 'collectTime', performance.now());
				entity.setValue(_Collectible, 'collectBy', 'opponent');
			}
			opponentScore = msg.score || (opponentScore + 1);
			updateScore();
		} else if (msg.type === 'score' && msg.playerId !== myId) {
			opponentScore = msg.score || 0;
			updateScore();
		} else if (msg.type === 'leave' && msg.playerId === opponentId) {
			opponentAvatar.visible = false;
			opponentLabel.visible = false;
			opponentId = null;
			opponentName = 'Waiting...';
			updateOpponentLabel();
		}
	}

	function updateScore() {
		onScoreUpdate({ you: myScore, opponent: opponentScore, opponentName });
	}

	function updateOpponentLabel() {
		// Recreate the label sprite with new text
		const pos = opponentLabel.position.clone();
		scene.remove(opponentLabel);
		opponentLabel.material.dispose();
		opponentLabel = createTextSprite(THREE, opponentName, '#4fc3f7');
		opponentLabel.visible = !!opponentId;
		opponentLabel.position.copy(pos);
		scene.add(opponentLabel);
	}

	// Wire collection broadcast — adds the entity's point value
	collectionSys._onCollectRemote = (entityId) => {
		const entity = entityById.get(entityId);
		const pts = entity ? entity.getValue(_Collectible, 'points') : 1;
		myScore += pts;
		updateScore();
		if (_ws?.readyState === WebSocket.OPEN) {
			_ws.send(JSON.stringify({
				type: 'collect',
				playerId: myId,
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
	const touchInput = { x: 0, y: 0 }; // -1..1 for movement
	let touchLookId = null;
	let thumbstickId = null;
	let thumbstickStart = null;

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

		// Collection animations
		collectionSys.update(dt);

		// Broadcast pose to opponent (throttled)
		const now = performance.now();
		if (_ws?.readyState === WebSocket.OPEN && now - lastPoseSent > 100) {
			lastPoseSent = now;
			_ws.send(JSON.stringify({
				type: 'pose', playerId: myId, name: playerName,
				x: camera.position.x, y: camera.position.y, z: camera.position.z,
			}));
		}
	}
	animate();

	// Return cleanup
	return {
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
