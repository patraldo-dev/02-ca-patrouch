import * as universal from '../entries/pages/card/_id_/_page.js';
import * as server from '../entries/pages/card/_id_/_page.server.js';

export const index = 21;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/card/_id_/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/card/[id]/+page.js";
export { server };
export const server_id = "src/routes/card/[id]/+page.server.js";
export const imports = ["_app/immutable/nodes/21.2Mm1Toup.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/COH9MEEV.js","_app/immutable/chunks/CNZgEGEW.js","_app/immutable/chunks/CMjCajgg.js","_app/immutable/chunks/4PyPdDUi.js","_app/immutable/chunks/rUh0QOfW.js","_app/immutable/chunks/X_E6-_TU.js","_app/immutable/chunks/CCw70eET.js"];
export const stylesheets = ["_app/immutable/assets/21.DjVKQRHL.css"];
export const fonts = [];
