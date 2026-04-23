import { json } from "@sveltejs/kit";
import { s as saveDraft, p as publishWriting } from "../../../../../chunks/writing-stats.js";
async function POST(event) {
  const user = event.locals.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const body = await event.request.json();
  const { title, content, promptId, aiAssisted, visibility, status } = body;
  if (!title?.trim() || !content?.trim()) {
    return json({ error: "Title and content are required" }, { status: 400 });
  }
  const db = event.locals.db;
  if (status === "draft") {
    const result2 = await saveDraft(db, user.id, { title, content, promptId, aiAssisted });
    return json({ success: true, ...result2 });
  }
  const result = await publishWriting(db, user.id, { title, content, promptId, aiAssisted, visibility });
  return json({ success: true, ...result });
}
export {
  POST
};
