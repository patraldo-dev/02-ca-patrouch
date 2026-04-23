// Booty Battle Chat Room — Durable Object with SQLite
// Each DO instance = one game chat room (stub ID = room name)
// WebSocket for real-time text messaging
// Albot Camus participates as AI narrator

export class BootyChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = new Map(); // sessionId → { ws, username, displayName }
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Ensure SQLite is initialized
    await this.ensureDB();

    // GET /messages?limit=50&before=timestamp — fetch history
    if (request.method === 'GET' && path === '/messages') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
      const before = url.searchParams.get('before');
      let sql = 'SELECT id, username, display_name, message, type, created_at FROM messages';
      if (before) sql += ` WHERE created_at < ?`;
      sql += ` ORDER BY created_at DESC LIMIT ?`;
      const params = before ? [before, limit] : [limit];
      const result = await this.state.storage.sql.prepare(sql).bind(...params).all();
      const messages = (result.results || []).reverse();
      return Response.json({ messages });
    }

    // POST /system — system message (join/leave/narrator events)
    if (request.method === 'POST' && path === '/system') {
      const { message, type, username } = await request.json();
      if (!message) return Response.json({ error: 'message required' }, { status: 400 });
      return await this.postMessage({
        username: username || 'system',
        display_name: null,
        message: String(message).slice(0, 500),
        type: type || 'system'
      });
    }

    // WebSocket upgrade at /ws
    if (path === '/ws') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();

      const username = url.searchParams.get('username') || 'anonymous';
      const displayName = url.searchParams.get('display_name') || username;
      const sessionId = crypto.randomUUID();

      // Store connection
      this.connections.set(sessionId, { ws: server, username, displayName });

      // Send recent history to new user
      try {
        const result = await this.state.storage.sql.prepare(
          'SELECT id, username, display_name, message, type, created_at FROM messages ORDER BY created_at DESC LIMIT 50'
        ).bind().all();
        const messages = (result.results || []).reverse();
        server.send(JSON.stringify({ type: 'history', messages }));
      } catch (e) {
        console.error('History load error:', e);
      }

      // Broadcast join
      await this.postSystemMessage(`${displayName} se unió al chat`);

      // Handle incoming messages
      server.addEventListener('message', async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'chat' && data.message) {
            const trimmed = String(data.message).trim().slice(0, 500);
            if (!trimmed) return;

            // Save and broadcast user message
            await this.postMessage({
              username,
              display_name: displayName,
              message: trimmed,
              type: 'user'
            });

            // Maybe Albot Camus responds (~25% chance)
            if (Math.random() < 0.25 && username !== 'albot-camus') {
              await this.narratorRespond(trimmed, username);
            }
          }
        } catch (e) {
          console.error('WS message error:', e);
        }
      });

      server.addEventListener('close', () => {
        this.connections.delete(sessionId);
        this.postSystemMessage(`${displayName} salió del chat`).catch(() => {});
      });

      server.addEventListener('error', () => {
        this.connections.delete(sessionId);
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not found', { status: 404 });
  }

  async ensureDB() {
    if (this._dbReady) return;
    try {
      await this.state.storage.sql.prepare(
        `CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          display_name TEXT,
          message TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'user',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`
      ).run();
      await this.state.storage.sql.prepare(
        `CREATE INDEX IF NOT EXISTS idx_messages_time ON messages(created_at)`
      ).run();
      this._dbReady = true;
    } catch (e) {
      console.error('DB init error:', e);
      this._dbReady = true; // Don't retry endlessly
    }
  }

  async postMessage({ username, display_name, message, type }) {
    const id = crypto.randomUUID();
    await this.state.storage.sql.prepare(
      `INSERT INTO messages (id, username, display_name, message, type, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(id, username, display_name, message, type).run();

    this.broadcast({
      id, username, display_name, message, type,
      created_at: new Date().toISOString()
    });

    return Response.json({ ok: true, id });
  }

  async postSystemMessage(message) {
    const id = crypto.randomUUID();
    try {
      await this.state.storage.sql.prepare(
        `INSERT INTO messages (id, username, display_name, message, type, created_at)
         VALUES (?, 'system', NULL, ?, 'system', datetime('now'))`
      ).bind(id, message).run();
    } catch {}

    this.broadcast({
      id, username: 'system', display_name: null,
      message, type: 'system', created_at: new Date().toISOString()
    });
  }

  broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const [, conn] of this.connections) {
      try { conn.ws.send(data); } catch {}
    }
  }

  async narratorRespond(userMessage, username) {
    try {
      // Get recent context
      const result = await this.state.storage.sql.prepare(
        "SELECT username, message FROM messages WHERE type IN ('user','narrator') ORDER BY created_at DESC LIMIT 8"
      ).bind().all();
      const context = (result.results || []).map(r => `${r.username}: ${r.message}`).join('\n');

      const ai = this.env.AI;
      const resp = await ai.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
        prompt: `You are Albot Camus, the God-like Narrator of the Bottle Booty ocean game.
You speak in cryptic, poetic, slightly ominous prose. Keep responses to 1-2 short sentences max.
Respond naturally to the conversation. Match the language of the user.

Recent chat:
${context}

${username} said: ${userMessage}

Albot Camus:`,
        max_tokens: 100
      });

      const reply = (resp?.response || '').trim().slice(0, 300);
      if (!reply) return;

      await this.postMessage({
        username: 'albot-camus',
        display_name: 'Albot Camus',
        message: reply,
        type: 'narrator'
      });
    } catch (e) {
      console.error('Narrator error:', e);
    }
  }

  async webSocketMessage(ws, message) {
    // Placeholder — handled in fetch via event listener
  }

  async webSocketClose(ws, code, reason, wasClean) {
    // Placeholder — handled in fetch via event listener
  }
}
