import * as server from '../entries/pages/admin/_page.server.js';

export const index = 11;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/+page.server.js";
export const imports = ["_app/immutable/nodes/11.D5IWrTMJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/B0CcSODA.js","_app/immutable/chunks/GMGyt3qk.js","_app/immutable/chunks/W9rxIS8D.js","_app/immutable/chunks/BouOLQ17.js","_app/immutable/chunks/DUY4pXWZ.js","_app/immutable/chunks/DAiurb5_.js","_app/immutable/chunks/8ydyANTu.js"];
export const stylesheets = ["_app/immutable/assets/11.fQPO_qEp.css"];
export const fonts = [];
