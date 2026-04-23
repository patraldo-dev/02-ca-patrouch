import { k as head, e as escape_html, c as store_get, u as unsubscribe_stores, a as pop, p as push } from "../../../chunks/index2.js";
import { t } from "../../../chunks/index3.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.reviews.title"))}</title>`;
  });
  $$payload.out.push(`<div class="container svelte-1lwsl2u"><div class="page-header svelte-1lwsl2u"><h1 class="svelte-1lwsl2u">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.reviews.heading"))}</h1> <p class="subtitle svelte-1lwsl2u">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.reviews.subtitle"))}</p></div> `);
  {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="state-box svelte-1lwsl2u"><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.reviews.loading"))}</p></div>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
