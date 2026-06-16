// Transaction logger for Bottle Booty
// Usage: await logTransaction(db, { player_id, type, amount, detail, related_id })

export async function logTransaction(db, { player_id, type, amount = 0, detail = '', related_id = null }) {
    if (!db) return;
    try {
        await db.prepare(`
            INSERT INTO bq_transactions (id, player_id, type, amount, detail, related_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            player_id,
            type,
            amount,
            detail,
            related_id
        ).run();
    } catch (e) {
        console.error('logTransaction failed:', e.message);
    }
}

// Transaction types:
// 'move' - player moved (amount = fuel cost, negative)
// 'checkin' - daily check-in (amount = dollars earned, positive)
// 'transfer_send' - sent dollars (amount = negative)
// 'transfer_receive' - received dollars (amount = positive)
// 'bet_placed' - bet placed (amount = negative)
// 'bet_won' - bet won (amount = positive)
// 'bet_lost' - bet lost (amount = negative)
// 'fuel_request' - requested fuel
// 'fuel_fulfilled' - fulfilled fuel request
// 'marketplace_buy' - bought writing
// 'marketplace_sell' - sold writing
// 'marketplace_royalty' - received royalty
// 'keyword_match' - keyword matched (amount = points)
// 'capture' - bottle captured (amount = dollars earned)
// 'draft_bonus' - daily draft bonus
// 'bot_steal' - stolen by bot
// 'join' - joined the crusade
// 'bot_commission' - bot bank commission
