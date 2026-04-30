import * as universal from '../entries/pages/write/_username_/_page.js';
import * as server from '../entries/pages/write/_username_/_page.server.js';

export const index = 36;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/write/_username_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/write/[username]/+page.js";
export { server };
export const server_id = "src/routes/write/[username]/+page.server.js";
export const imports = ["_app/immutable/nodes/36.VtCw7FuU.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C_ypCbr-.js","_app/immutable/chunks/BYHqxEaj.js","_app/immutable/chunks/BBzQ1gTY.js","_app/immutable/chunks/DhFLis_7.js","_app/immutable/chunks/D60XAhtd.js","_app/immutable/chunks/16EERJEz.js","_app/immutable/chunks/DTCNAND8.js","_app/immutable/chunks/DmT-1Ms3.js","_app/immutable/chunks/o6q8Mtqc.js","_app/immutable/chunks/eLItx-_i.js"];
export const stylesheets = ["_app/immutable/assets/36.COsISfz4.css"];
export const fonts = [];
