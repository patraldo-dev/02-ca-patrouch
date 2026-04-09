// src/routes/api/tts/cf-test/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request, platform, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    if (!platform?.env?.AI) {
        return json({ error: 'AI not available' }, { status: 503 });
    }

    try {
        const { text } = await request.json();

        if (!text || text.length < 10) {
            return json({ error: 'Text too short' }, { status: 400 });
        }

        // CF TTS has a character limit, split into chunks
        const maxLen = 1024;
        const chunks = [];
        let remaining = text.trim();
        while (remaining.length > 0) {
            if (remaining.length <= maxLen) {
                chunks.push(remaining);
                break;
            }
            let idx = remaining.lastIndexOf('.', maxLen);
            if (idx < maxLen / 2) idx = remaining.lastIndexOf(' ', maxLen);
            if (idx < maxLen / 2) idx = maxLen;
            chunks.push(remaining.slice(0, idx + 1));
            remaining = remaining.slice(idx + 1).trim();
        }

        const audioParts = [];
        for (const chunk of chunks) {
            const resp = await platform.env.AI.run('@cf/myshell/multilingual-tts', {
                text: chunk,
                voice: 'default'
            });

            // resp is an AudioBuffer
            if (resp?.audio) {
                // Convert Float32Array to base64 WAV
                const samples = resp.audio;
                const wav = encodeWav(samples, 24000);
                audioParts.push(wav);
            }
        }

        // Concatenate WAV files (simple: just merge PCM data)
        let merged;
        if (audioParts.length === 1) {
            merged = audioParts[0];
        } else if (audioParts.length > 1) {
            // Merge by concatenating PCM data with header from first
            const pcmArrays = audioParts.map(wav => {
                // Strip WAV header (44 bytes) and get PCM
                return wav.slice(44);
            });
            const totalLen = pcmArrays.reduce((sum, p) => sum + p.length, 0);
            const mergedPcm = new Uint8Array(totalLen);
            let offset = 0;
            for (const pcm of pcmArrays) {
                mergedPcm.set(pcm, offset);
                offset += pcm.length;
            }
            // Rebuild WAV header with total size
            const header = new Uint8Array(audioParts[0].slice(0, 44));
            const view = new DataView(header.buffer);
            view.setUint32(4, totalLen + 36, true);
            view.setUint32(40, totalLen, true);
            merged = new Uint8Array(header.length + mergedPcm.length);
            merged.set(header);
            merged.set(mergedPcm, header.length);
        }

        if (!merged) {
            return json({ error: 'No audio generated' }, { status: 500 });
        }

        // Convert to base64
        let binary = '';
        for (let i = 0; i < merged.length; i++) {
            binary += String.fromCharCode(merged[i]);
        }
        const base64 = btoa(binary);

        return json({ audio: base64, format: 'wav', provider: 'cloudflare', chunks: chunks.length });
    } catch (err) {
        console.error('CF TTS error:', err);
        return json({ error: 'CF TTS failed: ' + err.message }, { status: 500 });
    }
}

function encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
    }

    return new Uint8Array(buffer);
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
