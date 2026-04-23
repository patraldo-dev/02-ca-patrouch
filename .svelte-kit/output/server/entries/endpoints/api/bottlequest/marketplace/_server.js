import { json } from "@sveltejs/kit";
import { l as logTransaction } from "../../../../../chunks/bottlequest-logger.js";
const ROYALTY_RATE = 0.1;
async function GET({ locals, platform }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ listings: [], wordIndex: [], myWritings: [] });
  try {
    const { results: listings } = await db.prepare(`
            SELECT m.*, w.title, SUBSTR(w.content, 1, 200) as excerpt, w.username as author_name,
                   sp.display_name as seller_name, sp.port_name as seller_port
            FROM bq_marketplace m
            JOIN writings w ON m.writing_id = w.id
            JOIN bq_players sp ON m.seller_player_id = sp.id
            WHERE m.status = 'listed'
            ORDER BY m.listed_at DESC LIMIT 50
        `).all();
    const monthStart = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7) + "-01";
    const { results: wordRows } = await db.prepare(`
            SELECT word, SUM(points_value) as total_points, COUNT(*) as uses
            FROM bq_keyword_proposals
            WHERE created_at >= ? AND status = 'matched'
            GROUP BY word ORDER BY total_points DESC LIMIT 20
        `).bind(monthStart).all();
    return json({ listings: listings || [], wordIndex: wordRows || [] });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
async function POST({ request, locals, platform }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: "No DB" }, { status: 500 });
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { writing_id, price } = await request.json();
    if (!writing_id || !price || price < 1) {
      return json({ error: "Invalid listing" }, { status: 400 });
    }
    const player = await db.prepare("SELECT id FROM bq_players WHERE username = ?").bind(locals.user.username).first();
    if (!player) return json({ error: "No player found" }, { status: 404 });
    const ownership = await db.prepare(
      `SELECT id FROM bq_writing_ownership WHERE writing_id = ? AND owner_player_id = ? AND status = 'owned'`
    ).bind(writing_id, player.id).first();
    const writing = await db.prepare(
      `SELECT id, user_id FROM writings WHERE id = ? AND status = 'published'`
    ).bind(writing_id).first();
    if (!writing) return json({ error: "Writing not found" }, { status: 404 });
    const isOriginalAuthor = writing.user_id === locals.user.id;
    if (!ownership && !isOriginalAuthor) return json({ error: "You do not own this writing" }, { status: 403 });
    const existing = await db.prepare(
      `SELECT id FROM bq_marketplace WHERE writing_id = ? AND status = 'listed'`
    ).bind(writing_id).first();
    if (existing) return json({ error: "Already listed" }, { status: 400 });
    if (isOriginalAuthor && !ownership) {
      await db.prepare(
        `INSERT INTO bq_writing_ownership (id, writing_id, owner_player_id, is_original_author, acquired_price) VALUES (?, ?, ?, 1, 0)`
      ).bind(crypto.randomUUID(), writing_id, player.id).run();
    }
    const authorPlayer = await db.prepare("SELECT id FROM bq_players WHERE user_id = ?").bind(writing.user_id).first();
    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO bq_marketplace (id, writing_id, seller_player_id, price, original_author_id, status)
             VALUES (?, ?, ?, ?, ?, 'listed')`
    ).bind(id, writing_id, player.id, price, authorPlayer?.id || null).run();
    await logTransaction(db, { player_id: player.id, type: "marketplace_buy", amount: -listing.price, detail: `Bought writing ${listing.writing_id}` });
    return json({ success: true, id });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
async function PATCH({ request, locals, platform }) {
  const db = platform?.env?.DB_book;
  if (!db) return json({ error: "No DB" }, { status: 500 });
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { listing_id } = await request.json();
    if (!listing_id) return json({ error: "Missing listing_id" }, { status: 400 });
    const buyer = await db.prepare("SELECT id, fuel FROM bq_players WHERE username = ?").bind(locals.user.username).first();
    if (!buyer) return json({ error: "No player found" }, { status: 404 });
    const listing2 = await db.prepare(
      `SELECT * FROM bq_marketplace WHERE id = ? AND status = 'listed'`
    ).bind(listing_id).first();
    if (!listing2) return json({ error: "Listing not found" }, { status: 404 });
    if (listing2.seller_player_id === buyer.id) return json({ error: "Can't buy your own listing" }, { status: 400 });
    if (buyer.fuel < listing2.price) return json({ error: `Insufficient fuel. Need ${listing2.price}` }, { status: 400 });
    await db.prepare(`UPDATE bq_players SET fuel = fuel - ? WHERE id = ?`).bind(listing2.price, buyer.id).run();
    await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(listing2.price, listing2.seller_player_id).run();
    let royaltyPaid = 0;
    const isResale = listing2.resale_count > 0;
    if (isResale && listing2.original_author_id && listing2.original_author_id !== listing2.seller_player_id) {
      royaltyPaid = Math.ceil(listing2.price * ROYALTY_RATE);
      const sellerNet = listing2.price - royaltyPaid;
      await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(-royaltyPaid, listing2.seller_player_id).run();
      await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(royaltyPaid, listing2.original_author_id).run();
    }
    await db.prepare(
      `UPDATE bq_writing_ownership SET status = 'sold' WHERE writing_id = ? AND owner_player_id = ? AND status = 'owned'`
    ).bind(listing2.writing_id, listing2.seller_player_id).run();
    await db.prepare(
      `INSERT INTO bq_writing_ownership (id, writing_id, owner_player_id, acquired_price, acquired_from_player_id)
             VALUES (?, ?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), listing2.writing_id, buyer.id, listing2.price, listing2.seller_player_id).run();
    await db.prepare(
      `UPDATE bq_marketplace SET status = 'sold', sold_at = datetime('now'), buyer_player_id = ?, resale_count = resale_count + 1, royalty_paid = ? WHERE id = ?`
    ).bind(buyer.id, royaltyPaid, listing_id).run();
    return json({
      success: true,
      royalty_paid: royaltyPaid,
      message: isResale && royaltyPaid ? `Purchased! 10% royalty (${royaltyPaid} ⛽) paid to original author` : "Purchased!"
    });
  } catch (e) {
    return json({ error: e.message }, { status: 500 });
  }
}
export {
  GET,
  PATCH,
  POST
};
