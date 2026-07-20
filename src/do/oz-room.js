// OzRoom — Durable Object for the Oz multiplayer world.
//
// One DO instance = the shared Oz garden. Everyone who opens /portals/oz
// lands here together. Unlike GrabDemoRoom (competitive, round-based),
// OzRoom is exploratory co-op: no timer, no promotion, just shared
// presence + shared collectibles (munchkins AND monkeys) + monkey waves.
//
// The DO owns monkey-wave timing so all clients spawn the same monkeys
// at the same positions — no per-client desync. Munchkin collection is
// shared (whoever reaches first gets it, peer_collect hides it everywhere).
//
// Modeled on GrabDemoRoom but stripped of round/promotion logic.

const MONKEY_WAVE_INTERVAL_MS = 20_000;   // a wave every 20s
const MONKEYS_PER_WAVE_BASE = 3;
const MONKEYS_PER_PLAYER = 1;             // +1 monkey per connected player
const MONKEY_MAX_PER_WAVE = 8;            // cap
const HEARTBEAT_MS = 30_000;
const STALE_AFTER_MS = 90_000;

export class OzRoom {
	constructor(state, env) {
		this.state = state;
		this.env = env;
		// sessionId → { ws, userId, name, score, x, y, z, yaw, lastUpdate, lastPing }
		this.connections = new Map();
		this.collectedMunchkinIds = new Set();   // shared collected set
		this.collectedMonkeyIds = new Set();
		this.nextMonkeyId = 0;
		this.monkeyTimer = null;
		this.waveCount = 0;
	}

	async fetch(request) {
		const url = new URL(request.url);

		if (url.pathname === '/ws' || url.pathname === '/api/oz/ws') {
			return this._handleUpgrade(request, url);
		}

		if (url.pathname === '/' || url.pathname === '') {
			return Response.json({
				status: 'ok',
				service: 'oz-room',
				players: this.connections.size,
				munchkinsCollected: this.collectedMunchkinIds.size,
				monkeysCollected: this.collectedMonkeyIds.size,
				waveCount: this.waveCount,
			});
		}

		return new Response('Not found', { status: 404 });
	}

	_handleUpgrade(request, url) {
		const userId = url.searchParams.get('user') || crypto.randomUUID();
		const name = url.searchParams.get('name') || ('Player-' + Math.random().toString(36).slice(2, 5));

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);
		server.accept();
		const sessionId = crypto.randomUUID();

		this.connections.set(sessionId, {
			ws: server, userId, name, score: 0,
			x: 0, y: 1.6, z: 6, yaw: 0,
			lastUpdate: 0, lastPing: Date.now(),
		});

		const hb = setInterval(() => {
			const conn = this.connections.get(sessionId);
			if (!conn) { clearInterval(hb); return; }
			if (Date.now() - conn.lastPing > STALE_AFTER_MS) {
				this._removeConnection(sessionId);
				clearInterval(hb);
			}
		}, HEARTBEAT_MS);

		server.send(JSON.stringify({ type: 'ping' }));
		server.addEventListener('message', () => {
			const c = this.connections.get(sessionId);
			if (c) c.lastPing = Date.now();
		});

		// Send roster + shared collected sets to the newcomer
		server.send(JSON.stringify({
			type: 'roster',
			sessionId,
			peers: this._roster(sessionId),
			collectedMunchkinIds: [...this.collectedMunchkinIds],
			collectedMonkeyIds: [...this.collectedMonkeyIds],
			waveCount: this.waveCount,
		}));

		this._broadcast({
			type: 'peer_joined', sessionId, userId, name,
			x: 0, y: 1.6, z: 6, yaw: 0,
		}, sessionId);

