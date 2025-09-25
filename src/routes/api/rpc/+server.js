// src/routes/api/rpc/+server.js
import { newWorkersRpcResponse } from 'capnweb';
import { AuthService } from '$lib/rpc/AuthService.js';

export async function POST({ request, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) {
        return new Response(JSON.stringify({ error: 'DB_book unavailable' }), { status: 500 });
    }

    const authService = new AuthService(db, platform.env);
    return newWorkersRpcResponse(request, authService);
}

export async function GET({ request, platform }) {
    return POST({ request, platform });
}
