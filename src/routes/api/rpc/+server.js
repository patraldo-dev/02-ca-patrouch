// src/routes/api/rpc/+server.js
import { newWorkersRpcResponse } from 'capnweb';
import { AuthService } from '$lib/rpc/AuthService.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) {
        return new Response(
            JSON.stringify({ error: 'DB_book unavailable' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }


// ✅ Pass platform.env to AuthService
    const authService = new AuthService(db, platform.env);
    return newWorkersRpcResponse(request, authService);
}

export async function GET({ request, platform }) {
    console.log('🔄 Incoming RPC GET (WebSocket upgrade) request to /api/rpc');
    return POST({ request, platform });
}
