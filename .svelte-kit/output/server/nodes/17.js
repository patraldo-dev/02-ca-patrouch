import * as server from '../entries/pages/card/_id_/_page.server.js';

export const index = 17;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/card/_id_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/card/[id]/+page.server.js";
export const imports = ["_app/immutable/nodes/17.BL5IfQrj.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/7EQ61Un6.js","_app/immutable/chunks/CC5H2EQ_.js","_app/immutable/chunks/DVpYTlYi.js","_app/immutable/chunks/D8ru06rp.js","_app/immutable/chunks/wYm4gnM0.js"];
export const stylesheets = ["_app/immutable/assets/17.DjVKQRHL.css"];
export const fonts = [];
