import { d as attr, e as escape_html, c as store_get, u as unsubscribe_stores, a as pop, p as push } from "../../../../chunks/index2.js";
import { t } from "../../../../chunks/index3.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let isAdult = false;
  let username = "";
  let email = "";
  let password = "";
  let confirmPassword = "";
  let isLoading = false;
  $$payload.out.push(`<main class="svelte-1w0wxd8"><svg class="signup-icon svelte-1w0wxd8" width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="28" cy="28" r="26" stroke="#c9a87c" stroke-width="1" opacity="0.3"></circle><path d="M18 38 C18 30 22 22 28 22 C34 22 38 30 38 38" stroke="#c9a87c" stroke-width="1.5" fill="none" stroke-linecap="round"></path><path d="M22 16 L26 28" stroke="#c9a87c" stroke-width="1.5" fill="none" stroke-linecap="round"></path><circle cx="26" cy="28" r="1.5" fill="#c9a87c"></circle><path d="M26 28 Q30 32 34 26" stroke="#c9a87c" stroke-width="1.5" fill="none" stroke-linecap="round"></path></svg> <h1>Create an Account</h1> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <form class="svelte-1w0wxd8"><div><label for="username" class="svelte-1w0wxd8">Username</label> <input id="username"${attr("value", username)} type="text" required placeholder="Choose a username" minlength="3" maxlength="32" class="svelte-1w0wxd8"/></div> <div><label for="email" class="svelte-1w0wxd8">Email</label> <input id="email"${attr("value", email)} type="email" required placeholder="your@email.com" class="svelte-1w0wxd8"/></div> <div><label for="password" class="svelte-1w0wxd8">Password</label> <input id="password"${attr("value", password)} type="password" placeholder="Create a password" required minlength="8" autocomplete="new-password"${attr("disabled", isLoading, true)} class="svelte-1w0wxd8"/></div> <div><label for="confirmPassword" class="svelte-1w0wxd8">Confirm Password</label> <input id="confirmPassword"${attr("value", confirmPassword)} type="password" placeholder="Repeat your password" required autocomplete="new-password"${attr("disabled", isLoading, true)} class="svelte-1w0wxd8"/></div> <div class="checkbox-group svelte-1w0wxd8"><input type="checkbox" id="adult"${attr("checked", isAdult, true)} required${attr("disabled", isLoading, true)} class="svelte-1w0wxd8"/> <label for="adult" class="svelte-1w0wxd8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("signup.adult_confirm"))}</label></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <button type="submit"${attr("disabled", isLoading, true)} class="svelte-1w0wxd8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("signup.button"))}</button></form> <p style="margin-top: 1rem;">${escape_html(store_get($$store_subs ??= {}, "$t", t)("signup.have_account"))} <a href="/login" class="svelte-1w0wxd8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("signup.login_link"))}</a></p></main>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
