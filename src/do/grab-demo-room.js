// GrabDemoRoom — Durable Object for the grab-demo multiplayer game.
//
// One DO instance = one difficulty-level room. Players who open
// /portals/grab-demo?level=N all land in the same level-N room. The room
// tracks: connected players (presence), shared collected-entity set,
// per-player scores, and a round timer. When the timer expires, the
// highest-scoring player promotes to level N+1 (redirects to a fresh room);
// losers stay and pair with the next arrivals.
//
// Unlike PortalRoom (pose-only relay), this DO understands game messages:
//   inbound:  pose, collect, score
//   outbound: roster, peer_joined, peer_left, peer_pose, peer_collect,
//             peer_score, entity_spawn, round_end, round_start, promote
//
// No persistence — round state is ephemeral (in-memory). SQLite is declared
// in the migration so a future phase can persist a leaderboard.

const ROUND_DURATION_MS = 90_000;      // 90s rounds
const ENTITY_BASE = 20;                 // GLBs at 1 player
const ENTITY_PER_PLAYER = 10;           // +10 GLBs per additional player
const ENTITY_PER_LEVEL = 5;             // +5 GLBs per difficulty level
const RESPAWN_THRESHOLD = 0.5;          // spawn fresh GLBs when <50% remain
const HEARTBEAT_MS = 30_000;
const STALE_AFTER_MS = 90_000;

export class GrabDemoRoom {
	constructor(state, env) {
		this.state = state;
		this.env = env;
		// sessionId → { ws, userId, name, score, x, y, z, yaw, lastUpdate, lastPing }
		this.connections = new Map();
		this.roundActive = false;
		this.roundEndTime = 0;
		this.roundTimer = null;
		this.nextEntityId = 0;
		this.entities = [];               // [{ entityId, x, z, modelIndex, collected }]
		this.level = 1;                   // set from first connection's ?level= param
	}

	async fetch(request) {
		const url = new URL(request.url);

		if (url.pathname === '/ws' || url.pathname === '/api/grab-demo/ws') {
			return this._handleUpgrade(request, url);
		}

		// Health check
		if (url.pathname === '/' || url.pathname === '') {
			return Response.json({
				status: 'ok',
				service: 'grab-demo-room',
				level: this.level,
				players: this.connections.size,
				roundActive: this.roundActive,
				entitiesRemaining: this.entities.filter((e) => !e.collected).length,
			});
		}

		return new Response('Not found', { status: 404 });
	}

	_handleUpgrade(request, url) {
		const userId = url.searchParams.get('user') || crypto.randomUUID();
		const name = url.searchParams.get('name') || ('Player-' + Math.random().toString(36).slice(2, 5));
		const level = parseInt(url.searchParams.get('level') || '1', 10);

		// First connection sets the room's level (subsequent must match or be
		// redirected — but for phase 1, we trust the client's ?level= param).
		if (this.connections.size === 0) {
			this.level = level;
			this._buildEntityPool();
		}

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);
		server.accept();
		const sessionId = crypto.randomUUID();

		this.connections.set(sessionId, {
			ws: server, userId, name, score: 0,
			x: 0, y: 1.5, z: 3, yaw: 0,
			lastUpdate: 0, lastPing: Date.now(),
		});

		// Heartbeat — reap dead connections
		const hb = setInterval(() => {
			const conn = this.connections.get(sessionId);
			if (!conn) { clearInterval(hb); return; }
			if (Date.now() - conn.lastPing > STALE_AFTER_MS) {
				this._removeConnection(sessionId);
				clearInterval(hb);
			}
		}, HEARTBEAT_MS);

		server.send(JSON.stringify({ type: 'ping' }));

		// Any message updates lastPing (heartbeat ack)
		server.addEventListener('message', () => {
			const c = this.connections.get(sessionId);
			if (c) c.lastPing = Date.now();
		});

		// Send roster + current entity pool + round state to the newcomer
		const peers = this._roster(sessionId);
		server.send(JSON.stringify({
			type: 'roster',
			sessionId,             // tell the client its own id
			peers,
			level: this.level,
			entities: this.entities.filter((e) => !e.collected),
			roundActive: this.roundActive,
			roundEnd: this.roundEndTime,
		}));

		// Announce to everyone else
		this._broadcast({
			type: 'peer_joined', sessionId, userId, name,
			x: 0, y: 1.5, z: 3, yaw: 0,
		}, sessionId);

