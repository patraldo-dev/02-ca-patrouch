import { json } from '@sveltejs/kit';
import { logTransaction } from '$lib/server/bottlequest-logger';

// GET: list marketplace + word index
// POST: list a writing for sale
// PATCH: buy a listing

const ROYALTY_RATE = 0.10; // 10% to original author on resale

export async function GET({ locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ listings: [], wordIndex: [], myWritings: [] });

    try {
        // Active listings
        const { results: listings } = await db.prepare(`
            SELECT m.*, w.title, SUBSTR(w.content, 1, 200) as excerpt, w.username as author_name,
                   sp.display_name as seller_name, sp.port_name as seller_port
            FROM bq_marketplace m
            JOIN writings w ON m.writing_id = w.id
            JOIN bq_players sp ON m.seller_player_id = sp.id
            WHERE m.status = 'listed'
            ORDER BY m.listed_at DESC LIMIT 50
        `).all();

        // Word index: top 20 most-used 4+ letter words this month from published writings
        const monthStart = new Date().toISOString().slice(0, 7) + '-01';
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

export async function POST({ request, locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { writing_id, price } = await request.json();
        if (!writing_id || !price || price < 1) {
            return json({ error: 'Invalid listing' }, { status: 400 });
        }

        const player = await db.prepare('SELECT id FROM bq_players WHERE username = ?').bind(locals.user.username).first();
        if (!player) return json({ error: 'No player found' }, { status: 404 });

        // Verify player owns this writing
        const ownership = await db.prepare(
            `SELECT id FROM bq_writing_ownership WHERE writing_id = ? AND owner_player_id = ? AND status = 'owned'`
        ).bind(writing_id, player.id).first();

        // Also check if player is the original author
        const writing = await db.prepare(
            `SELECT id, user_id FROM writings WHERE id = ? AND status = 'published'`
        ).bind(writing_id).first();

        if (!writing) return json({ error: 'Writing not found' }, { status: 404 });

        const isOriginalAuthor = writing.user_id === locals.user.id;
        if (!ownership && !isOriginalAuthor) return json({ error: 'You do not own this writing' }, { status: 403 });

        // Not already listed
        const existing = await db.prepare(
            `SELECT id FROM bq_marketplace WHERE writing_id = ? AND status = 'listed'`
        ).bind(writing_id).first();
        if (existing) return json({ error: 'Already listed' }, { status: 400 });

        // Auto-create ownership for original author if needed
        if (isOriginalAuthor && !ownership) {
            await db.prepare(
                `INSERT INTO bq_writing_ownership (id, writing_id, owner_player_id, is_original_author, acquired_price) VALUES (?, ?, ?, 1, 0)`
            ).bind(crypto.randomUUID(), writing_id, player.id).run();
        }

        const authorPlayer = await db.prepare('SELECT id FROM bq_players WHERE user_id = ?').bind(writing.user_id).first();

        const id = crypto.randomUUID();
        await db.prepare(
            `INSERT INTO bq_marketplace (id, writing_id, seller_player_id, price, original_author_id, status)
             VALUES (?, ?, ?, ?, ?, 'listed')`
        ).bind(id, writing_id, player.id, price, authorPlayer?.id || null).run();

    await logTransaction(db, { player_id: player.id, type: 'marketplace_buy', amount: -listing.price, detail: `Bought writing ${listing.writing_id}` });
        return json({ success: true, id });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH({ request, locals, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });
    if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { listing_id } = await request.json();
        if (!listing_id) return json({ error: 'Missing listing_id' }, { status: 400 });

        const buyer = await db.prepare('SELECT id, fuel FROM bq_players WHERE username = ?').bind(locals.user.username).first();
        if (!buyer) return json({ error: 'No player found' }, { status: 404 });

        const listing = await db.prepare(
            `SELECT * FROM bq_marketplace WHERE id = ? AND status = 'listed'`
        ).bind(listing_id).first();
        if (!listing) return json({ error: 'Listing not found' }, { status: 404 });
        if (listing.seller_player_id === buyer.id) return json({ error: "Can't buy your own listing" }, { status: 400 });

        if (buyer.fuel < listing.price) return json({ error: `Insufficient fuel. Need ${listing.price}` }, { status: 400 });

        // Execute sale
        await db.prepare(`UPDATE bq_players SET fuel = fuel - ? WHERE id = ?`).bind(listing.price, buyer.id).run();
        await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(listing.price, listing.seller_player_id).run();

        // 10% royalty to original author on resale
        let royaltyPaid = 0;
        const isResale = listing.resale_count > 0;
        if (isResale && listing.original_author_id && listing.original_author_id !== listing.seller_player_id) {
            royaltyPaid = Math.ceil(listing.price * ROYALTY_RATE);
            // Royalty comes from buyer, deducted from what seller receives
            const sellerNet = listing.price - royaltyPaid;
            await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(-royaltyPaid, listing.seller_player_id).run();
            await db.prepare(`UPDATE bq_players SET fuel = fuel + ? WHERE id = ?`).bind(royaltyPaid, listing.original_author_id).run();
        }

        // Transfer ownership
        await db.prepare(
            `UPDATE bq_writing_ownership SET status = 'sold' WHERE writing_id = ? AND owner_player_id = ? AND status = 'owned'`
        ).bind(listing.writing_id, listing.seller_player_id).run();
        await db.prepare(
            `INSERT INTO bq_writing_ownership (id, writing_id, owner_player_id, acquired_price, acquired_from_player_id)
             VALUES (?, ?, ?, ?, ?)`
        ).bind(crypto.randomUUID(), listing.writing_id, buyer.id, listing.price, listing.seller_player_id).run();

        // Update listing
        await db.prepare(
            `UPDATE bq_marketplace SET status = 'sold', sold_at = datetime('now'), buyer_player_id = ?, resale_count = resale_count + 1, royalty_paid = ? WHERE id = ?`
        ).bind(buyer.id, royaltyPaid, listing_id).run();

        return json({
            success: true,
            royalty_paid: royaltyPaid,
            message: isResale && royaltyPaid ? `Purchased! 10% royalty (${royaltyPaid} ⛽) paid to original author` : 'Purchased!'
        });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
