/* TAKE MY HOODIE — admin page */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var TOKEN_KEY = "tmh-admin-token";
  var SLOTS = [
    { id: "hero", label: "Front / Hero", hint: "Main photo — hero, gallery, order box" },
    { id: "back", label: "Back", hint: "Gallery" },
    { id: "detail", label: "Detail", hint: "Gallery" },
    { id: "worn", label: "Worn", hint: "Gallery" }
  ];
  var MAX_SIDE = 1600, QUALITY = 0.82;

  var token = sessionStorage.getItem(TOKEN_KEY) || "";
  var state = null;       // product being edited
  var dirty = false;
  var uploading = 0;

  var form = $("#product-form");
  var statusEl = $("#save-status");
  var saveErr = $("#save-error");

  /* ---------------- API ---------------- */
  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers || {}, token ? { Authorization: "Bearer " + token } : {});
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (r.status === 401 && path !== "/api/admin/login") { logout("Your session expired. Log in again."); throw new Error("401"); }
        if (!r.ok) throw new Error(data.error || "Request failed (" + r.status + ").");
        return data;
      });
    }, function () { throw new Error("Can't reach the server. Check your connection."); });
  }

  /* ---------------- views ---------------- */
  function showLogin(msg) {
    $("#editor-view").hidden = true;
    $("#login-view").hidden = false;
    var e = $("#login-error");
    e.textContent = msg || ""; e.hidden = !msg;
  }
  function logout(msg) {
    token = ""; sessionStorage.removeItem(TOKEN_KEY);
    dirty = false;
    showLogin(msg);
  }

  $("#login-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var btn = ev.target.querySelector("button");
    btn.disabled = true;
    api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: ev.target.password.value })
    }).then(function (d) {
      token = d.token; sessionStorage.setItem(TOKEN_KEY, token);
      ev.target.reset();
      openEditor();
    }).catch(function (err) {
      showLogin(err.message);
    }).then(function () { btn.disabled = false; });
  });
  $("#logout").addEventListener("click", function () {
    if (dirty && !confirm("You have unsaved changes. Log out anyway?")) return;
    logout();
  });

  function openEditor() {
    api("/api/admin/product").then(function () {
      return fetch("/api/product", { cache: "no-store" }).then(function (r) { return r.json(); });
    }).then(function (d) {
      state = fromSaved(d && d.product);
      render();
      $("#login-view").hidden = true;
      $("#editor-view").hidden = false;
      setStatus(d && d.product && d.product.updatedAt ? "Last saved " + new Date(d.product.updatedAt).toLocaleString() : "Not saved yet. Showing defaults.");
    }).catch(function (err) { if (err.message !== "401") showLogin(err.message); });
  }

  /* ---------------- data ---------------- */
  function fromSaved(p) {
    var C = Object.assign({}, window.TMH_CONFIG || {}, p || {});
    return {
      productName: C.productName || "",
      tagline: C.tagline || "",
      status: C.status || "open",
      price: C.price, shippingFlat: C.shippingFlat || 0, maxQty: C.maxQty || 5, dropSize: C.dropSize,
      presaleEnd: C.presaleEnd,
      productionStartDate: C.productionStartDate || "",
      shipDateDate: C.shipDateDate || "",
      paypalClientId: C.paypalClientId === "YOUR_PAYPAL_CLIENT_ID" ? "" : (C.paypalClientId || ""),
      email: C.email || "", instagram: C.instagram || "", tiktok: C.tiktok || "",
      colors: (C.colors || []).map(function (c) { return { name: c.name, hex: c.hex }; }),
      sizeRows: (C.sizes || []).map(function (s) {
        var r = (C.sizeChart || {})[s] || {};
        return { size: s, chest: r.chest, length: r.length, sleeve: r.sleeve };
      }),
      specs: [0, 1, 2].map(function (i) { var s = (C.specs || [])[i] || {}; return { label: s.label || "", value: s.value || "", text: s.text || "" }; }),
      images: Object.assign({}, C.images || {})
    };
  }

  function toLocalInput(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var p = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* ---------------- render ---------------- */
  var SIMPLE = ["productName", "tagline", "price", "shippingFlat", "maxQty", "dropSize", "productionStartDate", "shipDateDate", "paypalClientId", "email", "instagram", "tiktok"];

  function render() {
    SIMPLE.forEach(function (k) { form.elements[k].value = state[k] == null ? "" : state[k]; });
    form.elements.presaleEnd.value = toLocalInput(state.presaleEnd);
    Array.prototype.forEach.call(form.elements.status, function (r) { r.checked = r.value === state.status; });
    renderPhotos(); renderColors(); renderSizes(); renderSpecs();
  }

  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function renderPhotos() {
    var wrap = $("#photos"); wrap.innerHTML = "";
    SLOTS.forEach(function (slot) {
      var url = state.images[slot.id] || "/images/" + slot.id + ".jpg";
      var src = /^(\/|https?:)/.test(url) ? url : "/" + url;
      var card = el(
        '<div class="a-photo">' +
          '<label class="a-photo__drop">' +
            '<img alt="" src="' + esc(src) + '">' +
            '<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" aria-label="Upload ' + esc(slot.label) + ' photo">' +
            '<span class="a-photo__hint">Replace photo</span>' +
            '<span class="a-photo__busy" hidden>Uploading…</span>' +
          "</label>" +
          '<div class="a-photo__meta"><strong>' + esc(slot.label) + "</strong><small>" + esc(slot.hint) + "</small></div>" +
          (/^\/api\/media\//.test(url) ? '<button type="button" class="a-photo__reset">Remove (use default)</button>' : "") +
        "</div>"
      );
      var drop = $(".a-photo__drop", card), input = $("input", card);
      input.addEventListener("change", function () { if (input.files[0]) upload(slot.id, input.files[0], card); });
      ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
      ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.remove("is-over"); }); });
      drop.addEventListener("drop", function (e) {
        e.preventDefault();
        var f = e.dataTransfer.files[0]; if (f) upload(slot.id, f, card);
      });
      var reset = $(".a-photo__reset", card);
      if (reset) reset.addEventListener("click", function () { state.images[slot.id] = "images/" + slot.id + ".jpg"; markDirty(); renderPhotos(); });
      wrap.appendChild(card);
    });
  }

  function compress(file) {
    if (!/^image\//.test(file.type) && !/\.(heic|heif)$/i.test(file.name)) return Promise.reject(new Error("That file isn't an image."));
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error("Couldn't process that image.")); }, "image/jpeg", QUALITY);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("This browser can't read that image format. Export it as JPG and try again.")); };
      img.src = url;
    });
  }

  function upload(slotId, file, card) {
    var busy = $(".a-photo__busy", card);
    busy.hidden = false; uploading++; showSaveError("");
    compress(file).then(function (blob) {
      return api("/api/admin/upload?slot=" + slotId, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
    }).then(function (d) {
      state.images[slotId] = d.url;
      markDirty();
      renderPhotos();
    }).catch(function (err) {
      if (err.message !== "401") showSaveError(err.message);
      busy.hidden = true;
    }).then(function () { uploading--; });
  }

  function renderColors() {
    var wrap = $("#colors"); wrap.innerHTML = "";
    state.colors.forEach(function (c, i) {
      var row = el(
        '<div class="a-row">' +
          '<input type="color" value="' + esc(c.hex || "#141414") + '" aria-label="Color swatch">' +
          '<input type="text" value="' + esc(c.name) + '" placeholder="Color name, e.g. Washed Black" maxlength="40" aria-label="Color name">' +
          '<input class="a-hex" type="text" value="' + esc(c.hex) + '" maxlength="7" aria-label="Hex code" spellcheck="false">' +
          '<button type="button" class="a-del" aria-label="Remove color">×</button>' +
        "</div>"
      );
      var inputs = row.querySelectorAll("input");
      inputs[0].addEventListener("input", function () { c.hex = inputs[0].value; inputs[2].value = c.hex; markDirty(); });
      inputs[1].addEventListener("input", function () { c.name = inputs[1].value; markDirty(); });
      inputs[2].addEventListener("input", function () {
        if (/^#[0-9a-f]{6}$/i.test(inputs[2].value)) { c.hex = inputs[2].value; inputs[0].value = c.hex; markDirty(); }
      });
      $(".a-del", row).addEventListener("click", function () { state.colors.splice(i, 1); markDirty(); renderColors(); });
      wrap.appendChild(row);
    });
  }
  $("#add-color").addEventListener("click", function () {
    state.colors.push({ name: "", hex: "#141414" }); markDirty(); renderColors();
    $("#colors .a-row:last-child input[type=text]").focus();
  });

  function renderSizes() {
    var tbody = $("#sizes"); tbody.innerHTML = "";
    state.sizeRows.forEach(function (r, i) {
      var tr = el(
        "<tr>" +
          '<td><input data-k="size" value="' + esc(r.size) + '" maxlength="6" aria-label="Size"></td>' +
          '<td><input data-k="chest" type="number" min="0" step="0.5" inputmode="decimal" value="' + esc(r.chest) + '" aria-label="Chest width cm"></td>' +
          '<td><input data-k="length" type="number" min="0" step="0.5" inputmode="decimal" value="' + esc(r.length) + '" aria-label="Body length cm"></td>' +
          '<td><input data-k="sleeve" type="number" min="0" step="0.5" inputmode="decimal" value="' + esc(r.sleeve) + '" aria-label="Sleeve cm"></td>' +
          '<td><button type="button" class="a-del" aria-label="Remove size">×</button></td>' +
        "</tr>"
      );
      tr.querySelectorAll("input").forEach(function (inp) {
        inp.addEventListener("input", function () { r[inp.getAttribute("data-k")] = inp.value; markDirty(); });
      });
      $(".a-del", tr).addEventListener("click", function () { state.sizeRows.splice(i, 1); markDirty(); renderSizes(); });
      tbody.appendChild(tr);
    });
  }
  $("#add-size").addEventListener("click", function () {
    state.sizeRows.push({ size: "", chest: "", length: "", sleeve: "" }); markDirty(); renderSizes();
    $("#sizes tr:last-child input").focus();
  });

  function renderSpecs() {
    var wrap = $("#specs"); wrap.innerHTML = "";
    state.specs.forEach(function (s, i) {
      var box = el(
        '<div class="a-spec">' +
          '<span class="a-spec__num">0' + (i + 1) + "</span>" +
          '<div class="a-spec__top">' +
            '<label class="a-field"><span>Label</span><input data-k="label" maxlength="40" value="' + esc(s.label) + '"></label>' +
            '<label class="a-field"><span>Headline</span><input data-k="value" maxlength="60" value="' + esc(s.value) + '"></label>' +
          "</div>" +
          '<label class="a-field"><span>Text</span><textarea data-k="text" maxlength="400">' + esc(s.text) + "</textarea></label>" +
        "</div>"
      );
      box.querySelectorAll("[data-k]").forEach(function (inp) {
        inp.addEventListener("input", function () { s[inp.getAttribute("data-k")] = inp.value; markDirty(); });
      });
      wrap.appendChild(box);
    });
  }

  /* ---------------- save ---------------- */
  function setStatus(msg, isDirty) {
    [statusEl, $("#save-status-2")].forEach(function (e) { if (e) { e.textContent = msg; e.classList.toggle("is-dirty", !!isDirty); } });
  }
  function markDirty() { dirty = true; setStatus("Unsaved changes", true); }
  function showSaveError(msg) { saveErr.textContent = msg; saveErr.hidden = !msg; if (msg) saveErr.scrollIntoView({ behavior: "smooth", block: "center" }); }

  form.addEventListener("input", function (e) {
    var k = e.target.name;
    if (!k) return;
    markDirty();
  });

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (uploading) { showSaveError("Wait for the photo upload to finish, then save."); return; }
    var bad = form.querySelector("[name]:invalid");
    if (bad) {
      var lbl = bad.closest(".a-field");
      showSaveError("Check this field: " + (lbl ? lbl.querySelector("span").firstChild.textContent.trim() : bad.name) + ".");
      bad.focus();
      return;
    }
    SIMPLE.forEach(function (k) { state[k] = form.elements[k].value; });
    var pe = form.elements.presaleEnd.value;
    state.presaleEnd = pe ? new Date(pe).toISOString() : "";
    var st = form.querySelector('input[name="status"]:checked');
    state.status = st ? st.value : "open";

    var btns = document.querySelectorAll('[type="submit"][form="product-form"], #product-form [type="submit"]');
    btns.forEach(function (b) { b.disabled = true; });
    setStatus("Saving…");
    showSaveError("");
    api("/api/admin/product", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    }).then(function (d) {
      dirty = false;
      state = fromSaved(d.product);
      render();
      setStatus("Saved & live · " + new Date().toLocaleTimeString());
    }).catch(function (err) {
      if (err.message === "401") return;
      setStatus("Not saved", true);
      showSaveError(err.message);
    }).then(function () { btns.forEach(function (b) { b.disabled = false; }); });
  });

  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------------- start ---------------- */
  if (token) openEditor(); else showLogin();
})();
