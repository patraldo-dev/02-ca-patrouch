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

    const authService = new AuthService(db);
    return newWorkersRpcResponse(request, authService);
}

// Optional: Handle WebSocket upgrade
export async function GET({ request, platform }) {
    const db = platform?.env?.DB_book;
    if (!db) {
        return new Response('DB_book unavailable', { status: 500 });
    }

    const authService = new AuthService(db);
    return newWorkersRpcResponse(request, authService);
}
