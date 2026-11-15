/* =========================================================================
   TAKE MY HOODIE — site logic
   Settings live in js/config.js. You shouldn't need to edit this file.
   ========================================================================= */
(function () {
  "use strict";

  /* Load the product saved from the admin page (/api/product), then start.
     Falls back to js/config.js if the API isn't available (e.g. local preview). */
  var started = false;
  function start() { if (!started) { started = true; boot(); } }
  window.TMH_CONFIG = window.TMH_CONFIG || {};
  if (/^https?:$/.test(location.protocol)) {
    var fallback = setTimeout(start, 2500);
    fetch("/api/product", { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.product) Object.assign(window.TMH_CONFIG, d.product); })
      .catch(function () {})
      .then(function () { clearTimeout(fallback); start(); });
  } else {
    start();
  }

  function boot() {
  var C = window.TMH_CONFIG;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var money = function (n) { return "$" + (Math.round(n * 100) % 100 === 0 ? String(Math.round(n)) : n.toFixed(2)); };
  var to2 = function (n) { return n.toFixed(2); };
  var shipFlat = Number(C.shippingFlat) || 0;

  /* ---------------------------------------------------------------
     1. Fill config values into the page
     --------------------------------------------------------------- */
  var derived = {
    price: money(C.price),
    shippingText: shipFlat > 0 ? money(shipFlat) + " flat-rate worldwide shipping" : "Free worldwide shipping",
    shippingShort: shipFlat > 0 ? money(shipFlat) : "Free",
    dropSize: String(C.dropSize)
  };
  $$("[data-cfg]").forEach(function (el) {
    var k = el.getAttribute("data-cfg");
    var v = Object.prototype.hasOwnProperty.call(derived, k) ? derived[k] : C[k];
    if (v !== undefined && v !== null && v !== "") el.textContent = v;
  });
  if (C.email) $$("[data-cfg-mailto]").forEach(function (a) { a.href = "mailto:" + C.email; });
  if (C.instagram) $$("[data-cfg-instagram]").forEach(function (a) {
    a.href = "https://instagram.com/" + C.instagram;
    if (a.hasAttribute("data-show-handle")) a.textContent = "Instagram @" + C.instagram;
  });
  if (C.tiktok) $$("[data-cfg-tiktok]").forEach(function (a) {
    a.href = "https://www.tiktok.com/@" + C.tiktok;
    if (a.hasAttribute("data-show-handle")) a.textContent = "TikTok @" + C.tiktok;
  });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  var chips = $("[data-color-chips]");
  if (chips && C.colors) {
    chips.innerHTML = "";
    C.colors.forEach(function (c) {
      var s = document.createElement("span");
      s.className = "color-chip";
      s.innerHTML = '<i style="background:' + c.hex + '"></i>';
      s.appendChild(document.createTextNode(c.name));
      chips.appendChild(s);
    });
  }

  // Photos (uploaded from admin) — images fade in once the right source is set
  $$("img[data-img]").forEach(function (img) {
    var url = C.images && C.images[img.getAttribute("data-img")];
    if (url && img.getAttribute("src") !== url) img.src = url;
    var ready = function () { img.classList.add("is-ready"); };
    if (img.complete && img.naturalWidth) ready(); else { img.addEventListener("load", ready); img.addEventListener("error", ready); }
  });

  // Details section
  if (Array.isArray(C.specs)) {
    $$("[data-spec]").forEach(function (el) {
      var s = C.specs[Number(el.getAttribute("data-spec"))];
      if (!s || !(s.label || s.value || s.text)) { el.hidden = true; return; }
      $(".spec__label", el).textContent = s.label;
      $(".spec__value", el).textContent = s.value;
      $(".spec__text", el).textContent = s.text;
    });
  }

  /* ---------------------------------------------------------------
     2. Header + reveal animations
     --------------------------------------------------------------- */
  var header = $(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-solid", window.scrollY > 40); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); rio.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { rio.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------------------------------------------------------------
     3. Countdown
     --------------------------------------------------------------- */
  var endTime = C.presaleEnd ? new Date(C.presaleEnd).getTime() : NaN;
  var manualClosed = C.status === "closed" || C.status === "soldout";
  var isClosed = function () { return manualClosed || (!isNaN(endTime) && Date.now() >= endTime); };
  var countdowns = $$("[data-countdown]");
  var pad = function (n) { return n < 10 ? "0" + n : String(n); };
  var cdTimer;

  function tick() {
    var diff = Math.max(0, endTime - Date.now());
    var d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24,
        m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
    countdowns.forEach(function (cd) {
      $("[data-cd=d]", cd).textContent = pad(d);
      $("[data-cd=h]", cd).textContent = pad(h);
      $("[data-cd=m]", cd).textContent = pad(m);
      $("[data-cd=s]", cd).textContent = pad(s);
      cd.setAttribute("aria-label", "Presale ends in " + d + " days " + h + " hours " + m + " minutes");
    });
    if (diff <= 0) {
      clearInterval(cdTimer);
      countdowns.forEach(function (cd) { cd.classList.add("is-closed"); });
      closeCheckout();
    }
  }
  if (manualClosed) {
    countdowns.forEach(function (cd) {
      cd.classList.add("is-closed");
      var t = $(".countdown__closed", cd); if (t) t.textContent = C.status === "soldout" ? "Sold out" : "Presale closed";
    });
  } else if (countdowns.length && !isNaN(endTime)) { tick(); cdTimer = setInterval(tick, 1000); }

  /* ---------------------------------------------------------------
     4. Gallery (native swipe via scroll-snap + dots/arrows)
     --------------------------------------------------------------- */
  $$("[data-gallery]").forEach(function (g) {
    var track = $(".gallery__track", g);
    var slides = $$(".gallery__slide", g);
    var dotsWrap = $(".gallery__dots", g);
    var prev = $("[data-prev]", g), next = $("[data-next]", g);
    var current = 0;

    var dots = slides.map(function (slide, i) {
      var b = document.createElement("button");
      b.type = "button";
      var cap = $("figcaption", slide);
      b.setAttribute("aria-label", "Photo " + (i + 1) + (cap ? ": " + cap.textContent : ""));
      b.addEventListener("click", function () { go(i); });
      dotsWrap.appendChild(b);
      return b;
    });

    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      var left = slides[i].offsetLeft - slides[0].offsetLeft;
      track.scrollTo({ left: left, behavior: "smooth" });
    }
    function update() {
      var x = track.scrollLeft, best = 0, bestDist = Infinity;
      slides.forEach(function (s, i) {
        var d = Math.abs(s.offsetLeft - slides[0].offsetLeft - x);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      var atEnd = x + track.clientWidth >= track.scrollWidth - 4;
      if (atEnd) best = slides.length - 1;
      current = best;
      dots.forEach(function (d, i) { d.setAttribute("aria-current", i === current ? "true" : "false"); });
      if (prev) prev.disabled = x <= 4;
      if (next) next.disabled = atEnd;
    }
    var raf;
    track.addEventListener("scroll", function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener("resize", update);
    if (prev) prev.addEventListener("click", function () { go(current - 1); });
    if (next) next.addEventListener("click", function () { go(current + 1); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
    });
    update();
  });

  /* ---------------------------------------------------------------
     5. Size guide modal
     --------------------------------------------------------------- */
  var sizeDialog = $("#size-guide");
  var unit = "cm";
  function renderSizeTable() {
    var tbody = $("[data-size-table]");
    if (!tbody || !C.sizeChart) return;
    var conv = function (cm) { return unit === "cm" ? String(cm) : (cm / 2.54).toFixed(1); };
    tbody.innerHTML = (C.sizes || Object.keys(C.sizeChart)).map(function (sz) {
      var r = C.sizeChart[sz];
      if (!r) return "";
      return "<tr><td>" + sz + "</td><td>" + conv(r.chest) + "</td><td>" + conv(r.length) + "</td><td>" + conv(r.sleeve) + "</td></tr>";
    }).join("");
    $$("[data-unit]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-unit") === unit ? "true" : "false"); });
  }
  if (sizeDialog) {
    renderSizeTable();
    $$("[data-unit]").forEach(function (b) {
      b.addEventListener("click", function () { unit = b.getAttribute("data-unit"); renderSizeTable(); });
    });
    $$("[data-open-size-guide]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (typeof sizeDialog.showModal === "function") sizeDialog.showModal();
        else sizeDialog.setAttribute("open", "");
      });
    });
    $("[data-close-modal]", sizeDialog).addEventListener("click", function () { sizeDialog.close(); });
    sizeDialog.addEventListener("click", function (e) { if (e.target === sizeDialog) sizeDialog.close(); });
  }

  /* ---------------------------------------------------------------
     6. Order state (color / size / quantity)
     --------------------------------------------------------------- */
  var state = { color: C.colors && C.colors[0] ? C.colors[0] : { id: "default", name: "Default" }, size: null, qty: 1 };
  var colorsWrap = $("[data-colors]");
  var sizesWrap = $("[data-sizes]");
  var maxQty = Number(C.maxQty) || 5;

  function radio(group, value, labelHtml, extraClass) {
    var id = "opt-" + group + "-" + String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
    var wrap = document.createElement("div");
    wrap.className = "option" + (extraClass ? " " + extraClass : "");
    wrap.innerHTML = '<input type="radio" name="' + group + '" id="' + id + '" value="' + value + '"><label for="' + id + '">' + labelHtml + "</label>";
    return wrap;
  }

  if (colorsWrap && C.colors) {
    C.colors.forEach(function (c, i) {
      var opt = radio("color", c.id, '<i style="background:' + c.hex + '"></i>' + c.name, "option--swatch");
      var input = $("input", opt);
      if (i === 0) input.checked = true;
      input.addEventListener("change", function () { state.color = c; updateOrder(); });
      colorsWrap.appendChild(opt);
    });
  }
  if (sizesWrap && C.sizes) {
    C.sizes.forEach(function (sz) {
      var opt = radio("size", sz, sz);
      $("input", opt).addEventListener("change", function () {
        state.size = sz;
        sizesWrap.classList.remove("is-error");
        showError("");
        updateOrder();
      });
      sizesWrap.appendChild(opt);
    });
  }
  $$("[data-qty]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.qty = Math.max(1, Math.min(maxQty, state.qty + Number(b.getAttribute("data-qty"))));
      updateOrder();
    });
  });

  function totals() {
    var sub = Number(C.price) * state.qty;
    return { sub: sub, ship: shipFlat, total: sub + shipFlat };
  }

  function updateOrder() {
    if (!colorsWrap) return;
    var t = totals();
    var setText = function (sel, v) { var el = $(sel); if (el) el.textContent = v; };
    setText("[data-selected-color]", "— " + state.color.name);
    setText("[data-selected-size]", state.size ? "— " + state.size : "— pick one");
    setText("[data-qty-value]", state.qty);
    setText("[data-subtotal]", money(t.sub));
    setText("[data-shipping]", t.ship > 0 ? money(t.ship) : "Free");
    setText("[data-total]", money(t.total));
    var minus = $('[data-qty="-1"]'), plus = $('[data-qty="1"]');
    if (minus) minus.disabled = state.qty <= 1;
    if (plus) plus.disabled = state.qty >= maxQty;
    syncPayPal();
  }

  /* ---------------------------------------------------------------
     7. PayPal Smart Buttons
     --------------------------------------------------------------- */
  var ppContainer = $("#paypal-buttons");
  var errEl = $("[data-checkout-error]");
  var infoEl = $("[data-checkout-info]");
  var ppActions = null;
  var sdkRequested = false;

  function showError(msg) { if (!errEl) return; errEl.textContent = msg; errEl.hidden = !msg; }
  function showInfo(msg) { if (!infoEl) return; infoEl.textContent = msg; infoEl.hidden = !msg; }
  function syncPayPal() {
    if (!ppActions) return;
    if (state.size) ppActions.enable(); else ppActions.disable();
  }

  function closeCheckout() {
    if (!ppContainer) return;
    ppContainer.innerHTML = '<div class="checkout__closed"><strong>' + (C.status === "soldout" ? "Sold out" : "Presale closed") + '</strong>Drop 01 is done. Join the Drop 02 list below to hear first.</div>';
    showError(""); showInfo("");
    var cta = $("[data-sticky-cta] .btn");
    if (cta) { cta.setAttribute("href", "#waitlist"); cta.firstChild.textContent = "Join Drop 02 list "; }
  }

  function orderStrings() {
    var t = totals();
    var details = "Color: " + state.color.name + " | Size: " + state.size + " | Qty: " + state.qty;
    var desc = ("PRESALE " + (C.productName || "TAKE MY HOODIE") + " | " + details + " | Ships by " + C.shipDate).slice(0, 127);
    var sku = ("TMH-D01-" + state.color.id + "-" + state.size).toUpperCase().slice(0, 127);
    return { t: t, details: details, desc: desc, sku: sku };
  }

  function renderButtons() {
    if (!window.paypal || !ppContainer) return;
    ppContainer.innerHTML = "";
    window.paypal.Buttons({
      style: { layout: "vertical", color: "black", shape: "rect", label: "paypal", height: 50 },

      onInit: function (data, actions) { ppActions = actions; syncPayPal(); },

      onClick: function () {
        showInfo("");
        if (isClosed()) { closeCheckout(); return false; }
        if (!state.size) {
          showError("Pick your size first.");
          if (sizesWrap) {
            sizesWrap.classList.remove("is-error"); void sizesWrap.offsetWidth; sizesWrap.classList.add("is-error");
            sizesWrap.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          return false;
        }
        showError("");
      },

      createOrder: function (data, actions) {
        var o = orderStrings();
        var cur = C.currency || "USD";
        return actions.order.create({
          intent: "CAPTURE",
          purchase_units: [{
            description: o.desc,
            custom_id: (state.color.id + "|" + state.size + "|" + state.qty).slice(0, 127),
            soft_descriptor: "TAKEMYHOODIE",
            amount: {
              currency_code: cur,
              value: to2(o.t.total),
              breakdown: {
                item_total: { currency_code: cur, value: to2(o.t.sub) },
                shipping: { currency_code: cur, value: to2(o.t.ship) }
              }
            },
            items: [{
              name: ((C.productName || "TAKE MY HOODIE") + " (" + state.color.name + " / " + state.size + ")").slice(0, 127),
              description: ("PRESALE | " + o.details + " | Ships by " + C.shipDate).slice(0, 127),
              sku: o.sku,
              unit_amount: { currency_code: cur, value: to2(Number(C.price)) },
              quantity: String(state.qty),
              category: "PHYSICAL_GOODS"
            }]
          }],
          application_context: {
            brand_name: "TAKE MY HOODIE",
            shipping_preference: "GET_FROM_FILE", // PayPal collects the shipping address
            user_action: "PAY_NOW"
          }
        });
      },

      onApprove: function (data, actions) {
        showInfo("Confirming your payment…");
        return actions.order.capture().then(function (details) {
          showInfo("");
          showThanks(details);
        }).catch(function () {
          showInfo("");
          showError("We couldn't confirm the payment. If you were charged, email us your PayPal receipt and we'll sort it out.");
        });
      },

      onCancel: function () { showInfo("Payment cancelled. Your selection is still here whenever you're ready."); },

      onError: function (err) {
        if (window.console) console.error("PayPal error", err);
        showError("Something went wrong with checkout. Please try again. If it keeps happening, email us.");
      }
    }).render("#paypal-buttons").catch(function () {
      ppContainer.innerHTML = '<div class="checkout__setup">Checkout couldn\'t load. Refresh the page or try another browser.</div>';
    });
  }

  function loadPayPal() {
    if (sdkRequested || !ppContainer) return;
    sdkRequested = true;
    if (isClosed()) { closeCheckout(); return; }

    var id = (C.paypalClientId || "").trim();
    if (!id || id === "YOUR_PAYPAL_CLIENT_ID") {
      ppContainer.innerHTML =
        '<div class="checkout__setup"><strong>Checkout setup needed.</strong><br>' +
        "Add your PayPal Client ID in <code>js/config.js</code> (<code>paypalClientId</code>) and the PayPal + card buttons appear here.</div>";
      return;
    }
    var s = document.createElement("script");
    s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(id) +
      "&currency=" + encodeURIComponent(C.currency || "USD") + "&intent=capture&components=buttons";
    s.async = true;
    s.setAttribute("data-page-type", "product-details");
    s.onload = renderButtons;
    s.onerror = function () {
      ppContainer.innerHTML = '<div class="checkout__setup">Checkout couldn\'t load. Check your connection, disable ad-blockers for this page, and refresh.</div>';
    };
    document.head.appendChild(s);
  }

  if (ppContainer) {
    updateOrder();
    if (isClosed()) closeCheckout();
    // Load PayPal only when the buyer gets close to the order box (keeps first load fast)
    var preorder = $("#preorder");
    if ("IntersectionObserver" in window && preorder) {
      var pio = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { loadPayPal(); pio.disconnect(); }
      }, { rootMargin: "900px 0px" });
      pio.observe(preorder);
    } else {
      loadPayPal();
    }
    $$('a[href="#preorder"]').forEach(function (a) { a.addEventListener("click", loadPayPal); });
  }

  /* ---------------------------------------------------------------
     8. Thank-you state
     --------------------------------------------------------------- */
  var thanks = $("#thanks");
  var lastFocus = null;
  function showThanks(details) {
    if (!thanks) return;
    var meta = $("[data-thanks-meta]", thanks);
    var parts = [];
    var name = details && details.payer && details.payer.name && details.payer.name.given_name;
    if (name) parts.push("Respect, " + name + ".");
    parts.push(state.qty + " × " + (C.productName || "hoodie") + " — " + state.color.name + " / " + (state.size || "?") + ".");
    if (details && details.id) parts.push("Order ID: " + details.id + ".");
    if (meta) meta.textContent = parts.join(" ");
    lastFocus = document.activeElement;
    thanks.hidden = false;
    thanks.classList.add("is-in");
    document.body.style.overflow = "hidden";
    var title = $("#thanks-title");
    if (title) title.focus();
    if (sticky) sticky.classList.add("is-hidden");
  }
  function hideThanks() {
    thanks.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    refreshSticky();
  }
  if (thanks) {
    $("[data-close-thanks]", thanks).addEventListener("click", hideThanks);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !thanks.hidden) hideThanks(); });
  }

  /* ---------------------------------------------------------------
     9. Sticky mobile CTA — hidden while the order box is on screen
     --------------------------------------------------------------- */
  var sticky = $("[data-sticky-cta]");
  var hideZones = new Set();
  function refreshSticky() {
    if (!sticky) return;
    sticky.classList.toggle("is-hidden", hideZones.size > 0 || (thanks && !thanks.hidden));
  }
  if (sticky && "IntersectionObserver" in window) {
    var zones = [$(".order-box"), $("#waitlist"), $(".site-footer")].filter(Boolean);
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) hideZones.add(e.target); else hideZones.delete(e.target); });
      refreshSticky();
    }, { threshold: 0.05 });
    zones.forEach(function (z) { sio.observe(z); });
  }

  /* ---------------------------------------------------------------
     10. Netlify Forms (AJAX submit, falls back to normal POST without JS)
     --------------------------------------------------------------- */
  $$("form[data-ajax-form]").forEach(function (form) {
    var status = form.parentNode.querySelector("[data-form-status]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var btn = form.querySelector('[type="submit"]');
      if (btn) btn.disabled = true;
      if (status) status.textContent = "Sending…";
      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        form.reset();
        if (status) status.textContent = form.getAttribute("data-success") || "You're on the list. We'll hit you first for Drop 02.";
      }).catch(function () {
        if (status) status.textContent = "Couldn't send that. Try again, or email us.";
      }).then(function () { if (btn) btn.disabled = false; });
    });
  });

  /* Preview the thank-you screen while designing: add #preview-thanks to the URL */
  if (location.hash === "#preview-thanks" && thanks) {
    state.size = state.size || "L";
    showThanks({ id: "PREVIEW-0000", payer: { name: { given_name: "Preview" } } });
  }
  }
})();
