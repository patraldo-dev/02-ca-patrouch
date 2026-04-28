import * as server from '../entries/pages/(auth-pages)/_layout.server.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(auth-pages)/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(auth-pages)/+layout.server.js";
export const imports = ["_app/immutable/nodes/2.CSy6fFqI.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/C_ypCbr-.js","_app/immutable/chunks/C2b3LAqZ.js","_app/immutable/chunks/DTCNAND8.js"];
export const stylesheets = [];
export const fonts = [];
