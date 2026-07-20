// @ts-nocheck — IWSDK/Three.js ECS code
// ═══════════════════════════════════════════════════════════
//  oz-world.js
//  The Wizard of Oz-inspired world. The visitor is Dorothy, arriving
//  in a field of oversized flowers. GLB munchkins (Antoine's figures)
//  hide inside the flowers — invisible until Dorothy approaches. When
//  she gets close, they pop out, scatter, and the yellow brick road
//  lights up leading deeper into the scene.
//
//  ECS architecture: HideSystem handles proximity reveal, same pattern
//  as the portal engine's RevelationSystem.
// ═══════════════════════════════════════════════════════════
// All imports are dynamic inside bootOzWorld() to avoid bundler TDZ issues
// when this module is dynamically imported via await import(). This matches
// the pattern in grab-demo-world.js — module-level elics component creation
// (reuseOrCreate) causes "Cannot access 'X' before initialization" errors
// because the bundler hoists static imports but defers their evaluation.

const CF_IMAGES_HASH = '4bRSwPonOXfEIBVZiDXg0w';
const SKYBOX_ID = 'e9fd4477-84f5-4a57-ac67-aba89d28b000';

// Module-level callbacks — no elics dependency, safe to keep at module scope.
let _onMunchkinCollect = null;
let _onMonkeyCollect = null;
let _onPlayerHit = null;

