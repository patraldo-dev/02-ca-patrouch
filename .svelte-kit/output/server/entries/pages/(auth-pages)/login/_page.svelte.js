import { e as escape_html, b as store_get, c as attr, u as unsubscribe_stores } from "../../../../chunks/renderer.js";
import { t } from "../../../../chunks/index3.js";
import "../../../../chunks/auth-client.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let error = data?.errorMessage || "";
    let isLoading = false;
    let identifier = "";
    let password = "";
    $$renderer2.push(`<div class="login-page svelte-1l3oj45"><div class="login-container svelte-1l3oj45"><div class="login-card svelte-1l3oj45"><div class="login-header svelte-1l3oj45"><h1 class="svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.title"))}</h1> <p class="svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.subtitle"))}</p></div> `);
    if (error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="error-message svelte-1l3oj45"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#ef4444"></circle><path d="M12 8V12" stroke="white" stroke-width="2" stroke-linecap="round"></path><path d="M12 16H12.01" stroke="white" stroke-width="2" stroke-linecap="round"></path></svg> <span>${escape_html(error)}</span></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="oauth-section svelte-1l3oj45"><button type="button" class="btn-oauth btn-google svelte-1l3oj45"><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"></path><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg> Google</button> <button type="button" class="btn-oauth btn-github svelte-1l3oj45"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg> GitHub</button></div> <div class="divider svelte-1l3oj45"><span class="divider-line svelte-1l3oj45"></span> <span class="divider-text svelte-1l3oj45">or</span> <span class="divider-line svelte-1l3oj45"></span></div> <form class="login-form svelte-1l3oj45"><div class="form-group svelte-1l3oj45"><label for="identifier" class="svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.email_label"))}</label> <input id="identifier"${attr("value", identifier)} type="text"${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.login.email_placeholder"))} required="" autocomplete="username"${attr("disabled", isLoading, true)} class="svelte-1l3oj45"/></div> <div class="form-group svelte-1l3oj45"><label for="password" class="svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.password_label"))}</label> <div class="password-wrapper svelte-1l3oj45"><input id="password"${attr("value", password)}${attr("type", "password")}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("auth.login.password_placeholder"))} required="" autocomplete="current-password"${attr("disabled", isLoading, true)} class="svelte-1l3oj45"/> <button type="button" class="toggle-password svelte-1l3oj45" aria-label="Toggle password visibility">`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`);
    }
    $$renderer2.push(`<!--]--></button></div></div> <div class="form-options svelte-1l3oj45"><a href="/forgot-password" class="forgot-link svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.forgot"))}</a></div> <button type="submit" class="login-button svelte-1l3oj45"${attr("disabled", isLoading, true)}>`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.sign_in"))}`);
    }
    $$renderer2.push(`<!--]--></button></form> <p class="signup-link svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.no_account"))} <a href="/signup" class="svelte-1l3oj45">${escape_html(store_get($$store_subs ??= {}, "$t", t)("auth.login.sign_up"))}</a></p></div></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
