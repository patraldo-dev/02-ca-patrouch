import { json } from '@sveltejs/kit';

// Creative Tide — communal creativity gauge
// Measures the writing community's output over the last 7 days
// Display-only: does NOT affect movement cost
// Power is distributed communally, not individually

export async function GET({ platform }) {
    const db = platform?.env?.DB_book;
    if (!db) return json({ tide: 0, label: 'Calma', detail: 'Sin datos' });

    try {
        // Count published writings in the last 7 days
        const { results: weekStats } = await db.prepare(`
            SELECT
                COUNT(*) as writings_count,
                COALESCE(SUM(total_words), 0) as total_words,
                MAX(last_writing_date) as last_write
            FROM user_writing_stats
            WHERE last_writing_date >= datetime('now', '-7 days')
        `).all();

        const stats = weekStats?.[0] || {};
        const writings = stats.writings_count || 0;
        const words = stats.total_words || 0;

        // Also count bottles launched recently (creative acts in the game)
        const { results: bottleStats } = await db.prepare(`
            SELECT COUNT(*) as cnt FROM bottles
            WHERE created_at >= datetime('now', '-7 days')
            AND status != 'archived'
        `).all();
        const bottleCount = bottleStats?.[0]?.cnt || 0;

        // Count active writers (wrote in last 7 days)
        const { results: activeWriters } = await db.prepare(`
            SELECT COUNT(DISTINCT user_id) as cnt FROM user_writing_stats
            WHERE last_writing_date >= datetime('now', '-7 days')
        `).all();
        const writers = activeWriters?.[0]?.cnt || 0;

        // Tide level: 0-100 scale
        // writings contribute 15 pts each (cap 40), words/100 contribute 1 pt each (cap 30),
        // bottles contribute 5 pts each (cap 15), writers contribute 3 pts each (cap 15)
        const tide = Math.min(100,
            Math.min(40, writings * 15) +
            Math.min(30, Math.floor(words / 100)) +
            Math.min(15, bottleCount * 5) +
            Math.min(15, writers * 3)
        );

        const labels = [
            { max: 5,   label: 'Calma',       emoji: '🌊', desc: 'El océano espera.' },
            { max: 20,  label: 'Rippling',    emoji: '🌀', desc: 'Primeros aleteos de inspiración.' },
            { max: 40,  label: 'Flujo',       emoji: '🌊', desc: 'Las palabras encuentran su ritmo.' },
            { max: 60,  label: 'Marea Alta',   emoji: '🌠', desc: 'Creatividad en pleno auge.' },
            { max: 80,  label: 'Tempestad',   emoji: '⛈️', desc: 'Tormenta de palabras.' },
            { max: 100, label: 'Ola Gigante',  emoji: '🐋', desc: 'Ola creativa sin precedentes.' },
        ];

        const tier = labels.find(l => tide <= l.max) || labels[labels.length - 1];

        return json({
            tide,
            level: tier.label,
            emoji: tier.emoji,
            desc: tier.desc,
            stats: {
                writings,
                words,
                bottles: bottleCount,
                activeWriters: writers,
            },
        });
    } catch (e) {
        return json({ tide: 0, label: 'Calma', error: e.message }, { status: 500 });
    }
}
