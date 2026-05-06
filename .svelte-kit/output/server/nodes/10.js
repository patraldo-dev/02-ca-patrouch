import * as server from '../entries/pages/account/_page.server.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/account/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/account/+page.server.js";
export const imports = ["_app/immutable/nodes/10.DYrEdOzD.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B0CcSODA.js","_app/immutable/chunks/GMGyt3qk.js","_app/immutable/chunks/W9rxIS8D.js","_app/immutable/chunks/BouOLQ17.js","_app/immutable/chunks/DUY4pXWZ.js","_app/immutable/chunks/BXjXS4dR.js","_app/immutable/chunks/CbTIxrDF.js","_app/immutable/chunks/BMKc3Trk.js","_app/immutable/chunks/DAiurb5_.js","_app/immutable/chunks/B1156oEb.js","_app/immutable/chunks/CcbwJF9L.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/CGjzN7Mx.js","_app/immutable/chunks/BzoXv4BV.js","_app/immutable/chunks/DZc67b1Z.js","_app/immutable/chunks/8ydyANTu.js","_app/immutable/chunks/D0C1hOej.js","_app/immutable/chunks/BGcckHsx.js","_app/immutable/chunks/gPreitE9.js","_app/immutable/chunks/DslO9JOW.js"];
export const stylesheets = ["_app/immutable/assets/10.BbX61CaJ.css"];
export const fonts = [];
