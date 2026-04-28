import { h as head, e as escape_html, c as attr, i as stringify } from "../../../../chunks/renderer.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    if (!data.writing) {
      throw new Error("Writing not found");
    }
    const { title, excerpt, author, wordCount, createdAt, aiAssisted, id } = data.writing;
    const locale = data.locale || "en";
    const i18n = {
      en: {
        words: "words",
        by: "by",
        ai_assisted: "AI Assisted",
        copy_link: "Copy link",
        copied: "Link copied!",
        read_full: "Read full writing →",
        share_text: (t2, a, w) => `"${t2}" by ${a} — ${w} words on patrouch.ca`
      },
      es: {
        words: "palabras",
        by: "por",
        ai_assisted: "Asistencia IA",
        copy_link: "Copiar enlace",
        copied: "¡Enlace copiado!",
        read_full: "Leer escrito completo →",
        share_text: (t2, a, w) => `"${t2}" por ${a} — ${w} palabras en patrouch.ca`
      },
      fr: {
        words: "mots",
        by: "par",
        ai_assisted: "Assistance IA",
        copy_link: "Copier le lien",
        copied: "Lien copié !",
        read_full: "Lire l'écrit complet →",
        share_text: (t2, a, w) => `"${t2}" par ${a} — ${w} mots sur patrouch.ca`
      }
    };
    const t = i18n[locale] || i18n.en;
    const localeMap = { en: "en-US", es: "es-MX", fr: "fr-FR" };
    const dateStr = new Date(createdAt.replace(" ", "T")).toLocaleDateString(localeMap[locale] || "en-US", { month: "long", day: "numeric", year: "numeric" });
    const shareUrl = typeof window !== "undefined" ? window.location.href : `https://patrouch.ca/card/${id}`;
    t.share_text(title, author, wordCount);
    head("1mi5mc3", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>"${escape_html(title)}" by ${escape_html(author)} — patrouch.ca</title>`);
      });
      $$renderer3.push(`<meta property="og:title"${attr("content", title)}/> <meta property="og:description"${attr("content", excerpt)}/> <meta property="og:type" content="article"/> <meta property="og:url"${attr("content", shareUrl)}/> <meta property="og:site_name" content="patrouch.ca"/> <meta name="twitter:card" content="summary_large_image"/> <meta name="twitter:title"${attr("content", title)}/> <meta name="twitter:description"${attr("content", excerpt)}/>`);
    });
    $$renderer2.push(`<div class="card-container svelte-1mi5mc3"><div class="card svelte-1mi5mc3" id="writing-card"><div class="card-header svelte-1mi5mc3"><span class="site-badge svelte-1mi5mc3">patrouch.ca</span> `);
    if (aiAssisted) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="ai-badge svelte-1mi5mc3">${escape_html(t.ai_assisted)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <h1 class="card-title svelte-1mi5mc3">${escape_html(title)}</h1> <p class="card-author svelte-1mi5mc3">${escape_html(t.by)} <strong class="svelte-1mi5mc3">${escape_html(author)}</strong></p> <div class="card-divider svelte-1mi5mc3"></div> <blockquote class="card-excerpt svelte-1mi5mc3">${escape_html(excerpt)}</blockquote> <div class="card-footer svelte-1mi5mc3"><span class="card-meta svelte-1mi5mc3">${escape_html(wordCount)} ${escape_html(t.words)}</span> <span class="card-meta svelte-1mi5mc3">${escape_html(dateStr)}</span></div> <div class="card-watermark svelte-1mi5mc3">✍️</div></div> <div class="actions svelte-1mi5mc3"><button class="btn-copy svelte-1mi5mc3">`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svelte-1mi5mc3"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> <span>${escape_html(t.copy_link)}</span>`);
    }
    $$renderer2.push(`<!--]--></button> <div class="share-buttons svelte-1mi5mc3"><button class="share-btn whatsapp svelte-1mi5mc3" title="WhatsApp"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path></svg></button> <button class="share-btn telegram svelte-1mi5mc3" title="Telegram"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"></path></svg></button> <button class="share-btn mastodon svelte-1mi5mc3" title="Mastodon"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 3.085.576 4.417.283 1.32.759 2.135 1.38 2.895.67.82 1.563 1.29 2.642 1.42.49.058.99.088 1.49.088h.03c.51 0 1.02-.03 1.53-.088 1.08-.13 1.972-.6 2.642-1.42.62-.76 1.097-1.575 1.38-2.895.25-1.332.458-3.177.576-4.417.172-1.866.186-3.737.26-5.611.05-1.306.02-2.731-.26-4.032zm-2.85 12.99c-.16.84-.42 1.5-.78 2.01-.48.66-1.14 1.02-1.98 1.11-.54.06-1.08.09-1.62.09h-.03c-.54 0-1.08-.03-1.62-.09-.84-.09-1.5-.45-1.98-1.11-.36-.51-.62-1.17-.78-2.01-.12-.6-.18-1.2-.24-1.8-.06-.6-.09-1.2-.09-1.8 0-.6.03-1.2.09-1.8.06-.6.12-1.2.24-1.8.16-.84.42-1.5.78-2.01.48-.66 1.14-1.02 1.98-1.11.54-.06 1.08-.09 1.62-.09h.03c.54 0 1.08.03 1.62.09.84.09 1.5.45 1.98 1.11.36.51.62 1.17.78 2.01.12.6.18 1.2.24 1.8.06.6.09 1.2.09 1.8 0 .6-.03 1.2-.09 1.8-.06.6-.12 1.2-.24 1.8zm-3.39-4.59v2.79h-1.56v-2.79c0-.78-.39-1.17-1.17-1.17-.78 0-1.17.39-1.17 1.17v2.79H11.56v-2.79c0-.78-.39-1.17-1.17-1.17-.78 0-1.17.39-1.17 1.17v2.79H7.66V9.9h1.56v.78c.39-.51.9-.78 1.56-.78.66 0 1.17.27 1.56.78.39-.51.9-.78 1.56-.78.66 0 1.17.27 1.56.78v-.78h1.56v4.2z"></path></svg></button> `);
    if (typeof navigator !== "undefined" && navigator.share) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button class="share-btn native svelte-1mi5mc3" title="Share"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg></button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <a${attr("href", `/writings/${stringify(id)}`)} class="back-link svelte-1mi5mc3">${escape_html(t.read_full)}</a></div></div>`);
  });
}
export {
  _page as default
};
