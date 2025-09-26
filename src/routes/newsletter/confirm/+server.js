// src/routes/newsletter/confirm/+server.js
import { redirect, fail } from '@sveltejs/kit';

export async function GET({ url, platform }) {
    const token = url.searchParams.get('token');
    
    if (!token) {
        return fail(400, { error: 'Missing confirmation token' });
    }
    
    if (!platform?.env?.DB_book) {
        return fail(500, { error: 'Database not available' });
    }
    
    const db = platform.env.DB_book;
    
    try {
        // Find subscriber with this token
        const subscriber = await db.prepare(`
            SELECT id, email, confirmed, expires_at
            FROM subscribers
            WHERE confirmation_token = ?
        `).bind(token).first();
        
        if (!subscriber) {
            return fail(400, { error: 'Invalid or expired token' });
        }
        
        // Check if token is expired
        if (subscriber.expires_at && new Date(subscriber.expires_at) < new Date()) {
            return fail(400, { error: 'Confirmation token has expired' });
        }
        
        // Check if already confirmed
        if (subscriber.confirmed) {
            return redirect(302, '/confirmation-success?already=true');
        }
        
        // Confirm the subscription
        await db.prepare(`
            UPDATE subscribers
            SET confirmed = 1, confirmation_token = NULL
            WHERE id = ?
        `).bind(subscriber.id).run();
        
        // Redirect to success page
        return redirect(302, '/confirmation-success');
    } catch (error) {
        console.error('Newsletter confirmation error:', error);
        return fail(500, { error: 'Failed to confirm subscription' });
    }
}
