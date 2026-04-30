import * as server from '../entries/pages/admin/_layout.server.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/+layout.server.js";
export const imports = ["_app/immutable/nodes/3.QNlv8GrC.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C_ypCbr-.js","_app/immutable/chunks/BYHqxEaj.js","_app/immutable/chunks/BBzQ1gTY.js","_app/immutable/chunks/DhFLis_7.js","_app/immutable/chunks/D60XAhtd.js","_app/immutable/chunks/C2b3LAqZ.js","_app/immutable/chunks/DTCNAND8.js","_app/immutable/chunks/o6q8Mtqc.js","_app/immutable/chunks/wP0qf2A5.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/RfQTMKFK.js","_app/immutable/chunks/IpB75WsZ.js","_app/immutable/chunks/BIVhEQ11.js","_app/immutable/chunks/C7wSchzS.js","_app/immutable/chunks/eLItx-_i.js"];
export const stylesheets = ["_app/immutable/assets/3.BaTVQL_z.css"];
export const fonts = [];
