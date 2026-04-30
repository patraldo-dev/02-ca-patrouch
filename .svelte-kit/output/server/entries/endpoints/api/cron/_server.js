import { json } from "@sveltejs/kit";
async function GET({ url, platform }) {
  const secret = url.searchParams.get("secret");
  const envSecret = await platform?.env?.CRON_SECRET?.get?.() ?? null;
  if (!envSecret || secret !== envSecret) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  const task = url.searchParams.get("task");
  const origin = url.searchParams.get("origin") || "https://patrouch.ca";
  try {
    const endpoints = {
      "sappho": "/api/sappho/write",
      "drift": "/api/drift/simulate",
      "narrator": "/api/narrator",
      "bot-ai": "/api/bottlequest/bot-ai-cron",
      "search-reindex": "/api/search/index"
    };
    const path = endpoints[task];
    if (!path) {
      return json({ error: `Unknown task: ${task}` }, { status: 400 });
    }
    const targetUrl = `${origin}${path}`;
    const method = ["drift", "search-reindex"].includes(task) ? "GET" : "POST";
    const resp = await fetch(targetUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer cron-cf-trigger-2026"
      }
    });
    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return json({ ok: true, task, status: resp.status, result: typeof data === "object" ? data : { raw: String(data).slice(0, 500) } });
  } catch (e) {
    return json({ error: e.message, task }, { status: 500 });
  }
}
export {
  GET
};
