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
import * as THREE from 'three';
import { World } from '@iwsdk/core';
import { createComponent, createSystem, Types, ComponentRegistry } from 'elics';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const CF_IMAGES_HASH = '4bRSwPonOXfEIBVZiDXg0w';
const BG_IMAGE_ID = 'e9fd4477-84f5-4a57-ac67-aba89d28b000';
const WS_URL = 'wss://booty-chat-worker.chef-tech.workers.dev/portal-ws/ws';

const MODELS = [
	{ url: '/api/assets/models/spirit.glb', count: 10, label: 'Spirit' },
	{ url: '/api/assets/models/hombre-amarillo.glb', count: 10, label: 'Hombre Amarillo' },
	{ url: '/api/assets/models/antoine/mujer-musa.glb', count: 10, label: 'Mujer Musa' },
];

// ── ECS Components ──
function reuseOrCreate(id, schema) {
	return ComponentRegistry.has(id) ? ComponentRegistry.getById(id) : createComponent(id, schema);
}

const Collectible = reuseOrCreate('Collectible', {
	entityId:    { type: Types.Int32, default: 0 },
	collected:   { type: Types.Boolean, default: false },
	collectTime: { type: Types.Float32, default: 0 },
	collectBy:   { type: Types.String, default: '' },
	spinSpeed:   { type: Types.Float32, default: 0.5 },
	bobPhase:    { type: Types.Float32, default: 0 },
	baseY:       { type: Types.Float32, default: 0.6 },
	modelIndex:  { type: Types.Int32, default: 0 },
	// Game behavior fields
	points:      { type: Types.Int32, default: 1 },
	behavior:    { type: Types.String, default: 'passive' }, // passive|evade|attack|hide|follow
	baseX:       { type: Types.Float32, default: 0 },  // home position for evade return
	baseZ:       { type: Types.Float32, default: 0 },
	fleeSpeed:   { type: Types.Float32, default: 2.0 },
	chaseSpeed:  { type: Types.Float32, default: 1.5 },
	hitCooldown: { type: Types.Float32, default: 0 },  // attack contact cooldown
});

// ── ECS Systems ──

// Module-level callback for attack hits (set by boot function)
let _onPlayerHit = null;

// Animation: spin + bob + behavior-driven movement (priority 0)
// Handles passive (idle), evade (flee player), attack (chase player),
// and visual glow by behavior type.
const AnimationSystem = class extends createSystem({
	items: { required: [Collectible] },
}) {
	update(dt) {
		const time = performance.now() / 1000;
		const camera = this.world?.camera;
		const playerPos = camera ? camera.position : null;

		for (const entity of this.queries.items.entities) {
			if (entity.getValue(Collectible, 'collected')) continue;
			const obj = entity.object3D;
			if (!obj) continue;

			const behavior = entity.getValue(Collectible, 'behavior');
			const spin = entity.getValue(Collectible, 'spinSpeed');
			const phase = entity.getValue(Collectible, 'bobPhase');
			const baseY = entity.getValue(Collectible, 'baseY');

			obj.rotation.y += spin * dt;

			if (behavior === 'evade' && playerPos) {
				// Flee from the player when within flee radius
				const dx = obj.position.x - playerPos.x;
				const dz = obj.position.z - playerPos.z;
				const dist = Math.hypot(dx, dz);
				const fleeRadius = 4;
				const fleeSpeed = entity.getValue(Collectible, 'fleeSpeed');
				const baseX = entity.getValue(Collectible, 'baseX');
				const baseZ = entity.getValue(Collectible, 'baseZ');

				if (dist < fleeRadius && dist > 0.01) {
					// Push away from player
					obj.position.x += (dx / dist) * fleeSpeed * dt;
					obj.position.z += (dz / dist) * fleeSpeed * dt;
				} else {
					// Drift back toward home position
					obj.position.x += (baseX - obj.position.x) * 0.5 * dt;
					obj.position.z += (baseZ - obj.position.z) * 0.5 * dt;
				}
				obj.position.y = baseY + Math.sin(time * 3 + phase) * 0.2;

			} else if (behavior === 'attack' && playerPos) {
				// Chase the player
				const dx = playerPos.x - obj.position.x;
				const dz = playerPos.z - obj.position.z;
				const dist = Math.hypot(dx, dz);
				const chaseSpeed = entity.getValue(Collectible, 'chaseSpeed');
				const cooldown = entity.getValue(Collectible, 'hitCooldown');

				if (dist > 0.5) {
					obj.position.x += (dx / dist) * chaseSpeed * dt;
					obj.position.z += (dz / dist) * chaseSpeed * dt;
				}
				obj.position.y = baseY + Math.sin(time * 4 + phase) * 0.15;

				// Hit detection: if close to player and cooldown expired
				if (dist < 1.0 && cooldown <= 0 && _onPlayerHit) {
					entity.setValue(Collectible, 'hitCooldown', 2.0);
					_onPlayerHit(entity.getValue(Collectible, 'points'));
				}
				// Tick down cooldown
				if (cooldown > 0) {
					entity.setValue(Collectible, 'hitCooldown', cooldown - dt);
				}

			} else {
				// Passive: gentle spin + bob
				obj.position.y = baseY + Math.sin(time * 2 + phase) * 0.15;
			}
		}
	}
};

