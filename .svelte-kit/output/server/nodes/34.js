import * as server from '../entries/pages/write/_username_/_page.server.js';

export const index = 34;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/write/_username_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/write/[username]/+page.server.js";
export const imports = ["_app/immutable/nodes/34.BUoOH7qN.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B-kkWyoj.js","_app/immutable/chunks/gvh7lOGK.js","_app/immutable/chunks/DhJC173B.js","_app/immutable/chunks/BXAUmlsv.js","_app/immutable/chunks/DPhPjVjy.js","_app/immutable/chunks/ZUdecCQ-.js","_app/immutable/chunks/C4KPR46J.js","_app/immutable/chunks/DZnnfcaB.js","_app/immutable/chunks/V5A2JhxQ.js","_app/immutable/chunks/BfY0Hlq5.js"];
export const stylesheets = ["_app/immutable/assets/34.COsISfz4.css"];
export const fonts = [];
