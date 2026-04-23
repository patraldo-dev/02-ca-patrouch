import { k as head, e as escape_html } from "../../../chunks/index2.js";
function _page($$payload) {
  let input = "¡Hola, quién eres? Café, año, música";
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>UTF-8 Test — Ex Libris</title>`;
    $$payload2.out.push(`<meta charset="utf-8"/>`);
  });
  $$payload.out.push(`<div class="container svelte-1c6m2lj"><h1 class="svelte-1c6m2lj">UTF-8 Internationalization Test</h1> <form accept-charset="UTF-8"><textarea rows="4" placeholder="Type text with diacritics..." class="svelte-1c6m2lj">`);
  const $$body = escape_html(input);
  if ($$body) {
    $$payload.out.push(`${$$body}`);
  }
  $$payload.out.push(`</textarea> <button type="button" class="svelte-1c6m2lj">Test UTF-8</button></form> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
}
export {
  _page as default
};
