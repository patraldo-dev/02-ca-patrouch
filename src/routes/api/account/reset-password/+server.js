// POST /api/account/reset-password — Direct D1 password reset (bypass Better Auth)
import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
    const user = locals?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    
    const { userId, newPassword } = await request.json();
    if (!userId || !newPassword || newPassword.length < 8) {
        return json({ error: 'Invalid input' }, { status: 400 });
    }

    if (userId !== user.id && user.role !== 'admin') {
        return json({ error: 'Forbidden' }, { status: 403 });
    }

    // PBKDF2 via WebCrypto — doesn't count against CF Workers CPU time
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(newPassword), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial, 256
    );
    const hashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
    const saltB64 = btoa(String.fromCharCode(...salt));
    const hash = `pbkdf2:100000:${saltB64}:${hashB64}`;

    const db = locals.db;
    await db.prepare("UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'")
        .bind(hash, userId).run();

    return json({ success: true });
}
