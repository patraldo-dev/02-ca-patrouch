import { k as head, e as escape_html, c as store_get, f as ensure_array_like, g as attr_class, h as stringify, d as attr, u as unsubscribe_stores, a as pop, p as push } from "../../../../chunks/index2.js";
import { t } from "../../../../chunks/index3.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  let users = data.users || [];
  let deletingId = null;
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.title"))}</title>`;
  });
  $$payload.out.push(`<div class="admin-users-container svelte-1p497kv"><header class="page-header svelte-1p497kv"><h1 class="svelte-1p497kv">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.heading"))}</h1> <p class="subtitle svelte-1p497kv">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.subtitle"))}</p></header> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (users.length === 0) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="empty-state svelte-1p497kv"><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.empty"))}</p></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
    const each_array = ensure_array_like(users);
    $$payload.out.push(`<div class="users-table-wrapper svelte-1p497kv"><table class="users-table svelte-1p497kv"><thead><tr><th class="svelte-1p497kv">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.table.username"))}</th><th class="svelte-1p497kv">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.table.email"))}</th><th class="svelte-1p497kv">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.table.role"))}</th><th class="actions-column svelte-1p497kv">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.table.actions"))}</th></tr></thead><tbody><!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let user = each_array[$$index];
      $$payload.out.push(`<tr class="user-row svelte-1p497kv"><td class="username-cell svelte-1p497kv"><div class="user-info svelte-1p497kv"><div class="user-avatar svelte-1p497kv">${escape_html(user.username.substring(0, 2).toUpperCase())}</div> <span class="username-text svelte-1p497kv">${escape_html(user.username)}</span></div></td><td class="email-cell svelte-1p497kv">${escape_html(user.email)}</td><td class="role-cell svelte-1p497kv"><span${attr_class(`role-badge role-${stringify(user.role)}`, "svelte-1p497kv")}>${escape_html(user.role === "admin" ? store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.roles.admin") : user.role === "member" ? store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.roles.member") : user.role === "agent" ? "Agent" : store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.roles.user"))}</span></td><td class="actions-cell svelte-1p497kv">`);
      if (user.role !== "admin") {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`<button class="action-btn delete-btn svelte-1p497kv"${attr("disabled", deletingId === user.id, true)}${attr("aria-label", store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.delete"))}>`);
        if (deletingId === user.id) {
          $$payload.out.push("<!--[-->");
          $$payload.out.push(`<span class="spinner svelte-1p497kv"></span>`);
        } else {
          $$payload.out.push("<!--[!-->");
          $$payload.out.push(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`);
        }
        $$payload.out.push(`<!--]--></button>`);
      } else {
        $$payload.out.push("<!--[!-->");
        $$payload.out.push(`<span class="protected-label svelte-1p497kv">—</span>`);
      }
      $$payload.out.push(`<!--]--></td></tr>`);
    }
    $$payload.out.push(`<!--]--></tbody></table></div>`);
  }
  $$payload.out.push(`<!--]--> <div class="back-link svelte-1p497kv"><a href="/admin" class="svelte-1p497kv">← ${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.backToHome"))}</a></div></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