// Collection: raycast on click/tap, mark entities collected.
// NOT an ECS system — this is a plain class that we call manually from
// the animation loop. Only systems registered with world.registerSystem()
// should extend createSystem.
class CollectionSystem {
	init() {
		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();
		this.collectedCount = 0;
		this._onCollect = null;
	}

	setupRaycast(camera, domElement) {
		this.camera = camera;
		this.domElement = domElement;
		this.collectibles = [];

		let lookActive = false;
		let mouseDownPos = null;

		const onPointerDown = (e) => {
			lookActive = true;
			mouseDownPos = { x: e.clientX, y: e.clientY, moved: false };
		};

		const onPointerUp = (e) => {
			if (lookActive && mouseDownPos && !mouseDownPos.moved) {
				this._tryCollect(mouseDownPos.x, mouseDownPos.y);
			}
			lookActive = false;
		};

		const onPointerMove = (e) => {
			if (lookActive && mouseDownPos) {
				if (Math.abs(e.clientX - mouseDownPos.x) > 5 ||
					Math.abs(e.clientY - mouseDownPos.y) > 5) {
					mouseDownPos.moved = true;
				}
			}
		};

		domElement.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('pointermove', onPointerMove);

		// Touch support
		let touchStart = null;
		const onTouchStart = (e) => {
			const t = e.touches[0];
			touchStart = { x: t.clientX, y: t.clientY };
		};
		const onTouchEnd = (e) => {
			if (touchStart) {
				this._tryCollect(touchStart.x, touchStart.y);
			}
			touchStart = null;
		};
		domElement.addEventListener('touchstart', onTouchStart);
		domElement.addEventListener('touchend', onTouchEnd);

		this._cleanupInput = () => {
			domElement.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointermove', onPointerMove);
			domElement.removeEventListener('touchstart', onTouchStart);
			domElement.removeEventListener('touchend', onTouchEnd);
		};
	}

	registerCollectible(entity) {
		this.collectibles = this.collectibles || [];
		this.collectibles.push(entity);
	}

	setOnCollect(cb) {
		this._onCollect = cb;
	}

	_tryCollect(clientX, clientY) {
		if (!this.camera || !this.collectibles) return;
		this.pointer.x = (clientX / window.innerWidth) * 2 - 1;
		this.pointer.y = -(clientY / window.innerHeight) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, this.camera);

		// Get meshes from active (non-collected) collectibles
		const meshes = this.collectibles
			.filter((e) => !e.getValue(Collectible, 'collected'))
			.map((e) => e.object3D)
			.filter(Boolean);

		const hits = this.raycaster.intersectObjects(meshes, true);
		if (hits.length > 0) {
			// Walk up to find the entity
			let obj = hits[0].object;
			while (obj && !this.collectibles.some((e) => e.object3D === obj)) {
				obj = obj.parent;
			}
			if (obj) {
				const entity = this.collectibles.find((e) => e.object3D === obj);
			if (entity && !entity.getValue(Collectible, 'collected')) {
				entity.setValue(Collectible, 'collected', true);
				entity.setValue(Collectible, 'collectTime', performance.now());
				entity.setValue(Collectible, 'collectBy', 'you');
				this.collectedCount++;
				if (this._onCollect) this._onCollect(this.collectedCount);
				// Broadcast to opponent
				if (this._onCollectRemote) {
					this._onCollectRemote(entity.getValue(Collectible, 'entityId'));
				}
			}
			}
		}
	}

	update(dt) {
		// Handle collected entity animation (shrink + fade)
		for (const entity of this.collectibles || []) {
			if (entity.getValue(Collectible, 'collected')) {
				const elapsed = (performance.now() - entity.getValue(Collectible, 'collectTime')) / 400;
				const obj = entity.object3D;
				if (!obj) continue;
				if (elapsed >= 1) {
					// Remove from scene
					if (obj.parent) obj.parent.remove(obj);
				} else {
					obj.scale.setScalar(Math.max(0, 1 - elapsed));
					obj.position.y += 0.03;
					obj.rotation.y += 0.3;
				}
			}
		}
	}
};

