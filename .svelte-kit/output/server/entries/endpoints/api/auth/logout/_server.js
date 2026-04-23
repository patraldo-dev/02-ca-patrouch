import { json } from "@sveltejs/kit";
async function POST({ platform }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: "DB unavailable" }, { status: 500 });
  const response = json({ success: true });
  response.headers.set(
    "Set-Cookie",
    "session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict"
  );
  return response;
}
export {
  POST
};
