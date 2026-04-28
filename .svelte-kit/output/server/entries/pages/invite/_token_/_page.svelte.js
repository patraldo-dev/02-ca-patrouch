import { e as escape_html, b as store_get, u as unsubscribe_stores } from "../../../../chunks/renderer.js";
import { p as page } from "../../../../chunks/stores.js";
import { g as goto } from "../../../../chunks/client.js";
import { t } from "../../../../chunks/index3.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let loading = true;
    let success = false;
    let errorMsg = "";
    async function acceptInvite() {
      try {
        const res = await fetch(`/api/invite/${store_get($$store_subs ??= {}, "$page", page).params.token}`);
        if (res.ok) {
          success = true;
          setTimeout(() => goto("/"), 2e3);
        } else {
          const body = await res.json();
          errorMsg = body.message || "Invalid or expired invitation";
        }
      } catch {
        errorMsg = "Network error. Please try again.";
      } finally {
        loading = false;
      }
    }
    if (data.user) {
      acceptInvite();
    }
    $$renderer2.push(`<div class="invite-page svelte-12nwbd8">`);
    if (loading) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="card svelte-12nwbd8"><div class="spinner svelte-12nwbd8"></div> <p class="svelte-12nwbd8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("invite.accepting"))}</p></div>`);
    } else if (success) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div class="card success svelte-12nwbd8"><div class="icon svelte-12nwbd8">✨</div> <h2 class="svelte-12nwbd8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("invite.success.title"))}</h2> <p class="svelte-12nwbd8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("invite.success.message"))}</p></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="card error svelte-12nwbd8"><div class="icon svelte-12nwbd8">⚠️</div> <h2 class="svelte-12nwbd8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("invite.error.title"))}</h2> <p class="svelte-12nwbd8">${escape_html(errorMsg)}</p> <a href="/" class="btn svelte-12nwbd8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("invite.back_home"))}</a></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
