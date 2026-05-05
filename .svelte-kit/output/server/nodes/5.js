import * as server from '../entries/pages/api/admin/_layout.server.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/api/admin/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/api/admin/+layout.server.js";
export const imports = ["_app/immutable/nodes/5.B5wQR90s.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B0CcSODA.js","_app/immutable/chunks/GMGyt3qk.js","_app/immutable/chunks/W9rxIS8D.js","_app/immutable/chunks/CXFzVcMB.js","_app/immutable/chunks/CbTIxrDF.js","_app/immutable/chunks/DAiurb5_.js","_app/immutable/chunks/CcbwJF9L.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/X83KOod6.js","_app/immutable/chunks/Ez4ddWgA.js","_app/immutable/chunks/DkJaV5g-.js","_app/immutable/chunks/BGcckHsx.js","_app/immutable/chunks/BouOLQ17.js","_app/immutable/chunks/DUY4pXWZ.js"];
export const stylesheets = ["_app/immutable/assets/5.D6O-uV_4.css"];
export const fonts = [];
