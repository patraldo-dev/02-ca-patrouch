// src/routes/api/rpc/+server.js
import { newWorkersRpcResponse } from 'capnweb';
import { AuthService } from '$lib/rpc/AuthService.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) {
        return new Response(
            JSON.stringify({ error: 'DB_book unavailable' }),
            { status: 500 }
        );
    }

    // ✅ Create AuthService
    const authService = new AuthService(db, platform.env);

    // ✅ Wrap RPC in timeout
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('RPC timeout')), 10000) // 10s timeout
    );

    try {
        // ✅ Race RPC against timeout
        return await Promise.race([
            newWorkersRpcResponse(request, authService),
            timeout
        ]);
    } catch (err) {
        console.error('🔥 RPC failed:', err);
        return new Response(
            JSON.stringify({ error: 'Server error: ' + err.message }),
            { status: 500 }
        );
    }
}

export async function GET({ request, platform }) {
    return POST({ request, platform });
}
