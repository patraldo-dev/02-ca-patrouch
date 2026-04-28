import * as server from '../entries/pages/admin/analytics/_page.server.js';

export const index = 12;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/analytics/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/analytics/+page.server.js";
export const imports = ["_app/immutable/nodes/12.DJUdPMNr.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C7wSchzS.js","_app/immutable/chunks/C_ypCbr-.js","_app/immutable/chunks/DhFLis_7.js","_app/immutable/chunks/D60XAhtd.js","_app/immutable/chunks/16EERJEz.js","_app/immutable/chunks/DTCNAND8.js","_app/immutable/chunks/DmT-1Ms3.js","_app/immutable/chunks/o6q8Mtqc.js","_app/immutable/chunks/DAk3OZq9.js","_app/immutable/chunks/BK355jMr.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/C9unnt0N.js"];
export const stylesheets = ["_app/immutable/assets/12.DcWgOZvp.css"];
export const fonts = [];
