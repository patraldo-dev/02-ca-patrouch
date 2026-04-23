import * as server from '../entries/pages/admin/analytics/_page.server.js';

export const index = 11;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/analytics/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/analytics/+page.server.js";
export const imports = ["_app/immutable/nodes/11.CkGGkh80.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DiQul2Ep.js","_app/immutable/chunks/BCmwgY1R.js","_app/immutable/chunks/hXTTgo2q.js","_app/immutable/chunks/CeaMKrPw.js","_app/immutable/chunks/vYeeBVxZ.js","_app/immutable/chunks/C91UaUCV.js","_app/immutable/chunks/BTBxOEEE.js","_app/immutable/chunks/CgfdhRf2.js","_app/immutable/chunks/CgBRi1Wa.js","_app/immutable/chunks/DkZZXSU2.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/PcJc0xCM.js"];
export const stylesheets = ["_app/immutable/assets/11.DcWgOZvp.css"];
export const fonts = [];
