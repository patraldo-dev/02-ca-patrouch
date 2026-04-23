import { c as store_get, e as escape_html, u as unsubscribe_stores, a as pop, p as push } from "../../../chunks/index2.js";
import { p as page } from "../../../chunks/stores.js";
import { t } from "../../../chunks/index3.js";
import { h as html } from "../../../chunks/html.js";
function _error($$payload, $$props) {
  push();
  var $$store_subs;
  let status = store_get($$store_subs ??= {}, "$page", page).status;
  $$payload.out.push(`<div class="error-page svelte-17nr8gh">`);
  if (status === 403) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<h1 class="svelte-17nr8gh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.error.access_denied"))}</h1> <p class="svelte-17nr8gh">${html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.error.reserved"))}</p> <a href="/write" class="btn-accent svelte-17nr8gh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.error.go_write"))}</a> <a href="/" class="btn-glass svelte-17nr8gh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.error.back_home"))}</a>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<h1 class="svelte-17nr8gh">${escape_html(status)}</h1> <p class="svelte-17nr8gh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.error.something_wrong"))}</p> <a href="/" class="btn svelte-17nr8gh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.error.back_home"))}</a>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _error as default
};
