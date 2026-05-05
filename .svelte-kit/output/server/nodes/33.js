import * as server from '../entries/pages/stats/_page.server.js';

export const index = 33;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/stats/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/stats/+page.server.js";
export const imports = ["_app/immutable/nodes/33.bC2DZhlR.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B0CcSODA.js","_app/immutable/chunks/GMGyt3qk.js","_app/immutable/chunks/W9rxIS8D.js","_app/immutable/chunks/BouOLQ17.js","_app/immutable/chunks/DUY4pXWZ.js","_app/immutable/chunks/DAiurb5_.js","_app/immutable/chunks/8ydyANTu.js","_app/immutable/chunks/uMlhyGVt.js","_app/immutable/chunks/BGcckHsx.js","_app/immutable/chunks/BXjXS4dR.js","_app/immutable/chunks/CbTIxrDF.js","_app/immutable/chunks/BMKc3Trk.js","_app/immutable/chunks/B1156oEb.js","_app/immutable/chunks/CcbwJF9L.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/mpdyRPX9.js","_app/immutable/chunks/CGjzN7Mx.js"];
export const stylesheets = ["_app/immutable/assets/BadgeTrophyCase.D3Gr7r2L.css","_app/immutable/assets/33.tfn-m5Pj.css"];
export const fonts = [];
