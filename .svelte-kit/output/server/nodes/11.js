import * as server from '../entries/pages/admin/_page.server.js';

export const index = 11;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/+page.server.js";
export const imports = ["_app/immutable/nodes/11.C-I2u3hd.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B-kkWyoj.js","_app/immutable/chunks/gvh7lOGK.js","_app/immutable/chunks/DhJC173B.js","_app/immutable/chunks/BXAUmlsv.js","_app/immutable/chunks/DPhPjVjy.js","_app/immutable/chunks/V5A2JhxQ.js","_app/immutable/chunks/BfY0Hlq5.js"];
export const stylesheets = ["_app/immutable/assets/11.fQPO_qEp.css"];
export const fonts = [];
