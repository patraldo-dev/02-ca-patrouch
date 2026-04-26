import * as server from '../entries/pages/api/admin/_layout.server.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/api/admin/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/api/admin/+layout.server.js";
export const imports = ["_app/immutable/nodes/5.BGUHQnBZ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B-kkWyoj.js","_app/immutable/chunks/gvh7lOGK.js","_app/immutable/chunks/DhJC173B.js","_app/immutable/chunks/BP82K2WP.js","_app/immutable/chunks/C4KPR46J.js","_app/immutable/chunks/V5A2JhxQ.js","_app/immutable/chunks/DnmNXk9r.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/BeWlC9Gj.js","_app/immutable/chunks/C4EgYJQM.js","_app/immutable/chunks/CQfdSLh-.js","_app/immutable/chunks/Cw8TFuSp.js","_app/immutable/chunks/BXAUmlsv.js","_app/immutable/chunks/DPhPjVjy.js"];
export const stylesheets = ["_app/immutable/assets/5.D6O-uV_4.css"];
export const fonts = [];
