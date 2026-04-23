import { k as head, n as maybe_selected, a as pop, p as push } from "../../../../chunks/index2.js";
function _page($$payload, $$props) {
  push();
  let days = 30;
  head($$payload, ($$payload2) => {
    $$payload2.title = `<title>Analytics — patrouch.ca</title>`;
  });
  $$payload.out.push(`<div class="analytics-dashboard svelte-h1vjnr"><header class="svelte-h1vjnr"><h1 class="svelte-h1vjnr">Analytics</h1> <div class="controls svelte-h1vjnr"><label for="days" class="svelte-h1vjnr">Period:</label> <select id="days" class="svelte-h1vjnr">`);
  $$payload.select_value = days;
  $$payload.out.push(`<option value="7"${maybe_selected($$payload, "7")}>Last 7 days</option><option value="30"${maybe_selected($$payload, "30")}>Last 30 days</option><option value="90"${maybe_selected($$payload, "90")}>Last 90 days</option><option value="365"${maybe_selected($$payload, "365")}>Last year</option>`);
  $$payload.select_value = void 0;
  $$payload.out.push(`</select></div></header> `);
  {
    $$payload.out.push("<!--[!-->");
    {
      $$payload.out.push("<!--[-->");
      $$payload.out.push(`<div class="loading svelte-h1vjnr">Loading analytics...</div>`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
export {
  _page as default
};
