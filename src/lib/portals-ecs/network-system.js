// @ts-nocheck — IWSDK/Three.js dynamic scene code; excluded from strict type-checking (jsconfig.json).
// ═══════════════════════════════════════════════════════════
//  network-system.js
//  Multiplayer avatar sync. Connects to the PortalRoom Durable Object via
//  WebSocket, broadcasts the local player's pose, and spawns/updates remote
//  avatar meshes for other visitors in the same portal world.
//
//  Remote avatars are simple colored spheres (head) — a v1 representation.
//  They lerp toward their last-reported positions for smooth movement.
// ═══════════════════════════════════════════════════════════
import { createSystem } from 'elics';
import { Vector3, Mesh, MeshBasicMaterial, SphereGeometry, Group } from 'three';
import { locomotion } from './locomotion-system.js';

const WS_URL = 'wss://booty-chat-worker.chef-tech.workers.dev/portal-ws/ws';
const SEND_INTERVAL_MS = 80;  // ~12Hz pose broadcasts
const LERP_SPEED = 0.12;      // remote avatar smoothing

const _localPos = new Vector3();
const _tmpPos = new Vector3();
const _sphereGeo = new SphereGeometry(0.12, 12, 10);

// Generate a stable color from a sessionId hash.
function colorFromId(id) {
	let hash = 0;
	for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
	const h = (Math.abs(hash) % 360) / 360;
	const c = new MeshBasicMaterial({ color: 0xffffff });
	c.color.setHSL(h, 0.6, 0.55);
	return c;
}

function createAvatarMesh(sessionId) {
	const group = new Group();
	const head = new Mesh(_sphereGeo, colorFromId(sessionId));
	head.position.y = 0;
	group.add(head);
	return group;
}

export const NetworkSystem = class extends createSystem({}) {
	init() {
		console.log('[network] system registered & initialized ✓');
		this._userId = crypto.randomUUID();
		this._room = null;
		this._ws = null;
		this._avatars = new Map(); // sessionId → { mesh, targetX, targetY, targetZ, targetYaw }
		this._lastSend = 0;
		this._lastPos = { x: 0, y: 0, z: 0 };
	}

	update(delta, _time) {
		const world = this.world;
		const room = world._currentPortalId;
		if (!room) return;

		// Reconnect if the room changed (scene navigation).
		if (this._room !== room) {
			this._disconnect();
			this._room = room;
			this._connect(room);
		}

		// Read local player position (same logic as locomotion-system).
		let px, py, pz, yaw;
		if (world.session && world.player) {
			world.player.getWorldPosition(_localPos);
			px = _localPos.x; py = _localPos.y; pz = _localPos.z;
			yaw = Math.atan2(world.camera.matrixWorld.elements[8], world.camera.matrixWorld.elements[10]);
		} else if (world.camera) {
			px = world.camera.position.x; py = world.camera.position.y; pz = world.camera.position.z;
			yaw = world.camera.rotation.y;
		} else {
			return;
		}

		// Throttle pose sends — only when position changed and enough time elapsed.
		const now = performance.now();
		const moved = Math.abs(px - this._lastPos.x) + Math.abs(py - this._lastPos.y) + Math.abs(pz - this._lastPos.z) > 0.01;
		if ((moved || locomotion.userActive) && now - this._lastSend > SEND_INTERVAL_MS) {
			this._lastSend = now;
			this._lastPos = { x: px, y: py, z: pz };
			if (this._ws?.readyState === WebSocket.OPEN) {
				this._ws.send(JSON.stringify({ type: 'pose', x: px, y: py, z: pz, yaw }));
			}
		}

		// Lerp remote avatars toward their target positions.
		for (const [sid, avatar] of this._avatars) {
			_tmpPos.set(avatar.targetX, avatar.targetY, avatar.targetZ);
			avatar.mesh.position.lerp(_tmpPos, LERP_SPEED);
			avatar.mesh.rotation.y += (avatar.targetYaw - avatar.mesh.rotation.y) * LERP_SPEED;
		}
	}

	_connect(room) {
		try {
			const url = `${WS_URL}?room=${encodeURIComponent(room)}&user=${this._userId}&name=visitor`;
			this._ws = new WebSocket(url);

			this._ws.onopen = () => {
				console.log('[network] connected to room:', room);
			};

			this._ws.onmessage = (e) => {
				try {
					const msg = JSON.parse(e.data);
					this._handleMessage(msg);
				} catch {}
			};

			this._ws.onclose = () => {
				console.log('[network] disconnected from room:', room);
				this._ws = null;
			};

			this._ws.onerror = () => {
				console.warn('[network] WebSocket error');
				this._ws = null;
			};
		} catch (err) {
			console.warn('[network] connect failed:', err.message);
		}
	}

	_disconnect() {
		// Remove all remote avatars from the scene.
		const world = this.world;
		for (const [sid, avatar] of this._avatars) {
			if (world?.scene) world.scene.remove(avatar.mesh);
		}
		this._avatars.clear();

		if (this._ws) {
			try { this._ws.close(); } catch {}
			this._ws = null;
		}
	}

	_handleMessage(msg) {
		const world = this.world;
		if (!world?.scene) return;

		switch (msg.type) {
			case 'roster':
				// Initial list of already-connected peers.
				for (const peer of (msg.peers || [])) {
					this._spawnAvatar(peer.sessionId, peer.x, peer.y, peer.z, peer.yaw);
				}
				break;

			case 'peer_joined':
				this._spawnAvatar(msg.sessionId, msg.x, msg.y, msg.z, msg.yaw);
				break;

			case 'peer_pose':
				const avatar = this._avatars.get(msg.sessionId);
				if (avatar) {
					avatar.targetX = msg.x;
					avatar.targetY = msg.y;
					avatar.targetZ = msg.z;
					avatar.targetYaw = msg.yaw;
				}
				break;

			case 'peer_left':
				const existing = this._avatars.get(msg.sessionId);
				if (existing) {
					world.scene.remove(existing.mesh);
					this._avatars.delete(msg.sessionId);
				}
				break;
		}
	}

	_spawnAvatar(sessionId, x, y, z, yaw) {
		if (this._avatars.has(sessionId)) return;
		const world = this.world;
		if (!world?.scene) return;
		const mesh = createAvatarMesh(sessionId);
		mesh.position.set(x, y, z);
		mesh.rotation.y = yaw || 0;
		world.scene.add(mesh);
		this._avatars.set(sessionId, { mesh, targetX: x, targetY: y, targetZ: z, targetYaw: yaw || 0 });
		console.log('[network] peer spawned:', sessionId);
	}

	destroy() {
		this._disconnect();
	}
};
