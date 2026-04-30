import * as server from '../entries/pages/games/_page.server.js';

export const index = 22;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/games/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/games/+page.server.js";
export const imports = ["_app/immutable/nodes/22.DLucqbLH.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C_ypCbr-.js","_app/immutable/chunks/BYHqxEaj.js","_app/immutable/chunks/BBzQ1gTY.js","_app/immutable/chunks/DhFLis_7.js","_app/immutable/chunks/D60XAhtd.js","_app/immutable/chunks/o6q8Mtqc.js","_app/immutable/chunks/BIVhEQ11.js","_app/immutable/chunks/C7wSchzS.js","_app/immutable/chunks/eLItx-_i.js"];
export const stylesheets = ["_app/immutable/assets/22.BFNOxqco.css"];
export const fonts = [];
