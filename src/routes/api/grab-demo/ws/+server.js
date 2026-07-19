// WebSocket upgrade → GrabDemoRoom Durable Object.
//
// ONE shared room for all players (keyed as 'global'). Everyone who opens
// /portals/grab-demo lands in the same DO instance — no invite links, no
// level-based fragmentation. The ?level= query param is ignored for room
// routing (difficulty is handled per-player on the client for now).
//
// NOTE: the level-keyed room model split players across difficulty tiers,
// so a desktop player on level 2 and a phone player on level 1 were in
// DIFFERENT rooms and never saw each other. Collapsing to one room fixes
// that — the pool-hall model (per-player difficulty) will replace this
// when implemented.

export async function GET({ request, url, platform }) {
	const env = platform?.env;
	if (!env?.GRAB_DEMO_ROOM) {
		return new Response('GRAB_DEMO_ROOM binding not available', { status: 503 });
	}

	// Single shared room — everyone plays together.
	const roomId = 'global';

	const id = env.GRAB_DEMO_ROOM.idFromName(roomId);
	const stub = env.GRAB_DEMO_ROOM.get(id);

	// Forward the original request (preserves query params the DO reads:
	// user, name). The DO does the WebSocketPair + accept dance.
	return stub.fetch(request);
}
