import * as server from '../entries/pages/admin/_layout.server.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/+layout.server.js";
export const imports = ["_app/immutable/nodes/3.Jjxk-3_h.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B-kkWyoj.js","_app/immutable/chunks/gvh7lOGK.js","_app/immutable/chunks/DhJC173B.js","_app/immutable/chunks/BXAUmlsv.js","_app/immutable/chunks/DPhPjVjy.js","_app/immutable/chunks/BP82K2WP.js","_app/immutable/chunks/C4KPR46J.js","_app/immutable/chunks/V5A2JhxQ.js","_app/immutable/chunks/DnmNXk9r.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/BeWlC9Gj.js","_app/immutable/chunks/C4EgYJQM.js","_app/immutable/chunks/CQfdSLh-.js","_app/immutable/chunks/Cw8TFuSp.js","_app/immutable/chunks/BfY0Hlq5.js"];
export const stylesheets = ["_app/immutable/assets/3.BaTVQL_z.css"];
export const fonts = [];
