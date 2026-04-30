import * as server from '../entries/pages/agora/_page.server.js';

export const index = 16;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/agora/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/agora/+page.server.js";
export const imports = ["_app/immutable/nodes/16.C-oTCddD.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C_ypCbr-.js","_app/immutable/chunks/BYHqxEaj.js","_app/immutable/chunks/BBzQ1gTY.js","_app/immutable/chunks/DhFLis_7.js","_app/immutable/chunks/D60XAhtd.js","_app/immutable/chunks/16EERJEz.js","_app/immutable/chunks/DTCNAND8.js","_app/immutable/chunks/DmT-1Ms3.js","_app/immutable/chunks/o6q8Mtqc.js","_app/immutable/chunks/DAk3OZq9.js","_app/immutable/chunks/wP0qf2A5.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/BIVhEQ11.js","_app/immutable/chunks/C7wSchzS.js","_app/immutable/chunks/eLItx-_i.js"];
export const stylesheets = ["_app/immutable/assets/16.BC9y6SNH.css"];
export const fonts = [];
