// GET /api/user/avatar/download — force-download the session user's own avatar.
// Provider avatars live on Google/GitHub CDNs, where the HTML `download`
// attribute is ignored (cross-origin) and the raw CDN URL leaks to the client.
// This endpoint proxies the stored avatar as an attachment instead.
import { json } from '@sveltejs/kit';

const EXT_BY_TYPE = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_BYTES = 5 * 1024 * 1024; // avatars are small; refuse anything oversized

export async function GET({ locals, url }) {
    const user = locals?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const db = locals?.db;
    if (!db) return json({ error: 'Database unavailable' }, { status: 503 });

    // Same resolution order as the account page: profiles.avatar_url (uploaded),
    // then users.image (social login). Only the user's own stored value is ever
    // fetched — this is not a general proxy.
    let src = '';
    try {
        const row = await db
            .prepare(
                `SELECT p.avatar_url AS profile_avatar, u.image AS user_image
                 FROM users u
                 LEFT JOIN profiles p ON p.user_id = u.id AND p.is_active = 1
                 WHERE u.id = ?`
            )
            .bind(user.id)
            .first();
        src = row?.profile_avatar || row?.user_image || '';
    } catch {
        // Fallback: pre-Better Auth users table (no profiles join)
        try {
            const row = await db
                .prepare('SELECT image FROM users WHERE id = ?')
                .bind(user.id)
                .first();
            src = row?.image || '';
        } catch {
            return json({ error: 'Avatar lookup failed' }, { status: 500 });
        }
    }

    if (!src) return json({ error: 'No avatar set' }, { status: 404 });
    if (src.startsWith('data:')) {
        return json({ error: 'Inline avatars cannot be downloaded' }, { status: 400 });
    }

    const target = src.startsWith('/') ? new URL(src, url.origin).toString() : src;

    try {
        const res = await fetch(target, { redirect: 'follow' });
        if (!res.ok) return json({ error: 'Avatar fetch failed' }, { status: 502 });

        const size = Number(res.headers.get('content-length') || 0);
        if (size > MAX_BYTES) return json({ error: 'Avatar too large' }, { status: 502 });

        const bytes = await res.arrayBuffer();
        if (bytes.byteLength > MAX_BYTES) {
            return json({ error: 'Avatar too large' }, { status: 502 });
        }

        const type = (res.headers.get('content-type') || '').split(';')[0].trim();
        const ext = EXT_BY_TYPE[type] || 'png';
        return new Response(bytes, {
            status: 200,
            headers: {
                'content-type': type || 'application/octet-stream',
                'content-disposition': `attachment; filename="avatar.${ext}"`,
                'cache-control': 'no-store',
            },
        });
    } catch {
        return json({ error: 'Avatar fetch failed' }, { status: 502 });
    }
}
