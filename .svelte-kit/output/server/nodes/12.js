import * as server from '../entries/pages/admin/analytics/_page.server.js';

export const index = 12;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/analytics/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/analytics/+page.server.js";
export const imports = ["_app/immutable/nodes/12.CBM4IDov.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BGcckHsx.js","_app/immutable/chunks/B0CcSODA.js","_app/immutable/chunks/BouOLQ17.js","_app/immutable/chunks/DUY4pXWZ.js","_app/immutable/chunks/BXjXS4dR.js","_app/immutable/chunks/CbTIxrDF.js","_app/immutable/chunks/BMKc3Trk.js","_app/immutable/chunks/DAiurb5_.js","_app/immutable/chunks/B1156oEb.js","_app/immutable/chunks/CGjzN7Mx.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/DMFRS776.js"];
export const stylesheets = ["_app/immutable/assets/12.DcWgOZvp.css"];
export const fonts = [];
