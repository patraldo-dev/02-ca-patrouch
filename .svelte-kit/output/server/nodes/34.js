import * as universal from '../entries/pages/write/_username_/_page.js';
import * as server from '../entries/pages/write/_username_/_page.server.js';

export const index = 34;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/write/_username_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/write/[username]/+page.js";
export { server };
export const server_id = "src/routes/write/[username]/+page.server.js";
export const imports = ["_app/immutable/nodes/34.DsSMFxUZ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CZk4491h.js","_app/immutable/chunks/NcJOAUVe.js","_app/immutable/chunks/i3VATfVl.js","_app/immutable/chunks/6NSiUUA1.js","_app/immutable/chunks/DZ0hPRw2.js","_app/immutable/chunks/DZk9-0M-.js","_app/immutable/chunks/DFjNq0iQ.js","_app/immutable/chunks/CFTIMbi0.js","_app/immutable/chunks/CwUWxAZr.js","_app/immutable/chunks/nCIxTaFM.js"];
export const stylesheets = ["_app/immutable/assets/34.COsISfz4.css"];
export const fonts = [];
