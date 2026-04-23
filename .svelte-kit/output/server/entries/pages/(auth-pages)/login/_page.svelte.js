import { e as escape_html, c as store_get, d as attr, u as unsubscribe_stores, a as pop, p as push } from "../../../../chunks/index2.js";
import { t } from "../../../../chunks/index3.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  data?.redirectTo || "/";
  let error = data?.errorMessage || "";
  let isLoading = false;
  let identifier = "";
  let password = "";
  $$payload.out.push(`<div class="login-page svelte-1l3oj45"><div class="login-container svelte-1l3oj45"><div class="login-card svelte-1l3oj45"><div class="login-header svelte-1l3oj45"><h1 class="svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.title"))}</h1> <p class="svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.subtitle"))}</p> <p class="signup-link svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.no_account"))} <a href="/signup" class="svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.sign_up"))}</a></p></div> `);
  if (error) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="error-message svelte-1l3oj45"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="svelte-1l3oj45"><circle cx="12" cy="12" r="10" fill="#ef4444" class="svelte-1l3oj45"></circle><path d="M12 8V12" stroke="white" stroke-width="2" stroke-linecap="round" class="svelte-1l3oj45"></path><path d="M12 16H12.01" stroke="white" stroke-width="2" stroke-linecap="round" class="svelte-1l3oj45"></path></svg> <span class="svelte-1l3oj45">${escape_html(error)}</span></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <form class="login-form svelte-1l3oj45"><div class="form-group svelte-1l3oj45"><label for="identifier" class="svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.email_label"))}</label> <input id="identifier"${attr("value", identifier)} type="text"${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.login.email_placeholder"))} required autocomplete="username"${attr("disabled", isLoading, true)} class="svelte-1l3oj45"/></div> <div class="form-group svelte-1l3oj45"><label for="password" class="svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.password_label"))}</label> <input id="password"${attr("value", password)} type="password"${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.login.password_placeholder"))} required autocomplete="current-password"${attr("disabled", isLoading, true)} class="svelte-1l3oj45"/></div> <div class="form-options svelte-1l3oj45"><label class="checkbox-container svelte-1l3oj45"><input type="checkbox" class="svelte-1l3oj45"/> <span class="checkmark svelte-1l3oj45"></span> Remember me</label> <a href="/forgot-password" class="forgot-link svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.forgot"))}</a></div> <button type="submit" class="login-button svelte-1l3oj45"${attr("disabled", isLoading, true)}>`);
  {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.sign_in"))}`);
  }
  $$payload.out.push(`<!--]--></button></form></div></div> <a href="#footer" class="hero-scroll svelte-1l3oj45" aria-label="Scroll to subscribe"><span class="scroll-line svelte-1l3oj45"></span></a></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
