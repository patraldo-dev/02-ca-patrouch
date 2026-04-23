import { json } from "@sveltejs/kit";
const MODERATION_PROMPT = 'You are a moderation filter for a literary writing community. Check for: hate speech, harassment, spam, explicit content unrelated to writing, personal attacks. Respond ONLY with "approve" or "reject: [brief reason]".';
async function GET({ locals, params, url }) {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  const { id: writingId } = params;
  const sort = url.searchParams.get("sort") || "newest";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = (page - 1) * limit;
  const db = locals.db;
  const writing = await db.prepare(
    "SELECT id, allow_comments FROM writings WHERE id = ?"
  ).bind(writingId).first();
  if (!writing) return json({ error: "Not found" }, { status: 404 });
  let orderClause = "ORDER BY c.created_at DESC";
  if (sort === "oldest") orderClause = "ORDER BY c.created_at ASC";
  else if (sort === "liked") orderClause = "ORDER BY c.likes_count DESC, c.created_at DESC";
  else if (sort === "picks") orderClause = "ORDER BY c.is_featured DESC, c.created_at DESC";
  const userLikes = await db.prepare(
    "SELECT comment_id FROM comment_likes WHERE user_id = ?"
  ).bind(locals.user.id).all();
  const likedSet = new Set(userLikes.results?.map((r) => r.comment_id) || []);
  const { results } = await db.prepare(`
        SELECT c.id, c.content, c.status, c.is_featured, c.likes_count, c.created_at,
               c.parent_id, c.user_id, u.username, u.role as user_role
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.writing_id = ? AND c.status = 'approved'
        ${orderClause}
        LIMIT ? OFFSET ?
    `).bind(writingId, limit, offset).all();
  const countResult = await db.prepare(
    "SELECT COUNT(*) as total FROM comments WHERE writing_id = ? AND status = ?"
  ).bind(writingId, "approved").first();
  return json({
    comments: results.map((c) => ({ ...c, liked: likedSet.has(c.id) })),
    total: countResult?.total || 0,
    page,
    limit
  });
}
async function POST({ locals, params, request, platform }) {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  const writingId = params.id;
  const db = locals.db;
  const writing = await db.prepare(
    "SELECT id, allow_comments, user_id as author_id FROM writings WHERE id = ?"
  ).bind(writingId).first();
  if (!writing) return json({ error: "Not found" }, { status: 404 });
  if (!writing.allow_comments) return json({ error: "Comments are disabled" }, { status: 403 });
  const body = await request.json();
  const { content, parent_id } = body;
  if (!content || content.trim().length === 0) return json({ error: "Content required" }, { status: 400 });
  if (content.length > 1500) return json({ error: "Comment too long" }, { status: 400 });
  if (parent_id) {
    const userRole2 = locals.user.role || "user";
    if (userRole2 !== "member" && userRole2 !== "admin") {
      return json({ error: "Members only can reply" }, { status: 403 });
    }
    const parent = await db.prepare(
      "SELECT id FROM comments WHERE id = ? AND writing_id = ?"
    ).bind(parent_id, writingId).first();
    if (!parent) return json({ error: "Parent comment not found" }, { status: 404 });
  }
  let status = "pending";
  const userRole = locals.user.role || "user";
  if (userRole === "admin") {
    status = "approved";
  } else {
    try {
      const ai = platform?.env?.AI;
      if (ai) {
        const resp = await ai.run("@cf/mistralai/mistral-small-3.1-24b-instruct", {
          messages: [
            { role: "system", content: MODERATION_PROMPT },
            { role: "user", content }
          ]
        });
        const decision = (resp?.response || "").trim().toLowerCase();
        if (decision.startsWith("approve")) {
          status = "approved";
        } else {
          status = "rejected";
        }
      } else {
        status = "approved";
      }
    } catch (e) {
      console.error("Moderation error:", e);
      status = "approved";
    }
  }
  const commentId = crypto.randomUUID();
  await db.prepare(`
        INSERT INTO comments (id, writing_id, user_id, parent_id, content, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(commentId, writingId, locals.user.id, parent_id || null, content.trim(), status).run();
  if (status === "rejected") {
    return json({ error: "moderation", message: "Your comment was not approved by our moderation filter." }, { status: 422 });
  }
  const newComment = await db.prepare(`
        SELECT c.id, c.content, c.status, c.is_featured, c.likes_count, c.created_at,
               c.parent_id, c.user_id, u.username, u.role as user_role
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
    `).bind(commentId).first();
  return json({ comment: { ...newComment, liked: false } }, { status: 201 });
}
export {
  GET,
  POST
};
