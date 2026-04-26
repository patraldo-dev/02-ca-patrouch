import * as universal from '../entries/pages/card/_id_/_page.js';
import * as server from '../entries/pages/card/_id_/_page.server.js';

export const index = 18;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/card/_id_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/card/[id]/+page.js";
export { server };
export const server_id = "src/routes/card/[id]/+page.server.js";
export const imports = ["_app/immutable/nodes/18.CTZtCs6P.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CZk4491h.js","_app/immutable/chunks/6NSiUUA1.js","_app/immutable/chunks/DZ0hPRw2.js","_app/immutable/chunks/DZk9-0M-.js","_app/immutable/chunks/DFjNq0iQ.js","_app/immutable/chunks/CwUWxAZr.js","_app/immutable/chunks/B8fnR7tN.js"];
export const stylesheets = ["_app/immutable/assets/18.DjVKQRHL.css"];
export const fonts = [];
