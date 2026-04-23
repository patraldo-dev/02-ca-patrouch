import { b as bind_props, a as pop, p as push, e as escape_html, c as store_get, d as attr, u as unsubscribe_stores, f as ensure_array_like, g as attr_class, h as stringify, i as copy_payload, j as assign_payload, k as head, l as attr_style } from "../../chunks/index2.js";
import { t, l as locale } from "../../chunks/index3.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "../../chunks/state.svelte.js";
import "clsx";
import "../../chunks/OnboardingFlow.svelte_svelte_type_style_lang.js";
import { p as page } from "../../chunks/stores.js";
import { h as html } from "../../chunks/html.js";
function SearchModal($$payload, $$props) {
  push();
  let { serverLocale = "en", open = false } = $$props;
  $$payload.out.push(`<button class="search-fab svelte-1gvkdtx" aria-label="Search"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg></button> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { open });
  pop();
}
const descriptions = {
  "en": {
    "/": "Patrouch — A space for writing. Get daily creative sparks, write in any language, and share your voice with a community of writers.",
    "/agora": "Browse writings from the Patrouch community. Discover new voices, read published works, and find inspiration.",
    "/write": "Your daily writing space. Accept today's creative spark, write freely, and track your writing streaks.",
    "/login": "Sign in to your Patrouch account.",
    "/signup": "Join Patrouch — a writing community for creative minds. Get daily prompts and start writing today."
  },
  "es": {
    "/": "Patrouch — Un espacio de escritura. Recibe chispas creativas diarias, escribe en cualquier idioma y comparte tu voz con una comunidad de escritores.",
    "/agora": "Explora escritos de la comunidad Patrouch. Descubre nuevas voces, lee obras publicadas y encuentra inspiración.",
    "/write": "Tu espacio diario de escritura. Acepta la chispa creativa de hoy, escribe libremente y lleva tu racha.",
    "/login": "Inicia sesión en tu cuenta de Patrouch.",
    "/signup": "Únete a Patrouch — una comunidad de escritura para mentes creativas. Recibe estímulos diarios y empieza a escribir hoy."
  },
  "fr": {
    "/": "Patrouch — Un espace d'écriture. Recevez des étincelles créatives quotidiennes, écrivez dans n'importe quelle langue et partagez votre voix.",
    "/agora": "Parcourez les écrits de la communauté Patrouch. Découvrez de nouvelles voix et trouvez l'inspiration.",
    "/write": "Votre espace d'écriture quotidien. Acceptez l'étincelle du jour, écrivez librement et suivez votre progression.",
    "/login": "Connectez-vous à votre compte Patrouch.",
    "/signup": "Rejoignez Patrouch — une communauté d'écriture pour esprits créatifs. Recevez des prompts quotidiens et commencez à écrire."
  }
};
function getSeoMeta(pathname, lang) {
  const localeDescriptions = descriptions[lang] || descriptions["en"];
  const desc = localeDescriptions[pathname] || localeDescriptions["/"];
  const title = "Patrouch.ca — A Playful Space for Serious Writing";
  const ogImage = "https://patrouch.ca/og-image.png";
  return {
    title,
    description: desc,
    ogTitle: title,
    ogDescription: desc,
    ogImage,
    ogUrl: `https://patrouch.ca${pathname}`,
    ogType: "website",
    ogLocale: lang === "es" ? "es_MX" : lang === "fr" ? "fr_FR" : "en_US",
    canonical: `https://patrouch.ca${pathname}`
  };
}
function NewsletterForm($$payload, $$props) {
  push();
  var $$store_subs;
  let email = "";
  let isSubmitting = false;
  $$payload.out.push(`<div class="newsletter-form svelte-v55u47"><h3 class="svelte-v55u47">${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.newsletter.title"))}</h3> <p class="svelte-v55u47">${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.newsletter.description"))}</p> `);
  {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--> <form><div class="input-group svelte-v55u47"><input type="email"${attr("value", email)}${attr("placeholder", store_get($$store_subs ??= {}, "$t", t)("common.newsletter.email_placeholder"))} required${attr("disabled", isSubmitting, true)} class="svelte-v55u47"/> <button type="submit"${attr("disabled", isSubmitting, true)} class="svelte-v55u47">`);
  {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.newsletter.subscribe_button"))}`);
  }
  $$payload.out.push(`<!--]--></button></div></form></div>`);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
