import * as server from '../entries/pages/stats/_page.server.js';

export const index = 29;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/stats/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/stats/+page.server.js";
export const imports = ["_app/immutable/nodes/29.D0YW2dLi.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B-kkWyoj.js","_app/immutable/chunks/gvh7lOGK.js","_app/immutable/chunks/DhJC173B.js","_app/immutable/chunks/BXAUmlsv.js","_app/immutable/chunks/DPhPjVjy.js","_app/immutable/chunks/V5A2JhxQ.js","_app/immutable/chunks/BfY0Hlq5.js","_app/immutable/chunks/wNW-pJXo.js","_app/immutable/chunks/Cw8TFuSp.js","_app/immutable/chunks/ZUdecCQ-.js","_app/immutable/chunks/C4KPR46J.js","_app/immutable/chunks/DZnnfcaB.js","_app/immutable/chunks/C0sCgtfU.js","_app/immutable/chunks/DnmNXk9r.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/Dg7bqLtf.js","_app/immutable/chunks/CZo9pet5.js"];
export const stylesheets = ["_app/immutable/assets/BadgeTrophyCase.D3Gr7r2L.css","_app/immutable/assets/29.tfn-m5Pj.css"];
export const fonts = [];
