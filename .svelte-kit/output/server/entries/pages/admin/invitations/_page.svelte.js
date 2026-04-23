import { e as escape_html, s as store_get, b as attr, c as ensure_array_like, u as unsubscribe_stores } from "../../../../chunks/renderer.js";
import { t } from "../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils3.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let invitations = [];
    let email = "";
    let role = "member";
    let creating = false;
    async function loadInvitations() {
      const res = await fetch("/api/admin/invite");
      if (res.ok) invitations = await res.json();
    }
    function formatDate(ts) {
      if (!ts) return "—";
      return new Date(ts * 1e3).toLocaleDateString();
    }
    loadInvitations();
    $$renderer2.push(`<div class="invitations-page svelte-15bv2ej"><h1 class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.title"))}</h1> <p class="subtitle svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.subtitle"))}</p> <div class="create-section svelte-15bv2ej"><h2 class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.create_title"))}</h2> <form class="svelte-15bv2ej"><input type="email"${attr("value", email)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("admin.invitations.email_placeholder"))} class="svelte-15bv2ej"/> `);
    $$renderer2.select(
      { value: role, class: "" },
      ($$renderer3) => {
        $$renderer3.option({ value: "member" }, ($$renderer4) => {
          $$renderer4.push(`Member`);
        });
        $$renderer3.option({ value: "admin" }, ($$renderer4) => {
          $$renderer4.push(`Admin`);
        });
      },
      "svelte-15bv2ej"
    );
    $$renderer2.push(` <button type="submit"${attr("disabled", creating, true)} class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.create_button"))}</button></form> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="list-section svelte-15bv2ej"><h2 class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.list_title"))}</h2> `);
    if (invitations.length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="empty svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.no_invitations"))}</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="table-wrap svelte-15bv2ej"><table class="svelte-15bv2ej"><thead><tr><th class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.col.email"))}</th><th class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.col.created"))}</th><th class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.col.status"))}</th><th class="svelte-15bv2ej"></th></tr></thead><tbody><!--[-->`);
      const each_array = ensure_array_like(invitations);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let inv = each_array[$$index];
        $$renderer2.push(`<tr><td class="svelte-15bv2ej">${escape_html(inv.email || "—")}</td><td class="svelte-15bv2ej">${escape_html(formatDate(inv.created_at))}</td><td class="svelte-15bv2ej">`);
        if (inv.used) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="badge used svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.status.used"))}</span>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<span class="badge pending svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.status.pending"))}</span>`);
        }
        $$renderer2.push(`<!--]--></td><td class="svelte-15bv2ej">`);
        if (!inv.used) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="copy-btn svelte-15bv2ej">📋</button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></td></tr>`);
      }
      $$renderer2.push(`<!--]--></tbody></table></div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
