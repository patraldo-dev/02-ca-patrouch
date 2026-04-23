import { redirect } from "@sveltejs/kit";
async function validateSessionAndGetUser(db, sessionId) {
  const now = Date.now();
  const { results } = await db.prepare(`
        SELECT s.id, s.user_id, s.expires_at, u.id, u.username, u.email, u.email_verified_at
        FROM user_session s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND s.expires_at > ?
    `).bind(sessionId, now).all();
  if (results.length === 0) {
    return null;
  }
  const row = results[0];
  const user = {
    id: row.id,
    username: row.username,
    email: row.email,
    email_verified: row.email_verified_at !== null
  };
  return user;
}
async function load({ request, cookies, url, platform }) {
  const sessionId = cookies.get("session");
  if (sessionId) {
    try {
      if (!platform?.env?.DB_book) {
        throw new Error("Database not available");
      }
      const db = platform.env.DB_book;
      const user = await validateSessionAndGetUser(db, sessionId);
      if (user) {
        throw redirect(302, "/");
      }
    } catch (error) {
      if (error.status === 302) {
        throw error;
      }
      console.error("Session validation failed:", error);
    }
  }
  const redirectTo = url.searchParams.get("redirect") || "/";
  const errorMessage = url.searchParams.get("error") || null;
  return {
    redirectTo,
    errorMessage,
    message: errorMessage ? "Login failed. Please check your credentials and try again." : "Please log in to access your account."
  };
}
export {
  load
};
