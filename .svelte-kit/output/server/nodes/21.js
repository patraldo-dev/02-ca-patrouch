import * as server from '../entries/pages/games/booty/_page.server.js';

export const index = 21;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/games/booty/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/games/booty/+page.server.js";
export const imports = ["_app/immutable/nodes/21.LjBtEdV9.js","_app/immutable/chunks/D9Z9MdNV.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BVz-wF_9.js","_app/immutable/chunks/7EQ61Un6.js","_app/immutable/chunks/CC5H2EQ_.js","_app/immutable/chunks/DVpYTlYi.js","_app/immutable/chunks/C0IeHCTK.js","_app/immutable/chunks/D8ru06rp.js","_app/immutable/chunks/B-LrS94s.js","_app/immutable/chunks/wYm4gnM0.js","_app/immutable/chunks/KfB9xc2B.js","_app/immutable/chunks/BRzKQYUk.js","_app/immutable/chunks/BS8WuJrw.js","_app/immutable/chunks/wRcodnXl.js","_app/immutable/chunks/B9WH8ZWI.js","_app/immutable/chunks/yBlTv31V.js","_app/immutable/chunks/BrvIvy0u.js","_app/immutable/chunks/CuzFCTBL.js","_app/immutable/chunks/Ci2E9ob5.js","_app/immutable/chunks/S4Hihn2m.js","_app/immutable/chunks/CU8g8LG6.js"];
export const stylesheets = ["_app/immutable/assets/21.BxLSYX1W.css"];
export const fonts = [];
