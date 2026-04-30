import * as server from '../entries/pages/agora/community/_page.server.js';

export const index = 17;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/agora/community/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/agora/community/+page.server.js";
export const imports = ["_app/immutable/nodes/17.Oc_uqgrN.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C_ypCbr-.js","_app/immutable/chunks/BYHqxEaj.js","_app/immutable/chunks/BBzQ1gTY.js","_app/immutable/chunks/DhFLis_7.js","_app/immutable/chunks/D60XAhtd.js","_app/immutable/chunks/16EERJEz.js","_app/immutable/chunks/DTCNAND8.js","_app/immutable/chunks/DmT-1Ms3.js","_app/immutable/chunks/o6q8Mtqc.js","_app/immutable/chunks/wP0qf2A5.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/eLItx-_i.js"];
export const stylesheets = ["_app/immutable/assets/17.CFW0VVj1.css"];
export const fonts = [];
