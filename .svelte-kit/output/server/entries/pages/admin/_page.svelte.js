import { h as head, e as escape_html, s as store_get, u as unsubscribe_stores } from "../../../chunks/renderer.js";
import { t } from "../../../chunks/index3.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    head("1jef3w8", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.title"))}</title>`);
      });
    });
    $$renderer2.push(`<div class="admin-container svelte-1jef3w8"><header class="admin-header svelte-1jef3w8"><h1 class="svelte-1jef3w8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.heading"))}</h1> <p class="svelte-1jef3w8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.welcome"))}</p></header> <div class="admin-grid svelte-1jef3w8"><section class="admin-card svelte-1jef3w8"><h2 class="svelte-1jef3w8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.title"))}</h2> <p class="card-desc svelte-1jef3w8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.subtitle"))}</p> <div class="admin-actions svelte-1jef3w8"><a href="/admin/users" class="btn-primary svelte-1jef3w8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.manage"))}</a></div></section> <section class="admin-card svelte-1jef3w8"><h2 class="svelte-1jef3w8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.analytics.title"))}</h2> <p class="card-desc svelte-1jef3w8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.analytics.subtitle"))}</p> <div class="admin-actions svelte-1jef3w8"><a href="/admin/analytics" class="btn-primary svelte-1jef3w8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.analytics.view"))}</a></div></section></div> <div class="admin-footer svelte-1jef3w8"><a href="/" class="btn-secondary svelte-1jef3w8">← ${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.backToHome"))}</a></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
