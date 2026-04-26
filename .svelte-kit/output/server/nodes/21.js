import * as server from '../entries/pages/games/_page.server.js';

export const index = 21;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/games/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/games/+page.server.js";
export const imports = ["_app/immutable/nodes/21.BjW-9LND.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B-kkWyoj.js","_app/immutable/chunks/gvh7lOGK.js","_app/immutable/chunks/DhJC173B.js","_app/immutable/chunks/BXAUmlsv.js","_app/immutable/chunks/DPhPjVjy.js","_app/immutable/chunks/V5A2JhxQ.js","_app/immutable/chunks/CQfdSLh-.js","_app/immutable/chunks/Cw8TFuSp.js","_app/immutable/chunks/BfY0Hlq5.js"];
export const stylesheets = ["_app/immutable/assets/21.BFNOxqco.css"];
export const fonts = [];