		server.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(event.data);
				this._handleMessage(sessionId, data);
			} catch (e) {}
		});

		server.addEventListener('close', () => this._removeConnection(sessionId));
		server.addEventListener('error', () => this._removeConnection(sessionId));

		// Start monkey waves if not already running
		if (!this.monkeyTimer) this._startMonkeyWaves();

		return new Response(null, { status: 101, webSocket: client });
	}

	_handleMessage(sessionId, data) {
		const conn = this.connections.get(sessionId);
		if (!conn) return;

		switch (data.type) {
			case 'pose': {
				const now = Date.now();
				if (now - conn.lastUpdate < 50) return;
				conn.x = data.x; conn.y = data.y; conn.z = data.z; conn.yaw = data.yaw;
				conn.lastUpdate = now;
				this._broadcast({
					type: 'peer_pose', sessionId, x: data.x, y: data.y, z: data.z, yaw: data.yaw,
				}, sessionId);
				break;
			}
			case 'collect_munchkin': {
				if (this.collectedMunchkinIds.has(data.munchkinId)) return;
				this.collectedMunchkinIds.add(data.munchkinId);
				conn.score = data.score;
				this._broadcast({
					type: 'munchkin_collected', sessionId, munchkinId: data.munchkinId, score: conn.score,
				});
				break;
			}
			case 'collect_monkey': {
				if (this.collectedMonkeyIds.has(data.monkeyId)) return;
				this.collectedMonkeyIds.add(data.monkeyId);
				conn.score = data.score;
				this._broadcast({
					type: 'monkey_collected', sessionId, monkeyId: data.monkeyId, score: conn.score,
				});
				break;
			}
			case 'score': {
				conn.score = data.score;
				this._broadcast({ type: 'peer_score', sessionId, score: conn.score }, sessionId);
				break;
			}
			// WebRTC signaling relay (for future voice chat)
			case 'rtc_offer':
			case 'rtc_answer':
			case 'rtc_ice': {
				const target = this.connections.get(data.to);
				if (target) {
					target.ws.send(JSON.stringify({ ...data, from: sessionId }));
				}
				break;
			}
		}
	}

	// ── Monkey waves: spawn monkeys at deterministic positions so all ──
	// clients agree. Positions derived from monkeyId (same formula the
	// client uses). Wave size scales with player count.
	_startMonkeyWaves() {
		const fire = () => {
			if (this.connections.size === 0) return;  // nobody here, skip
			const count = Math.min(
				MONKEY_MAX_PER_WAVE,
				MONKEYS_PER_WAVE_BASE + this.connections.size * MONKEYS_PER_PLAYER
			);
			const monkeys = [];
			for (let i = 0; i < count; i++) {
				const mid = this.nextMonkeyId++;
				const angle = (mid / 8) * Math.PI * 2 + (mid % 3) * 0.5;
				const radius = 8 + (mid % 4) * 2;
				monkeys.push({
					monkeyId: mid,
					x: Math.cos(angle) * radius,
					z: Math.sin(angle) * radius,
					spawnTime: Date.now(),
				});
			}
			this.waveCount++;
			this._broadcast({ type: 'monkey_wave', monkeys, waveCount: this.waveCount });
		};
		// First wave after 8s (let the player settle), then every 20s
		setTimeout(fire, 8000);
		this.monkeyTimer = setInterval(fire, MONKEY_WAVE_INTERVAL_MS);
	}

	_roster(excludeId) {
		return [...this.connections.entries()]
			.filter(([id]) => id !== excludeId)
			.map(([id, c]) => ({
				sessionId: id, userId: c.userId, name: c.name,
				score: c.score, x: c.x, y: c.y, z: c.z, yaw: c.yaw,
			}));
	}

	_removeConnection(sessionId) {
		const existed = this.connections.delete(sessionId);
		if (!existed) return;
		this._broadcast({ type: 'peer_left', sessionId });
		// Stop waves if room empties
		if (this.connections.size === 0 && this.monkeyTimer) {
			clearInterval(this.monkeyTimer);
			this.monkeyTimer = null;
		}
	}

	_broadcast(msg, excludeId) {
		const data = JSON.stringify(msg);
		for (const [id, conn] of this.connections) {
			if (id === excludeId) continue;
			try { conn.ws.send(data); } catch {}
		}
	}
}
