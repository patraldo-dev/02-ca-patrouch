import { d as derived, s as store_get, u as unsubscribe_stores } from "../../../chunks/renderer.js";
import { p as page } from "../../../chunks/stores.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let alreadyConfirmed = derived(() => store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("already") === "true");
    let type = derived(() => store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("type") || "user");
    $$renderer2.push(`<div class="container svelte-hsy38w"><div class="confirmation-card svelte-hsy38w">`);
    if (alreadyConfirmed()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<h1 class="svelte-hsy38w">Already Confirmed</h1> <p class="svelte-hsy38w">`);
      if (type() === "newsletter") {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`Your newsletter subscription has already been confirmed. Thank you for subscribing!`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`Your email has already been verified. Thank you for confirming your account!`);
      }
      $$renderer2.push(`<!--]--></p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<h1 class="svelte-hsy38w">`);
      if (type() === "newsletter") {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`Newsletter Subscription Confirmed!`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`Email Verified!`);
      }
      $$renderer2.push(`<!--]--></h1> <p class="svelte-hsy38w">`);
      if (type() === "newsletter") {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`Thank you for subscribing to our newsletter. You'll now receive updates about new books and reviews.`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`Thank you for verifying your email. Your account is now fully activated.`);
      }
      $$renderer2.push(`<!--]--></p>`);
    }
    $$renderer2.push(`<!--]--> <a href="/" class="btn svelte-hsy38w">Return to Homepage</a></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
