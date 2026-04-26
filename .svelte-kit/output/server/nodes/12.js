import * as server from '../entries/pages/admin/analytics/_page.server.js';

export const index = 12;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/analytics/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/analytics/+page.server.js";
export const imports = ["_app/immutable/nodes/12.BTvbXaTb.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/Cw8TFuSp.js","_app/immutable/chunks/B-kkWyoj.js","_app/immutable/chunks/BXAUmlsv.js","_app/immutable/chunks/DPhPjVjy.js","_app/immutable/chunks/ZUdecCQ-.js","_app/immutable/chunks/C4KPR46J.js","_app/immutable/chunks/DZnnfcaB.js","_app/immutable/chunks/V5A2JhxQ.js","_app/immutable/chunks/C0sCgtfU.js","_app/immutable/chunks/CZo9pet5.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/DUqw0nff.js"];
export const stylesheets = ["_app/immutable/assets/12.DcWgOZvp.css"];
export const fonts = [];
