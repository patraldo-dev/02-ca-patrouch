import { loadPortalsData } from '$lib/server/portals-data.js';

export async function load({ platform }) {
    return loadPortalsData(platform?.env?.DB_book);
}
