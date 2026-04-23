import { error, redirect } from "@sveltejs/kit";
async function GET({ url, platform }) {
  const token = url.searchParams.get("token");
  if (!token) {
    throw error(400, { message: "Missing confirmation token" });
  }
  if (!platform?.env?.DB_book) {
    throw error(500, { message: "Database not available" });
  }
  const db = platform.env.DB_book;
  try {
    const subscriber = await db.prepare(
      "SELECT id, email, confirmed, token_expires_at FROM subscribers WHERE confirmation_token = ?"
    ).bind(token).first();
    if (!subscriber) {
      throw error(400, { message: "Invalid or expired token" });
    }
    if (subscriber.token_expires_at && new Date(subscriber.token_expires_at) < /* @__PURE__ */ new Date()) {
      throw error(400, { message: "Confirmation token has expired" });
    }
    if (subscriber.confirmed) {
      throw redirect(302, "/?confirmed=already");
    }
    await db.prepare(
      "UPDATE subscribers SET confirmed = 1, confirmed_at = datetime('now'), confirmation_token = NULL WHERE id = ?"
    ).bind(subscriber.id).run();
    throw redirect(302, "/?confirmed=success");
  } catch (e) {
    if (e.status) throw e;
    console.error("Newsletter confirmation error:", e);
    throw error(500, { message: "Failed to confirm subscription" });
  }
}
export {
  GET
};
