import * as server from '../entries/pages/games/_page.server.js';

export const index = 23;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/games/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/games/+page.server.js";
export const imports = ["_app/immutable/nodes/23.9IOSxdYK.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B0CcSODA.js","_app/immutable/chunks/GMGyt3qk.js","_app/immutable/chunks/W9rxIS8D.js","_app/immutable/chunks/BouOLQ17.js","_app/immutable/chunks/DUY4pXWZ.js","_app/immutable/chunks/DAiurb5_.js","_app/immutable/chunks/D0C1hOej.js","_app/immutable/chunks/BGcckHsx.js","_app/immutable/chunks/8ydyANTu.js"];
export const stylesheets = ["_app/immutable/assets/23.BFNOxqco.css"];
export const fonts = [];
