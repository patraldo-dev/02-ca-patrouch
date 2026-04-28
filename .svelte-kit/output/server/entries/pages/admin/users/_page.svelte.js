import { h as head, e as escape_html, b as store_get, f as ensure_array_like, a as attr_class, i as stringify, c as attr, u as unsubscribe_stores } from "../../../../chunks/renderer.js";
import { t } from "../../../../chunks/index3.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let users = data.users || [];
    let deletingId = null;
    head("1p497kv", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.title"))}</title>`);
      });
    });
    $$renderer2.push(`<div class="admin-users-container svelte-1p497kv"><header class="page-header svelte-1p497kv"><h1 class="svelte-1p497kv">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.heading"))}</h1> <p class="subtitle svelte-1p497kv">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.subtitle"))}</p></header> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (users.length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="empty-state svelte-1p497kv"><p>${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.empty"))}</p></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="users-table-wrapper svelte-1p497kv"><table class="users-table svelte-1p497kv"><thead><tr><th class="svelte-1p497kv">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.table.username"))}</th><th class="svelte-1p497kv">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.table.email"))}</th><th class="svelte-1p497kv">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.table.role"))}</th><th class="actions-column svelte-1p497kv">${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.table.actions"))}</th></tr></thead><tbody><!--[-->`);
      const each_array = ensure_array_like(users);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let user = each_array[$$index];
        $$renderer2.push(`<tr class="user-row svelte-1p497kv"><td class="username-cell svelte-1p497kv"><div class="user-info svelte-1p497kv"><div class="user-avatar svelte-1p497kv">${escape_html(user.username.substring(0, 2).toUpperCase())}</div> <span class="username-text svelte-1p497kv">${escape_html(user.username)}</span></div></td><td class="email-cell svelte-1p497kv">${escape_html(user.email)}</td><td class="role-cell svelte-1p497kv"><span${attr_class(`role-badge role-${stringify(user.role)}`, "svelte-1p497kv")}>${escape_html(user.role === "admin" ? store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.roles.admin") : user.role === "member" ? store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.roles.member") : user.role === "agent" ? "Agent" : store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.roles.user"))}</span></td><td class="actions-cell svelte-1p497kv">`);
        if (user.role !== "admin") {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="action-btn delete-btn svelte-1p497kv"${attr("disabled", deletingId === user.id, true)}${attr("aria-label", store_get($$store_subs ??= {}, "$t", t)("pages.admin.sections.users.delete"))}>`);
          if (deletingId === user.id) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<span class="spinner svelte-1p497kv"></span>`);
          } else {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`);
          }
          $$renderer2.push(`<!--]--></button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<span class="protected-label svelte-1p497kv">—</span>`);
        }
        $$renderer2.push(`<!--]--></td></tr>`);
      }
      $$renderer2.push(`<!--]--></tbody></table></div>`);
    }
    $$renderer2.push(`<!--]--> <div class="back-link svelte-1p497kv"><a href="/admin" class="svelte-1p497kv">← ${escape_html(store_get($$store_subs ??= {}, "$t", t)("pages.admin.backToHome"))}</a></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
