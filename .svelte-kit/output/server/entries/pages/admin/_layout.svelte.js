import { h as head, a as attr_class, s as store_get, e as escape_html, u as unsubscribe_stores } from "../../../chunks/renderer.js";
import { p as page } from "../../../chunks/stores.js";
import { t } from "../../../chunks/index2.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { children } = $$props;
    head("1qg5d05", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.layout.title"))}</title>`);
      });
    });
    $$renderer2.push(`<div class="admin-layout svelte-1qg5d05"><nav class="admin-nav svelte-1qg5d05"><a href="/admin"${attr_class("svelte-1qg5d05", void 0, {
      "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/admin"
    })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.layout.dashboard"))}</a> <a href="/admin/users"${attr_class("svelte-1qg5d05", void 0, {
      "active": store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/users")
    })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.layout.users"))}</a> <a href="/admin/invitations"${attr_class("svelte-1qg5d05", void 0, {
      "active": store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/invitations")
    })}>📨 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.layout.invitations"))}</a> <a href="/admin/analytics"${attr_class("svelte-1qg5d05", void 0, {
      "active": store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/analytics")
    })}>📊 Analytics</a></nav> <main class="admin-content svelte-1qg5d05">`);
    children($$renderer2);
    $$renderer2.push(`<!----></main></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
