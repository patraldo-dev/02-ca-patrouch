// src/lib/server/require-role.js
import { error, redirect } from '@sveltejs/kit';

/**
 * Returns the user's actual role from DB (fresh), falling back to session role.
 * Throws 403 if the user lacks one of the allowed roles.
 * Redirects to login if not authenticated.
 */
export async function requireRole(locals, allowedRoles, url) {
    if (!locals.user) {
        throw redirect(302, '/login?redirect=' + encodeURIComponent(url.pathname));
    }

    let role = locals.user.role;

    // Fresh check from DB — Better Auth caches role in session token
    if (locals.db) {
        try {
            const row = await locals.db
                .prepare('SELECT role FROM users WHERE id = ?')
                .bind(locals.user.id)
                .first();
            if (row?.role) {
                role = row.role;
                // Update session object so downstream code sees fresh role
                locals.user.role = role;
            }
        } catch {}
    }

    if (!allowedRoles.includes(role)) {
        throw error(403, 'Member access required');
    }

    return role;
}
