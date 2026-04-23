import { k as head, g as attr_class, c as store_get, u as unsubscribe_stores, a as pop, p as push } from "../../../../chunks/index2.js";
import { p as page } from "../../../../chunks/stores.js";
function _layout($$payload, $$props) {
  push();
  var $$store_subs;
  let { children } = $$props;
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Admin — Ex Libris</title>`;
  });
  $$payload.out.push(`<div class="admin-layout svelte-p23yfe"><nav class="admin-nav svelte-p23yfe"><a href="/admin"${attr_class("svelte-p23yfe", void 0, {
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
  children($$payload);
  $$payload.out.push(`<!----></main></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _layout as default
};
