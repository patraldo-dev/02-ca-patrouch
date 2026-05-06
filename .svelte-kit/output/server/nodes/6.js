import * as server from '../entries/pages/_page.server.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/+page.server.js";
export const imports = ["_app/immutable/nodes/6.Be9rdlz6.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B0CcSODA.js","_app/immutable/chunks/GMGyt3qk.js","_app/immutable/chunks/W9rxIS8D.js","_app/immutable/chunks/BouOLQ17.js","_app/immutable/chunks/DUY4pXWZ.js","_app/immutable/chunks/BXjXS4dR.js","_app/immutable/chunks/CbTIxrDF.js","_app/immutable/chunks/BMKc3Trk.js","_app/immutable/chunks/DAiurb5_.js","_app/immutable/chunks/B1156oEb.js","_app/immutable/chunks/CcbwJF9L.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/DZc67b1Z.js","_app/immutable/chunks/8ydyANTu.js","_app/immutable/chunks/B06kKp4y.js","_app/immutable/chunks/DCPge2M6.js","_app/immutable/chunks/D0C1hOej.js","_app/immutable/chunks/BGcckHsx.js"];
export const stylesheets = ["_app/immutable/assets/6.BxS0s0B2.css"];
export const fonts = [];
