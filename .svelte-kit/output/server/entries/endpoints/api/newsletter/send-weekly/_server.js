import { json } from "@sveltejs/kit";
import { s as sendDailyPromptEmail } from "../../../../../chunks/mailgun.js";
async function POST({ request, platform }) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer sappho-cron-2026-secret`) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = platform?.env?.DB_book;
  const ai = platform?.env?.AI;
  if (!db) return json({ error: "DB unavailable" }, { status: 503 });
  const { results: subscribers } = await db.prepare(
    "SELECT email, locale FROM subscribers WHERE type = 'daily-prompt' AND confirmed = 1"
  ).all();
  if (!subscribers.length) {
    return json({ sent: 0, message: "No subscribers" });
  }
  const today = /* @__PURE__ */ new Date();
  const cst = new Date(today.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  const dateStr = cst.toISOString().slice(0, 10);
  const byLocale = {};
  for (const sub of subscribers) {
    const loc = sub.locale || "en";
    if (!byLocale[loc]) byLocale[loc] = [];
    byLocale[loc].push(sub.email);
  }
  let sent = 0;
  let errors = [];
  for (const [locale, emails] of Object.entries(byLocale)) {
    let promptText;
    const existing = await db.prepare(
      "SELECT prompt_text FROM writing_prompts WHERE prompt_date = ? AND locale = ? AND category = 'daily-community' LIMIT 1"
    ).bind(dateStr, locale).first();
    if (existing) {
      promptText = existing.prompt_text;
    } else if (ai) {
      try {
        const result = await ai.run("@cf/mistralai/mistral-small-3.1-24b-instruct", {
          messages: [{
            role: "user",
            content: `Generate a single creative writing prompt for Sunday. It should be gentle, contemplative, inspiring — not demanding. Just one sentence in ${locale === "es" ? "Spanish" : locale === "fr" ? "French" : "English"}. No explanations, just the prompt.`
          }]
        });
        promptText = result?.response?.trim();
      } catch (e) {
        errors.push(`AI failed for ${locale}: ${e.message}`);
        continue;
      }
    } else {
      errors.push(`No AI for ${locale}`);
      continue;
    }
    for (const email of emails) {
      try {
        await sendDailyPromptEmail(email, promptText, locale, platform.env);
        sent++;
      } catch (e) {
        errors.push(`${email}: ${e.message}`);
      }
    }
    if (ai) await new Promise((r) => setTimeout(r, 500));
  }
  return json({ sent, total: subscribers.length, errors: errors.length > 0 ? errors : void 0 });
}
export {
  POST
};
