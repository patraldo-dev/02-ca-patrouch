import * as universal from '../entries/pages/card/_id_/_page.js';
import * as server from '../entries/pages/card/_id_/_page.server.js';

export const index = 19;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/card/_id_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/card/[id]/+page.js";
export { server };
export const server_id = "src/routes/card/[id]/+page.server.js";
export const imports = ["_app/immutable/nodes/19.BsJc0nfG.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C_ypCbr-.js","_app/immutable/chunks/DhFLis_7.js","_app/immutable/chunks/D60XAhtd.js","_app/immutable/chunks/16EERJEz.js","_app/immutable/chunks/DTCNAND8.js","_app/immutable/chunks/o6q8Mtqc.js","_app/immutable/chunks/DAk3OZq9.js"];
export const stylesheets = ["_app/immutable/assets/19.DjVKQRHL.css"];
export const fonts = [];
