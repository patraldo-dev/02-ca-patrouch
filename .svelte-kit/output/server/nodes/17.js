import * as server from '../entries/pages/card/_id_/_page.server.js';

export const index = 17;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/card/_id_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/card/[id]/+page.server.js";
export const imports = ["_app/immutable/nodes/17.DDgnqOHt.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BCmwgY1R.js","_app/immutable/chunks/hXTTgo2q.js","_app/immutable/chunks/CeaMKrPw.js","_app/immutable/chunks/vYeeBVxZ.js","_app/immutable/chunks/C91UaUCV.js","_app/immutable/chunks/CgfdhRf2.js","_app/immutable/chunks/CgBRi1Wa.js"];
export const stylesheets = ["_app/immutable/assets/17.DjVKQRHL.css"];
export const fonts = [];
