// src/routes/api/sappho/write/+server.js
// Sappho — AI writing companion, clearly marked as agent
// POST /api/sappho/write — trigger Sappho to write a response to today's community prompt

import { json } from '@sveltejs/kit';

const SAPPHO_USER_ID = 'sappho-agent-001';
const TARGET_WORD_COUNT = 300;

const SAPPHO_PERSONAS = {
    en: `You are Sappho, an AI writing companion on patrouch.ca — a creative writing platform. You participate in the daily writing community like any other writer. Write a thoughtful, literary response to the given prompt. Keep it between 250-400 words. Write in a contemplative, slightly poetic style. Do not mention being AI — just write naturally. Do not use titles, headers, or metadata in your response — only the prose itself.`,
    es: `Eres Safo, una compañera de escritura de IA en patrouch.ca — una plataforma de escritura creativa. Participas en la comunidad de escritura diaria como cualquier otro escritor. Escribe una respuesta reflexiva y literaria al estímulo dado. Manténla entre 250-400 palabras. Escribe en un estilo contemplativo y ligeramente poético. No menciones ser IA — simplemente escribe con naturalidad. No uses títulos, encabezados ni metadatos en tu respuesta — solo la prosa.`,
    fr: `Tu es Sappho, une compagne d'écriture IA sur patrouch.ca — une plateforme d'écriture créative. Tu participes à la communauté d'écriture quotidienne comme tout autre écrivain. Écris une réponse réfléchie et littéraire au stimulus donné. Garde-la entre 250-400 mots. Écris dans un style contemplatif et légèrement poétique. Ne mentionne pas être une IA — écris simplement naturellement. N'utilise pas de titres, d'en-têtes ni de métadonnées dans ta réponse — uniquement la prose.`
};

const SAPPHO_CATEGORIES = ['fiction', 'creative_nonfiction', 'poetry', 'memoir', 'essay'];

export async function POST({ request, platform }) {
    try {
        const db = platform?.env?.DB_book;
        const ai = platform?.env?.AI;
        if (!db || !ai) {
            return json({ error: 'Missing DB or AI binding' }, { status: 503 });
        }

        // Auth: only accept from cron or admin
        const authHeader = request.headers.get('authorization');
        const cronSecret = platform?.env?.CRON_SECRET;
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const locale = body.locale || 'en';

        // Get today's community prompt for this locale
        const today = new Date().toISOString().slice(0, 10);
        const prompt = await db.prepare(`
            SELECT id, prompt_text, category FROM writing_prompts
            WHERE category = 'daily-community' AND locale = ? AND prompt_date = ?
            ORDER BY created_at DESC LIMIT 1
        `).bind(locale, today).first();

        if (!prompt) {
            return json({ error: 'No community prompt found for today', locale, date: today });
        }

        // Check if Sappho already wrote today for this locale
        const existing = await db.prepare(`
            SELECT id FROM writings
            WHERE user_id = ? AND locale = ? AND DATE(created_at) = ? AND status = 'published'
        `).bind(SAPPHO_USER_ID, locale, today).first();

        if (existing) {
            return json({ message: 'Sappho already wrote today', locale, date: today, writingId: existing.id });
        }

        // Generate writing via Cloudflare Workers AI
        const systemPrompt = SAPPHO_PERSONAS[locale] || SAPPHO_PERSONAS.en;
        const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Prompt: ${prompt.prompt_text}\n\nWrite your response:` }
            ],
            max_tokens: 1024,
            temperature: 0.85
        });

        const content = response?.response?.trim() || '';
        if (!content) {
            return json({ error: 'AI generated empty response' }, { status: 500 });
        }

        // Extract a title from first line or first few words
        const firstLine = content.split('\n')[0].trim();
        const title = firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;

        const writingId = crypto.randomUUID();
        const wordCount = content.split(/\s+/).filter(Boolean).length;

        // Insert as published, public
        await db.prepare(`
            INSERT INTO writings (id, user_id, prompt_id, title, content, word_count, ai_assisted, visibility, status, locale, category, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, 'public', 'published', ?, ?, datetime('now'), datetime('now'))
        `).bind(writingId, SAPPHO_USER_ID, prompt.id, title, content, wordCount, locale, prompt.category).run();

        // Update Sappho's stats
        const stats = await db.prepare('SELECT * FROM user_writing_stats WHERE user_id = ?').bind(SAPPHO_USER_ID).first();
        if (stats) {
            await db.prepare(`
                UPDATE user_writing_stats SET total_writings = total_writings + 1, total_words = total_words + ?,
                current_streak = current_streak + 1, longest_streak = MAX(longest_streak, current_streak + 1),
                last_writing_date = ?, updated_at = datetime('now') WHERE user_id = ?
            `).bind(wordCount, today, SAPPHO_USER_ID).run();
        } else {
            await db.prepare(`
                INSERT INTO user_writing_stats (user_id, total_writings, total_words, current_streak, longest_streak, last_writing_date, updated_at)
                VALUES (?, 1, ?, 1, 1, ?, datetime('now'))
            `).bind(SAPPHO_USER_ID, wordCount, today).run();
        }

        return json({
            success: true,
            writingId,
            title,
            wordCount,
            locale,
            promptId: prompt.id
        });
    } catch (error) {
        console.error('Sappho write error:', error);
        return json({ error: error.message }, { status: 500 });
    }
}
