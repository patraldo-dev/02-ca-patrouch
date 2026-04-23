import { f as ensure_array_like, e as escape_html, c as store_get, d as attr, n as maybe_selected, u as unsubscribe_stores, a as pop, p as push } from "../../../chunks/index2.js";
import { g as getLocale, t } from "../../../chunks/index3.js";
import { g as goto } from "../../../chunks/client.js";
function _page($$payload, $$props) {
  push();
  var $$store_subs;
  let { data } = $$props;
  if (!data.user) {
    goto();
  }
  let text = "";
  getLocale();
  let voiceId = "pNInz6obpgDQGcFmaJgB";
  let provider = "cloudflare";
  let useAiDevelop = false;
  let isLoading = false;
  let isAiLoading = false;
  let hasKey = false;
  let keyPreview = null;
  let showKeySetup = false;
  let apiKeyInput = "";
  let keyLoading = false;
  let hasCfKey = false;
  let showCfKeySetup = false;
  let cfApiKeyInput = "";
  let cfAccountIdInput = "";
  let hasHfKey = false;
  let showHfKeySetup = false;
  let hfApiKeyInput = "";
  let cfKeyLoading = false;
  const cfVoices = [{ id: "default", name: "Default" }];
  let voices = cfVoices;
  async function checkKey() {
    try {
      const res = await fetch("/api/tts/api-key");
      const data2 = await res.json();
      hasKey = data2.hasKey;
      keyPreview = data2.preview;
      showKeySetup = !data2.hasKey;
    } catch (e) {
    }
  }
  checkKey();
  async function checkCfKey() {
    try {
      const res = await fetch("/api/tts/cf-api-key");
      const data2 = await res.json();
      hasCfKey = data2.hasKey;
      if (provider === "cloudflare" && !data2.hasKey) showCfKeySetup = true;
    } catch (e) {
    }
  }
  checkCfKey();
  async function checkHfKey() {
    try {
      const res = await fetch("/api/tts/deepinfra-api-key");
      const data2 = await res.json();
      hasHfKey = data2.hasKey;
      if (provider === "kokoro" && !data2.hasKey) ;
    } catch (e) {
    }
  }
  checkHfKey();
  const each_array = ensure_array_like(voices);
  $$payload.out.push(`<main class="audio-page svelte-8dkqzx"><div class="container"><h1 class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.title"))}</h1> <p class="audio-desc svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.description"))}</p> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (showKeySetup) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="key-setup svelte-8dkqzx"><h2 class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_title"))}</h2> <p class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_desc"))}</p> <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener" class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_link"))}</a> <div class="key-form svelte-8dkqzx"><input type="password"${attr("value", apiKeyInput)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("audio.key_placeholder"))}${attr("disabled", keyLoading, true)} class="svelte-8dkqzx"/> <button${attr("disabled", apiKeyInput.length < 10, true)} class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_save"))}</button></div> `);
    {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (showCfKeySetup) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="key-setup svelte-8dkqzx"><h2 class="svelte-8dkqzx">Cloudflare Workers AI</h2> <p class="svelte-8dkqzx">Requires a Cloudflare paid plan. Enter your CF API token and Account ID.</p> <div class="key-form svelte-8dkqzx" style="flex-direction:column;gap:0.5rem;"><input type="text"${attr("value", cfAccountIdInput)} placeholder="CF Account ID"${attr("disabled", cfKeyLoading, true)} class="svelte-8dkqzx"/> <input type="password"${attr("value", cfApiKeyInput)} placeholder="CF API Token"${attr("disabled", cfKeyLoading, true)} class="svelte-8dkqzx"/> <button${attr("disabled", cfApiKeyInput.length < 10 || cfAccountIdInput.length < 10, true)} class="svelte-8dkqzx">${escape_html("Save")}</button></div> `);
    {
      $$payload.out.push("<!--[!-->");
    }
    $$payload.out.push(`<!--]--></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (showHfKeySetup) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="key-setup svelte-8dkqzx"><h2 class="svelte-8dkqzx">Kokoro TTS (DeepInfra)</h2> <p class="svelte-8dkqzx">Enter your DeepInfra API key (requires card at deepinfra.com).</p> <div class="key-form svelte-8dkqzx" style="flex-direction:column;gap:0.5rem;"><input type="password"${attr("value", hfApiKeyInput)} placeholder="DeepInfra API Key"${attr("disabled", isLoading, true)} class="svelte-8dkqzx"/> <button${attr("disabled", hfApiKeyInput.length < 10, true)} class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_save") || "Save")}</button></div></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (hasHfKey && !showHfKeySetup && provider === "kokoro") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="key-status svelte-8dkqzx"><span>HF: configured</span> <button class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_change"))}</button></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="audio-form svelte-8dkqzx"><div class="row svelte-8dkqzx"><div class="field svelte-8dkqzx"><label class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.provider"))}</label> <select${attr("disabled", isLoading, true)} class="svelte-8dkqzx">`);
  $$payload.select_value = provider;
  $$payload.out.push(`<option value="elevenlabs"${maybe_selected($$payload, "elevenlabs")}>ElevenLabs</option><option value="kokoro"${maybe_selected($$payload, "kokoro")}>Kokoro</option><option value="cloudflare"${maybe_selected($$payload, "cloudflare")}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.provider_free_limited"))}</option>`);
  $$payload.select_value = void 0;
  $$payload.out.push(`</select></div> <div class="field svelte-8dkqzx"><label class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.voice"))}</label> <select${attr("disabled", isLoading, true)} class="svelte-8dkqzx">`);
  $$payload.select_value = voiceId;
  $$payload.out.push(`<!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let v = each_array[$$index];
    $$payload.out.push(`<option${attr("value", v.id)}${maybe_selected($$payload, v.id)}>${escape_html(v.name)}</option>`);
  }
  $$payload.out.push(`<!--]-->`);
  $$payload.select_value = void 0;
  $$payload.out.push(`</select></div></div> <div class="field full svelte-8dkqzx" style="position:relative;"><label class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.text_label"))}</label> <textarea${attr("lang", data.serverLocale || "en")} spellcheck="true"${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("audio.placeholder"))} rows="14"${attr("disabled", isAiLoading, true)} class="svelte-8dkqzx">`);
  const $$body = escape_html(text);
  if ($$body) {
    $$payload.out.push(`${$$body}`);
  }
  $$payload.out.push(`</textarea> <button class="copy-inline svelte-8dkqzx"${attr("title", store_get($$store_subs ??= {}, "$t", t)("audio.copy"))}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg></button> <div class="textarea-footer"><span class="char-count svelte-8dkqzx">${escape_html(text.length)} / 5000 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.chars") || "characters")}</span></div></div> <div class="options-row svelte-8dkqzx"><label class="toggle svelte-8dkqzx"><input type="checkbox"${attr("checked", useAiDevelop, true)} class="svelte-8dkqzx"/> <span>${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.ai_develop"))}</span></label></div> <p class="privacy-note svelte-8dkqzx">🔒 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.privacy"))}</p> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <div class="actions svelte-8dkqzx">`);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <button class="btn-primary svelte-8dkqzx"${attr("disabled", text.length < 10, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.generate_btn"))}</button></div></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  if (hasKey && !showKeySetup) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="key-status svelte-8dkqzx"><span>Key: ${escape_html(keyPreview)}</span> <button class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_change"))}</button></div>`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> `);
  {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="key-status svelte-8dkqzx"><span>${escape_html(hasCfKey ? "CF: configured" : "CF: not configured")}</span> <button class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_change"))}</button></div>`);
  }
  $$payload.out.push(`<!--]--></div> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></main>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _page as default
};
