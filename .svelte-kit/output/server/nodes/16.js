import * as server from '../entries/pages/agora/community/_page.server.js';

export const index = 16;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/agora/community/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/agora/community/+page.server.js";
export const imports = ["_app/immutable/nodes/16.Djc6jGDY.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B-kkWyoj.js","_app/immutable/chunks/gvh7lOGK.js","_app/immutable/chunks/DhJC173B.js","_app/immutable/chunks/BXAUmlsv.js","_app/immutable/chunks/DPhPjVjy.js","_app/immutable/chunks/ZUdecCQ-.js","_app/immutable/chunks/C4KPR46J.js","_app/immutable/chunks/DZnnfcaB.js","_app/immutable/chunks/V5A2JhxQ.js","_app/immutable/chunks/DnmNXk9r.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/BfY0Hlq5.js"];
export const stylesheets = ["_app/immutable/assets/16.CFW0VVj1.css"];
export const fonts = [];
