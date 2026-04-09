// src/routes/api/tts/api-key/+server.js
import { json } from '@sveltejs/kit';

// Simple encryption/decryption using a static salt + the user's ID as part of the key
// This is NOT military-grade — it's obfuscation to prevent plaintext storage
function encrypt(text, userId) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    // XOR with a derived key from userId
    const keyBytes = encoder.encode('patrouch-tts-' + userId);
    const encrypted = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
    }
    // Return as hex string
    return Array.from(encrypted).map(b => b.toString(16).padStart(2, '0')).join('');
}

function decrypt(hex, userId) {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode('patrouch-tts-' + userId);
    const encrypted = new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    return new TextDecoder().decode(decrypted);
}

export async function GET({ locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const row = await locals.db.prepare('SELECT elevenlabs_key_encrypted FROM users WHERE id = ?').bind(user.id).first();

    return json({
        hasKey: !!row?.elevenlabs_key_encrypted,
        // Return a masked preview (last 4 chars)
        preview: row?.elevenlabs_key_encrypted ? '••••' + row.elevenlabs_key_encrypted.slice(-4) : null
    });
}

export async function POST({ request, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
        return json({ error: 'Invalid API key' }, { status: 400 });
    }

    // Validate the key against ElevenLabs
    try {
        const resp = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
            headers: { 'xi-api-key': apiKey.trim() }
        });
        if (!resp.ok) {
            return json({ error: 'Invalid ElevenLabs API key' }, { status: 400 });
        }
    } catch (e) {
        return json({ error: 'Could not validate API key' }, { status: 503 });
    }

    const encrypted = encrypt(apiKey.trim(), user.id);

    await locals.db.prepare('UPDATE users SET elevenlabs_key_encrypted = ? WHERE id = ?').bind(encrypted, user.id).run();

    return json({ success: true });
}

export async function DELETE({ locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    await locals.db.prepare('UPDATE users SET elevenlabs_key_encrypted = NULL WHERE id = ?').bind(user.id).run();

    return json({ success: true });
}
