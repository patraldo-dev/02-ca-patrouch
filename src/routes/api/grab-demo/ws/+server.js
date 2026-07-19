// WebSocket upgrade → GrabDemoRoom Durable Object.
//
// The room is keyed by level: level-1 players share one DO instance,
// level-2 promoted players share another. The ?level= query param (default 1)
// selects the room. No invite links — everyone at a given level is in the
// same room and sees everyone else via the presence roster.
//
// Mirrors the pattern in booty-chat-worker/src/index.js for PortalRoom, but
// the DO lives in THIS worker (no cross-domain WS URL).

export async function GET({ request, url, platform }) {
	const env = platform?.env;
	if (!env?.GRAB_DEMO_ROOM) {
		return new Response('GRAB_DEMO_ROOM binding not available', { status: 503 });
	}

	const level = url.searchParams.get('level') || '1';
	// Room id: level-1, level-2, ... — one DO instance per difficulty tier.
	const roomId = `level-${level}`;

	const id = env.GRAB_DEMO_ROOM.idFromName(roomId);
	const stub = env.GRAB_DEMO_ROOM.get(id);

	// Forward the original request (preserves query params the DO reads:
	// user, name, level). The DO does the WebSocketPair + accept dance.
	return stub.fetch(request);
}