function LanguageSwitcherDesktop($$payload, $$props) {
  push();
  const languages = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
    { code: "fr", label: "FR" }
  ];
  let { serverLocale = "es" } = $$props;
  let activeLocale = serverLocale || "es";
  languages.find((l) => l.code === activeLocale);
  const each_array = ensure_array_like(languages);
  $$payload.out.push(`<div class="lang-switcher svelte-evvbcv"><!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let lang = each_array[$$index];
    $$payload.out.push(`<button${attr_class("lang-pill svelte-evvbcv", void 0, { "active": activeLocale === lang.code })}${attr("aria-label", `Switch to ${stringify(lang.label)}`)}>${escape_html(lang.label)}</button>`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop();
}
function getTheme() {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") || "dark";
}
function _layout($$payload, $$props) {
  push();
  var $$store_subs;
  let { data, children } = $$props;
  let mobileMenuOpen = false;
  let currentTheme = getTheme();
  let searchOpen = false;
  data.activeProfile?.id || null;
  let activeDisplayName = data.activeProfile?.display_name || data.user?.username || "";
  let scrolled = false;
  let scrollProgress = 0;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    head($$payload2, ($$payload3) => {
      $$payload3.title = `<title>Patrouch</title>`;
      $$payload3.out.push(`<html${attr("lang", store_get($$store_subs ??= {}, "$locale", locale) || "en")}></html> <meta name="description"${attr("content", getSeoMeta(store_get($$store_subs ??= {}, "$page", page).url.pathname, store_get($$store_subs ??= {}, "$locale", locale) || "en").description)}/> <link rel="canonical"${attr("href", "https://patrouch.ca" + store_get($$store_subs ??= {}, "$page", page).url.pathname)}/> <meta property="og:title" content="Patrouch — A Space for Writing"/> <meta property="og:description"${attr("content", getSeoMeta(store_get($$store_subs ??= {}, "$page", page).url.pathname, store_get($$store_subs ??= {}, "$locale", locale) || "en").description)}/> <meta property="og:url"${attr("content", "https://patrouch.ca" + store_get($$store_subs ??= {}, "$page", page).url.pathname)}/> <meta property="og:type" content="website"/> <meta property="og:locale"${attr("content", store_get($$store_subs ??= {}, "$locale", locale) === "es" ? "es_MX" : store_get($$store_subs ??= {}, "$locale", locale) === "fr" ? "fr_FR" : "en_US")}/> <meta property="og:site_name" content="Patrouch"/> <meta name="twitter:card" content="summary"/>`);
    });
    $$payload2.out.push(`<div class="scroll-progress"${attr_style(`width: ${stringify(scrollProgress)}%`)}></div> <div class="app-layout svelte-12qhfyh"><header${attr_class("navbar svelte-12qhfyh", void 0, { "scrolled": scrolled })}><div class="container nav-container svelte-12qhfyh"><a href="/" class="logo svelte-12qhfyh" aria-label="Home"><span class="logo-initials svelte-12qhfyh">C. R</span> <span class="logo-name svelte-12qhfyh">Patraldo</span></a> <nav class="desktop-nav svelte-12qhfyh" aria-label="Main navigation"><a href="/"${attr_class("svelte-12qhfyh", void 0, {
      "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/"
    })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.home"))}</a> <a href="/agora"${attr_class("svelte-12qhfyh", void 0, {
      "active": store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/agora")
    })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.agora"))}</a> <a href="/write"${attr_class("svelte-12qhfyh", void 0, {
      "active": store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/write")
    })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.write"))}</a> <a href="/games"${attr_class("svelte-12qhfyh", void 0, {
      "active": store_get($$store_subs ??= {}, "$page", page).url.pathname.startsWith("/games")
    })}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.games"))}</a> `);
    if (data?.user?.role === "admin" || data?.user?.role === "member") {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<div class="taller-dropdown svelte-12qhfyh"><button class="taller-trigger svelte-12qhfyh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.taller"))}</button> `);
      {
        $$payload2.out.push("<!--[!-->");
      }
      $$payload2.out.push(`<!--]--></div>`);
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--> `);
    if (data?.user && data.user.role !== "admin" && data.user.role !== "member") {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<span class="taller-teaser svelte-12qhfyh"${attr("title", "Members only")}>${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.taller"))}</span> `);
      {
        $$payload2.out.push("<!--[!-->");
      }
      $$payload2.out.push(`<!--]-->`);
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--></nav> <div class="nav-actions svelte-12qhfyh"><button class="theme-toggle svelte-12qhfyh"${attr("aria-label", currentTheme === "dark" ? store_get($$store_subs ??= {}, "$t", t)("common.theme_light") : store_get($$store_subs ??= {}, "$t", t)("common.theme_dark"))}${attr("title", currentTheme === "dark" ? store_get($$store_subs ??= {}, "$t", t)("common.theme_light") : store_get($$store_subs ??= {}, "$t", t)("common.theme_dark"))}>`);
    if (currentTheme === "dark") {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`);
    } else {
      $$payload2.out.push("<!--[!-->");
      $$payload2.out.push(`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`);
    }
    $$payload2.out.push(`<!--]--></button> <button class="help-btn"${attr("title", store_get($$store_subs ??= {}, "$t", t)("common.help"))}>?</button> `);
    LanguageSwitcherDesktop($$payload2, { serverLocale: data.serverLocale });
    $$payload2.out.push(`<!----> <div class="auth-actions svelte-12qhfyh">`);
    if (data?.user) {
      $$payload2.out.push("<!--[-->");
      if (data.user?.role === "admin") {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="profile-switcher svelte-12qhfyh"><button class="profile-trigger svelte-12qhfyh"><span class="profile-avatar svelte-12qhfyh">${escape_html((activeDisplayName || "?")[0].toUpperCase())}</span> <span class="profile-name svelte-12qhfyh">${escape_html(activeDisplayName)}</span> <span class="admin-badge svelte-12qhfyh">admin</span> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg></button> `);
        {
          $$payload2.out.push("<!--[!-->");
        }
        $$payload2.out.push(`<!--]--></div>`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<a href="/profile" class="profile-trigger svelte-12qhfyh"><span class="profile-avatar svelte-12qhfyh">${escape_html((data.user.display_name || data.user.username || "?")[0].toUpperCase())}</span> <span class="profile-name svelte-12qhfyh">${escape_html(data.user.display_name || data.user.username)}</span></a>`);
      }
      $$payload2.out.push(`<!--]--> <button class="btn-glass svelte-12qhfyh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.logout"))}</button>`);
    } else {
      $$payload2.out.push("<!--[!-->");
      $$payload2.out.push(`<a href="/login" class="btn-glass svelte-12qhfyh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.login"))}</a> <a href="/signup" class="btn-accent svelte-12qhfyh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.nav.signup"))}</a>`);
    }
    $$payload2.out.push(`<!--]--></div></div> <button class="mobile-toggle svelte-12qhfyh" aria-label="Toggle menu"${attr("aria-expanded", mobileMenuOpen)}><span${attr_class("hamburger svelte-12qhfyh", void 0, { "open": mobileMenuOpen })}><span class="svelte-12qhfyh"></span><span class="svelte-12qhfyh"></span><span class="svelte-12qhfyh"></span></span></button></div></header> `);
    {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--> <main class="main-content svelte-12qhfyh">`);
    children($$payload2);
    $$payload2.out.push(`<!----> `);
    SearchModal($$payload2, {
      serverLocale: data.serverLocale,
      get open() {
        return searchOpen;
      },
      set open($$value) {
        searchOpen = $$value;
        $$settled = false;
      }
    });
    $$payload2.out.push(`<!----> `);
    {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--> `);
    {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--></main> <footer id="footer" class="site-footer svelte-12qhfyh"><div class="container"><div class="newsletter-section svelte-12qhfyh">`);
    NewsletterForm($$payload2);
    $$payload2.out.push(`<!----></div> <div class="footer-bottom svelte-12qhfyh"><p class="footer-tagline svelte-12qhfyh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.footer.tagline"))}</p> <p class="footer-copy svelte-12qhfyh">© ${escape_html((/* @__PURE__ */ new Date()).getFullYear())} Christophe R Patraldo — <a href="https://patrouch.ca" class="svelte-12qhfyh">patrouch.ca</a></p> <p class="footer-built svelte-12qhfyh">${html(store_get($$store_subs ??= {}, "$t", t)("common.footer.built_by"))}</p> <p class="footer-links svelte-12qhfyh"><a href="/privacy" class="svelte-12qhfyh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.footer.privacy"))}</a> <span class="footer-sep svelte-12qhfyh">·</span> <a href="/terms" class="svelte-12qhfyh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.footer.terms"))}</a> <span class="footer-sep svelte-12qhfyh">·</span> <a href="mailto:ishmael@patrouch.ca" class="svelte-12qhfyh">${escape_html(store_get($$store_subs ??= {}, "$t", t)("common.footer.contact"))}</a></p></div></div></footer></div> // tiny test Wed Apr 22 02:22:33 PM CST 2026
// tiny test Wed Apr 22 03:23:42 PM CST 2026
// again, tiny test Wed Apr 22 03:27:04 PM CST 2026`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
export {
  _layout as default
};
