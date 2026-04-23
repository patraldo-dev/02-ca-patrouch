import { json } from "@sveltejs/kit";
function encrypt(text, userId) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const keyBytes = encoder.encode("patrouch-tts-" + userId);
  const encrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  return Array.from(encrypted).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function GET({ locals }) {
  const user = locals.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const row = await locals.db.prepare("SELECT cf_api_key_encrypted, cf_account_id FROM users WHERE id = ?").bind(user.id).first();
  return json({
    hasKey: !!row?.cf_api_key_encrypted,
    accountId: row?.cf_account_id || null
  });
}
async function POST({ request, locals }) {
  const user = locals.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const { apiKey, accountId } = await request.json();
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
    return json({ error: "Invalid API key" }, { status: 400 });
  }
  if (!accountId || typeof accountId !== "string" || accountId.trim().length < 10) {
    return json({ error: "Invalid Account ID" }, { status: 400 });
  }
  const encrypted = encrypt(apiKey.trim(), user.id);
  await locals.db.prepare("UPDATE users SET cf_api_key_encrypted = ?, cf_account_id = ? WHERE id = ?").bind(encrypted, accountId.trim(), user.id).run();
  return json({ success: true });
}
async function DELETE({ locals }) {
  const user = locals.user;
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  await locals.db.prepare("UPDATE users SET cf_api_key_encrypted = NULL, cf_account_id = NULL WHERE id = ?").bind(user.id).run();
  return json({ success: true });
}
export {
  DELETE,
  GET,
  POST
};