// ── Text sprite helper ──
// THREE passed in (we no longer statically import it).
function createTextSprite(THREE, text, color = '#ffd700') {
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
export async function bootOzWorld(container, options = {}) {
	if (!container) throw new Error('bootOzWorld: container is null');

	// Dynamic imports — avoid bundler TDZ issues
	const THREE = await import('three');
	const { World } = await import('@iwsdk/core');
	const { createComponent, createSystem, Types, ComponentRegistry } = await import('elics');
	const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
	const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');

	// ── ECS Components — created AFTER elics loads (deferred from module scope) ──
	const Munchkin = ComponentRegistry.has('OzMunchkin')
		? ComponentRegistry.getById('OzMunchkin')
		: createComponent('OzMunchkin', {
			state:       { type: Types.String, default: 'hidden' }, // hidden|emerging|visible|scattering|collected
			munchkinId:  { type: Types.Int32, default: -1 }, // shared collection sync ID
			revealDist:  { type: Types.Float32, default: 3.0 },
			hideDist:    { type: Types.Float32, default: 5.0 },
			bobPhase:    { type: Types.Float32, default: 0 },
			spinSpeed:   { type: Types.Float32, default: 0.5 },
			scatterDir:  { type: Types.Float32, default: 0 }, // angle
			scatterTime: { type: Types.Float32, default: 0 },
			points:      { type: Types.Int32, default: 2 },
			collected:   { type: Types.Boolean, default: false },
		});

	const Flower = ComponentRegistry.has('OzFlower')
		? ComponentRegistry.getById('OzFlower')
		: createComponent('OzFlower', {
			swayPhase: { type: Types.Float32, default: 0 },
			swaySpeed: { type: Types.Float32, default: 0.5 },
			hasMunchkin: { type: Types.Boolean, default: false },
		});

	// Flying monkeys — swoop down from the sky in waves, chase players,
	// and must be clicked/tapped to defeat (scatters into fragments).
	const Monkey = ComponentRegistry.has('OzMonkey')
		? ComponentRegistry.getById('OzMonkey')
		: createComponent('OzMonkey', {
			monkeyId:     { type: Types.Int32, default: -1 },
			state:        { type: Types.String, default: 'swooping' }, // swooping|attacking|retreating|collected
			spawnTime:    { type: Types.Float32, default: 0 },
			swoopPhase:   { type: Types.Float32, default: 0 },  // drives the sine-wave Y arc
			swoopSpeed:   { type: Types.Float32, default: 1.5 },
			swoopAmplitude: { type: Types.Float32, default: 3.0 },
			baseY:        { type: Types.Float32, default: 5.0 },
			chaseSpeed:   { type: Types.Float32, default: 1.8 },
			bobPhase:     { type: Types.Float32, default: 0 },
			points:       { type: Types.Int32, default: 5 },
			collected:    { type: Types.Boolean, default: false },
			collectTime:  { type: Types.Float32, default: 0 },
			hitCooldown:  { type: Types.Float32, default: 0 },
		});

	// ── ECS Systems — defined here so they close over Munchkin/Flower after creation ──

	// HideRevealSystem: manages munchkin visibility based on player proximity.
	// Same pattern as the portal engine's RevelationSystem.
	const HideRevealSystem = class extends createSystem({
		munchkins: { required: [Munchkin] },
	}) {
		update(dt) {
			const camera = this.world?.camera;
			if (!camera) return;
			const playerX = camera.position.x;
			const playerZ = camera.position.z;

			for (const entity of this.queries.munchkins.entities) {
				if (entity.getValue(Munchkin, 'collected')) continue;
				const obj = entity.object3D;
				if (!obj) continue;

				const state = entity.getValue(Munchkin, 'state');
				const revealDist = entity.getValue(Munchkin, 'revealDist');
				const dist = Math.hypot(obj.position.x - playerX, obj.position.z - playerZ);

				if (state === 'hidden' && dist < revealDist) {
					entity.setValue(Munchkin, 'state', 'emerging');
				} else if (state === 'emerging') {
					// Scale up (pop out of flower)
					const s = Math.min(1, obj.scale.x + dt * 3);
					obj.scale.setScalar(s);
					if (s >= 1) {
						entity.setValue(Munchkin, 'state', 'visible');
						entity.setValue(Munchkin, 'scatterDir', Math.random() * Math.PI * 2);
						entity.setValue(Munchkin, 'scatterTime', 0);
					}
				} else if (state === 'visible') {
					const scatterTime = entity.getValue(Munchkin, 'scatterTime');
					const newTime = scatterTime + dt;

					if (newTime < 2.0) {
						// Scatter: run away from player
						const dir = entity.getValue(Munchkin, 'scatterDir');
						const speed = 1.5 * (1 - newTime / 2.0);
						obj.position.x += Math.cos(dir) * speed * dt;
						obj.position.z += Math.sin(dir) * speed * dt;
						obj.rotation.y += dt * 3;
					}

					entity.setValue(Munchkin, 'scatterTime', newTime);
					obj.position.y = 0.6 + Math.sin(performance.now() / 200 + entity.getValue(Munchkin, 'bobPhase')) * 0.1;

					// Collect on touch
					if (dist < 1.0) {
						entity.setValue(Munchkin, 'collected', true);
						entity.setValue(Munchkin, 'state', 'collected');
						if (_onMunchkinCollect) _onMunchkinCollect(
							entity.getValue(Munchkin, 'munchkinId'),
							entity.getValue(Munchkin, 'points'),
						);
					}
				}
			}
		}
	};

	// FlowerSwaySystem: gentle flower animation
	const FlowerSwaySystem = class extends createSystem({
		flowers: { required: [Flower] },
	}) {
		update(dt) {
			const time = performance.now() / 1000;
			for (const entity of this.queries.flowers.entities) {
				const obj = entity.object3D;
				if (!obj) continue;
				const phase = entity.getValue(Flower, 'swayPhase');
				const speed = entity.getValue(Flower, 'swaySpeed');
				obj.rotation.z = Math.sin(time * speed + phase) * 0.05;
			}
		}
	};

	// MonkeySystem: flying monkeys swoop in sine arcs, chase the nearest
	// player, and hit on proximity. Defeated by click/tap (handled by the
	// raycaster in step 5). Monkeys despawn after 30s if not collected.
	const MonkeySystem = class extends createSystem({
		monkeys: { required: [Monkey] },
	}) {
		update(dt) {
			const cam = this.world?.camera;
			if (!cam) return;
			const pp = cam.position;
			const time = performance.now() / 1000;
			for (const entity of this.queries.monkeys.entities) {
				if (entity.getValue(Monkey, 'collected')) continue;
				const obj = entity.object3D;
				if (!obj) continue;
				const state = entity.getValue(Monkey, 'state');
				const spawnTime = entity.getValue(Monkey, 'spawnTime');
				const age = time - spawnTime;
				// Despawn after 30s — fly away (retreat upward)
				if (age > 30 && state !== 'collected') {
					obj.position.y += dt * 3;
					obj.scale.multiplyScalar(1 - dt * 0.5);
					if (obj.scale.x < 0.05) {
						entity.setValue(Monkey, 'collected', true);
						entity.setValue(Monkey, 'state', 'collected');
					}
					continue;
				}
				const phase = entity.getValue(Monkey, 'swoopPhase');
				const swoopSpeed = entity.getValue(Monkey, 'swoopSpeed');
				const amplitude = entity.getValue(Monkey, 'swoopAmplitude');
				const baseY = entity.getValue(Monkey, 'baseY');
				const bobPhase = entity.getValue(Monkey, 'bobPhase');
				// Sine-wave Y arc (the "flying" motion)
				obj.position.y = baseY + Math.sin(time * swoopSpeed + phase) * amplitude + Math.sin(time * 6 + bobPhase) * 0.2;
				// Chase the player on XZ
				const dx = pp.x - obj.position.x;
				const dz = pp.z - obj.position.z;
				const dist = Math.hypot(dx, dz);
				const chaseSpeed = entity.getValue(Monkey, 'chaseSpeed');
				if (dist > 0.5) {
					obj.position.x += (dx / dist) * chaseSpeed * dt;
					obj.position.z += (dz / dist) * chaseSpeed * dt;
				}
				// Face the player + spin (menacing)
				obj.rotation.y = Math.atan2(dx, dz) + time * 2;
				// Hit the player on proximity (< 1.5 units) — cooldown to avoid spam
				const hitCd = entity.getValue(Monkey, 'hitCooldown');
				if (dist < 1.5 && hitCd <= 0 && obj.position.y < pp.y + 1) {
					entity.setValue(Monkey, 'hitCooldown', 2.0);
					if (_onPlayerHit) _onPlayerHit(entity.getValue(Monkey, 'points'));
				}
				if (hitCd > 0) entity.setValue(Monkey, 'hitCooldown', hitCd - dt);
			}
		}
	};

	const onScoreUpdate = options.onScoreUpdate || (() => {});
	const onPresenceUpdate = options.onPresenceUpdate || (() => {});
	let score = 0;

	// ── Multiplayer state ──
	const WS_URL = `${typeof location !== 'undefined'
		? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
		: ''}/api/oz/ws`;
	const playerName = options.playerName || ('Player-' + Math.random().toString(36).slice(2, 6));
	const myId = crypto.randomUUID();
	let mySessionId = null;
	let _ws = null;
	const peers = new Map();         // sessionId → { name, score, x, y, z, yaw, avatarMesh, labelSprite }
	let lastPoseSent = 0;
	const munchkinById = new Map();  // munchkinId (entity index) → ECS entity
	const monkeyById = new Map();    // monkeyId → ECS entity (flying monkeys)
	let _wsReady = false;

	// ── ECS World (creates its own scene, camera, renderer) ──
	const world = await World.create(container, {
		xr: { offer: 'none' },
		render: { defaultLighting: false },
		features: { locomotion: false, grabbing: false, physics: false },
	});

	// Use the World's scene + camera + renderer
	const scene = world.scene;
	const camera = world.camera;
	const renderer = world.renderer;
	camera.position.set(0, 1.6, 6);

	// Skybox
	const skyboxTexture = new THREE.TextureLoader().load(
		`https://imagedelivery.net/${CF_IMAGES_HASH}/${SKYBOX_ID}/full`
	);
	skyboxTexture.colorSpace = THREE.SRGBColorSpace;
	const skybox = new THREE.Mesh(
		new THREE.SphereGeometry(30, 32, 16),
		new THREE.MeshBasicMaterial({ map: skyboxTexture, side: THREE.BackSide, depthWrite: false, fog: false })
	);
	scene.add(skybox);
	scene.fog = new THREE.Fog(0x2a3318, 20, 50);

	// Lighting — warm Oz daylight
	scene.add(new THREE.AmbientLight(0xffe8aa, 0.5));
	const sun = new THREE.DirectionalLight(0xfff0cc, 1.0);
	sun.position.set(5, 15, 8);
	scene.add(sun);
	const fill = new THREE.DirectionalLight(0x88aa44, 0.3);
	fill.position.set(-5, 5, -3);
	scene.add(fill);

	// ── Ground: grass-green textured plane ──
	const groundCanvas = document.createElement('canvas');
	groundCanvas.width = 256;
	groundCanvas.height = 256;
	const gctx = groundCanvas.getContext('2d');
	gctx.fillStyle = '#2d4a1e';
	gctx.fillRect(0, 0, 256, 256);
	for (let i = 0; i < 500; i++) {
		const x = Math.random() * 256;
		const y = Math.random() * 256;
		const v = Math.random();
		gctx.fillStyle = `rgb(${30 + v * 20}, ${60 + v * 30}, ${20 + v * 15})`;
		gctx.fillRect(x, y, 3, 3);
	}
	const groundTexture = new THREE.CanvasTexture(groundCanvas);
	groundTexture.wrapS = THREE.RepeatWrapping;
	groundTexture.wrapT = THREE.RepeatWrapping;
	groundTexture.repeat.set(15, 15);

	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry(60, 60),
		new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1.0 })
	);
	ground.rotation.x = -Math.PI / 2;
	scene.add(ground);

	// ── Yellow brick road ──
	const roadGroup = new THREE.Group();
	for (let i = 0; i < 8; i++) {
		const seg = new THREE.Mesh(
			new THREE.PlaneGeometry(2.5, 3),
			new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.6, metalness: 0.2, emissive: 0x442200 })
		);
		seg.rotation.x = -Math.PI / 2;
		seg.position.set(0, 0.01, -(i * 3.2) - 2);
		roadGroup.add(seg);
		for (let b = 0; b < 3; b++) {
			const line = new THREE.Mesh(
				new THREE.PlaneGeometry(2.3, 0.06),
				new THREE.MeshBasicMaterial({ color: 0x8a6810 })
			);
			line.rotation.x = -Math.PI / 2;
			line.position.set(0, 0.02, -(i * 3.2) - 2 + (b - 1) * 0.9);
			roadGroup.add(line);
		}
	}
	scene.add(roadGroup);

	// ── Load GLB munchkins from the asset library (game_name = 'oz') ──
	const loader = new GLTFLoader();
	// Wire meshopt decoder so compressed GLBs (EXT_meshopt_compression) load.
	// Additive: uncompressed GLBs load identically.
	loader.setMeshoptDecoder(MeshoptDecoder);

	let munchkinModels = [];
	try {
		const res = await fetch(`/api/assets/library?game=oz`);
		const data = await res.json();
		munchkinModels = data.models || [];
	} catch (e) {
		console.warn('[oz] fetchGameModels failed, using fallback');
	}
	// Fallback if no models tagged for oz
	if (munchkinModels.length === 0) {
		munchkinModels = [
			{ url: '/api/assets/models/hombre-amarillo.glb' },
			{ url: '/api/assets/models/antoine/mujer-musa.glb' },
		];
	}

	const munchkinTemplates = await Promise.all(
		munchkinModels.map((m) =>
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

	world.registerComponent(Munchkin);
	world.registerComponent(Flower);
	world.registerComponent(Monkey);
	world.registerSystem(HideRevealSystem, { priority: 0 });
	world.registerSystem(FlowerSwaySystem, { priority: 0 });
	world.registerSystem(MonkeySystem, { priority: 0 });

	// ── Spawn flowers + munchkins ──
	const FLOWER_COUNT = 20;
	const MUNCHKIN_COUNT = 12;
	const flowerColors = [0xff6688, 0xffcc44, 0xff8844, 0xee44aa, 0x66dd88];

	for (let i = 0; i < FLOWER_COUNT; i++) {
		// Build a procedural flower: stem + petals
		const flowerGroup = new THREE.Group();

		// Stem
		const stem = new THREE.Mesh(
			new THREE.CylinderGeometry(0.06, 0.08, 1.5, 6),
			new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.8 })
		);
		stem.position.y = 0.75;
		flowerGroup.add(stem);

		// Petals (cone cluster)
		const petalColor = flowerColors[i % flowerColors.length];
		for (let p = 0; p < 5; p++) {
			const angle = (p / 5) * Math.PI * 2;
			const petal = new THREE.Mesh(
				new THREE.ConeGeometry(0.2, 0.5, 4),
				new THREE.MeshStandardMaterial({ color: petalColor, roughness: 0.6 })
			);
			petal.position.set(Math.cos(angle) * 0.2, 1.5, Math.sin(angle) * 0.2);
			petal.rotation.z = -Math.PI / 3;
			petal.rotation.y = angle;
			flowerGroup.add(petal);
		}

		// Center
		const center = new THREE.Mesh(
			new THREE.SphereGeometry(0.18, 8, 6),
			new THREE.MeshStandardMaterial({ color: 0xffdd00, roughness: 0.5 })
		);
		center.position.y = 1.5;
		flowerGroup.add(center);

		// Position — scatter around the road, avoiding the road itself
		let fx, fz;
		do {
			const angle = Math.random() * Math.PI * 2;
			const radius = 3 + Math.random() * 12;
			fx = Math.cos(angle) * radius;
			fz = Math.sin(angle) * radius;
		} while (Math.abs(fx) < 1.5 && fz < 0); // keep off the road

		flowerGroup.position.set(fx, 0, fz);
		scene.add(flowerGroup);

		// ECS entity for sway
		const fEntity = world.createTransformEntity(flowerGroup);
		fEntity.addComponent(Flower, {
			swayPhase: Math.random() * Math.PI * 2,
			swaySpeed: 0.5 + Math.random() * 0.5,
			hasMunchkin: i < MUNCHKIN_COUNT,
		});
	}

	// ── Spawn munchkins hidden near flowers ──
	for (let i = 0; i < MUNCHKIN_COUNT; i++) {
		const template = munchkinTemplates[i % munchkinTemplates.length];
		const clone = template.clone(true);

		// Normalize scale
		const box = new THREE.Box3().setFromObject(clone);
		const size = new THREE.Vector3();
		box.getSize(size);
		if (size.y > 0) clone.scale.setScalar(0.8 / size.y);

		const group = new THREE.Group();
		group.add(clone);

		// Position near a flower area (same scatter as flowers, deterministic-ish)
		const angle = (i / MUNCHKIN_COUNT) * Math.PI * 2 + Math.random() * 0.5;
		const radius = 3 + Math.random() * 12;
		group.position.set(Math.cos(angle) * radius, 0.6, Math.sin(angle) * radius);

		// Start hidden (scale 0)
		group.scale.setScalar(0);
		scene.add(group);

		const entity = world.createTransformEntity(group);
		entity.addComponent(Munchkin, {
			state: 'hidden',
			munchkinId: i,  // used for shared collection sync via the DO
			revealDist: 3.0 + Math.random(),
			hideDist: 5.0 + Math.random() * 2,
			bobPhase: Math.random() * Math.PI * 2,
			spinSpeed: 0.5 + Math.random() * 0.5,
			scatterDir: Math.random() * Math.PI * 2,
			scatterTime: 0,
			points: 2,
			collected: false,
		});
		munchkinById.set(i, entity);
	}

	// Wire collect callback — broadcasts to the DO so other clients hide
	// the same munchkin. The munchkinId is the entity's index in our local
	// array (matches the DO's shared collectedMunchkinIds set).
	_onMunchkinCollect = (munchkinId, pts) => {
		score += pts;
		onScoreUpdate(score);
		if (_ws?.readyState === WebSocket.OPEN) {
			_ws.send(JSON.stringify({
				type: 'collect_munchkin',
				munchkinId,
				score,
			}));
		}
		broadcastPresence();
	};

	// Wire monkey collect + player-hit callbacks
	_onMonkeyCollect = (monkeyId, pts) => {
		score += pts;
		onScoreUpdate(score);
		if (_ws?.readyState === WebSocket.OPEN) {
			_ws.send(JSON.stringify({
				type: 'collect_monkey',
				monkeyId,
				score,
			}));
		}
		broadcastPresence();
	};
	_onPlayerHit = (pts) => {
		// Monkey hit the player — penalty (subtract a few points, floor at 0)
		score = Math.max(0, score - 2);
		onScoreUpdate(score);
	};

	// Spawn a flying monkey at a DO-assigned position. Uses the munchkin
	// templates as a proxy model (or a dark sphere fallback). All clients
	// spawn the same monkey at the same position — positions are derived
	// from monkeyId in the DO, so no per-client desync.
	function spawnMonkey(monkeyId, x, z, spawnTimeSec) {
		if (monkeyById.has(monkeyId)) return;  // already spawned (wave re-broadcast)
		// Build a dark winged proxy: a sphere + cone "beak" group.
		// TODO: replace with a real flying-monkey GLB when available.
		const group = new THREE.Group();
		const body = new THREE.Mesh(
			new THREE.SphereGeometry(0.35, 12, 8),
			new THREE.MeshStandardMaterial({ color: 0x3a2a4a, roughness: 0.7, emissive: 0x1a0a2a })
		);
		body.position.y = 0;
		group.add(body);
		// Wings (flat cones that flap — static for now, flap animation in step 5+)
		for (const side of [-1, 1]) {
			const wing = new THREE.Mesh(
				new THREE.ConeGeometry(0.15, 0.5, 4),
				new THREE.MeshStandardMaterial({ color: 0x2a1a3a, roughness: 0.8, side: THREE.DoubleSide })
			);
			wing.position.set(side * 0.3, 0.1, 0);
			wing.rotation.z = side * Math.PI / 3;
			group.add(wing);
		}
		// Glowing eyes (menacing)
		const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3300, blending: THREE.AdditiveBlending });
		for (const side of [-1, 1]) {
			const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), eyeMat);
			eye.position.set(side * 0.1, 0.1, 0.3);
			group.add(eye);
		}

		group.position.set(x, 8, z);  // start high (swoop down)
		scene.add(group);

		const entity = world.createTransformEntity(group);
		entity.addComponent(Monkey, {
			monkeyId,
			state: 'swooping',
			spawnTime: spawnTimeSec || (performance.now() / 1000),
			swoopPhase: monkeyId * 0.7,
			swoopSpeed: 1.2 + (monkeyId % 3) * 0.3,
			swoopAmplitude: 2.5 + (monkeyId % 2) * 1.0,
			baseY: 4.0,
			chaseSpeed: 1.6 + (monkeyId % 3) * 0.3,
			bobPhase: monkeyId * 1.3,
			points: 5,
			collected: false,
			collectTime: 0,
			hitCooldown: 0,
		});
		monkeyById.set(monkeyId, entity);
	}

	// ── Multiplayer: WebSocket connection + N-player peers ──
	function connectWS() {
		const params = new URLSearchParams({ user: myId, name: playerName });
		const ws = new WebSocket(`${WS_URL}?${params.toString()}`);
		ws.onopen = () => { console.log('[oz] WS connected'); _wsReady = true; };
		ws.onmessage = (event) => {
			try { handleWSMessage(JSON.parse(event.data)); } catch (e) {}
		};
		ws.onclose = () => { _wsReady = false; setTimeout(connectWS, 2000); };
		ws.onerror = () => { ws.close(); };
		_ws = ws;
	}

	function handleWSMessage(msg) {
		switch (msg.type) {
			case 'roster': {
				mySessionId = msg.sessionId;
				// Register existing peers
				for (const p of (msg.peers || [])) ensurePeer(p.sessionId, p.name, p.x, p.y, p.z);
				// Hide munchkins already collected by others
				for (const mid of (msg.collectedMunchkinIds || [])) {
					const e = munchkinById.get(mid);
					if (e && !e.getValue(Munchkin, 'collected')) {
						e.setValue(Munchkin, 'collected', true);
					}
				}
				broadcastPresence();
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
			case 'munchkin_collected': {
				// Another player collected a munchkin — hide it locally.
				const e = munchkinById.get(msg.munchkinId);
				if (e && !e.getValue(Munchkin, 'collected')) {
					e.setValue(Munchkin, 'collected', true);
					e.setValue(Munchkin, 'state', 'collected');
				}
				const peer = peers.get(msg.sessionId);
				if (peer) peer.score = msg.score || peer.score;
				broadcastPresence();
				break;
			}
			case 'monkey_collected': {
				// Another player defeated a monkey — hide it locally.
				const monkeyEntity = monkeyById.get(msg.monkeyId);
				if (monkeyEntity && !monkeyEntity.getValue(Monkey, 'collected')) {
					monkeyEntity.setValue(Monkey, 'collected', true);
					monkeyEntity.setValue(Monkey, 'state', 'collected');
					monkeyEntity.setValue(Monkey, 'collectTime', performance.now());
				}
				const peer = peers.get(msg.sessionId);
				if (peer) peer.score = msg.score || peer.score;
				broadcastPresence();
				break;
			}
			case 'monkey_wave': {
				// The DO broadcasts a wave — spawn the same monkeys on all clients.
				// Positions are derived from monkeyId (DO assigns them), so we
				// use the DO-provided x/z rather than computing locally.
				for (const m of (msg.monkeys || [])) {
					spawnMonkey(m.monkeyId, m.x, m.z, m.spawnTime / 1000);
				}
				break;
			}
			case 'peer_score': {
				const peer = peers.get(msg.sessionId);
				if (peer) peer.score = msg.score;
				broadcastPresence();
				break;
			}
		}
	}

	// ── Peer avatar management (simplified sphere + label, like grab-demo) ──
	function ensurePeer(sessionId, name, x = 0, y = 1.5, z = 6) {
		if (peers.has(sessionId)) return peers.get(sessionId);
		// Dorothy-themed avatar: a glowing emerald sphere (Toto's energy?)
		const avatarMesh = new THREE.Mesh(
			new THREE.SphereGeometry(0.3, 16, 12),
			new THREE.MeshBasicMaterial({ color: 0x66ddaa, transparent: true, opacity: 0.75 })
		);
		avatarMesh.position.set(x, y, z);
		scene.add(avatarMesh);
		const labelSprite = createTextSprite(THREE, name || 'Dorothy', '#ffd700');
		labelSprite.position.set(x, y + 0.8, z);
		scene.add(labelSprite);
		const peer = { name: name || 'Dorothy', score: 0, x, y, z, yaw: 0, avatarMesh, labelSprite };
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
		const roster = [...peers.values()].map((p) => ({ name: p.name, score: p.score }));
		const count = peers.size + 1;
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('oz-presence', {
				detail: { count, roster, myName: playerName, myScore: score },
			}));
		}
		onPresenceUpdate({ count, roster });
	}

	connectWS();

	// ── Movement: WASD + mouse-drag look (no OrbitControls) ──
	let yaw = 0, pitch = 0;
	let lookActive = false;
	let lookMoved = false;

	const keys = {};
	const onKeyDown = (e) => { keys[e.code] = true; };
	const onKeyUp = (e) => { keys[e.code] = false; };
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);

	const onMouseDown = () => { lookActive = true; lookMoved = false; };
	const onMouseUp = () => { lookActive = false; };
	const onMouseMove = (e) => {
		if (lookActive && e.buttons > 0) {
			lookMoved = true;
			yaw -= e.movementX * 0.003;
			pitch -= e.movementY * 0.003;
			pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
		}
	};
	renderer.domElement.addEventListener('mousedown', onMouseDown);
	window.addEventListener('mouseup', onMouseUp);
	window.addEventListener('mousemove', onMouseMove);

	// ── Animation loop: WASD + look only. World handles ECS + rendering. ──
	let animationId;
	const moveDir = new THREE.Vector3();

	function animate() {
		animationId = requestAnimationFrame(animate);
		const dt = 0.016;

		// Apply look
		camera.rotation.order = 'YXZ';
		camera.rotation.y = yaw;
		camera.rotation.x = pitch;

		// WASD movement (camera-relative)
		moveDir.set(0, 0, 0);
		if (keys['KeyW'] || keys['ArrowUp']) moveDir.z -= 1;
		if (keys['KeyS'] || keys['ArrowDown']) moveDir.z += 1;
		if (keys['KeyA'] || keys['ArrowLeft']) moveDir.x -= 1;
		if (keys['KeyD'] || keys['ArrowRight']) moveDir.x += 1;
		if (moveDir.lengthSq() > 0) {
			moveDir.normalize().applyEuler(new THREE.Euler(0, yaw, 0));
			camera.position.x += moveDir.x * 3 * dt;
			camera.position.z += moveDir.z * 3 * dt;
			camera.position.y = 1.6;
		}

		// Broadcast pose to the DO (throttled) for multiplayer presence.
		const now = performance.now();
		if (_ws?.readyState === WebSocket.OPEN && now - lastPoseSent > 100) {
			lastPoseSent = now;
			_ws.send(JSON.stringify({
				type: 'pose',
				x: camera.position.x, y: camera.position.y, z: camera.position.z,
				yaw,
			}));
		}
		// Do NOT call renderer.render — the World handles rendering.
	}
	animate();

	return {
		destroy() {
			cancelAnimationFrame(animationId);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			renderer.domElement.removeEventListener('mousedown', onMouseDown);
			window.removeEventListener('mouseup', onMouseUp);
			window.removeEventListener('mousemove', onMouseMove);
			// Close the WS + clean up peer avatars
			if (_ws) { _ws.close(); _ws = null; }
			for (const sid of [...peers.keys()]) removePeer(sid);
			if (container.contains(renderer.domElement)) {
				container.removeChild(renderer.domElement);
			}
		},
	};
}
