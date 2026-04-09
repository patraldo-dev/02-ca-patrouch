// src/routes/api/tts/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request, platform, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { text, voiceId = 'pNInz6obpgDQGcFmaJgB', modelId = 'eleven_turbo_v2_5', provider = 'elevenlabs' } = await request.json();

        if (!text || text.trim().length < 10) {
            return json({ error: 'Text must be at least 10 characters' }, { status: 400 });
        }

        if (provider === 'cloudflare') {
            return json({ error: 'Cloudflare TTS coming soon — requires Workers paid plan' }, { status: 503 });
        }

        // ElevenLabs TTS — use user's own key
        const row = await locals.db.prepare('SELECT elevenlabs_key_encrypted FROM users WHERE id = ?').bind(user.id).first();
        if (!row?.elevenlabs_key_encrypted) {
            return json({ error: 'no_api_key' }, { status: 503 });
        }
        const encoder = new TextEncoder();
        const keyBytes = encoder.encode('patrouch-tts-' + user.id);
        const encrypted = new Uint8Array(row.elevenlabs_key_encrypted.match(/.{2}/g).map(b => parseInt(b, 16)));
        const decrypted = new Uint8Array(encrypted.length);
        for (let i = 0; i < encrypted.length; i++) decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
        const apiKey = new TextDecoder().decode(decrypted);

        if (text.length > 5000) {
            return json({ error: 'Text must be under 5000 characters for free tier' }, { status: 400 });
        }

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text.trim(), model_id: modelId, voice_settings: { stability: 0.4, similarity_boost: 0.8 } })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return json({ error: err.detail?.message || 'TTS generation failed' }, { status: response.status });
        }

        const audioBuffer = await response.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
        return json({ audio: base64, format: 'mp3', provider: 'elevenlabs' });
    } catch (err) {
        console.error('TTS error:', err);
        return json({ error: 'TTS generation failed' }, { status: 500 });
    }
}
