import { c as store_get, u as unsubscribe_stores, a as pop, p as push } from "../../../chunks/index2.js";
import { p as page } from "../../../chunks/stores.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let alreadyConfirmed = store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("already") === "true";
  let type = store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("type") || "user";
  $$payload.out.push(`<div class="container svelte-hsy38w"><div class="confirmation-card svelte-hsy38w">`);
  if (alreadyConfirmed) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<h1 class="svelte-hsy38w">Already Confirmed</h1> <p class="svelte-hsy38w">`);
    if (type === "newsletter") {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`Your newsletter subscription has already been confirmed. Thank you for subscribing!`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`Your email has already been verified. Thank you for confirming your account!`);
    }
    $$payload.out.push(`<!--]--></p>`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<h1 class="svelte-hsy38w">`);
    if (type === "newsletter") {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`Newsletter Subscription Confirmed!`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`Email Verified!`);
    }
    $$payload.out.push(`<!--]--></h1> <p class="svelte-hsy38w">`);
    if (type === "newsletter") {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`Thank you for subscribing to our newsletter. You'll now receive updates about new books and reviews.`);
    } else {
      $$payload.out.push("<!--[!-->");
      $$payload.out.push(`Thank you for verifying your email. Your account is now fully activated.`);
    }
    $$payload.out.push(`<!--]--></p>`);
  }
  $$payload.out.push(`<!--]--> <a href="/" class="btn svelte-hsy38w">Return to Homepage</a></div></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
