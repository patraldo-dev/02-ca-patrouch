// src/routes/api/tts/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request, platform, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { text, voiceId = 'pNInz6obpgDQGcFmaJgB', modelId = 'eleven_turbo_v2_5', provider = 'elevenlabs', locale = 'en' } = await request.json();

        if (!text || text.trim().length < 10) {
            return json({ error: 'Text must be at least 10 characters' }, { status: 400 });
        }

        if (provider === 'cloudflare') {
            // Cloudflare TTS
            if (!platform?.env?.AI) {
                return json({ error: 'AI not available' }, { status: 503 });
            }

            const maxLen = 1024;
            const chunks = [];
            let remaining = text.trim();
            while (remaining.length > 0) {
                if (remaining.length <= maxLen) { chunks.push(remaining); break; }
                let idx = remaining.lastIndexOf('.', maxLen);
                if (idx < maxLen / 2) idx = remaining.lastIndexOf(' ', maxLen);
                if (idx < maxLen / 2) idx = maxLen;
                chunks.push(remaining.slice(0, idx + 1));
                remaining = remaining.slice(idx + 1).trim();
            }

            const audioParts = [];
            for (const chunk of chunks) {
                const resp = await platform.env.AI.run('@cf/myshell-ai/melotts', {
                    prompt: chunk,
                    lang: locale || 'en'
                });
                if (resp?.audio) {
                    audioParts.push(resp.audio);
                }
            }

            if (audioParts.length === 0) {
                return json({ error: 'No audio generated' }, { status: 500 });
            }

            let merged;
            if (audioParts.length === 1) {
                merged = audioParts[0];
            } else {
                const buffers = audioParts.map(b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
                const totalLen = buffers.reduce((s, b) => s + b.length, 0);
                const mergedBytes = new Uint8Array(totalLen);
                let off = 0;
                for (const buf of buffers) { mergedBytes.set(buf, off); off += buf.length; }
                let binary = '';
                for (let i = 0; i < mergedBytes.length; i++) binary += String.fromCharCode(mergedBytes[i]);
                merged = btoa(binary);
            }

            return json({ audio: merged, format: 'mp3', provider: 'cloudflare' });
        }

        // ElevenLabs TTS
        const apiKey = platform?.env?.ELEVENLABS_API_KEY;
        if (!apiKey) {
            return json({ error: 'TTS not configured' }, { status: 503 });
        }

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

function encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const ws = (v, o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    ws(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    ws(view, 8, 'WAVE');
    ws(view, 12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    ws(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
    }
    return new Uint8Array(buffer);
}
