import { loadPortalsData, pickRandomPortalId } from '$lib/server/portals-data.js';

export async function load({ platform }) {
    const data = await loadPortalsData(platform?.env?.DB_book);
    // /portals drops the visitor into a random world each visit. Every world is
    // itself a navigable menu (gateways to all other portals), so there's no
    // dedicated index — just arrive and explore. PortalScene reads
    // initialPortalId to boot the engine at the chosen world.
    return { ...data, initialPortalId: pickRandomPortalId(data) };
}
