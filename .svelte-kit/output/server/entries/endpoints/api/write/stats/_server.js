import { json } from "@sveltejs/kit";
import { b as getStats } from "../../../../../chunks/writing-stats.js";
async function GET(event) {
  const user = event.locals.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const stats = await getStats(event.locals.db, user.id);
  return json(stats);
}
export {
  GET
};
