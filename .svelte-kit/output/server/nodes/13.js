import * as server from '../entries/pages/admin/bottles/_page.server.js';

export const index = 13;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/bottles/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/bottles/+page.server.js";
export const imports = ["_app/immutable/nodes/13.AEmm4r6B.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BGcckHsx.js","_app/immutable/chunks/B0CcSODA.js","_app/immutable/chunks/BouOLQ17.js","_app/immutable/chunks/DUY4pXWZ.js","_app/immutable/chunks/BMKc3Trk.js","_app/immutable/chunks/DAiurb5_.js","_app/immutable/chunks/B1156oEb.js","_app/immutable/chunks/CcbwJF9L.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/BzoXv4BV.js","_app/immutable/chunks/DZc67b1Z.js","_app/immutable/chunks/D0C1hOej.js","_app/immutable/chunks/W9rxIS8D.js"];
export const stylesheets = ["_app/immutable/assets/13.D4og2d5Y.css"];
export const fonts = [];
