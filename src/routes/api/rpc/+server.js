// src/routes/api/rpc/+server.js
import { newWorkersRpcResponse } from 'capnweb';
import { AuthService } from '$lib/rpc/AuthService.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform }) {
    console.log('📡 Incoming RPC POST request to /api/rpc');

    const db = platform?.env?.DB_book;
    if (!db) {
        console.error('❌ DB_book is undefined or not bound');
        return new Response(
            JSON.stringify({ error: 'DB_book unavailable' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    console.log('✅ DB_book is available');

    try {
        console.log('🔧 Attempting to create new AuthService instance...');
        const authService = new AuthService(db);
        console.log('✅ AuthService instance created successfully');

        // Log what methods are exposed (optional but helpful)
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(authService))
            .filter(prop => typeof authService[prop] === 'function' && prop !== 'constructor');
        console.log('🔌 Exposed RPC methods:', methods);

        console.log('🚀 Returning RPC response to client');
        return newWorkersRpcResponse(request, authService);

    } catch (err) {
        console.error('🔥 FAILED to create AuthService:', err);
        console.error('🔥 Error stack:', err.stack);

        return new Response(
            JSON.stringify({ 
                error: 'Server error during RPC setup', 
                details: err.message 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
}

// Handle WebSocket upgrade (optional but recommended)
export async function GET({ request, platform }) {
    console.log('🔄 Incoming RPC GET (WebSocket upgrade) request to /api/rpc');
    return POST({ request, platform });
}
