// WebSocket upgrade → OzRoom Durable Object.
//
// One shared room for all Oz players (keyed 'global'). Everyone who opens
// /portals/oz lands in the same garden instance — shared munchkins,
// shared monkey waves, shared presence.

export async function GET({ request, url, platform }) {
	const env = platform?.env;
	if (!env?.OZ_ROOM) {
		return new Response('OZ_ROOM binding not available', { status: 503 });
	}

	const roomId = 'global';
	const id = env.OZ_ROOM.idFromName(roomId);
	const stub = env.OZ_ROOM.get(id);

	return stub.fetch(request);
}
