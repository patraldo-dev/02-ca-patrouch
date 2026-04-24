import { e as escape_html, s as store_get, c as ensure_array_like, b as attr, u as unsubscribe_stores, d as derived } from "../../../chunks/renderer.js";
import { g as getLocale, t } from "../../../chunks/index3.js";
import { g as goto } from "../../../chunks/client.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
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
    let voices = derived(() => cfVoices);
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
    $$renderer2.push(`<main class="audio-page svelte-8dkqzx"><div class="container"><h1 class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.title"))}</h1> <p class="audio-desc svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.description"))}</p> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (showKeySetup) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="key-setup svelte-8dkqzx"><h2 class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_title"))}</h2> <p class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_desc"))}</p> <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener" class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_link"))}</a> <div class="key-form svelte-8dkqzx"><input type="password"${attr("value", apiKeyInput)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("audio.key_placeholder"))}${attr("disabled", keyLoading, true)} class="svelte-8dkqzx"/> <button${attr("disabled", apiKeyInput.length < 10, true)} class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_save"))}</button></div> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (showCfKeySetup) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="key-setup svelte-8dkqzx"><h2 class="svelte-8dkqzx">Cloudflare Workers AI</h2> <p class="svelte-8dkqzx">Requires a Cloudflare paid plan. Enter your CF API token and Account ID.</p> <div class="key-form svelte-8dkqzx" style="flex-direction:column;gap:0.5rem;"><input type="text"${attr("value", cfAccountIdInput)} placeholder="CF Account ID"${attr("disabled", cfKeyLoading, true)} class="svelte-8dkqzx"/> <input type="password"${attr("value", cfApiKeyInput)} placeholder="CF API Token"${attr("disabled", cfKeyLoading, true)} class="svelte-8dkqzx"/> <button${attr("disabled", cfApiKeyInput.length < 10 || cfAccountIdInput.length < 10, true)} class="svelte-8dkqzx">${escape_html("Save")}</button></div> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (showHfKeySetup) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="key-setup svelte-8dkqzx"><h2 class="svelte-8dkqzx">Kokoro TTS (DeepInfra)</h2> <p class="svelte-8dkqzx">Enter your DeepInfra API key (requires card at deepinfra.com).</p> <div class="key-form svelte-8dkqzx" style="flex-direction:column;gap:0.5rem;"><input type="password"${attr("value", hfApiKeyInput)} placeholder="DeepInfra API Key"${attr("disabled", isLoading, true)} class="svelte-8dkqzx"/> <button${attr("disabled", hfApiKeyInput.length < 10, true)} class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_save") || "Save")}</button></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (hasHfKey && !showHfKeySetup && provider === "kokoro") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="key-status svelte-8dkqzx"><span>HF: configured</span> <button class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_change"))}</button></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="audio-form svelte-8dkqzx"><div class="row svelte-8dkqzx"><div class="field svelte-8dkqzx"><label class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.provider"))}</label> `);
    $$renderer2.select(
      { value: provider, disabled: isLoading, class: "" },
      ($$renderer3) => {
        $$renderer3.option({ value: "elevenlabs" }, ($$renderer4) => {
          $$renderer4.push(`ElevenLabs`);
        });
        $$renderer3.option({ value: "kokoro" }, ($$renderer4) => {
          $$renderer4.push(`Kokoro`);
        });
        $$renderer3.option({ value: "cloudflare" }, ($$renderer4) => {
          $$renderer4.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.provider_free_limited"))}`);
        });
      },
      "svelte-8dkqzx"
    );
    $$renderer2.push(`</div> <div class="field svelte-8dkqzx"><label class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.voice"))}</label> `);
    $$renderer2.select(
      { value: voiceId, disabled: isLoading, class: "" },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(voices());
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let v = each_array[$$index];
          $$renderer3.option({ value: v.id }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(v.name)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-8dkqzx"
    );
    $$renderer2.push(`</div></div> <div class="field full svelte-8dkqzx" style="position:relative;"><label class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.text_label"))}</label> <textarea${attr("lang", data.serverLocale || "en")} spellcheck="true"${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("audio.placeholder"))} rows="14"${attr("disabled", isAiLoading, true)} class="svelte-8dkqzx">`);
    const $$body = escape_html(text);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea> <button class="copy-inline svelte-8dkqzx"${attr("title", store_get($$store_subs ??= {}, "$t", t)("audio.copy"))}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg></button> <div class="textarea-footer"><span class="char-count svelte-8dkqzx">${escape_html(text.length)} / 5000 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.chars") || "characters")}</span></div></div> <div class="options-row svelte-8dkqzx"><label class="toggle svelte-8dkqzx"><input type="checkbox"${attr("checked", useAiDevelop, true)} class="svelte-8dkqzx"/> <span>${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.ai_develop"))}</span></label></div> <p class="privacy-note svelte-8dkqzx">🔒 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.privacy"))}</p> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="actions svelte-8dkqzx">`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <button class="btn-primary svelte-8dkqzx"${attr("disabled", text.length < 10, true)}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.generate_btn"))}</button></div></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (hasKey && !showKeySetup) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="key-status svelte-8dkqzx"><span>Key: ${escape_html(keyPreview)}</span> <button class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_change"))}</button></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="key-status svelte-8dkqzx"><span>${escape_html(hasCfKey ? "CF: configured" : "CF: not configured")}</span> <button class="svelte-8dkqzx">${escape_html(store_get($$store_subs ??= {}, "$t", t)("audio.key_change"))}</button></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></main>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
