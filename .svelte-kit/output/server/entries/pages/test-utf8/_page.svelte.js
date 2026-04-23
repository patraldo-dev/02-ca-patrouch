import { h as head, e as escape_html } from "../../../chunks/renderer.js";
function _page($$renderer) {
  let input = "¡Hola, quién eres? Café, año, música";
  head("1c6m2lj", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>UTF-8 Test — Ex Libris</title>`);
    });
    $$renderer2.push(`<meta charset="utf-8"/>`);
  });
  $$renderer.push(`<div class="container svelte-1c6m2lj"><h1 class="svelte-1c6m2lj">UTF-8 Internationalization Test</h1> <form accept-charset="UTF-8"><textarea rows="4" placeholder="Type text with diacritics..." class="svelte-1c6m2lj">`);
  const $$body = escape_html(input);
  if ($$body) {
    $$renderer.push(`${$$body}`);
  }
  $$renderer.push(`</textarea> <button type="button" class="svelte-1c6m2lj">Test UTF-8</button></form> `);
  {
    $$renderer.push("<!--[-1-->");
  }
  $$renderer.push(`<!--]--></div>`);
}
export {
  _page as default
};
