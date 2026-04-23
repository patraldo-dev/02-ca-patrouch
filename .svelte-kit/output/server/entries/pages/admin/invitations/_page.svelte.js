import { e as escape_html, d as attr, c as store_get, n as maybe_selected, f as ensure_array_like, u as unsubscribe_stores, a as pop, p as push } from "../../../../chunks/index2.js";
import { t } from "../../../../chunks/index3.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils.js";
import "../../../../chunks/state.svelte.js";
function _page($$payload, $$props) {
  push();
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
  $$payload.out.push(`<div class="invitations-page svelte-15bv2ej"><h1 class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.title"))}</h1> <p class="subtitle svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.subtitle"))}</p> <div class="create-section svelte-15bv2ej"><h2 class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.create_title"))}</h2> <form class="svelte-15bv2ej"><input type="email"${attr("value", email)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("admin.invitations.email_placeholder"))} class="svelte-15bv2ej"/> <select class="svelte-15bv2ej">`);
  $$payload.select_value = role;
  $$payload.out.push(`<option value="member"${maybe_selected($$payload, "member")}>Member</option><option value="admin"${maybe_selected($$payload, "admin")}>Admin</option>`);
  $$payload.select_value = void 0;
  $$payload.out.push(`</select> <button type="submit"${attr("disabled", creating, true)} class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.create_button"))}</button></form> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div> <div class="list-section svelte-15bv2ej"><h2 class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.list_title"))}</h2> `);
  if (invitations.length === 0) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<p class="empty svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.no_invitations"))}</p>`);
  } else {
    $$payload.out.push("<!--[!-->");
    const each_array = ensure_array_like(invitations);
    $$payload.out.push(`<div class="table-wrap svelte-15bv2ej"><table class="svelte-15bv2ej"><thead><tr><th class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.col.email"))}</th><th class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.col.created"))}</th><th class="svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.col.status"))}</th><th class="svelte-15bv2ej"></th></tr></thead><tbody><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let inv = each_array[$$index];
      $$payload.out.push(`<tr><td class="svelte-15bv2ej">${escape_html(inv.email || "—")}</td><td class="svelte-15bv2ej">${escape_html(formatDate(inv.created_at))}</td><td class="svelte-15bv2ej">`);
      if (inv.used) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<span class="badge used svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.status.used"))}</span>`);
      } else {
        $$payload.out.push("<!--[!-->");
        $$payload.out.push(`<span class="badge pending svelte-15bv2ej">${escape_html(store_get($$store_subs ??= {}, "$t", t)("admin.invitations.status.pending"))}</span>`);
      }
      $$payload.out.push(`<!--]--></td><td class="svelte-15bv2ej">`);
      if (!inv.used) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<button class="copy-btn svelte-15bv2ej">📋</button>`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]--></td></tr>`);
    }
    $$payload.out.push(`<!--]--></tbody></table></div>`);
  }
  $$payload.out.push(`<!--]--></div></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
