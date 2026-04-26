import * as server from '../entries/pages/games/_page.server.js';

export const index = 21;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/games/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/games/+page.server.js";
export const imports = ["_app/immutable/nodes/21.4ISwFi4p.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CZk4491h.js","_app/immutable/chunks/NcJOAUVe.js","_app/immutable/chunks/i3VATfVl.js","_app/immutable/chunks/6NSiUUA1.js","_app/immutable/chunks/DZ0hPRw2.js","_app/immutable/chunks/CwUWxAZr.js","_app/immutable/chunks/CLN2PBBD.js","_app/immutable/chunks/CYnnH-mP.js","_app/immutable/chunks/nCIxTaFM.js"];
export const stylesheets = ["_app/immutable/assets/21.BFNOxqco.css"];
export const fonts = [];
