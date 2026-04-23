import { k as head, g as attr_class, e as escape_html, c as store_get, u as unsubscribe_stores, a as pop, p as push } from "../../../chunks/index2.js";
import { p as page } from "../../../chunks/stores.js";
import { t } from "../../../chunks/index3.js";
function _layout($$payload, $$props) {
  push();
  var $$store_subs;
  let { children } = $$props;
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.layout.title"))}</title>`;
  });
  $$payload.out.push(`<div class="admin-layout svelte-1qg5d05"><nav class="admin-nav svelte-1qg5d05"><a href="/admin"${attr_class("svelte-1qg5d05", void 0, {
    "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/admin"
  })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.layout.dashboard"))}</a> <a href="/admin/users"${attr_class("svelte-1qg5d05", void 0, {
    "active": store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/users")
  })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.layout.users"))}</a> <a href="/admin/invitations"${attr_class("svelte-1qg5d05", void 0, {
    "active": store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/invitations")
  })}>📨 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.layout.invitations"))}</a> <a href="/admin/analytics"${attr_class("svelte-1qg5d05", void 0, {
    "active": store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/analytics")
  })}>📊 Analytics</a></nav> <main class="admin-content svelte-1qg5d05">`);
  children($$payload);
  $$payload.out.push(`<!----></main></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _layout as default
};