// ── Helper: create a text label as a THREE.Sprite ──
function createTextSprite(text, color = '#ffffff') {
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

	// ── Three.js scene (setup only — ECS owns the logic) ──
	const scene = new THREE.Scene();

	// ── Skybox: the background image wraps ALL AROUND the player as a
	// large sphere. The camera is inside the sphere, so wherever you look
	// you see the image — not black void. This is what makes the space feel
	// enclosed and defined, like stepping inside the artwork. ──
	const skyboxTexture = new THREE.TextureLoader().load(
		`https://imagedelivery.net/${CF_IMAGES_HASH}/${BG_IMAGE_ID}/full`
	);
	skyboxTexture.colorSpace = THREE.SRGBColorSpace;
	const skybox = new THREE.Mesh(
		new THREE.SphereGeometry(45, 32, 16),
		new THREE.MeshBasicMaterial({
			map: skyboxTexture,
			side: THREE.BackSide,  // render the inside of the sphere
			depthWrite: false,
		})
	);
	scene.add(skybox);

	// Fog for depth (fades distant objects into the skybox)
	scene.fog = new THREE.Fog(0x1a1020, 15, 40);

	// Camera
	const camera = new THREE.PerspectiveCamera(
		70, container.clientWidth / container.clientHeight, 0.1, 100
	);
	camera.position.set(0, 1.6, 5);

	// Renderer
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(container.clientWidth, container.clientHeight);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	container.appendChild(renderer.domElement);

	// Lighting
	scene.add(new THREE.AmbientLight(0x8888aa, 0.6));
	const keyLight = new THREE.DirectionalLight(0xc9a87c, 0.8);
	keyLight.position.set(5, 10, 5);
	scene.add(keyLight);
	const rimLight = new THREE.DirectionalLight(0x4fc3f7, 0.3);
	rimLight.position.set(-5, 3, -5);
	scene.add(rimLight);

	// ── Ground: textured plane so the floor reads as terrain, not void.
	// Uses a canvas-generated grid texture so it has visible structure. ──
	const groundCanvas = document.createElement('canvas');
	groundCanvas.width = 256;
	groundCanvas.height = 256;
	const gctx = groundCanvas.getContext('2d');
	// Base color
	gctx.fillStyle = '#1a1520';
	gctx.fillRect(0, 0, 256, 256);
	// Grid pattern
	gctx.strokeStyle = '#2a2535';
	gctx.lineWidth = 2;
	for (let i = 0; i <= 256; i += 32) {
		gctx.beginPath(); gctx.moveTo(i, 0); gctx.lineTo(i, 256); gctx.stroke();
		gctx.beginPath(); gctx.moveTo(0, i); gctx.lineTo(256, i); gctx.stroke();
	}
	// Subtle noise dots for texture
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

	// Grid
	const grid = new THREE.GridHelper(50, 25, 0x333355, 0x222233);
	scene.add(grid);

	// Orbit controls (desktop look)
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.target.set(0, 1, 0);

	// ── Load all 3 GLB templates ──
	const loader = new GLTFLoader();
	const templates = await Promise.all(
		MODELS.map((m) =>
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

	// ── ECS World ──
	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});

	// Register components
	world.registerComponent(Collectible);

	// Create the collection system and wire it up
	const collectionSys = new CollectionSystem();
	collectionSys.setupRaycast(camera, renderer.domElement);
	collectionSys.setOnCollect(onCollect);

	// Register systems (priority 0 = before TransformSystem at priority 1)
	// Set the attack-hit callback BEFORE the animation loop starts
	_onPlayerHit = (points) => {
		// Attacker hit the player — subtract 2 points (minimum 0)
		myScore = Math.max(0, myScore - 2);
		updateScore();
		if (onCollect) onCollect(myScore);
	};
	world.registerSystem(AnimationSystem, { priority: 0 });
	// CollectionSystem runs as a manual update (not an ECS query-based system
	// since it needs DOM event handling). We'll call its update in the loop.
	// But we register it so the AnimationSystem queries include Collectible.

	// ── Spawn 30 collectible entities with deterministic IDs (0-29) ──
	// Each model type gets a different behavior:
	//   Spirit (mi=0):     passive, 1 point — easy, stays still
	//   Hombre (mi=1):     evade, 3 points — runs away when you approach
	//   Mujer Musa (mi=2): attack, 5 points — chases you, -2 if it touches you
	const BEHAVIORS = [
		{ behavior: 'passive', points: 1, glow: 0x88ff88 },  // green
		{ behavior: 'evade',   points: 3, glow: 0xffcc44 },  // yellow
		{ behavior: 'attack',  points: 5, glow: 0xff4444 },  // red
	];

	let entityIdCounter = 0;
	for (let mi = 0; mi < templates.length; mi++) {
		const template = templates[mi];
		const cfg = BEHAVIORS[mi] || BEHAVIORS[0];
		for (let i = 0; i < MODELS[mi].count; i++) {
			const clone = template.clone(true);

			// Normalize scale
			const box = new THREE.Box3().setFromObject(clone);
			const size = new THREE.Vector3();
			box.getSize(size);
			if (size.y > 0) clone.scale.setScalar(1.2 / size.y);

			// Add a glow halo based on behavior type
			const glow = new THREE.Mesh(
				new THREE.SphereGeometry(0.5, 12, 8),
				new THREE.MeshBasicMaterial({
					color: cfg.glow,
					transparent: true,
					opacity: 0.15,
					blending: THREE.AdditiveBlending,
					depthWrite: false,
				})
			);
			clone.add(glow);

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

			scene.add(group);

			// Create ECS entity linked to this mesh
			const entity = world.createTransformEntity(group);
			entity.addComponent(Collectible, {
				entityId: eid,
				collected: false,
				collectTime: 0,
				spinSpeed: 0.3 + (eid % 5) * 0.1,
				bobPhase: eid * 0.7,
				baseY: 0.6,
				modelIndex: mi,
				behavior: cfg.behavior,
				points: cfg.points,
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
	const opponentLabel = createTextSprite('Waiting...', '#4fc3f7');
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
			if (entity && !entity.getValue(Collectible, 'collected')) {
				entity.setValue(Collectible, 'collected', true);
				entity.setValue(Collectible, 'collectTime', performance.now());
				entity.setValue(Collectible, 'collectBy', 'opponent');
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
		opponentLabel = createTextSprite(opponentName, '#4fc3f7');
		opponentLabel.visible = !!opponentId;
		opponentLabel.position.copy(pos);
		scene.add(opponentLabel);
	}

	// Wire collection broadcast — adds the entity's point value
	collectionSys._onCollectRemote = (entityId) => {
		const entity = entityById.get(entityId);
		const pts = entity ? entity.getValue(Collectible, 'points') : 1;
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

	// ── WASD movement (inline, simple) ──
	const keys = {};
	const onKeyDown = (e) => { keys[e.code] = true; };
	const onKeyUp = (e) => { keys[e.code] = false; };
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);

	// ── Resize ──
	const onResize = () => {
		camera.aspect = container.clientWidth / container.clientHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(container.clientWidth, container.clientHeight);
	};
	window.addEventListener('resize', onResize);

	// ── Animation loop ──
	let animationId;
	const moveDir = new THREE.Vector3();

	function animate() {
		animationId = requestAnimationFrame(animate);
		const dt = 0.016;

		controls.update();

		// WASD movement
		moveDir.set(0, 0, 0);
		if (keys['KeyW'] || keys['ArrowUp']) moveDir.z -= 1;
		if (keys['KeyS'] || keys['ArrowDown']) moveDir.z += 1;
		if (keys['KeyA'] || keys['ArrowLeft']) moveDir.x -= 1;
		if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1;
		if (moveDir.lengthSq() > 0) {
			moveDir.normalize();
			const yaw = controls.getAzimuthalAngle();
			const cos = Math.cos(yaw);
			const sin = Math.sin(yaw);
			camera.position.x += (moveDir.x * cos - moveDir.z * sin) * 3 * dt;
			camera.position.z += (moveDir.x * sin + moveDir.z * cos) * 3 * dt;
			camera.position.y = 1.6;
			controls.target.set(camera.position.x, 1, camera.position.z);
		}

		// Run collection system update (handles collected animations).
		// AnimationSystem is registered with the world and runs automatically
		// via IWSDK's internal loop — we do NOT call world.execute() ourselves.
		collectionSys.update(dt);

		// Broadcast our pose to opponent (throttled to 10/s)
		const now = performance.now();
		if (_ws?.readyState === WebSocket.OPEN && now - lastPoseSent > 100) {
			lastPoseSent = now;
			_ws.send(JSON.stringify({
				type: 'pose',
				playerId: myId,
				name: playerName,
				x: camera.position.x,
				y: camera.position.y,
				z: camera.position.z,
			}));
		}

		renderer.render(scene, camera);
	}
	animate();

	// Return cleanup
	return {
		destroy() {
			cancelAnimationFrame(animationId);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('resize', onResize);
			if (collectionSys._cleanupInput) collectionSys._cleanupInput();
			if (_ws) { _ws.close(); _ws = null; }
			controls.dispose();
			renderer.dispose();
			if (container.contains(renderer.domElement)) {
				container.removeChild(renderer.domElement);
			}
		},
	};
}
