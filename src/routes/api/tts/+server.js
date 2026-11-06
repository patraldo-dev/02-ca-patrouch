// src/routes/api/tts/+server.js
import { json } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';

function decryptUserKey(hex, userId) {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode('patrouch-tts-' + userId);
    const encrypted = new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    return new TextDecoder().decode(decrypted);
}


async function audioResultToBase64(result) {
    // Aura-2 bindings return a ReadableStream of MPEG bytes (not the
    // {audio} JSON envelope melotts used). Handle stream, blob or bytes.
    if (!result) return null;
    if (result instanceof ReadableStream) {
        const reader = result.getReader();
        const chunks = [];
        let len = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            len += value.length;
        }
        const out = new Uint8Array(len);
        let off = 0;
        for (const c of chunks) { out.set(c, off); off += c.length; }
        return bytesToBase64(out.buffer);
    }
    if (result.audio) return result.audio; // melotts-style envelope
    return null;
}

function bytesToBase64(buf) {
    const b = new Uint8Array(buf);
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < b.length; i += CHUNK) bin += String.fromCharCode(...b.subarray(i, i + CHUNK));
    return btoa(bin);
}

// Gemini returns raw PCM (24kHz s16le) — wrap in a WAV header so the
// browser can play it.
function pcmToWavBase64(pcm) {
    const sampleRate = 24000;
    const header = new ArrayBuffer(44);
    const v = new DataView(header);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true); ws(8, 'WAVE');
    ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true);
    v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, pcm.length, true);
    return bytesToBase64(new Blob([header, pcm]).arrayBuffer ? new Uint8Array([...new Uint8Array(header), ...new Uint8Array(pcm)]).buffer : pcm);
}

