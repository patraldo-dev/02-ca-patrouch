import * as server from '../entries/pages/api/admin/_layout.server.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/api/admin/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/api/admin/+layout.server.js";
export const imports = ["_app/immutable/nodes/5.ChS4I9Rm.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C_ypCbr-.js","_app/immutable/chunks/BYHqxEaj.js","_app/immutable/chunks/BBzQ1gTY.js","_app/immutable/chunks/C2b3LAqZ.js","_app/immutable/chunks/DTCNAND8.js","_app/immutable/chunks/o6q8Mtqc.js","_app/immutable/chunks/wP0qf2A5.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/DssZ74m7.js","_app/immutable/chunks/BKdWsvdG.js","_app/immutable/chunks/BXR04yJb.js","_app/immutable/chunks/C7wSchzS.js","_app/immutable/chunks/DhFLis_7.js","_app/immutable/chunks/D60XAhtd.js"];
export const stylesheets = ["_app/immutable/assets/5.D6O-uV_4.css"];
export const fonts = [];
