import { a as attr_class, e as escape_html, f as ensure_array_like, i as stringify, c as attr, h as head, b as store_get, k as clsx, j as attr_style, u as unsubscribe_stores, d as derived } from "../../../../chunks/renderer.js";
import { t } from "../../../../chunks/index3.js";
import { g as get } from "../../../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/exports.js";
import "../../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/state.svelte.js";
function BootyChat($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let messages = [];
    let input = "";
    let connected = false;
    let minimized = false;
    function formatTime(iso) {
      if (!iso) return "";
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    $$renderer2.push(`<div${attr_class("booty-chat svelte-q3qfat", void 0, { "minimized": minimized })}><button class="chat-toggle svelte-q3qfat" aria-label="Toggle chat"><span class="toggle-icon svelte-q3qfat">${escape_html("✕")}</span> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="toggle-title svelte-q3qfat">Chat</span>`);
    }
    $$renderer2.push(`<!--]--> <span${attr_class("toggle-status svelte-q3qfat", void 0, { "online": connected })}>●</span></button> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="chat-body svelte-q3qfat"><div class="chat-header svelte-q3qfat"><span>🏴‍☠️ Booty Chat</span> <span${attr_class("conn-badge svelte-q3qfat", void 0, { "online": connected })}>${escape_html("○ Reconnecting")}</span></div> <div class="chat-messages svelte-q3qfat"><!--[-->`);
      const each_array = ensure_array_like(messages);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let msg = each_array[$$index];
        $$renderer2.push(`<div${attr_class(`chat-msg ${stringify(msg.type)}`, "svelte-q3qfat")}>`);
        if (msg.type === "system") {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="system-text svelte-q3qfat">${escape_html(msg.message)}</span>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<div class="msg-header svelte-q3qfat"><span${attr_class(`msg-author ${stringify(msg.type)}`, "svelte-q3qfat")}>${escape_html(msg.type === "narrator" ? "🎭" : "")} ${escape_html(msg.display_name || msg.username)}</span> <span class="msg-time svelte-q3qfat">${escape_html(formatTime(msg.created_at))}</span></div> <div class="msg-body svelte-q3qfat">${escape_html(msg.message)}</div>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--> `);
      if (!messages.length) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="chat-empty svelte-q3qfat">Conectando al chat...</div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> <form class="chat-input-row svelte-q3qfat"><input type="text"${attr("value", input)} placeholder="Escribe un mensaje..."${attr("disabled", !connected, true)} maxlength="500" class="svelte-q3qfat"/> <button type="submit"${attr("disabled", !connected, true)} aria-label="Send" class="svelte-q3qfat">➤</button></form></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let scoreTab = "general";
    let launching = null;
    let fuelRequests = [];
    let requestAmount = "";
    let requestMsg = "";
    let requestingFuel = false;
    let marketListings = [];
    let wordIndex = [];
    let myBottles = [];
    let openingId = null;
    let openedBottle = null;
    let expandedBottle = null;
    function statusClass(s) {
      return "status-badge status-" + (s || "unknown");
    }
    function statusLabel(s) {
      const labels = {
        launched: { en: "Launched", es: "Lanzada", fr: "Lancée" },
        sailing: { en: "Floating", es: "Flotando", fr: "Flottant" },
        beached: { en: "Beached", es: "Varada", fr: "Échouée" },
        found: { en: "Found", es: "Encontrada", fr: "Trouvée" }
      };
      return (labels[s] || { en: s, es: s, fr: s })[data.serverLocale || "en"];
    }
    function contentTypeLabel(type) {
      const key = "bottles.type." + (type || "short_story");
      const label = get(t)(key);
      return label !== key ? label : type;
    }
    function formatDate(iso) {
      if (!iso) return "";
      return new Date(iso).toLocaleDateString(data.serverLocale || "es", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    function formatCoords(lat, lon) {
      if (lat == null || lon == null) return "";
      return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
    }
    function formatBeans(total) {
      total = total || 0;
      const licorice = Math.floor(total / 1e6);
      const r1 = total % 1e6;
      const cherry = Math.floor(r1 / 1e4);
      const r2 = r1 % 1e4;
      const lime = Math.floor(r2 / 100);
      const lemon = r2 % 100;
      let parts = [];
      if (licorice > 0) parts.push(`⚫${licorice}`);
      if (cherry > 0) parts.push(`🔴${cherry}`);
      if (lime > 0) parts.push(`🟢${lime}`);
      if (lemon > 0 || parts.length === 0) parts.push(`🟡${lemon}`);
      return parts.join(" ");
    }
    function formatSolarTime(lon) {
      if (lon == null) return "";
      const now = /* @__PURE__ */ new Date();
      const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
      const solarHours = (utcHours + lon / 15 + 24) % 24;
      const h = Math.floor(solarHours);
      const m = Math.floor((solarHours - h) * 60);
      const icon = solarHours >= 6 && solarHours < 18 ? "☀️" : "🌙";
      return `${icon} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    let totalLaunched = derived(() => data.bottles.filter((b) => b.status === "launched" || b.status === "sailing" || b.status === "beached" || b.status === "found").length);
    let totalBeached = derived(() => data.bottles.filter((b) => b.status === "beached").length);
    let totalFound = derived(() => data.bottles.filter((b) => b.status === "found").length);
    let mapInstance = null;
    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    let playersWithDist = derived(() => (data.players || []).map((p) => {
      let nearestBottle = null;
      let nearestDist = Infinity;
      for (const b of data.bottles || []) {
        if (b.current_lat && b.current_lon) {
          const d = haversine(p.lat, p.lon, b.current_lat, b.current_lon);
          if (d < nearestDist) {
            nearestDist = d;
            nearestBottle = b;
          }
        }
      }
      return {
        ...p,
        nearestBottle,
        nearestDist: nearestDist === Infinity ? null : nearestDist
      };
    }));
    let chatInput = "";
    let chatLoading = false;
    let chatHistory = [];
    let checkedIn = false;
    let checkinLoading = false;
    head("1wyf3u8", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.find_the_bottle"))} — Patrouch</title>`);
      });
    });
    $$renderer2.push(`<div class="ticker-tape svelte-1wyf3u8" role="status" aria-label="Market prices"><div class="ticker-content svelte-1wyf3u8"><span class="ticker-item svelte-1wyf3u8">🫘 BRENT <span class="ticker-value svelte-1wyf3u8">${escape_html(data.market?.brent_price?.toFixed(2) || "73.00")}</span> <span${attr_class("ticker-change svelte-1wyf3u8", void 0, {
      "ticker-up": data.market?.brent_change > 0,
      "ticker-down": data.market?.brent_change < 0
    })}>${escape_html(data.market?.brent_change > 0 ? "▲" : data.market?.brent_change < 0 ? "▼" : "—")}</span></span> <span class="ticker-divider svelte-1wyf3u8">│</span> <span class="ticker-item svelte-1wyf3u8">🏦 FED <span class="ticker-value svelte-1wyf3u8">${escape_html(data.market?.fed_rate?.toFixed(2) || "5.25")}%</span> <span${attr_class("ticker-change svelte-1wyf3u8", void 0, {
      "ticker-up": data.market?.fed_change > 0,
      "ticker-down": data.market?.fed_change < 0
    })}>${escape_html(data.market?.fed_change > 0 ? "▲" : data.market?.fed_change < 0 ? "▼" : "—")}</span></span> <span class="ticker-divider svelte-1wyf3u8">│</span> <span class="ticker-item svelte-1wyf3u8">🚢 <span class="ticker-value svelte-1wyf3u8">${escape_html(data.market?.cost_per_km?.toFixed(2) || "0.73")}</span> beans/km</span> <span class="ticker-divider svelte-1wyf3u8">│</span> <span class="ticker-item svelte-1wyf3u8">🤖 FEE <span class="ticker-value svelte-1wyf3u8">${escape_html(data.market?.fed_rate?.toFixed(2) || "5.25")}%</span></span> `);
    if (data.odds?.length && data.odds[0]?.odds?.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="ticker-divider svelte-1wyf3u8">│</span> <span class="ticker-item svelte-1wyf3u8">🎲 <span class="ticker-value svelte-1wyf3u8">${escape_html(data.odds[0].title)}</span> <!--[-->`);
      const each_array = ensure_array_like(data.odds[0].odds.slice(0, 2));
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let o = each_array[$$index];
        $$renderer2.push(`<span class="ticker-odds svelte-1wyf3u8">${escape_html(o.player.display_name || o.player.username)} ${escape_html(o.odds)}×</span>`);
      }
      $$renderer2.push(`<!--]--></span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div> `);
    if (data.myPlayer) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<a href="/games/booty/arbooty" style="display:block;background:var(--surface);border:2px solid var(--accent);border-radius:var(--radius);padding:1.5rem;margin-bottom:2rem;text-decoration:none;color:var(--text);" class="svelte-1wyf3u8"><h2 class="text-xl font-bold mb-1 svelte-1wyf3u8" style="font-family:Playfair Display,serif">🏴☠️ ${escape_html(store_get($$store_subs ??= {}, "$t", t)("booty.arbooty.title"))}</h2> <p class="text-sm svelte-1wyf3u8" style="color:var(--text-dim)">${escape_html(store_get($$store_subs ??= {}, "$t", t)("booty.arbooty.card_desc"))}</p></a> <a href="/games/booty/arbooty?mode=fiesta" style="display:block;background:var(--surface);border:2px solid #881337;border-radius:var(--radius);padding:1.5rem;margin-bottom:2rem;text-decoration:none;color:var(--text);" class="svelte-1wyf3u8"><h2 class="text-xl font-bold mb-1 svelte-1wyf3u8" style="font-family:Playfair Display,serif;color:#c9a87c">🎉 ¡Fiesta de Victor!</h2> <p class="text-sm svelte-1wyf3u8" style="color:var(--text-dim)">Encuentra mensajes escondidos con la cámara AR</p></a>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <section class="bottles-page svelte-1wyf3u8"><h1 class="page-title svelte-1wyf3u8">🍾 Booty <span class="title-accent svelte-1wyf3u8">Battle</span></h1> <p class="page-subtitle svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("games.find_the_bottle_desc"))}</p> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="stats-bar svelte-1wyf3u8"><div class="stats-row svelte-1wyf3u8"><div class="stat-item svelte-1wyf3u8"><span class="stat-num svelte-1wyf3u8">${escape_html(totalLaunched())}</span> <span class="stat-label svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.total_launched"))}</span></div> <div${attr_class("stat-item stat-divider svelte-1wyf3u8", void 0, { "stat-clickable": totalBeached() > 0 })} role="button" tabindex="0"><span class="stat-num svelte-1wyf3u8">${escape_html(totalBeached())}</span> <span class="stat-label svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.total_beached"))}</span></div></div> <div class="stats-row svelte-1wyf3u8"><div class="stat-item svelte-1wyf3u8"><span class="stat-num svelte-1wyf3u8">${escape_html(totalFound())}</span> <span class="stat-label svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.total_found"))}</span></div> <div class="stat-item stat-divider svelte-1wyf3u8"><span class="stat-num svelte-1wyf3u8">${escape_html(data.playersInPursuit || 0)}</span> <span class="stat-label svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.players_in_pursuit"))}</span></div></div> <div class="stats-row stats-row-center svelte-1wyf3u8"><button${attr_class("stat-checkin svelte-1wyf3u8", void 0, { "stat-checked": checkedIn })}${attr("disabled", checkinLoading, true)}><span class="stat-num svelte-1wyf3u8">${escape_html("✋")}</span> <span class="stat-label svelte-1wyf3u8">${escape_html("Check in")}</span></button></div> <div class="stats-row stats-row-center svelte-1wyf3u8">`);
    if (data.user && !data.myPlayer) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button class="stat-register svelte-1wyf3u8">→ ${escape_html(store_get($$store_subs ??= {}, "$t", t)("booty.register"))}</button>`);
    } else if (data.user) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<span class="stat-register stat-registered svelte-1wyf3u8">✓ ${escape_html(store_get($$store_subs ??= {}, "$t", t)("booty.registered"))}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<a href="/signup" class="stat-register svelte-1wyf3u8">→ ${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.register"))}</a>`);
    }
    $$renderer2.push(`<!--]--></div></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (data.myPlayer) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="section svelte-1wyf3u8"><h2 class="svelte-1wyf3u8">🆘 Bean Requests</h2> `);
      if (data.myPlayer) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="fuel-request-form svelte-1wyf3u8"><div class="request-row svelte-1wyf3u8"><input type="number"${attr("value", requestAmount)} min="1" max="50" placeholder="Amount (1-50)" class="transfer-input svelte-1wyf3u8" style="flex:1"/> <input type="text"${attr("value", requestMsg)} maxlength="140" placeholder="Why do you need beans?" class="transfer-input svelte-1wyf3u8" style="flex:2"/> <button class="btn-transfer svelte-1wyf3u8"${attr("disabled", requestingFuel, true)}>${escape_html("Request 🫘")}</button></div> <p class="transfer-limit svelte-1wyf3u8">Max 1 request/day · Albot Camus may reward the desperate</p></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (fuelRequests.length) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="requests-list svelte-1wyf3u8"><!--[-->`);
        const each_array_1 = ensure_array_like(fuelRequests);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let req = each_array_1[$$index_1];
          $$renderer2.push(`<div class="request-card svelte-1wyf3u8"><div class="request-info svelte-1wyf3u8"><strong class="svelte-1wyf3u8">${escape_html(req.display_name || req.username)}</strong> <span class="request-port svelte-1wyf3u8">📍 ${escape_html(req.port_name || "?")}</span> <span class="request-amount svelte-1wyf3u8">${escape_html(req.type === "ai" ? "🤖" : "👤")} requesting 🫘 ${escape_html(req.amount)}</span> `);
          if (req.message) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<span class="request-msg svelte-1wyf3u8">"${escape_html(req.message)}"</span>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]--></div> `);
          if (data.myPlayer && req.player_id !== data.myPlayer.id) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<button class="btn-fulfill svelte-1wyf3u8">Give 🫘</button>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<p class="no-requests svelte-1wyf3u8">No open requests</p>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="section svelte-1wyf3u8"><h2 class="svelte-1wyf3u8">🏪 Agora Marketplace</h2> `);
    if (wordIndex.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="word-index svelte-1wyf3u8"><span class="word-index-label svelte-1wyf3u8">📈 Word Index this month:</span> <!--[-->`);
      const each_array_2 = ensure_array_like(wordIndex.slice(0, 10));
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let w = each_array_2[$$index_2];
        $$renderer2.push(`<span class="word-pill svelte-1wyf3u8">${escape_html(w.word)} <span class="word-pts svelte-1wyf3u8">${escape_html(w.total_points)}</span></span>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (marketListings.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="listings-grid svelte-1wyf3u8"><!--[-->`);
      const each_array_3 = ensure_array_like(marketListings);
      for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
        let listing = each_array_3[$$index_3];
        $$renderer2.push(`<div class="listing-card svelte-1wyf3u8"><div class="listing-header svelte-1wyf3u8"><span class="listing-title svelte-1wyf3u8">📖 ${escape_html(listing.title || "Untitled")}</span> <span class="listing-price svelte-1wyf3u8">🫘 ${escape_html(listing.price)}</span></div> <div class="listing-meta svelte-1wyf3u8">by ${escape_html(listing.seller_name || listing.author_name)} · 📍 ${escape_html(listing.seller_port || "?")}</div> <div class="listing-excerpt svelte-1wyf3u8">${escape_html(listing.excerpt || "...")}</div> `);
        if (listing.resale_count > 0) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div class="listing-resale svelte-1wyf3u8">🔄 Resold ${escape_html(listing.resale_count)}x · 10% royalty to author</div>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (data.myPlayer && listing.seller_player_id !== data.myPlayer.id) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="btn-buy svelte-1wyf3u8">Buy for 🫘 ${escape_html(listing.price)}</button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<p class="no-requests svelte-1wyf3u8">No listings yet — publish writings and list them for sale!</p>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    if (data.odds?.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="section svelte-1wyf3u8"><h2 class="svelte-1wyf3u8">🎲 Betting Board</h2> <!--[-->`);
      const each_array_4 = ensure_array_like(data.odds);
      for (let $$index_5 = 0, $$length = each_array_4.length; $$index_5 < $$length; $$index_5++) {
        let bottleOdds = each_array_4[$$index_5];
        $$renderer2.push(`<div class="bet-bottle svelte-1wyf3u8"><div class="bet-bottle-title svelte-1wyf3u8">🍾 ${escape_html(bottleOdds.title)}</div> <div class="bet-rows svelte-1wyf3u8"><!--[-->`);
        const each_array_5 = ensure_array_like(bottleOdds.odds);
        for (let $$index_4 = 0, $$length2 = each_array_5.length; $$index_4 < $$length2; $$index_4++) {
          let o = each_array_5[$$index_4];
          $$renderer2.push(`<div class="bet-row svelte-1wyf3u8"><span class="bet-player svelte-1wyf3u8">${escape_html(o.player.type === "ai" ? "🤖" : "👤")} ${escape_html(o.player.display_name || o.player.username)}</span> <span class="bet-odds-val svelte-1wyf3u8">${escape_html(o.odds)}×</span> <span class="bet-dist svelte-1wyf3u8">${escape_html(o.distance.toFixed(2))}°</span> `);
          if (data.myPlayer && o.player.id !== data.myPlayer.id) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<button class="btn-bet svelte-1wyf3u8">Bet</button>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]--></div></div>`);
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
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (data.user) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="section svelte-1wyf3u8"><div class="section-header svelte-1wyf3u8"><h2 class="svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.my_bottles"))}</h2> <button class="btn btn-accent svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.create"))}</button></div> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (myBottles.length) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="bottles-table-wrap svelte-1wyf3u8"><table class="bottles-table svelte-1wyf3u8"><thead class="svelte-1wyf3u8"><tr class="svelte-1wyf3u8"><th class="svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.title"))}</th><th class="svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.content_type"))}</th><th class="svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.status.launched"))}</th><th class="svelte-1wyf3u8">Lat/Lng</th><th class="svelte-1wyf3u8"></th></tr></thead><tbody class="svelte-1wyf3u8"><!--[-->`);
        const each_array_8 = ensure_array_like(myBottles);
        for (let $$index_8 = 0, $$length = each_array_8.length; $$index_8 < $$length; $$index_8++) {
          let bottle = each_array_8[$$index_8];
          $$renderer2.push(`<tr class="tr-clickable svelte-1wyf3u8"><td class="td-title svelte-1wyf3u8">${escape_html(bottle.title || store_get($$store_subs ??= {}, "$t", t)("bottles.untitled"))}</td><td class="svelte-1wyf3u8"><span class="type-tag svelte-1wyf3u8">${escape_html(contentTypeLabel(bottle.content_type))}</span></td><td class="td-date svelte-1wyf3u8">${escape_html(formatDate(bottle.launched_at))}</td><td class="td-coords svelte-1wyf3u8">${escape_html(bottle.current_lat ? formatSolarTime(bottle.current_lon) : "—")}<br class="svelte-1wyf3u8"/><span class="mono svelte-1wyf3u8" style="font-size:0.75rem">${escape_html(bottle.current_lat ? formatCoords(bottle.current_lat, bottle.current_lon) : "")}</span></td><td class="td-action svelte-1wyf3u8">`);
          if (bottle.status === "preparing") {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<button class="btn btn-sm btn-accent svelte-1wyf3u8"${attr("disabled", launching, true)}>${escape_html(launching === bottle.id ? "..." : store_get($$store_subs ??= {}, "$t", t)("bottles.launch"))}</button>`);
          } else {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<span${attr_class(clsx(statusClass(bottle.status)), "svelte-1wyf3u8")}>${escape_html(statusLabel(bottle.status))}</span> `);
            if (bottle.current_lat && mapInstance) ;
            else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]--></td></tr> `);
          if (expandedBottle === bottle.id) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<tr class="tr-detail svelte-1wyf3u8"><td colspan="5" class="svelte-1wyf3u8"><div class="detail-grid svelte-1wyf3u8"><div class="detail-item svelte-1wyf3u8"><span class="detail-label svelte-1wyf3u8">ID</span> <span class="detail-value mono svelte-1wyf3u8">${escape_html(bottle.id.substring(0, 8))}…</span></div> <div class="detail-item svelte-1wyf3u8"><span class="detail-label svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.content_type"))}</span> <span class="detail-value svelte-1wyf3u8">${escape_html(contentTypeLabel(bottle.content_type))}</span></div> `);
            if (bottle.launched_at) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<div class="detail-item svelte-1wyf3u8"><span class="detail-label svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.launched_on"))}</span> <span class="detail-value svelte-1wyf3u8">${escape_html(formatDate(bottle.launched_at))}</span></div>`);
            } else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]--> `);
            if (bottle.launch_lat) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<div class="detail-item svelte-1wyf3u8"><span class="detail-label svelte-1wyf3u8">📍 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.map_title"))}</span> <span class="detail-value mono svelte-1wyf3u8">${escape_html(formatCoords(bottle.launch_lat, bottle.launch_lon))}</span></div>`);
            } else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]--> `);
            if (bottle.current_lat && (bottle.current_lat !== bottle.launch_lat || bottle.current_lon !== bottle.launch_lon)) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<div class="detail-item svelte-1wyf3u8"><span class="detail-label svelte-1wyf3u8">➜ ${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.map_title"))}</span> <span class="detail-value mono svelte-1wyf3u8">${escape_html(formatCoords(bottle.current_lat, bottle.current_lon))}</span></div>`);
            } else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]--> `);
            if (bottle.distance_km) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<div class="detail-item svelte-1wyf3u8"><span class="detail-label svelte-1wyf3u8">📏</span> <span class="detail-value svelte-1wyf3u8">${escape_html(bottle.distance_km.toFixed(1))} km</span></div>`);
            } else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]--> <div class="detail-item svelte-1wyf3u8"><span class="detail-label svelte-1wyf3u8">Status</span> <span class="detail-value svelte-1wyf3u8"><span${attr_class(clsx(statusClass(bottle.status)), "svelte-1wyf3u8")}>${escape_html(statusLabel(bottle.status))}</span></span></div> `);
            if (bottle.content && !bottle.content_hidden) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<div class="detail-item detail-full svelte-1wyf3u8"><span class="detail-label svelte-1wyf3u8">Message</span> <div class="detail-preview svelte-1wyf3u8">${escape_html(bottle.content)}</div></div>`);
            } else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]--></div></td></tr>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]--></tbody></table></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="chat-command svelte-1wyf3u8"><div class="chat-messages svelte-1wyf3u8">`);
    if (chatHistory.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<!--[-->`);
      const each_array_9 = ensure_array_like(chatHistory);
      for (let $$index_9 = 0, $$length = each_array_9.length; $$index_9 < $$length; $$index_9++) {
        let msg = each_array_9[$$index_9];
        $$renderer2.push(`<div${attr_class(`chat-msg ${stringify(msg.role)}`, "svelte-1wyf3u8")}>${escape_html(msg.text)}</div>`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <form class="chat-form svelte-1wyf3u8"><input type="text"${attr("value", chatInput)} placeholder="Say go to San Diego or chase the bottle" class="chat-input svelte-1wyf3u8"${attr("disabled", chatLoading, true)}/> `);
    if (data.user) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button type="button"${attr_class(`btn-chat-send ${stringify("")}`, "svelte-1wyf3u8")} title="Voice command" aria-label="Voice command">🎙️</button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <button type="submit" class="btn-chat-send svelte-1wyf3u8"${attr("disabled", !chatInput.trim(), true)}>🧭</button></form></div> <div class="section svelte-1wyf3u8"><div class="section-header svelte-1wyf3u8"><h2 class="svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.map_title"))}</h2> <button class="btn-sm svelte-1wyf3u8"${attr("title", "Fullscreen")}>🔳</button></div> <div class="map-container svelte-1wyf3u8"></div> `);
    if (data.player) {
      $$renderer2.push("<!--[0-->");
      BootyChat($$renderer2, {
        username: data.player.username,
        displayName: data.player.display_name
      });
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (data.bottles.filter((b) => b.status === "beached" || b.status === "found").length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="section svelte-1wyf3u8"><h2 class="svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.washed_up"))}</h2> <!--[-->`);
      const each_array_10 = ensure_array_like(data.bottles.filter((b) => b.status === "beached" || b.status === "found"));
      for (let $$index_10 = 0, $$length = each_array_10.length; $$index_10 < $$length; $$index_10++) {
        let bottle = each_array_10[$$index_10];
        $$renderer2.push(`<div class="beached-item svelte-1wyf3u8"><div class="beached-icon svelte-1wyf3u8">${escape_html(bottle.status === "found" ? "📬" : "🍾")}</div> <div class="beached-info svelte-1wyf3u8"><strong class="svelte-1wyf3u8">${escape_html(bottle.display_name || bottle.username || "Anónimo")}</strong> <div class="beached-meta svelte-1wyf3u8"><span class="type-tag svelte-1wyf3u8">${escape_html(contentTypeLabel(bottle.content_type))}</span> `);
        if (bottle.launched_at) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="meta-sep svelte-1wyf3u8">·</span> <span class="svelte-1wyf3u8">${escape_html(formatDate(bottle.launched_at))}</span> <span class="meta-sep svelte-1wyf3u8">·</span> <span class="svelte-1wyf3u8">${escape_html(formatCoords(bottle.launch_lat, bottle.launch_lon))}</span>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (bottle.current_lat) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="meta-sep svelte-1wyf3u8">→</span> <span class="svelte-1wyf3u8">${escape_html(formatCoords(bottle.current_lat, bottle.current_lon))}</span>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (bottle.distance_km) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="meta-sep svelte-1wyf3u8">·</span> <span class="svelte-1wyf3u8">${escape_html(bottle.distance_km.toFixed(0))} km</span>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div> <span${attr_class(clsx(statusClass(bottle.status)), "svelte-1wyf3u8")}>${escape_html(statusLabel(bottle.status))}</span></div> `);
        if (bottle.status === "beached" && !bottle.opened_by) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="btn btn-sm btn-accent svelte-1wyf3u8"${attr("disabled", openingId === bottle.id, true)}>${escape_html(openingId === bottle.id ? "..." : store_get($$store_subs ??= {}, "$t", t)("bottles.open_btn"))}</button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div> `);
        if (openedBottle?.id === bottle.id && openedBottle.content) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div class="revealed-content svelte-1wyf3u8"><div class="revealed-header svelte-1wyf3u8"><span class="revealed-icon svelte-1wyf3u8">🔓</span> <span class="svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.message_revealed"))}</span></div> <div class="revealed-text svelte-1wyf3u8">${escape_html(openedBottle.content)}</div></div>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (bottle.status === "found" && bottle.content && !bottle.content_hidden) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div class="revealed-content already-opened svelte-1wyf3u8"><div class="revealed-header svelte-1wyf3u8"><span class="svelte-1wyf3u8">📬</span><span class="svelte-1wyf3u8">${escape_html(store_get($$store_subs ??= {}, "$t", t)("bottles.already_opened"))}</span></div> <div class="revealed-text svelte-1wyf3u8">${escape_html(bottle.content)}</div></div>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (data.players?.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="scoreboard-section svelte-1wyf3u8"><h2 class="section-title svelte-1wyf3u8">🏆 ${escape_html(store_get($$store_subs ??= {}, "$t", t)("scoreboard.title"))}</h2> <div class="scoreboard-tabs svelte-1wyf3u8"><button${attr_class("svelte-1wyf3u8", void 0, { "active": scoreTab === "general" })}>🌐 General</button> <button${attr_class("svelte-1wyf3u8", void 0, { "active": scoreTab === "booty" })}>⚔️ Booty Battle</button> <button${attr_class("svelte-1wyf3u8", void 0, { "active": scoreTab === "arbooty" })}>🗺️ Arbooty</button></div> <div class="scoreboard-list svelte-1wyf3u8" role="list"><!--[-->`);
      const each_array_11 = ensure_array_like([...data.players].sort((a, b) => {
        return (b.points || 0) - (a.points || 0);
      }));
      for (let i = 0, $$length = each_array_11.length; i < $$length; i++) {
        let p = each_array_11[i];
        $$renderer2.push(`<div class="score-row svelte-1wyf3u8" role="listitem"><span class="score-rank svelte-1wyf3u8">${escape_html(i + 1)}</span> <span class="score-type svelte-1wyf3u8">${escape_html(p.type === "ai" ? "🤖" : p.solo ? "👤" : "👥")}</span> <span class="score-name svelte-1wyf3u8">${escape_html(p.display_name || p.username)}</span> <span class="score-pts svelte-1wyf3u8">⭐ ${escape_html(p.points || 0)}</span> <span class="score-fuel svelte-1wyf3u8">${escape_html(formatBeans(p.fuel))}</span></div>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (playersWithDist().length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="section svelte-1wyf3u8"><h2 class="svelte-1wyf3u8">🏴‍☠️ Players</h2> <div class="players-grid svelte-1wyf3u8"><!--[-->`);
      const each_array_12 = ensure_array_like(playersWithDist());
      for (let $$index_12 = 0, $$length = each_array_12.length; $$index_12 < $$length; $$index_12++) {
        let player = each_array_12[$$index_12];
        $$renderer2.push(`<div class="player-card svelte-1wyf3u8" role="button" tabindex="0"><div class="player-header svelte-1wyf3u8"><div class="player-avatar svelte-1wyf3u8"${attr_style(`background:${stringify(player.team_color || "var(--accent)")}`)}>${escape_html(player.type === "ai" ? "🤖" : "🧭")}</div> <div class="player-info svelte-1wyf3u8"><h3 class="svelte-1wyf3u8">${escape_html(player.display_name || player.username)} ${escape_html(player.type === "ai" ? "🤖" : "👤")}</h3> <span class="team-badge svelte-1wyf3u8"${attr_style(`background:${stringify(player.team_color || "var(--accent)")}22;color:${stringify(player.team_color || "var(--accent)")}`)}>${escape_html(player.type === "ai" ? "🤖 AI" : "👤 Human")} · ${escape_html(player.solo ? "Solo" : player.team_name || "Free Agent")}</span></div></div> <div class="player-details svelte-1wyf3u8"><div class="detail-row svelte-1wyf3u8"><span class="svelte-1wyf3u8">📍 Port</span><span class="svelte-1wyf3u8">${escape_html(player.port_name || "Unknown")}</span></div> <div class="detail-row svelte-1wyf3u8"><span class="svelte-1wyf3u8">${escape_html(formatSolarTime(player.lon))}</span><span class="svelte-1wyf3u8">${escape_html(player.lat ? formatCoords(player.lat, player.lon) : "—")}</span></div> <div class="detail-row svelte-1wyf3u8"><span class="svelte-1wyf3u8">⭐ Points</span><span class="svelte-1wyf3u8">${escape_html(player.points || 0)}</span></div> <div class="detail-row svelte-1wyf3u8"><span class="svelte-1wyf3u8">🫘 Beans</span><span class="svelte-1wyf3u8">${escape_html(formatBeans(player.fuel))}</span></div> `);
        if (player.nearestDist !== null) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="bottle-link svelte-1wyf3u8">🍾 Nearest: ${escape_html(player.nearestDist.toFixed(0))} km</button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div> `);
        if (data.myPlayer && player.id === data.myPlayer.id) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="btn-transfer svelte-1wyf3u8">→ Send 🫘</button>`);
        } else if (data.myPlayer && player.type !== "ai" && !player.solo) {
          $$renderer2.push("<!--[1-->");
          $$renderer2.push(`<button class="btn-send-me svelte-1wyf3u8">💸 Send me 🫘</button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