		// Game message handlers
		server.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(event.data);
				this._handleMessage(sessionId, data);
			} catch (e) {
				// ignore malformed
			}
		});

		server.addEventListener('close', () => this._removeConnection(sessionId));
		server.addEventListener('error', () => this._removeConnection(sessionId));

		// Start a round if none active
		if (!this.roundActive) this._startRound();

		return new Response(null, { status: 101, webSocket: client });
	}

	_handleMessage(sessionId, data) {
		const conn = this.connections.get(sessionId);
		if (!conn) return;

		switch (data.type) {
			case 'pose': {
				const now = Date.now();
				if (now - conn.lastUpdate < 50) return;  // throttle
				conn.x = data.x; conn.y = data.y; conn.z = data.z; conn.yaw = data.yaw;
				conn.lastUpdate = now;
				this._broadcast({
					type: 'peer_pose', sessionId, x: data.x, y: data.y, z: data.z, yaw: data.yaw,
				}, sessionId);
				break;
			}
			case 'collect': {
				// Mark entity collected (idempotent — first collector wins it)
				const ent = this.entities.find((e) => e.entityId === data.entityId);
				if (!ent || ent.collected) return;
				ent.collected = true;
				conn.score = data.score;  // client tracks its own cumulative score
				this._broadcast({
					type: 'peer_collect', sessionId, entityId: data.entityId, score: conn.score,
				});
				// Respawn if pool running low
				if (this._remainingFraction() < RESPAWN_THRESHOLD) {
					this._spawnEntities(5);
				}
				break;
			}
			case 'score': {
				conn.score = data.score;
				this._broadcast({ type: 'peer_score', sessionId, score: conn.score }, sessionId);
				break;
			}
			// Other message types (rtc_*, profile) — ignored for now
		}
	}

	_startRound() {
		if (this.roundActive) return;
		this.roundActive = true;
		this.roundEndTime = Date.now() + ROUND_DURATION_MS;
		// Reset collected flags (fresh round = fresh entities)
		for (const e of this.entities) e.collected = false;
		this._broadcast({
			type: 'round_start',
			level: this.level,
			roundEnd: this.roundEndTime,
			entities: this.entities,
		});
		// Schedule round end
		if (this.roundTimer) clearTimeout(this.roundTimer);
		this.roundTimer = setTimeout(() => this._endRound(), ROUND_DURATION_MS);
	}

	_endRound() {
		this.roundActive = false;
		this.roundTimer = null;
		if (this.connections.size === 0) return;  // nobody left

		// Find highest scorer (ties → earliest joiner wins, deterministic)
		let winner = null;
		let highScore = -1;
		const scores = [];
		for (const [id, conn] of this.connections) {
			scores.push({ sessionId: id, name: conn.name, score: conn.score });
			if (conn.score > highScore) {
				highScore = conn.score;
				winner = id;
			}
		}
		const winnerConn = winner ? this.connections.get(winner) : null;

		// SOLO PLAYER GUARD: a solo player (alone in the room) should NOT be
		// promoted just because the timer expired. Promotion requires:
		//   - 2+ players were in the round (real competition), AND
		//   - the winner scored at least 1 point (didn't just idle).
		// Without this guard, a solo player wins by default every 90s, gets
		// promoted, redirects to the next level, wins again, loops forever —
		// each redirect cancels the in-flight WS + restarts the boot.
		const shouldPromote = this.connections.size >= 2 && highScore > 0 && winnerConn;

		if (shouldPromote) {
			this._broadcast({
				type: 'round_end',
				winner,
				winnerName: winnerConn.name,
				scores,
				nextLevel: this.level + 1,
			});
			try {
				winnerConn.ws.send(JSON.stringify({ type: 'promote', newLevel: this.level + 1 }));
			} catch {}
			this._removeConnection(winner, /* silent */ true);
		} else {
			// Solo or no-score round: just notify + restart. No promotion.
			this._broadcast({
				type: 'round_end',
				winner: null,
				winnerName: null,
				scores,
				nextLevel: this.level,  // same level, no promotion
			});
		}

		// Reset scores for remaining players
		for (const conn of this.connections.values()) conn.score = 0;

		// If anyone remains, start a fresh round shortly.
		if (this.connections.size > 0) {
			setTimeout(() => this._startRound(), 3000);
		}
	}

	_buildEntityPool() {
		this.entities = [];
		const playerCount = Math.max(1, this.connections.size);
		const count = ENTITY_BASE
			+ (playerCount - 1) * ENTITY_PER_PLAYER
			+ (this.level - 1) * ENTITY_PER_LEVEL;
		this._spawnEntities(count);
	}

	_spawnEntities(n) {
		// New entity IDs are appended; clients get them via entity_spawn /
		// the initial roster. Positions are deterministic-by-id so all clients
		// agree (no separate per-client spawn sync needed beyond the broadcast).
		for (let i = 0; i < n; i++) {
			const entityId = this.nextEntityId++;
			const angle = (entityId / 30) * Math.PI * 2 + (entityId % 3) * 0.3;
			const radius = 4 + (entityId % 3) * 3;
			const entity = {
				entityId,
				x: Math.cos(angle) * radius,
				z: Math.sin(angle) * radius,
				modelIndex: entityId % 3,
				collected: false,
			};
			this.entities.push(entity);
			// Broadcast mid-round spawns; during initial pool build we send
			// the full list in the roster instead.
			if (this.roundActive) {
				this._broadcast({ type: 'entity_spawn', ...entity });
			}
		}
	}

	_remainingFraction() {
		if (this.entities.length === 0) return 0;
		const remaining = this.entities.filter((e) => !e.collected).length;
		return remaining / this.entities.length;
	}

	_roster(excludeId) {
		return [...this.connections.entries()]
			.filter(([id]) => id !== excludeId)
			.map(([id, c]) => ({
				sessionId: id, userId: c.userId, name: c.name,
				score: c.score, x: c.x, y: c.y, z: c.z, yaw: c.yaw,
			}));
	}

	_removeConnection(sessionId, silent = false) {
		const existed = this.connections.delete(sessionId);
		if (!existed) return;
		if (!silent) {
			this._broadcast({ type: 'peer_left', sessionId });
		}
		// If room empties, cancel the round timer (avoid spurious _endRound)
		if (this.connections.size === 0 && this.roundTimer) {
			clearTimeout(this.roundTimer);
			this.roundTimer = null;
			this.roundActive = false;
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
