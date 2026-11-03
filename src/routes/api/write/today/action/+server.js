import { json } from "@sveltejs/kit";
import { handleAction } from "#lib/server/writing-stats.js";
import { env } from 'cloudflare:workers';

function getLocale(event) {
  const q = event.url.searchParams.get("locale");
  if (["en", "es", "fr"].includes(q)) return q;
  const cookie = event.cookies.get("locale");
  if (["en", "es", "fr"].includes(cookie)) return cookie;
  const accept = event.request.headers.get("accept-language") || "";
  if (accept.startsWith("fr")) return "fr";
  if (accept.startsWith("es")) return "es";
  return "en";
}

export async function POST(event) {
  const user = event.locals.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const body = await event.request.json();
  const { action } = body;
  const locale = body.locale || getLocale(event);

  if (!action || !["accepted", "passed", "completed"].includes(action)) {
    return json(
      { error: 'Action must be "accepted" or "passed"' },
      { status: 400 },
    );
  }

  const db = event.locals.db;
  const ai = env?.AI;
  let result;
  try {
    result = await handleAction(db, ai, user.id, action, locale);
  } catch (err) {
    // Surface the real failure — this endpoint had been silently 500ing
    // (pass button did nothing, nothing logged) for months.
    console.error("POST /api/write/today/action error:", err);
    return json(
      { error: "Action failed", detail: err?.message || String(err) },
      { status: 500 },
    );
  }

  if (result.error) return json(result, { status: 429 });
  return json(result);
}
