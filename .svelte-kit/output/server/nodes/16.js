import * as server from '../entries/pages/agora/_page.server.js';

export const index = 16;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/agora/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/agora/+page.server.js";
export const imports = ["_app/immutable/nodes/16.BIunDKAM.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B0CcSODA.js","_app/immutable/chunks/GMGyt3qk.js","_app/immutable/chunks/W9rxIS8D.js","_app/immutable/chunks/BouOLQ17.js","_app/immutable/chunks/DUY4pXWZ.js","_app/immutable/chunks/BXjXS4dR.js","_app/immutable/chunks/CbTIxrDF.js","_app/immutable/chunks/BMKc3Trk.js","_app/immutable/chunks/DAiurb5_.js","_app/immutable/chunks/B1156oEb.js","_app/immutable/chunks/CcbwJF9L.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/DkJaV5g-.js","_app/immutable/chunks/BGcckHsx.js","_app/immutable/chunks/8ydyANTu.js"];
export const stylesheets = ["_app/immutable/assets/16.BC9y6SNH.css"];
export const fonts = [];
