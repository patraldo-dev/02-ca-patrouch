import * as server from '../entries/pages/admin/analytics/_page.server.js';

export const index = 13;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/analytics/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/analytics/+page.server.js";
export const imports = ["_app/immutable/nodes/13.BJRzZB2K.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BnKHZF6D.js","_app/immutable/chunks/COH9MEEV.js","_app/immutable/chunks/CNZgEGEW.js","_app/immutable/chunks/CMjCajgg.js","_app/immutable/chunks/4PyPdDUi.js","_app/immutable/chunks/rUh0QOfW.js","_app/immutable/chunks/Cc5fsE6q.js","_app/immutable/chunks/X_E6-_TU.js","_app/immutable/chunks/CCw70eET.js","_app/immutable/chunks/CQpzdJg2.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/CJdjuNHu.js"];
export const stylesheets = ["_app/immutable/assets/13.DcWgOZvp.css"];
export const fonts = [];
