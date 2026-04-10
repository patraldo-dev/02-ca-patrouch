// src/routes/api/tts/+server.js
import { json } from '@sveltejs/kit';

function decryptUserKey(hex, userId) {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode('patrouch-tts-' + userId);
    const encrypted = new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    return new TextDecoder().decode(decrypted);
}

export async function POST({ request, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { text, voiceId = 'pNInz6obpgDQGcFmaJgB', modelId = 'eleven_turbo_v2_5', provider = 'elevenlabs' } = await request.json();

        if (!text || text.trim().length < 10) {
            return json({ error: 'Text must be at least 10 characters' }, { status: 400 });
        }

        if (provider === 'cloudflare') {
            const row = await locals.db.prepare('SELECT cf_api_key_encrypted, cf_account_id FROM users WHERE id = ?').bind(user.id).first();
            if (!row?.cf_api_key_encrypted || !row?.cf_account_id) {
                return json({ error: 'no_cf_key' }, { status: 503 });
            }
            const apiKey = decryptUserKey(row.cf_api_key_encrypted, user.id);
            const accountId = row.cf_account_id;

            // Use CF REST API — runs on CF infrastructure, not on Worker
            const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/myshell-ai/melotts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: text.trim() })
            });

            const result = await resp.json().catch(() => ({}));

            if (!resp.ok) {
                return json({ error: result.errors?.[0]?.message || `Cloudflare TTS failed (${resp.status})` }, { status: resp.status });
            }

            if (result?.audio) {
                return json({ audio: result.audio, format: 'mp3', provider: 'cloudflare' });
            }
            return json({ error: 'No audio generated' }, { status: 500 });
        }

        // ElevenLabs TTS — use user's own key
        const row = await locals.db.prepare('SELECT elevenlabs_key_encrypted FROM users WHERE id = ?').bind(user.id).first();
        if (!row?.elevenlabs_key_encrypted) {
            return json({ error: 'no_api_key' }, { status: 503 });
        }
        const apiKey = decryptUserKey(row.elevenlabs_key_encrypted, user.id);

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
