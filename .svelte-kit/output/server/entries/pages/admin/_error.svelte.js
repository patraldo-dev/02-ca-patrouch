import { e as escape_html, b as store_get, u as unsubscribe_stores, d as derived } from "../../../chunks/renderer.js";
import { p as page } from "../../../chunks/stores.js";
import { t } from "../../../chunks/index3.js";
import { h as html } from "../../../chunks/html.js";
function _error($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let status = derived(() => store_get($$store_subs ??= {}, "$page", page).status);
    $$renderer2.push(`<div class="error-page svelte-17nr8gh">`);
    if (status() === 403) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<h1 class="svelte-17nr8gh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.error.access_denied"))}</h1> <p class="svelte-17nr8gh">${html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.error.reserved"))}</p> <a href="/write" class="btn-accent svelte-17nr8gh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.error.go_write"))}</a> <a href="/" class="btn-glass svelte-17nr8gh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.error.back_home"))}</a>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<h1 class="svelte-17nr8gh">${escape_html(status())}</h1> <p class="svelte-17nr8gh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.error.something_wrong"))}</p> <a href="/" class="btn svelte-17nr8gh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.error.back_home"))}</a>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _error as default
};
