import * as server from '../entries/pages/(auth-pages)/_layout.server.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(auth-pages)/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(auth-pages)/+layout.server.js";
export const imports = ["_app/immutable/nodes/2.BVlZIpB7.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/COH9MEEV.js","_app/immutable/chunks/rrbBjjww.js","_app/immutable/chunks/rUh0QOfW.js"];
export const stylesheets = [];
export const fonts = [];
