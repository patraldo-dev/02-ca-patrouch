import * as server from '../entries/pages/write/new/_page.server.js';

export const index = 35;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/write/new/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/write/new/+page.server.js";
export const imports = ["_app/immutable/nodes/35.DzeryEsl.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B-kkWyoj.js","_app/immutable/chunks/gvh7lOGK.js","_app/immutable/chunks/DhJC173B.js","_app/immutable/chunks/BXAUmlsv.js","_app/immutable/chunks/DPhPjVjy.js","_app/immutable/chunks/ZUdecCQ-.js","_app/immutable/chunks/C4KPR46J.js","_app/immutable/chunks/C0sCgtfU.js","_app/immutable/chunks/De3O_-12.js","_app/immutable/chunks/DUqw0nff.js","_app/immutable/chunks/BfY0Hlq5.js","_app/immutable/chunks/C4EgYJQM.js","_app/immutable/chunks/CQfdSLh-.js","_app/immutable/chunks/Cw8TFuSp.js"];
export const stylesheets = ["_app/immutable/assets/35.BXq2ygsA.css"];
export const fonts = [];
