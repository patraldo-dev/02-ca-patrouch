import * as server from '../entries/pages/card/_id_/_page.server.js';

export const index = 18;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/card/_id_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/card/[id]/+page.server.js";
export const imports = ["_app/immutable/nodes/18.BPiCAVbm.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B-kkWyoj.js","_app/immutable/chunks/BXAUmlsv.js","_app/immutable/chunks/DPhPjVjy.js","_app/immutable/chunks/ZUdecCQ-.js","_app/immutable/chunks/C4KPR46J.js","_app/immutable/chunks/V5A2JhxQ.js","_app/immutable/chunks/C0sCgtfU.js"];
export const stylesheets = ["_app/immutable/assets/18.DjVKQRHL.css"];
export const fonts = [];
