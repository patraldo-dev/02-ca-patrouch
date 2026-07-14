import { loadPortalsData, pickRandomPortalId } from '$lib/server/portals-data.js';

export async function load({ platform, locals }) {
    const data = await loadPortalsData(platform?.env?.DB_book);
    // /portals drops the visitor into a random world each visit. Every world is
    // itself a navigable menu (gateways to all other portals), so there's no
    // dedicated index — just arrive and explore. PortalScene reads
    // initialPortalId to boot the engine at the chosen world.
    // user/display_name are threaded so co-presence (NetworkSystem) can identify
    // the visitor by name instead of the anonymous "visitor" literal.
    return { ...data, initialPortalId: pickRandomPortalId(data), user: locals.user || null };
}