export async function POST({ request, locals, platform }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { text, voiceId = 'pNInz6obpgDQGcFmaJgB', modelId = 'eleven_turbo_v2_5', provider = 'elevenlabs', locale = 'en' } = await request.json();

        if (!text || text.trim().length < 10) {
            return json({ error: 'Text must be at least 10 characters' }, { status: 400 });
        }

        // No free voice — every engine is BYOK by explicit product decision.
        if (provider === 'cloudflare' || provider === 'cf') {
            return json({ error: 'no_free_voice', code: 'no_free_voice' }, { status: 403 });
        }

        // Kokoro TTS — via DeepInfra Inference API
        if (provider === 'kokoro') {
            const row = await locals.db.prepare('SELECT deepinfra_key_encrypted FROM users WHERE id = ?').bind(user.id).first();
            if (!row?.deepinfra_key_encrypted) {
                return json({ error: 'no_hf_key' }, { status: 503 });
            }
            const hfKey = decryptUserKey(row.deepinfra_key_encrypted, user.id);

            const resp = await fetch('https://api.deepinfra.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${hfKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ model: 'hexgrad/Kokoro-82M', input: text.trim().slice(0, 5000) })
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                return json({ error: err.error || `Kokoro TTS failed (${resp.status})` }, { status: resp.status });
            }

            const audioBuffer = await resp.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
            return json({ audio: base64, format: 'wav', provider: 'kokoro' });
        }

        // ── Aura-2 (Deepgram) on the USER's own Cloudflare account — BYOK so
        // the site never pays. Locale picks the dedicated Spanish model.
        if (provider === 'aura2') {
            const row = await locals.db.prepare('SELECT cf_api_key_encrypted, cf_account_id FROM users WHERE id = ?').bind(user.id).first();
            if (!row?.cf_api_key_encrypted || !row?.cf_account_id) {
                return json({ error: 'no_cf_key' }, { status: 503 });
            }
            if (!model) {
                return json({ error: 'no_cf_fr', code: 'no_cf_fr' }, { status: 501 });
            }
            const cfKey = decryptUserKey(row.cf_api_key_encrypted, user.id);
            const model = locale?.startsWith('fr') ? null
                : locale?.startsWith('en') ? '@cf/deepgram/aura-2-en'
                : '@cf/deepgram/aura-2-es';
            const esVoices = ['sirio','nestor','carina','celeste','alvaro','diana','aquila','selena','estrella','javier'];
            const payload = { text: text.trim().slice(0, 4000) };
            if (model.endsWith('aura-2-es') && esVoices.includes(voiceId)) payload.speaker = voiceId;
            const resp = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${row.cf_account_id}/ai/run/${model}`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${cfKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }
            );
            // REST answers either a JSON envelope or raw audio bytes
            let audio = null;
            const ctype = resp.headers.get('content-type') || '';
            if (resp.ok && !ctype.includes('json')) {
                audio = bytesToBase64(await resp.arrayBuffer());
            } else {
                const d = await resp.json().catch(() => ({}));
                audio = d?.result || d?.result?.audio || d?.audio;
                if (audio && typeof audio !== 'string') audio = null;
            }
            if (!resp.ok || !audio) {
                // 400/403 from the CF API almost always means the stored key
                // is a Global API Key (unsupported) or a token without the
                // Workers AI permission — give the client a code to localize.
                if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
                    const errText = await resp.text().catch(() => '');
                    let msg = '';
                    try { msg = JSON.parse(errText)?.errors?.[0]?.message || ''; } catch {}
                    return json({ error: 'cf_auth', detail: msg }, { status: resp.status });
                }
                return json({ error: `Aura-2 failed (${resp.status})` }, { status: resp.status });
            }
            return json({ audio, format: 'mp3', provider: 'aura2' });
        }

        // ── Cartesia Sonic — BYOK ──
        if (provider === 'cartesia') {
            const row = await locals.db.prepare('SELECT cartesia_key_encrypted FROM users WHERE id = ?').bind(user.id).first();
            if (!row?.cartesia_key_encrypted) return json({ error: 'no_key' }, { status: 503 });
            const key = decryptUserKey(row.cartesia_key_encrypted, user.id);
            const resp = await fetch('https://api.cartesia.ai/tts/speech/direct', {
                method: 'POST',
                headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_id: 'sonic-3',
                    transcript: text.trim().slice(0, 5000),
                    voice: { mode: 'name', name: voiceId || 'reader' },
                    output_format: { container: 'mp3', encoding: 'mp3', sample_rate: 22050 }
                })
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                return json({ error: err?.error?.message || `Cartesia failed (${resp.status})` }, { status: resp.status });
            }
            return json({ audio: bytesToBase64(await resp.arrayBuffer()), format: 'mp3', provider: 'cartesia' });
        }

        // ── Gemini TTS — BYOK ──
        if (provider === 'gemini') {
            const row = await locals.db.prepare('SELECT gemini_key_encrypted FROM users WHERE id = ?').bind(user.id).first();
            if (!row?.gemini_key_encrypted) return json({ error: 'no_key' }, { status: 503 });
            const key = decryptUserKey(row.gemini_key_encrypted, user.id);
            const voiceMap = { es: 'Fenrir', fr: 'Charon', en: 'Kore' };
            const resp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `Read this aloud with warmth: ${text.trim().slice(0, 5000)}` }] }],
                        generationConfig: {
                            responseModalities: ['AUDIO'],
                            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId || voiceMap[locale?.slice(0, 2)] || 'Kore' } } }
                        }
                    })
                }
            );
            const d = await resp.json().catch(() => ({}));
            const b64 = d?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!resp.ok || !b64) {
                return json({ error: d?.error?.message || `Gemini TTS failed (${resp.status})` }, { status: resp.status === 200 ? 500 : resp.status });
            }
            return json({ audio: pcmToWavBase64(Uint8Array.from(atob(b64), c => c.charCodeAt(0))), format: 'wav', provider: 'gemini' });
        }

        // ── OpenAI TTS — BYOK ──
        if (provider === 'openai') {
            const row = await locals.db.prepare('SELECT openai_key_encrypted FROM users WHERE id = ?').bind(user.id).first();
            if (!row?.openai_key_encrypted) return json({ error: 'no_key' }, { status: 503 });
            const key = decryptUserKey(row.openai_key_encrypted, user.id);
            const resp = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-4o-mini-tts',
                    voice: ['alloy', 'verse', 'sage', 'coral'].includes(voiceId) ? voiceId : 'coral',
                    input: text.trim().slice(0, 5000)
                })
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                return json({ error: err?.error?.message || `OpenAI TTS failed (${resp.status})` }, { status: resp.status });
            }
            return json({ audio: bytesToBase64(await resp.arrayBuffer()), format: 'mp3', provider: 'openai' });
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
