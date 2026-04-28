import * as server from '../entries/pages/account/_page.server.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/account/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/account/+page.server.js";
export const imports = ["_app/immutable/nodes/10.i-yI8qHu.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C_ypCbr-.js","_app/immutable/chunks/BYHqxEaj.js","_app/immutable/chunks/BBzQ1gTY.js","_app/immutable/chunks/DhFLis_7.js","_app/immutable/chunks/D60XAhtd.js","_app/immutable/chunks/16EERJEz.js","_app/immutable/chunks/DTCNAND8.js","_app/immutable/chunks/DmT-1Ms3.js","_app/immutable/chunks/o6q8Mtqc.js","_app/immutable/chunks/DAk3OZq9.js","_app/immutable/chunks/wP0qf2A5.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/BK355jMr.js","_app/immutable/chunks/j_clqXuE.js","_app/immutable/chunks/DrUhxKce.js","_app/immutable/chunks/DCR4lMxP.js","_app/immutable/chunks/BXR04yJb.js","_app/immutable/chunks/C7wSchzS.js","_app/immutable/chunks/gPreitE9.js","_app/immutable/chunks/DslO9JOW.js"];
export const stylesheets = ["_app/immutable/assets/10.DpsmsNaa.css"];
export const fonts = [];
