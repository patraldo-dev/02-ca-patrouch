import { k as head, e as escape_html, c as store_get, u as unsubscribe_stores, a as pop, p as push } from "../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "clsx";
import "../../../chunks/state.svelte.js";
import { t } from "../../../chunks/index3.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.title"))} — Patrouch</title>`;
  });
  $$payload.out.push(`<section class="games-page svelte-6rw1dw"><h1 class="page-title svelte-6rw1dw">${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.title"))}</h1> <p class="page-subtitle svelte-6rw1dw">${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.find_the_ai_desc"))}</p> <div class="cards-grid svelte-6rw1dw"><button class="game-card svelte-6rw1dw"><span class="game-card-icon svelte-6rw1dw">🕵️</span> <div class="game-card-body svelte-6rw1dw"><h2 class="svelte-6rw1dw">${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.find_the_ai"))}</h2> <p class="svelte-6rw1dw">${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.find_the_ai_desc"))}</p></div></button> <button class="game-card svelte-6rw1dw"><span class="game-card-icon svelte-6rw1dw">🍾</span> <div class="game-card-body svelte-6rw1dw"><h2 class="svelte-6rw1dw">${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.find_the_bottle"))}</h2> <p class="svelte-6rw1dw">${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.find_the_bottle_desc"))}</p></div></button></div></section>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
