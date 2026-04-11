// src/routes/api/tts/hf-api-key/+server.js
import { json } from '@sveltejs/kit';

function encrypt(text, userId) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const keyBytes = encoder.encode('patrouch-tts-' + userId);
    const encrypted = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
    }
    return Array.from(encrypted).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET({ locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const row = await locals.db.prepare('SELECT hf_api_key_encrypted FROM users WHERE id = ?').bind(user.id).first();

    return json({ hasKey: !!row?.hf_api_key_encrypted });
}

export async function POST({ request, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
        return json({ error: 'Invalid API key' }, { status: 400 });
    }

    const encrypted = encrypt(apiKey.trim(), user.id);

    await locals.db.prepare('UPDATE users SET hf_api_key_encrypted = ? WHERE id = ?').bind(encrypted, user.id).run();

    return json({ success: true });
}

export async function DELETE({ locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    await locals.db.prepare('UPDATE users SET hf_api_key_encrypted = NULL WHERE id = ?').bind(user.id).run();

    return json({ success: true });
}
