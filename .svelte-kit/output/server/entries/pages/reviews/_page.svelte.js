import { h as head, e as escape_html, s as store_get, u as unsubscribe_stores } from "../../../chunks/renderer.js";
import { t } from "../../../chunks/index2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    head("1lwsl2u", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.reviews.title"))}</title>`);
      });
    });
    $$renderer2.push(`<div class="container svelte-1lwsl2u"><div class="page-header svelte-1lwsl2u"><h1 class="svelte-1lwsl2u">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.reviews.heading"))}</h1> <p class="subtitle svelte-1lwsl2u">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.reviews.subtitle"))}</p></div> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="state-box svelte-1lwsl2u"><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.reviews.loading"))}</p></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
