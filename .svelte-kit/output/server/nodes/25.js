import * as universal from '../entries/pages/games/booty/_page.js';
import * as server from '../entries/pages/games/booty/_page.server.js';

export const index = 25;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/games/booty/_page.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/games/booty/+page.js";
export { server };
export const server_id = "src/routes/games/booty/+page.server.js";
export const imports = ["_app/immutable/nodes/25.DLdSzQWj.js","_app/immutable/chunks/PPVm8Dsz.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BnKHZF6D.js","_app/immutable/chunks/COH9MEEV.js","_app/immutable/chunks/CNZgEGEW.js","_app/immutable/chunks/CMjCajgg.js","_app/immutable/chunks/DGB_sTAZ.js","_app/immutable/chunks/BelQN5Eo.js","_app/immutable/chunks/4PyPdDUi.js","_app/immutable/chunks/rUh0QOfW.js","_app/immutable/chunks/Cc5fsE6q.js","_app/immutable/chunks/X_E6-_TU.js","_app/immutable/chunks/CCw70eET.js","_app/immutable/chunks/BsIzlKNo.js","_app/immutable/chunks/C7YJlRmi.js","_app/immutable/chunks/CQpzdJg2.js","_app/immutable/chunks/Cn4rZ9ik.js","_app/immutable/chunks/CJdjuNHu.js","_app/immutable/chunks/zBHtPKA-.js","_app/immutable/chunks/lj8Kp-za.js","_app/immutable/chunks/CIWSSOto.js","_app/immutable/chunks/DZcxTGg-.js","_app/immutable/chunks/Df9Pyfl2.js"];
export const stylesheets = ["_app/immutable/assets/25.-d-xZGKP.css"];
export const fonts = [];
