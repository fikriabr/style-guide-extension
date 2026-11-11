/*
 * Inspector elemen. Disuntikkan ke halaman aktif oleh popup (isolated world), tidak berjalan otomatis.
 * Perubahan hanya sementara: mengubah atribut class/style di DOM halaman, hilang saat halaman dimuat ulang.
 * Panel hidup di Shadow DOM dan memakai constructable stylesheet, supaya CSS dan CSP halaman tidak mengganggu.
 * Butuh data.js (ENTRIES, FRAMEWORKS) dan versions.js (SGV).
 */
(function () {
  "use strict";
  if (window.__sgInspector) return;

  var CSS = [
    ":host{all:initial}",
    "*{box-sizing:border-box}",
    ".layer{position:fixed;inset:0;pointer-events:none;z-index:2147483647;" +
      "color-scheme:light;--bg:#fbf8f2;--surface:#f3eee3;--text:#1d1a16;--muted:#5a5246;--line:#85796a;--soft:#e0d8c6;" +
      "--accent:#a04509;--on-accent:#fff;--danger:#b42318;" +
      "font:13px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--text)}",
    ".box{position:fixed;display:none;pointer-events:none;border-radius:2px}",
    ".box.hov{border:1.5px dashed var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent)}",
    ".box.sel{border:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 16%,transparent)}",
    ".tag{position:absolute;left:-2px;bottom:100%;margin-bottom:2px;white-space:nowrap;background:var(--accent);" +
      "color:var(--on-accent);font:11px/1.3 ui-monospace,Menlo,Consolas,monospace;padding:1px 6px;border-radius:3px}",
    ".panel{position:fixed;top:16px;right:16px;width:360px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;" +
      "pointer-events:auto;background:var(--bg);border:1px solid var(--line);border-radius:10px;" +
      "box-shadow:0 8px 28px rgba(0,0,0,.28);overflow:hidden}",
    ".head{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface);cursor:grab;" +
      "border-bottom:1px solid var(--soft);touch-action:none}",
    ".head.drag{cursor:grabbing}",
    ".title{flex:1;font:600 13px/1.4 ui-monospace,'JetBrains Mono',Menlo,Consolas,monospace;text-decoration:underline;" +
      "text-decoration-color:var(--accent);text-decoration-thickness:3px;text-underline-offset:4px;text-decoration-skip-ink:none}",
    ".scroll{overflow:auto;padding:10px;display:flex;flex-direction:column;gap:12px}",
    "button,input,textarea{font:inherit;color:inherit}",
    "input[type=checkbox]{accent-color:var(--accent)}",
    "button{cursor:pointer;border:1px solid var(--line);background:var(--bg);border-radius:6px;padding:3px 9px;min-height:26px}",
    "button:hover:not(:disabled){background:var(--surface)}",
    "button:active:not(:disabled){transform:translateY(1px)}",
    "button:disabled{cursor:not-allowed;opacity:.55}",
    "button.primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent);font-weight:600}",
    "button.primary:hover:not(:disabled){background:var(--accent);filter:brightness(1.08)}",
    "button.primary[aria-pressed=true]{outline:2px solid var(--text);outline-offset:1px}",
    ":is(button,input,textarea,a,summary):focus-visible{outline:2px solid var(--accent);outline-offset:2px}",
    ".fw{display:flex;flex-wrap:wrap;gap:6px}",
    ".chip{border:1px solid var(--line);border-radius:5px;padding:1px 7px;font-size:12px}",
    ".chip.none{color:var(--muted);border-style:dashed}",
    "h3{margin:0 0 6px;font-size:12px;font-weight:600;color:var(--muted);text-decoration:underline;" +
      "text-decoration-color:var(--accent);text-decoration-thickness:3px;text-underline-offset:4px;text-decoration-skip-ink:none}",
    ".sel-line{font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;word-break:break-all;background:var(--surface);" +
      "border-radius:6px;padding:6px 8px}",
    ".nav{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}",
    ".comp{margin-top:6px;color:var(--muted)}",
    "ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px}",
    ".cls{display:flex;align-items:center;gap:6px;padding:3px 4px;border-radius:6px}",
    ".cls:hover{background:var(--surface)}",
    ".cls label{display:flex;align-items:center;gap:6px;flex:1;min-width:0;cursor:pointer}",
    ".cls code{font:12px ui-monospace,Menlo,Consolas,monospace;word-break:break-all}",
    ".cls.off code{text-decoration:line-through;color:var(--muted)}",
    ".prop{color:var(--muted);font-size:11px;white-space:nowrap}",
    ".doc{font-size:11px;color:var(--accent);padding:0 3px;text-decoration:underline}",
    ".x{padding:0 7px;min-height:22px;line-height:1}",
    ".addform{margin-top:8px}",
    ".add{display:flex;gap:6px}",
    ".add input{flex:1;min-width:0;border:1px solid var(--line);border-radius:6px;padding:4px 8px;background:var(--bg)}",
    "label.lbl{display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:4px}",
    "textarea{width:100%;min-height:64px;resize:vertical;border:1px solid var(--line);border-radius:6px;padding:6px 8px;" +
      "background:var(--bg);font:12px/1.5 ui-monospace,Menlo,Consolas,monospace}",
    "dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:12px}",
    "dt{color:var(--muted)}",
    "dd{margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;word-break:break-all}",
    ".sw{display:inline-block;width:10px;height:10px;border:1px solid var(--line);border-radius:2px;margin-right:5px;vertical-align:-1px}",
    ".acts{display:flex;gap:6px;flex-wrap:wrap}",
    ".msg{min-height:18px;color:var(--muted);font-size:12px}",
    ".note{color:var(--muted);font-size:11px;margin:0}",
    ".empty{color:var(--muted);padding:2px 0}",
    "[hidden]{display:none!important}",
    ".stack{display:flex;flex-direction:column;gap:12px}",
    ".sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}",
    "@media (prefers-reduced-motion:reduce){button:active:not(:disabled){transform:none}}",
  ].join("\n");

  var S = {
    det: null,
    picking: false,
    el: null,
    items: [],
    states: new Map(),
    originals: new Map(),
    modified: new Set(),
    hoverEl: null,
    host: null,
    ui: {},
    raf: 0,
  };

  function h(tag, props) {
    var n = document.createElement(tag);
    var k;
    props = props || {};
    for (k in props) {
      var v = props[k];
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var kid = arguments[i];
      if (kid == null) continue;
      if (Array.isArray(kid)) kid.forEach(function (x) { if (x != null) n.append(x); });
      else n.append(kid);
    }
    return n;
  }

  function describe(el) {
    var s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    var cl = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean);
    if (cl.length) s += "." + cl.slice(0, 3).join(".") + (cl.length > 3 ? ".…" : "");
    return s;
  }

  function inOverlay(node) { return node === S.host || (S.host && S.host.contains(node)); }

  function rectBox(box, el) {
    if (!el || !el.isConnected) { box.style.display = "none"; return; }
    var r = el.getBoundingClientRect();
    box.style.display = "block";
    box.style.left = r.left + "px";
    box.style.top = r.top + "px";
    box.style.width = r.width + "px";
    box.style.height = r.height + "px";
    var tag = box.firstChild;
    if (tag) tag.textContent = describe(el) + "  " + Math.round(r.width) + "×" + Math.round(r.height);
  }

  function setMsg(text) {
    S.ui.msg.textContent = text || "";
    clearTimeout(setMsg.t);
    if (text) setMsg.t = setTimeout(function () { S.ui.msg.textContent = ""; }, 2500);
  }

  function activeFws() {
    var d = S.det || {};
    var list = [];
    if (d.bootstrap) list.push("bootstrap");
    if (d.tailwind) list.push("tailwind");
    return list.length ? list : ["bootstrap", "tailwind"];
  }

  function matchesFor(cls) {
    var out = [];
    activeFws().forEach(function (fw) {
      var m = SGV.matchClass(fw, cls);
      if (m) out.push(m);
    });
    return out;
  }

  function docLink(m, cls) {
    var det = S.det && S.det[m.fw];
    var d = SGV.docsUrl(m.fw, det, m.path);
    var short = m.fw === "bootstrap" ? "BS" : "TW";
    var both = activeFws().length > 1;
    return h("a", {
      class: "doc",
      href: d.url,
      target: "_blank",
      rel: "noopener noreferrer",
      "aria-label": "Dokumentasi " + FRAMEWORKS[m.fw].label + " untuk class " + cls + ": " + m.name,
      title: d.url + (d.approx ? " (" + (d.note || "halaman umum untuk versi ini") + ")" : ""),
      text: both ? "docs " + short : "docs",
    });
  }

  function startPicking() {
    S.picking = true;
    S.ui.pick.setAttribute("aria-pressed", "true");
    S.ui.pick.textContent = "Memilih… (Esc batal)";
    setMsg("Arahkan kursor, klik untuk memilih. Esc untuk batal.");
    document.documentElement.style.cursor = "crosshair";
  }

  function stopPicking() {
    S.picking = false;
    S.hoverEl = null;
    S.ui.hov.style.display = "none";
    S.ui.pick.setAttribute("aria-pressed", "false");
    S.ui.pick.textContent = S.el ? "Pilih elemen lain" : "Pilih elemen";
    document.documentElement.style.cursor = "";
  }

  function pageTarget(e) {
    var t = e.target;
    if (!(t instanceof Element) || inOverlay(t)) return null;
    return t;
  }

  function onMove(e) {
    if (!S.picking) return;
    var t = pageTarget(e);
    S.hoverEl = t;
    if (t) rectBox(S.ui.hov, t); else S.ui.hov.style.display = "none";
  }

  function swallow(e) {
    if (!S.picking || !pageTarget(e)) return;
    e.stopPropagation();
    if (e.type === "click") { e.preventDefault(); e.stopImmediatePropagation(); }
  }

  function onClick(e) {
    if (!S.picking) return;
    var t = pageTarget(e);
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    stopPicking();
    select(t);
  }

  function onKey(e) {
    if (!S.picking) return;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      stopPicking();
      setMsg("Pemilihan dibatalkan.");
    } else if (e.key === "Enter") {
      if (inOverlay(e.target)) return;
      var a = document.activeElement;
      var t = S.hoverEl || (a && a !== document.body && !inOverlay(a) ? a : null);
      if (t) { e.preventDefault(); e.stopPropagation(); stopPicking(); select(t); }
    }
  }

  function readItems(el) {
    return (el.getAttribute("class") || "").split(/\s+/).filter(Boolean).map(function (n) { return { name: n, on: true }; });
  }

  function select(el) {
    if (!el || !el.isConnected) return;
    S.el = el;
    if (!S.originals.has(el)) S.originals.set(el, { cls: el.getAttribute("class"), style: el.getAttribute("style") });
    S.items = S.states.get(el) || readItems(el);
    S.states.set(el, S.items);
    renderAll();
    rectBox(S.ui.sel, el);
    S.ui.pick.textContent = "Pilih elemen lain";
  }

  function applyClasses() {
    var v = S.items.filter(function (i) { return i.on; }).map(function (i) { return i.name; }).join(" ");
    if (v) S.el.setAttribute("class", v); else S.el.removeAttribute("class");
    S.modified.add(S.el);
    afterEdit();
  }

  function afterEdit() {
    rectBox(S.ui.sel, S.el);
    renderComputed();
    renderResetAll();
    S.ui.sline.textContent = describeFull(S.el);
  }

  function describeFull(el) {
    var s = "<" + el.tagName.toLowerCase();
    if (el.id) s += ' id="' + el.id + '"';
    var c = el.getAttribute("class");
    if (c) s += ' class="' + c + '"';
    return s + ">";
  }

  function restore(el) {
    var o = S.originals.get(el);
    if (!o) return;
    if (o.cls == null) el.removeAttribute("class"); else el.setAttribute("class", o.cls);
    if (o.style == null) el.removeAttribute("style"); else el.style.cssText = o.style;
    S.states.delete(el);
    S.modified.delete(el);
  }

  function nearestComponent(el) {
    var cur = el;
    while (cur && cur !== document.documentElement) {
      var cl = (cur.getAttribute("class") || "").split(/\s+/).filter(Boolean);
      for (var i = 0; i < cl.length; i++) {
        var m = SGV.matchClass("bootstrap", cl[i]);
        if (m && SGV.isComponentPath(m.path) && cur !== el) return cur;
      }
      cur = cur.parentElement;
    }
    return null;
  }

  function componentOf(el) {
    var cl = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean);
    for (var i = 0; i < cl.length; i++) {
      var m = SGV.matchClass("bootstrap", cl[i]);
      if (m && SGV.isComponentPath(m.path)) return m;
    }
    return null;
  }

  function renderDetection() {
    var box = S.ui.fw;
    box.textContent = "";
    var d = S.det || {};
    var any = false;
    ["bootstrap", "tailwind"].forEach(function (fw) {
      if (!d[fw]) return;
      any = true;
      box.append(h("span", {
        class: "chip",
        title: "Sumber: " + d[fw].source + " (keyakinan " + d[fw].confidence + ")",
        text: FRAMEWORKS[fw].label + " " + SGV.label(d[fw]),
      }));
    });
    if (!any) box.append(h("span", { class: "chip none", text: "Framework tidak terdeteksi" }));
  }

  function navBtn(label, aria, target) {
    return h("button", {
      type: "button",
      "aria-label": aria,
      title: aria,
      disabled: !target,
      text: label,
      onclick: function () { if (target) select(target); },
    });
  }

  function renderSelection() {
    var el = S.el;
    S.ui.nav.textContent = "";
    S.ui.comp.textContent = "";
    if (!el) {
      S.ui.sline.textContent = "Belum ada elemen dipilih.";
      S.ui.selected.hidden = true;
      return;
    }
    S.ui.selected.hidden = false;
    S.ui.empty.hidden = true;
    S.ui.sline.textContent = describeFull(el);
    var parent = el.parentElement && el.parentElement !== document.documentElement ? el.parentElement : null;
    var child = el.firstElementChild;
    S.ui.nav.append(
      navBtn("↑ Induk", "Pilih elemen induk", parent),
      navBtn("↓ Anak", "Pilih elemen anak pertama", child),
      navBtn("← Sebelumnya", "Pilih saudara sebelumnya", el.previousElementSibling),
      navBtn("Berikutnya →", "Pilih saudara berikutnya", el.nextElementSibling),
      navBtn("Komponen induk", "Naik ke komponen Bootstrap terdekat", nearestComponent(el))
    );
    var comp = componentOf(el);
    S.ui.comp.textContent = comp ? "Komponen: " + comp.name + " (Bootstrap)" : "Tidak ada class komponen Bootstrap pada elemen ini.";
  }

  function renderClasses() {
    var ul = S.ui.list;
    ul.textContent = "";
    S.ui.clsTitle.textContent = "Class (" + S.items.length + ")";
    if (!S.items.length) { ul.append(h("li", { class: "empty", text: "Elemen ini belum punya class." })); return; }
    S.items.forEach(function (item) {
      var ms = matchesFor(item.name);
      var cb = h("input", {
        type: "checkbox",
        checked: item.on,
        onchange: function (e) { item.on = e.target.checked; li.classList.toggle("off", !item.on); applyClasses(); },
      });
      cb.checked = item.on;
      var li = h("li", { class: "cls" + (item.on ? "" : " off") },
        h("label", {}, cb, h("code", { text: item.name })),
        h("span", { class: "prop", text: ms.length ? ms[0].name : "tidak dikenal" }),
        ms.map(function (m) { return docLink(m, item.name); }),
        h("button", {
          type: "button",
          class: "x",
          "aria-label": "Hapus class " + item.name,
          title: "Hapus class",
          text: "×",
          onclick: function () {
            S.items.splice(S.items.indexOf(item), 1);
            applyClasses();
            renderClasses();
          },
        })
      );
      ul.append(li);
    });
  }

  function renderStyle() {
    S.ui.style.value = (S.el.getAttribute("style") || "").split(";").map(function (x) { return x.trim(); })
      .filter(Boolean).map(function (x) { return x + ";"; }).join("\n");
  }

  var COMPUTED = ["display", "position", "width", "height", "margin", "padding", "color", "background-color",
    "font-size", "font-weight", "border-radius", "opacity"];

  function renderComputed() {
    var dl = S.ui.computed;
    dl.textContent = "";
    if (!S.el) return;
    var cs = getComputedStyle(S.el);
    COMPUTED.forEach(function (p) {
      var v = cs.getPropertyValue(p);
      var dd = h("dd", {});
      if (p === "color" || p === "background-color") {
        var sw = h("span", { class: "sw", "aria-hidden": "true" });
        sw.style.background = v;
        dd.append(sw);
      }
      dd.append(document.createTextNode(v));
      dl.append(h("dt", { text: p }), dd);
    });
  }

  function renderResetAll() {
    var n = S.modified.size;
    S.ui.resetAll.textContent = "Reset semua (" + n + ")";
    S.ui.resetAll.disabled = n === 0;
    S.ui.resetOne.disabled = !S.el || !S.modified.has(S.el);
  }

  function renderAll() {
    renderSelection();
    if (!S.el) return;
    renderClasses();
    renderStyle();
    renderComputed();
    renderResetAll();
  }

  function copyText(text, okMsg) {
    function fallback() {
      var ta = h("textarea", { class: "sr", "aria-hidden": "true", tabindex: "-1" });
      ta.value = text;
      S.ui.panel.append(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
      setMsg(ok ? okMsg : "Gagal menyalin. Salin manual dari kolom class.");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { setMsg(okMsg); }, fallback);
    } else {
      fallback();
    }
  }

  function addClasses(raw) {
    var names = raw.split(/\s+/).filter(Boolean);
    if (!names.length || !S.el) return;
    var added = 0;
    names.forEach(function (n) {
      if (!S.items.some(function (i) { return i.name === n; })) { S.items.push({ name: n, on: true }); added++; }
    });
    applyClasses();
    renderClasses();
    setMsg(added ? "Ditambahkan: " + names.join(" ") : "Class sudah ada.");
  }

  function suggestionTokens() {
    var set = {};
    var fws = activeFws();
    ENTRIES.forEach(function (e) {
      if (fws.indexOf(e.fw) < 0) return;
      e.cls.split(/\s+/).forEach(function (t) {
        if (/^[a-z!-][\w\-:\/.%#]*$/i.test(t) && t.indexOf("data-") !== 0) set[t] = 1;
      });
    });
    return Object.keys(set).sort();
  }

  function build() {
    var host = document.createElement("div");
    host.id = "__sg-inspector-host";
    var root = host.attachShadow({ mode: "open" });
    var sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    root.adoptedStyleSheets = [sheet];

    var ui = S.ui;
    ui.hov = h("div", { class: "box hov" }, h("span", { class: "tag" }));
    ui.sel = h("div", { class: "box sel" }, h("span", { class: "tag" }));
    ui.fw = h("div", { class: "fw" });
    ui.pick = h("button", { type: "button", class: "primary", "aria-pressed": "false", text: "Pilih elemen", onclick: function () { S.picking ? stopPicking() : startPicking(); } });
    var close = h("button", { type: "button", "aria-label": "Tutup inspector", title: "Tutup inspector", text: "Tutup", onclick: stop });
    ui.head = h("div", { class: "head" }, h("span", { class: "title", text: "Style Inspector" }), ui.pick, close);

    ui.sline = h("div", { class: "sel-line" });
    ui.nav = h("div", { class: "nav" });
    ui.comp = h("div", { class: "comp" });
    ui.clsTitle = h("h3", { id: "sg-cls-title" });
    ui.list = h("ul", { "aria-labelledby": "sg-cls-title" });
    ui.dl = h("datalist", { id: "sg-suggest" });
    ui.addInput = h("input", {
      id: "sg-add", type: "text", list: "sg-suggest", autocomplete: "off", spellcheck: "false", placeholder: "mis. p-4 atau btn-lg",
      onkeydown: function (e) {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); addClasses(ui.addInput.value); ui.addInput.value = ""; }
      },
    });
    var addForm = h("div", { class: "addform" },
      h("label", { class: "lbl", for: "sg-add", text: "Tambah class" }),
      h("div", { class: "add" }, ui.addInput,
        h("button", { type: "button", text: "Tambah", onclick: function () { addClasses(ui.addInput.value); ui.addInput.value = ""; ui.addInput.focus(); } })),
      ui.dl);

    ui.style = h("textarea", {
      id: "sg-style", spellcheck: "false", placeholder: "color: crimson;\nmargin-top: 8px;",
      oninput: function () {
        if (!S.el) return;
        S.el.style.cssText = ui.style.value;
        S.modified.add(S.el);
        afterEditLite();
      },
      onkeydown: function (e) { e.stopPropagation(); },
    });
    var styleBox = h("div", {}, h("label", { class: "lbl", for: "sg-style", text: "Style inline (CSS)" }), ui.style);

    ui.computed = h("dl", {});
    ui.resetOne = h("button", { type: "button", text: "Reset elemen ini", onclick: function () {
      if (!S.el) return;
      restore(S.el);
      select(S.el);
      setMsg("Elemen dikembalikan.");
    } });
    ui.resetAll = h("button", { type: "button", text: "Reset semua (0)", onclick: function () {
      var cur = S.el;
      Array.from(S.modified).forEach(restore);
      if (cur) select(cur); else renderResetAll();
      setMsg("Semua perubahan dikembalikan.");
    } });
    var copyBtn = h("button", { type: "button", text: "Salin class", onclick: function () {
      if (!S.el) return;
      var v = S.items.filter(function (i) { return i.on; }).map(function (i) { return i.name; }).join(" ");
      copyText(v, "Class disalin.");
    } });
    ui.msg = h("div", { class: "msg", role: "status" });

    ui.selected = h("div", { class: "stack", hidden: true },
      h("section", { "aria-label": "Elemen terpilih" }, h("h3", { text: "Elemen terpilih" }), ui.sline, ui.nav, ui.comp),
      h("section", {}, ui.clsTitle, ui.list, addForm),
      h("section", {}, styleBox),
      h("section", {}, h("h3", { text: "Nilai terhitung" }), ui.computed),
      h("div", { class: "acts" }, copyBtn, ui.resetOne, ui.resetAll)
    );

    ui.empty = h("p", { class: "empty", text: "Klik “Pilih elemen”, lalu klik komponen di halaman yang ingin diedit." });

    var body = h("div", { class: "scroll" },
      ui.fw, ui.empty, ui.selected, ui.msg,
      h("p", { class: "note", text: "Perubahan hanya sementara di halaman ini dan hilang saat dimuat ulang. Elemen di dalam iframe belum bisa dipilih." }));

    ui.panel = h("section", { class: "panel", role: "dialog", "aria-label": "Style Inspector" }, ui.head, body);
    root.append(h("div", { class: "layer" }, ui.hov, ui.sel, ui.panel));

    ui.head.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button")) return;
      var r = ui.panel.getBoundingClientRect();
      var dx = e.clientX - r.left, dy = e.clientY - r.top;
      ui.head.classList.add("drag");
      ui.head.setPointerCapture(e.pointerId);
      function move(ev) {
        var x = Math.max(0, Math.min(window.innerWidth - 60, ev.clientX - dx));
        var y = Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - dy));
        ui.panel.style.left = x + "px";
        ui.panel.style.top = y + "px";
        ui.panel.style.right = "auto";
      }
      function up() {
        ui.head.classList.remove("drag");
        ui.head.removeEventListener("pointermove", move);
        ui.head.removeEventListener("pointerup", up);
      }
      ui.head.addEventListener("pointermove", move);
      ui.head.addEventListener("pointerup", up);
    });

    S.host = host;
    document.documentElement.append(host);
  }

  function afterEditLite() {
    rectBox(S.ui.sel, S.el);
    renderComputed();
    renderResetAll();
  }

  function track() {
    cancelAnimationFrame(S.raf);
    S.raf = requestAnimationFrame(function () {
      if (S.el) rectBox(S.ui.sel, S.el);
      if (S.picking && S.hoverEl) rectBox(S.ui.hov, S.hoverEl);
    });
  }

  function listen(on) {
    var m = on ? "addEventListener" : "removeEventListener";
    document[m]("mousemove", onMove, true);
    document[m]("click", onClick, true);
    document[m]("mousedown", swallow, true);
    document[m]("mouseup", swallow, true);
    document[m]("pointerdown", swallow, true);
    document[m]("keydown", onKey, true);
    window[m]("scroll", track, true);
    window[m]("resize", track);
  }

  function start(det) {
    S.det = det || null;
    if (!S.host) { build(); listen(true); }
    else if (!S.host.isConnected) document.documentElement.append(S.host);
    renderDetection();
    S.ui.dl.textContent = "";
    suggestionTokens().forEach(function (t) { S.ui.dl.append(h("option", { value: t })); });
    if (S.el) renderAll();
    startPicking();
  }

  function stop() {
    stopPicking();
    listen(false);
    cancelAnimationFrame(S.raf);
    if (S.host) S.host.remove();
    S.host = null;
    S.ui = {};
    S.el = null;
    S.items = [];
    // Perubahan pada halaman sengaja dibiarkan; tombol "Reset" ada di panel sebelum ditutup.
  }

  window.__sgInspector = { start: start, stop: stop };
})();
