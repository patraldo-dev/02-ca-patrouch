import { h as head, e as escape_html, s as store_get, u as unsubscribe_stores } from "../../../chunks/renderer.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils3.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
import { t } from "../../../chunks/index2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    head("6rw1dw", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.title"))} — Patrouch</title>`);
      });
    });
    $$renderer2.push(`<section class="games-page svelte-6rw1dw"><h1 class="page-title svelte-6rw1dw">${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.title"))}</h1> <p class="page-subtitle svelte-6rw1dw">${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.find_the_ai_desc"))}</p> <div class="cards-grid svelte-6rw1dw"><button class="game-card svelte-6rw1dw"><span class="game-card-icon svelte-6rw1dw">🕵️</span> <div class="game-card-body svelte-6rw1dw"><h2 class="svelte-6rw1dw">${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.find_the_ai"))}</h2> <p class="svelte-6rw1dw">${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.find_the_ai_desc"))}</p></div></button> <button class="game-card svelte-6rw1dw"><span class="game-card-icon svelte-6rw1dw">🍾</span> <div class="game-card-body svelte-6rw1dw"><h2 class="svelte-6rw1dw">${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.find_the_bottle"))}</h2> <p class="svelte-6rw1dw">${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.find_the_bottle_desc"))}</p></div></button></div></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
