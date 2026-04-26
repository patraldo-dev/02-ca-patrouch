import * as server from '../entries/pages/agora/_page.server.js';

export const index = 15;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/agora/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/agora/+page.server.js";
export const imports = ["_app/immutable/nodes/15.CeXxr2u5.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B-kkWyoj.js","_app/immutable/chunks/gvh7lOGK.js","_app/immutable/chunks/DhJC173B.js","_app/immutable/chunks/BXAUmlsv.js","_app/immutable/chunks/DPhPjVjy.js","_app/immutable/chunks/ZUdecCQ-.js","_app/immutable/chunks/C4KPR46J.js","_app/immutable/chunks/DZnnfcaB.js","_app/immutable/chunks/V5A2JhxQ.js","_app/immutable/chunks/C0sCgtfU.js","_app/immutable/chunks/DnmNXk9r.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/CQfdSLh-.js","_app/immutable/chunks/Cw8TFuSp.js","_app/immutable/chunks/BfY0Hlq5.js"];
export const stylesheets = ["_app/immutable/assets/15.BC9y6SNH.css"];
export const fonts = [];
