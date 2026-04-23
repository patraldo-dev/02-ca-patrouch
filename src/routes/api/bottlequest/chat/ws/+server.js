// WebSocket proxy to BootyChatRoom Durable Object
// SvelteKit +server.js can return WebSocket 101 responses on Cloudflare

export async function GET({ request, platform }) {
    const env = platform?.env;
    if (!env?.BOOTY_CHAT) {
        return new Response('Chat not available', { status: 503 });
    }

    const id = env.BOOTY_CHAT.idFromName('global-room');
    const stub = env.BOOTY_CHAT.get(id);

    // Build DO URL preserving query params
    const url = new URL(request.url);
    url.pathname = '/ws';
    const doRequest = new Request(url.toString(), {
        headers: request.headers
    });

    // The DO returns a 101 WebSocket response — pass through directly
    return stub.fetch(doRequest);
}
