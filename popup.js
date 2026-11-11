(function () {
  "use strict";

  const $q = document.getElementById("q");
  const $results = document.getElementById("results");
  const $count = document.getElementById("count");
  const chips = Array.from(document.querySelectorAll(".chip"));
  const MAX_RESULTS = 60;

  let framework = "all";
  let pageInfo = null;
  let current = [];
  let activeIndex = 0;

  const store = {
    get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* localStorage bisa diblokir (mode privat) */ } },
  };

  function tokenize(q) {
    return q.toLowerCase().split(/[\s,]+/).filter(Boolean);
  }

  function scoreEntry(e, tokens) {
    const name = e.name.toLowerCase();
    const classes = e.cls.toLowerCase().split(/\s+/);
    const kw = e.kw.toLowerCase();
    let total = 0;
    for (const t of tokens) {
      if (!e.hay.includes(t)) return -1; // semua kata harus cocok (AND)
      let s = 1;
      if (name === t) s += 40;
      else if (name.startsWith(t)) s += 25;
      else if (name.split(/[^a-z0-9]+/).some((w) => w.startsWith(t))) s += 15;
      else if (name.includes(t)) s += 8;
      if (classes.some((c) => c === t)) s += 30;
      else if (classes.some((c) => c.startsWith(t) || c.replace(/^[a-z-]+:/, "").startsWith(t))) s += 18;
      else if (e.cls.toLowerCase().includes(t)) s += 6;
      if (kw.split(/\s+/).some((w) => w === t)) s += 10;
      else if (kw.includes(t)) s += 4;
      if (e.cat.toLowerCase().includes(t)) s += 2;
      total += s;
    }
    return total;
  }

  function search(query, fw) {
    const pool = ENTRIES.filter((e) => fw === "all" || e.fw === fw);
    const tokens = tokenize(query);
    if (!tokens.length) return { list: pool, tokens };
    const scored = [];
    pool.forEach((e, i) => {
      const s = scoreEntry(e, tokens);
      if (s >= 0) scored.push({ e, s, i });
    });
    scored.sort((a, b) => b.s - a.s || a.i - b.i);
    return { list: scored.map((x) => x.e), tokens };
  }

  // URL docs mengikuti versi framework yang terdeteksi di halaman aktif.
  function urlOf(e) {
    const det = pageInfo && pageInfo[e.fw];
    return det ? SGV.docsUrl(e.fw, det, e.path) : { url: e.url, approx: false };
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function highlight(text, tokens) {
    const frag = document.createDocumentFragment();
    if (!tokens.length || !text) { frag.append(text || ""); return frag; }
    const re = new RegExp("(" + tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "ig");
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.append(text.slice(last, m.index));
      frag.append(el("mark", null, m[0]));
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    if (last < text.length) frag.append(text.slice(last));
    return frag;
  }

  function card(e, idx, tokens) {
    const c = el("article", "card " + e.fw);
    c.dataset.index = idx;

    const head = el("div", "row");
    const name = el("h3", "name");
    name.append(highlight(e.name, tokens));
    head.append(name, el("span", "cat", e.cat), el("span", "badge", FRAMEWORKS[e.fw].label));
    c.append(head);

    c.append(el("p", "desc", e.desc));

    if (e.cls) {
      const box = el("div", "code");
      const code = el("code");
      code.append(highlight(e.cls, tokens));
      const btn = el("button", "copy", "Salin");
      btn.type = "button";
      btn.tabIndex = -1;
      btn.setAttribute("aria-label", "Salin class " + e.name);
      btn.addEventListener("click", (ev) => { ev.stopPropagation(); copy(e.cls, btn); });
      box.append(code, btn);
      c.append(box);
    }

    const doc = el("div", "doc");
    const target = urlOf(e);
    const link = el("a");
    link.href = target.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.tabIndex = -1;
    link.title = target.url;
    link.append(
      el("span", "sr-only", "Dokumentasi " + FRAMEWORKS[e.fw].label + " untuk " + e.name + ": "),
      el("span", "url", target.url.replace(/^https:\/\//, "")),
      el("span", "sr-only", " (buka di tab baru)")
    );
    doc.append(link);
    if (target.approx) doc.append(el("span", "approx", target.note || "halaman umum"));
    c.append(doc);

    c.addEventListener("click", () => setActive(idx, false));
    c.addEventListener("focusin", () => { if (idx !== activeIndex) setActive(idx, false); });
    return c;
  }

  function render() {
    const query = $q.value.trim();
    const { list, tokens } = search(query, framework);
    current = list.slice(0, MAX_RESULTS);
    activeIndex = 0;
    $results.textContent = "";
    $results.append(el("h2", "sr-only", "Hasil pencarian"));

    if (!list.length) {
      $count.textContent = "0 hasil";
      $results.append(emptyState(query));
      return;
    }

    const frag = document.createDocumentFragment();
    current.forEach((e, i) => frag.append(card(e, i, tokens)));
    $results.append(frag);
    $count.textContent = list.length > MAX_RESULTS
      ? "Menampilkan " + MAX_RESULTS + " dari " + list.length
      : list.length + " hasil";
    setActive(0, false);
    $results.scrollTop = 0;
  }

  function emptyState(query) {
    const box = el("div", "empty");
    box.append(el("h3", null, "Tidak ada hasil untuk “" + query + "”"));
    box.append(el("div", null, "Coba kata kunci lain, atau cari langsung di dokumentasi resmi:"));
    const links = el("div");
    ["tailwind", "bootstrap"].forEach((fw) => {
      if (framework !== "all" && framework !== fw) return;
      const a = el("a");
      a.append("Cari di " + FRAMEWORKS[fw].label, el("span", "sr-only", " (buka di tab baru)"));
      a.href = FRAMEWORKS[fw].searchUrl(query);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      links.append(a);
    });
    box.append(links);
    const sugg = el("div", "sugg");
    ["padding", "flex", "grid", "rata tengah", "modal", "dark mode", "button", "shadow"].forEach((s) => {
      const b = el("button", null, s);
      b.type = "button";
      b.addEventListener("click", () => { $q.value = s; onInput(); $q.focus(); });
      sugg.append(b);
    });
    box.append(sugg);
    return box;
  }

  // Hanya kartu aktif yang punya kontrol dalam urutan Tab, jadi Tab tidak harus melewati puluhan kartu.
  function setActive(i, scroll) {
    if (!current.length) return;
    activeIndex = Math.max(0, Math.min(current.length - 1, i));
    $results.querySelectorAll(".card").forEach((n) => {
      const on = Number(n.dataset.index) === activeIndex;
      n.classList.toggle("active", on);
      n.querySelectorAll(".copy, .doc a").forEach((ctl) => { ctl.tabIndex = on ? 0 : -1; });
      if (on && scroll) n.scrollIntoView({ block: "nearest" });
    });
  }

  const $status = document.getElementById("copy-status");

  function copy(text, btn) {
    const report = (ok) => {
      $status.textContent = ok ? "Class disalin." : "Gagal menyalin class. Salin manual dari kotak kode.";
      if (!btn) return;
      const old = btn.dataset.label || btn.textContent;
      btn.dataset.label = old;
      btn.textContent = ok ? "Tersalin ✓" : "Gagal ✕";
      btn.classList.toggle("done", ok);
      btn.classList.toggle("fail", !ok);
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.textContent = old; btn.classList.remove("done", "fail"); }, ok ? 1200 : 2500);
    };
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove();
      report(ok);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => report(true), fallback);
    } else {
      fallback();
    }
  }

  function onInput() {
    store.set("sg:q", $q.value);
    render();
  }

  function setFramework(fw) {
    framework = fw;
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.fw === fw)));
    store.set("sg:fw", fw);
    render();
  }

  $q.addEventListener("input", onInput);
  chips.forEach((c) => c.addEventListener("click", () => setFramework(c.dataset.fw)));

  document.getElementById("clear").addEventListener("click", () => { $q.value = ""; onInput(); $q.focus(); });

  document.addEventListener("keydown", (ev) => {
    const typing = document.activeElement === $q;
    // Enter pada tombol atau link berarti mengaktifkannya, bukan membuka docs kartu aktif.
    const onControl = ev.target.closest && ev.target.closest("button, a[href]");
    const inResults = ev.target.closest && ev.target.closest("#results");
    if (ev.key === "/" && !typing) { ev.preventDefault(); $q.focus(); $q.select(); return; }
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      setActive(activeIndex + (ev.key === "ArrowDown" ? 1 : -1), true);
      if (inResults) {
        const next = $results.querySelector(".card.active .doc a");
        if (next) next.focus();
      }
    } else if (ev.key === "Enter") {
      if (onControl) return;
      const e = current[activeIndex];
      if (e) { ev.preventDefault(); window.open(urlOf(e).url, "_blank", "noopener"); }
    } else if (ev.key === "Escape" && $q.value) {
      $q.value = ""; onInput();
    } else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "c") {
      const hasSelection = String(window.getSelection()).length > 0 ||
        (typing && $q.selectionStart !== $q.selectionEnd);
      const e = current[activeIndex];
      if (!hasSelection && e && e.cls) {
        ev.preventDefault();
        copy(e.cls, $results.querySelector('.card[data-index="' + activeIndex + '"] .copy'));
      }
    }
  });

  const $host = document.getElementById("pb-host");
  const $list = document.getElementById("pb-list");
  const $inspect = document.getElementById("inspect-btn");
  const $refresh = document.getElementById("pb-refresh");
  const $msg = document.getElementById("pb-msg");

  async function activeTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  function renderPage(info) {
    $list.textContent = "";
    ["bootstrap", "tailwind"].forEach((fw) => {
      const det = info && info[fw];
      const li = el("li", "pb-item" + (det ? " found" : ""));
      const line = el("div", "pb-line");
      line.append(el("span", "pb-fw", FRAMEWORKS[fw].label));
      if (det) {
        line.append(el("span", "pb-ver", SGV.label(det)));
        li.append(line, el("div", "pb-src", det.source));
      } else {
        line.append(el("span", "pb-ver none", "tidak terdeteksi"));
        li.append(line);
      }
      $list.append(li);
    });
  }

  function setPageError(text) {
    pageInfo = null;
    $host.textContent = "Halaman tidak bisa diperiksa";
    $list.textContent = "";
    $inspect.disabled = true;
    $msg.textContent = text;
  }

  async function detect() {
    $msg.textContent = "";
    $host.textContent = "Memeriksa halaman…";
    $refresh.disabled = true;
    const before = JSON.stringify(pageInfo);
    try {
      const tab = await activeTab();
      if (!tab || tab.id == null) return setPageError("Tidak ada tab aktif.");
      if (!/^(https?|file):/.test(tab.url || "")) {
        return setPageError("Hanya halaman http, https, atau file yang bisa diperiksa (bukan chrome:// atau Web Store).");
      }
      const out = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: "MAIN", func: sgDetectInPage });
      const info = out && out[0] && out[0].result;
      if (!info) return setPageError("Deteksi tidak mengembalikan hasil.");
      pageInfo = info;
      $host.textContent = info.host || "Halaman aktif";
      renderPage(info);
      $inspect.disabled = false;
      if (!info.bootstrap && !info.tailwind) {
        $msg.textContent = "Bootstrap atau Tailwind belum terdeteksi. Inspector tetap bisa dipakai, class dicocokkan ke keduanya.";
      }
      if (JSON.stringify(pageInfo) !== before) render();
    } catch (err) {
      const file = /file:/i.test(String(err && err.message));
      setPageError(file
        ? "Aktifkan “Allow access to file URLs” di pengaturan extension untuk halaman file://."
        : "Tidak bisa mengakses halaman ini: " + (err && err.message ? err.message : "kesalahan tidak dikenal"));
    } finally {
      $refresh.disabled = false;
    }
  }

  async function startInspect() {
    $inspect.disabled = true;
    $msg.textContent = "";
    try {
      const tab = await activeTab();
      const target = { tabId: tab.id };
      const probe = await chrome.scripting.executeScript({ target, func: () => !!window.__sgInspector });
      if (!probe[0].result) {
        await chrome.scripting.executeScript({ target, files: ["data.js", "versions.js", "inspector.js"] });
      }
      await chrome.scripting.executeScript({ target, func: (d) => window.__sgInspector.start(d), args: [pageInfo] });
      window.close();
    } catch (err) {
      $msg.textContent = "Gagal membuka inspector: " + (err && err.message ? err.message : "kesalahan tidak dikenal");
      $inspect.disabled = false;
    }
  }

  $inspect.addEventListener("click", startInspect);
  $refresh.addEventListener("click", detect);

  $q.value = store.get("sg:q");
  const savedFw = store.get("sg:fw");
  setFramework(["tailwind", "bootstrap"].includes(savedFw) ? savedFw : "all");
  $q.focus();
  $q.select();
  detect();
})();
