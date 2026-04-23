import { h as head, a as attr_class, s as store_get, u as unsubscribe_stores } from "../../../../chunks/renderer.js";
import { p as page } from "../../../../chunks/stores.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { children } = $$props;
    head("p23yfe", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Admin — Ex Libris</title>`);
      });
    });
    $$renderer2.push(`<div class="admin-layout svelte-p23yfe"><nav class="admin-nav svelte-p23yfe"><a href="/admin"${attr_class("svelte-p23yfe", void 0, {
      "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/admin"
    })}>Dashboard</a> <a href="/admin/books"${attr_class("svelte-p23yfe", void 0, {
      "active": store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/books")
    })}>Books</a> <a href="/admin/reviews"${attr_class("svelte-p23yfe", void 0, {
      "active": store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/reviews")
    })}>Reviews</a> <a href="/admin/blog"${attr_class("svelte-p23yfe", void 0, {
      "active": store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/blog")
    })}>Blog Posts</a> <a href="/admin/users"${attr_class("svelte-p23yfe", void 0, {
      "active": store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/admin/users")
    })}>User Management</a></nav> <main class="admin-content svelte-p23yfe">`);
    children($$renderer2);
    $$renderer2.push(`<!----></main></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
