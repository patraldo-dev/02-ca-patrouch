import * as server from '../entries/pages/admin/analytics/_page.server.js';

export const index = 12;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/analytics/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/analytics/+page.server.js";
export const imports = ["_app/immutable/nodes/12.BU9K7Xr4.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CYnnH-mP.js","_app/immutable/chunks/CZk4491h.js","_app/immutable/chunks/6NSiUUA1.js","_app/immutable/chunks/DZ0hPRw2.js","_app/immutable/chunks/DZk9-0M-.js","_app/immutable/chunks/DFjNq0iQ.js","_app/immutable/chunks/CFTIMbi0.js","_app/immutable/chunks/CwUWxAZr.js","_app/immutable/chunks/B8fnR7tN.js","_app/immutable/chunks/CA90GWDq.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/DQH8QHMs.js"];
export const stylesheets = ["_app/immutable/assets/12.DcWgOZvp.css"];
export const fonts = [];
