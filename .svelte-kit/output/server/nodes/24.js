import * as server from '../entries/pages/games/_page.server.js';

export const index = 24;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/games/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/games/+page.server.js";
export const imports = ["_app/immutable/nodes/24.DBcpc5cV.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/COH9MEEV.js","_app/immutable/chunks/DGB_sTAZ.js","_app/immutable/chunks/BelQN5Eo.js","_app/immutable/chunks/CNZgEGEW.js","_app/immutable/chunks/CMjCajgg.js","_app/immutable/chunks/X_E6-_TU.js","_app/immutable/chunks/DZcxTGg-.js","_app/immutable/chunks/BnKHZF6D.js","_app/immutable/chunks/lj8Kp-za.js"];
export const stylesheets = ["_app/immutable/assets/24.BFNOxqco.css"];
export const fonts = [];
