// POST /api/account/reset-password — Direct D1 password reset (bypass Better Auth)
// Requires admin role. Body: { userId, newPassword }
import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
    const user = locals?.user;
    if (!user || user.role !== 'admin') return json({ error: 'Forbidden' }, { status: 403 });
    
    const { userId, newPassword } = await request.json();
    if (!userId || !newPassword || newPassword.length < 8) {
        return json({ error: 'Invalid input' }, { status: 400 });
    }

    const { scrypt } = await import('node:crypto');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await new Promise((resolve, reject) => {
        scrypt(newPassword, salt, 64, { N: 2048, r: 8, p: 1 }, (err, key) => {
            if (err) return reject(err);
            const buf = Buffer.alloc(salt.length + key.length);
            salt.copy(buf, 0);
            key.copy(buf, salt.length);
            resolve(`scrypt:2048:8:1:${buf.toString('base64')}`);
        });
    });

    const db = locals.db;
    await db.prepare("UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'")
        .bind(hash, userId).run();

    return json({ success: true });
}
