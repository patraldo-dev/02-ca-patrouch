import * as universal from '../entries/pages/card/_id_/_page.js';
import * as server from '../entries/pages/card/_id_/_page.server.js';

export const index = 20;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/card/_id_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/card/[id]/+page.js";
export { server };
export const server_id = "src/routes/card/[id]/+page.server.js";
export const imports = ["_app/immutable/nodes/20.DnSoOaEv.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B0CcSODA.js","_app/immutable/chunks/BouOLQ17.js","_app/immutable/chunks/DUY4pXWZ.js","_app/immutable/chunks/BXjXS4dR.js","_app/immutable/chunks/CbTIxrDF.js","_app/immutable/chunks/DAiurb5_.js","_app/immutable/chunks/B1156oEb.js"];
export const stylesheets = ["_app/immutable/assets/20.DjVKQRHL.css"];
export const fonts = [];
