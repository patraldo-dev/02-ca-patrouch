import "@oslojs/encoding";
globalThis.process = globalThis.process || {};
globalThis.process.env = globalThis.process.env || {};
globalThis.process.env.OSLO_PASSWORD_DISABLE_NATIVE = "1";
const SESSION_EXPIRES_IN_MS = 30 * 24 * 60 * 60 * 1e3;
async function validateSession(db, sessionId) {
  const now = Date.now();
  const { results } = await db.prepare(`
        SELECT id, user_id, expires_at
        FROM user_session
        WHERE id = ?
    `).bind(sessionId).all();
  if (results.length === 0) {
    return null;
  }
  const row = results[0];
  const session = {
    id: row.id,
    userId: row.user_id,
    expiresAt: new Date(row.expires_at),
    fresh: false
  };
  if (now >= row.expires_at) {
    await invalidateSession(db, sessionId);
    return null;
  }
  if (now >= row.expires_at - SESSION_EXPIRES_IN_MS / 2) {
    const newExpiresAt = now + SESSION_EXPIRES_IN_MS;
    await db.prepare(`
            UPDATE user_session
            SET expires_at = ?
            WHERE id = ?
        `).bind(newExpiresAt, sessionId).run();
    session.expiresAt = new Date(newExpiresAt);
    session.fresh = true;
  }
  return session;
}
async function invalidateSession(db, sessionId) {
  await db.prepare(`
        DELETE FROM user_session
        WHERE id = ?
    `).bind(sessionId).run();
}
function setSessionCookie(headers, sessionId, expiresAt) {
  const cookie = [
    `session=${sessionId}`,
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
    "Path=/"
  ];
  if (process.env.NODE_ENV === "production") {
    cookie.push("Secure");
  }
  headers.set("Set-Cookie", cookie.join("; "));
}
function deleteSessionCookie(headers) {
  const cookie = [
    "session=",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Path=/"
  ];
  if (process.env.NODE_ENV === "production") {
    cookie.push("Secure");
  }
  headers.set("Set-Cookie", cookie.join("; "));
}
async function handle({ event, resolve }) {
  if (!event.platform?.env?.DB_book) {
    throw new Error('❌ D1 database binding "DB_book" not found. Check wrangler.jsonc.');
  }
  event.locals.db = event.platform.env.DB_book;
  const localeCookie = event.cookies.get("preferredLanguage") || event.cookies.get("locale");
  event.locals.locale = ["en", "es", "fr"].includes(localeCookie) ? localeCookie : "es";
  if (event.platform?.env?.MAILGUN_API_KEY) {
    console.log("🔑 MAILGUN_API_KEY is set (length:", event.platform.env.MAILGUN_API_KEY.length, ")");
  } else {
    console.error("❌ MAILGUN_API_KEY is MISSING or undefined");
  }
  const sessionId = event.cookies.get("session");
  let session = null;
  let user = null;
  if (sessionId) {
    console.log("🍪 Session cookie found:", sessionId);
    session = await validateSession(event.locals.db, sessionId);
    if (session) {
      console.log("✅ Session validated for user ID:", session.userId);
      const { results } = await event.locals.db.prepare(`
                SELECT id, username, email, email_verified_at, role, bio, avatar_url, display_name, created_at
                FROM users
                WHERE id = ?
            `).bind(session.userId).all();
      if (results[0]) {
        user = results[0];
        user.email_verified = user.email_verified_at !== null;
        console.log("👤 User loaded:", user.username);
      } else {
        console.log("🗑️ User not found — invalidating session");
        await invalidateSession(event.locals.db, sessionId);
        session = null;
      }
    } else {
      console.log("❌ Invalid session — clearing cookie");
      deleteSessionCookie(event.cookies);
    }
  } else {
    console.log("📭 No session cookie found");
  }
  event.locals.session = session;
  event.locals.user = user;
  if (event.platform) {
    event.locals.platform = event.platform;
  }
  const response = await resolve(event);
  if (session?.fresh) {
    console.log("🔄 Refreshing session cookie");
    setSessionCookie(response.headers, session.id, session.expiresAt);
  }
  return response;
}
export {
  handle
};
