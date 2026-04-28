import * as server from '../entries/pages/stats/_page.server.js';

export const index = 31;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/stats/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/stats/+page.server.js";
export const imports = ["_app/immutable/nodes/31.B-4SJeDf.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C_ypCbr-.js","_app/immutable/chunks/BYHqxEaj.js","_app/immutable/chunks/BBzQ1gTY.js","_app/immutable/chunks/DhFLis_7.js","_app/immutable/chunks/D60XAhtd.js","_app/immutable/chunks/o6q8Mtqc.js","_app/immutable/chunks/DCR4lMxP.js","_app/immutable/chunks/IKS_prG7.js","_app/immutable/chunks/C7wSchzS.js","_app/immutable/chunks/16EERJEz.js","_app/immutable/chunks/DTCNAND8.js","_app/immutable/chunks/DmT-1Ms3.js","_app/immutable/chunks/DAk3OZq9.js","_app/immutable/chunks/wP0qf2A5.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/BoaBw_Xt.js","_app/immutable/chunks/BK355jMr.js"];
export const stylesheets = ["_app/immutable/assets/BadgeTrophyCase.D3Gr7r2L.css","_app/immutable/assets/31.tfn-m5Pj.css"];
export const fonts = [];
