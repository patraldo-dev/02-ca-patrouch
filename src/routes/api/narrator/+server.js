import { json } from '@sveltejs/kit';

/**
 * GET: Fetch active narrator events (for display)
 * POST: Generate a portal dispatch notification (called by CF cron every 6h)
 * 
 * Portal dispatches replace the old Booty Battle Kraken system.
 * They scan recent Agora writings and portal activity, then generate
 * atmospheric notifications that connect the community to the portal universe.
 */

export async function GET({ platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ events: [] });

    try {
        const { results } = await db.prepare(`
            SELECT * FROM narrator_events 
            WHERE (expires_at IS NULL OR expires_at > datetime('now'))
            ORDER BY created_at DESC LIMIT 5
        `).all();
        return json({ events: results || [] });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}

export async function POST({ request, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ error: 'No DB' }, { status: 500 });

    const cronSecret = (await platform?.env?.CRON_SECRET?.get?.()) ?? null;
    const auth = request.headers.get('Authorization');
    if (!auth || !cronSecret || auth !== `Bearer ${cronSecret}`) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ai = platform?.env?.AI;

    try {
        // Gather context: recent writings, portal activity
        const { results: recentWritings } = await db.prepare(`
            SELECT w.id, w.title, w.word_count, w.created_at, u.username
            FROM writings w JOIN users u ON w.user_id = u.id
            WHERE w.status = 'published' AND w.visibility = 'public'
            ORDER BY w.created_at DESC LIMIT 10
        `).all();

        const { results: activePortals } = await db.prepare(`
            SELECT id, name_es, name_en, icon, narrator_tone, active_writings_count
            FROM portals WHERE status = 'active'
            ORDER BY active_writings_count DESC LIMIT 7
        `).all();

        const { results: dormantPortals } = await db.prepare(`
            SELECT id, name_es, name_en, icon, active_writings_count
            FROM portals WHERE status = 'dormant'
            LIMIT 3
        `).all();

        // Stats for context
        const totalWritings = recentWritings?.length || 0;
        const lastDispatchRow = await db.prepare(`
            SELECT created_at FROM narrator_events 
            ORDER BY created_at DESC LIMIT 1
        `).first();
        const hoursSinceLast = lastDispatchRow?.created_at 
            ? Math.floor((Date.now() - new Date(lastDispatchRow.created_at.replace(' ', 'T') + 'Z').getTime()) / 3600000)
            : 999;

        // Count new writings since last dispatch
        let newWritingsCount = totalWritings;
        if (lastDispatchRow?.created_at && totalWritings > 0) {
            const { count: newCount } = await db.prepare(`
                SELECT COUNT(*) as count FROM writings 
                WHERE status = 'published' AND visibility = 'public'
                AND created_at > ?
            `).bind(lastDispatchRow.created_at).first() || {};
            newWritingsCount = newCount || 0;
        }

        // Decide dispatch type
        let dispatchType = 'portal_activity';
        if (dormantPortals?.length > 0 && newWritingsCount >= 3) {
            // Check if any dormant portal is close to activation
            dispatchType = 'portal_condensing';
        } else if (newWritingsCount === 0 && hoursSinceLast > 12) {
            dispatchType = 'portal_silence';
        } else if (newWritingsCount >= 5) {
            dispatchType = 'portal_surge';
        }

        // Generate dispatch with AI
        if (!ai) {
            // Fallback without AI
            const title = dispatchType === 'portal_surge' 
                ? '✨ Surge of Creativity'
                : dispatchType === 'portal_condensing'
                ? '🌀 A New Portal Stirs'
                : '🔮 The Portals Hum';
            const narrative = `${newWritingsCount} new ${newWritingsCount === 1 ? 'writing' : 'writings'} in the Agora. The portals resonate.`;

            await db.prepare(`
                INSERT INTO narrator_events (id, title, narrative, event_type, duration_hours, expires_at, effects, target_game)
                VALUES (?, ?, ?, 'flavor', 6, datetime('now', '+6 hours'), '{}', 'both')
            `).bind(crypto.randomUUID(), title, narrative).run();

            await sendPortalNotifications(db, title, narrative);
            return json({ success: true, dispatch: dispatchType, fallback: true });
        }

        // Build context for AI
        const writingTitles = (recentWritings || []).slice(0, 5).map(w => `"${w.title}" by ${w.username}`).join(', ');
        const portalMoods = (activePortals || []).map(p => `${p.icon} ${p.name_es} (${p.active_writings_count} writings)`).join(', ');
        const dormantInfo = (dormantPortals || []).map(p => `${p.icon} ${p.name_es} (${p.active_writings_count}/3 to awaken)`).join(', ');

        const prompts = {
            portal_surge: `The Agora just saw ${newWritingsCount} new writings — a creative surge. The portals are vibrating with energy. Write a short, atmospheric dispatch (2-3 sentences) announcing this creative burst. Reference specific portals and the energy they're receiving. Tone: cosmic, warm, slightly epic.`,
            portal_condensing: `A dormant portal is close to awakening. ${dormantInfo}. ${newWritingsCount} new writings since last dispatch. Write a short dispatch (2-3 sentences) hinting that something new is about to emerge from the cosmos. The universe is expanding. Tone: mysterious, anticipatory.`,
            portal_silence: `It's been quiet. No new writings in ${hoursSinceLast} hours. The portals dim slightly. Write a short dispatch (2-3 sentences) that's a gentle invitation — not guilt-tripping, not demanding. Just a cosmic whisper that the portals miss the words. Tone: gentle, poetic, non-judgmental.`,
            portal_activity: `${newWritingsCount} new ${newWritingsCount === 1 ? 'writing has' : 'writings have'} appeared in the Agora. Recent works: ${writingTitles}. Active portals: ${portalMoods}. Write a short atmospheric dispatch (2-3 sentences) that connects the new writings to the portal universe. Be specific — reference a portal or a writing by mood. Tone: contemplative, literary.`
        };

        const prompt = prompts[dispatchType] || prompts.portal_activity;

        const aiResp = await ai.run('@cf/mistralai/mistral-small-3.1-24b-instruct', {
            messages: [
                { role: 'system', content: 'You are the cosmic voice of a creative writing universe. Write short, evocative dispatches (max 280 characters). No hashtags, no emoji in your text, no calls to action. Just atmosphere. Respond in English.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 150,
            temperature: 0.9
        });

        const narrative = (aiResp?.response || '').trim().slice(0, 300) || 'The portals hum with quiet attention.';

        // Title based on type
        const titles = {
            portal_surge: '✨ Creative Surge',
            portal_condensing: '🌀 Something Stirs',
            portal_silence: '🌙 The Quiet',
            portal_activity: '🔮 Portal Dispatch'
        };
        const title = titles[dispatchType] || '🔮 Portal Dispatch';

        // Store as event
        const id = crypto.randomUUID();
        await db.prepare(`
            INSERT INTO narrator_events (id, title, narrative, event_type, duration_hours, expires_at, effects, target_game)
            VALUES (?, ?, ?, ?, 6, datetime('now', '+6 hours'), '{}', 'both')
        `).bind(id, title, narrative, dispatchType).run();

        // Send notifications — include the active portal ids in meta so the bell
        // can deep-link ("→ Enter portal") instead of just showing text.
        const portalIds = (activePortals || []).slice(0, 3).map((p) => p.id);
        await sendPortalNotifications(db, title, narrative, portalIds);

        return json({ success: true, id, dispatch: dispatchType, newWritings: newWritingsCount });
    } catch (e) {
        console.error('Portal dispatch error:', e);
        return json({ error: e.message }, { status: 500 });
    }
}

async function sendPortalNotifications(db, title, body, portalIds = []) {
    try {
        const { results: users } = await db.prepare(`
            SELECT id FROM users WHERE id IN (
                SELECT DISTINCT user_id FROM notification_preferences WHERE game = 1
            )
        `).all();

        // meta carries the referenced portal ids so the notification bell can
        // render a deep link ("→ Enter portal"). Omitted when no portals apply.
        const meta = portalIds.length ? JSON.stringify({ portal_ids: portalIds }) : null;
        for (const u of (users || [])) {
            await db.prepare(
                'INSERT INTO notifications (user_id, type, title, body, meta) VALUES (?, ?, ?, ?, ?)'
            ).bind(u.id, 'portal', title, body, meta).run();
        }
    } catch (e) {
        console.error('[portal dispatch] notify failed:', e.message);
    }
}
