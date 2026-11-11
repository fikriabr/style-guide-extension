/*
 * Dijalankan di halaman aktif (world MAIN) lewat chrome.scripting.executeScript({ func }).
 * Fungsi ini diserialisasi sebagai teks, jadi harus mandiri: tidak boleh memakai variabel di luarnya.
 *
 * Urutan bukti, dari yang paling kuat: objek JS runtime, versi di URL CDN, banner komentar di CSS/JS,
 * variabel CSS, lalu class yang dipakai di DOM.
 */
async function sgDetectInPage() {
  const result = { host: location.hostname || location.protocol, bootstrap: null, tailwind: null };

  const parse = (s) => {
    const m = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(s || "");
    return m ? { text: m[0], major: +m[1], minor: +m[2], full: m[3] !== undefined } : null;
  };
  const hit = (fw, versionText, source, confidence, majorOnly) => {
    const p = parse(versionText);
    if (majorOnly) {
      result[fw] = { version: null, major: majorOnly.major, minor: majorOnly.minor == null ? null : majorOnly.minor, source, confidence };
    } else if (p) {
      result[fw] = { version: p.text, major: p.major, minor: p.minor, source, confidence };
    }
  };

  const sheets = Array.from(document.querySelectorAll('link[rel~="stylesheet"][href]')).map((l) => l.href);
  const scripts = Array.from(document.querySelectorAll("script[src]")).map((s) => s.src);
  const urls = sheets.concat(scripts);
  const inlineCss = Array.from(document.querySelectorAll("style")).map((s) => (s.textContent || "").slice(0, 400000));

  try {
    let v = null;
    if (window.bootstrap) {
      const comp = window.bootstrap.Tooltip || window.bootstrap.Modal || window.bootstrap.Collapse ||
        Object.values(window.bootstrap).find((x) => x && typeof x.VERSION === "string");
      v = comp && comp.VERSION;
    }
    if (!v) {
      const $ = window.jQuery || window.$;
      const plugin = $ && $.fn && ($.fn.modal || $.fn.dropdown || $.fn.collapse || $.fn.tooltip);
      v = plugin && plugin.Constructor && plugin.Constructor.VERSION;
    }
    if (typeof v === "string" && parse(v)) hit("bootstrap", v, "objek JS runtime", "tinggi");
  } catch (e) { /* akses global bisa dilarang halaman */ }

  if (!result.bootstrap) {
    const re = /bootstrap(?:[.-](?:min|bundle|grid|reboot|utilities))*(?:@|\/|-)v?(\d+\.\d+(?:\.\d+)?)/i;
    for (const u of urls) {
      const m = re.exec(u);
      if (m) { hit("bootstrap", m[1], "versi di URL CDN", "tinggi"); break; }
    }
  }

  if (!result.tailwind) {
    const reBrowser = /@tailwindcss\/browser@(\d+\.\d+(?:\.\d+)?)/i;
    const reCdn = /cdn\.tailwindcss\.com\/(\d+\.\d+\.\d+)/i;
    const reLib = /tailwind(?:css)?(?:@|\/)v?(\d+\.\d+(?:\.\d+)?)/i;
    for (const u of urls) {
      let m = reBrowser.exec(u) || reCdn.exec(u) || reLib.exec(u);
      if (m) { hit("tailwind", m[1], "versi di URL CDN", "tinggi"); break; }
      if (/cdn\.tailwindcss\.com/i.test(u)) { hit("tailwind", "", "Play CDN (v3)", "sedang", { major: 3 }); break; }
    }
  }

  const peek = async (url, limit, re) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    try {
      const res = await fetch(url, { signal: ctl.signal, credentials: "omit" });
      if (!res.ok || !res.body) return null;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let text = "", n = 0;
      while (n < limit) {
        const chunk = await reader.read();
        if (chunk.done) break;
        n += chunk.value.length;
        text += dec.decode(chunk.value, { stream: true });
        const m = re.exec(text);
        if (m) { reader.cancel().catch(() => {}); return m; }
      }
      reader.cancel().catch(() => {});
      return null;
    } catch (e) { return null; } finally { clearTimeout(timer); }
  };

  const reBsBanner = /Bootstrap(?:\s+Grid|\s+Reboot|\s+Utilities)?\s+v?(\d+\.\d+\.\d+)/i;
  const reTwBanner = /tailwindcss\s+v(\d+\.\d+\.\d+)/i;

  for (const css of inlineCss) {
    if (!result.bootstrap) { const m = reBsBanner.exec(css); if (m) hit("bootstrap", m[1], "banner komentar CSS", "tinggi"); }
    if (!result.tailwind) { const m = reTwBanner.exec(css); if (m) hit("tailwind", m[1], "banner komentar CSS", "tinggi"); }
  }

  const jobs = [];
  if (!result.bootstrap) {
    sheets.concat(scripts.filter((s) => /bootstrap/i.test(s))).slice(0, 8).forEach((u) =>
      jobs.push(peek(u, 6000, reBsBanner).then((m) => { if (m && !result.bootstrap) hit("bootstrap", m[1], "banner komentar file", "tinggi"); })));
  }
  if (!result.tailwind) {
    sheets.slice(0, 8).forEach((u) =>
      jobs.push(peek(u, 600000, reTwBanner).then((m) => { if (m && !result.tailwind) hit("tailwind", m[1], "banner komentar CSS", "tinggi"); })));
  }
  await Promise.all(jobs);

  const rootCS = getComputedStyle(document.documentElement);
  const has = (name) => rootCS.getPropertyValue(name).trim() !== "";

  if (!result.bootstrap) {
    if (has("--bs-blue") || has("--bs-body-font-family")) {
      if (has("--bs-emphasis-color")) hit("bootstrap", "", "variabel CSS (--bs-*)", "sedang", { major: 5, minor: 3 });
      else hit("bootstrap", "", "variabel CSS (--bs-*)", "sedang", { major: 5 });
    } else if (has("--breakpoint-sm") && (has("--primary") || has("--font-family-sans-serif"))) {
      hit("bootstrap", "", "variabel CSS (--primary)", "sedang", { major: 4 });
    }
  }

  if (!result.tailwind) {
    let v4 = has("--spacing") || has("--default-font-family");
    if (!v4) {
      try {
        for (const sh of document.styleSheets) {
          let rules;
          try { rules = sh.cssRules; } catch (e) { continue; }
          for (const r of rules) {
            if (r.constructor && r.constructor.name === "CSSPropertyRule" && /^--tw-/.test(r.name)) { v4 = true; break; }
          }
          if (v4) break;
        }
      } catch (e) { /* document.styleSheets bisa melempar error */ }
    }
    if (v4) hit("tailwind", "", "variabel CSS (@property --tw-*)", "sedang", { major: 4 });
    else if (has("--tw-border-spacing-x")) hit("tailwind", "", "variabel CSS (--tw-*)", "sedang", { major: 3 });
    else if (has("--tw-ring-offset-width")) hit("tailwind", "", "variabel CSS (--tw-*)", "sedang", { major: 2 });
  }

  const tokens = new Set();
  const els = document.querySelectorAll("[class]");
  for (let i = 0; i < els.length && i < 3000; i++) {
    const cl = els[i].classList;
    for (let j = 0; j < cl.length; j++) tokens.add(cl[j]);
  }

  if (!result.bootstrap) {
    if (document.querySelector("[data-bs-toggle],[data-bs-target],[data-bs-dismiss]")) {
      hit("bootstrap", "", "atribut data-bs-*", "sedang", { major: 5 });
    } else {
      const sig = [/^row$/, /^btn$/, /^btn-(primary|secondary|success|danger)$/, /^navbar$/, /^card(-body)?$/,
        /^form-control$/, /^modal-dialog$/, /^list-group-item$/, /^col-(sm|md|lg|xl)-\d+$/, /^dropdown-menu$/, /^nav-link$/];
      let n = 0;
      sig.forEach((re) => { for (const t of tokens) { if (re.test(t)) { n++; break; } } });
      if (n >= 3) {
        const v3 = ["glyphicon", "navbar-default", "panel-default", "hidden-xs", "pull-left"].some((c) => tokens.has(c)) ||
          Array.from(tokens).some((t) => /^col-xs-\d+$/.test(t));
        const major = v3 ? 3 : (document.querySelector("[data-toggle]") ? 4 : null);
        result.bootstrap = { version: null, major, minor: null, source: "class di DOM", confidence: "rendah" };
      }
    }
  }

  if (!result.tailwind) {
    const twSig = /^(flex|grid|items-center|justify-between|justify-center|px-\d+|py-\d+|p-\d+|mt-\d+|mb-\d+|gap-\d+|w-full|h-full|rounded(-\w+)?|text-(xs|sm|base|lg|xl|\dxl)|font-(medium|semibold|bold)|bg-\w+-\d{2,3}|text-\w+-\d{2,3}|shadow(-\w+)?|space-[xy]-\d+)$/;
    const variant = /^(sm|md|lg|xl|2xl|hover|focus|dark):/;
    let n = 0, v = 0;
    for (const t of tokens) { if (twSig.test(t)) n++; if (variant.test(t)) v++; }
    if (n >= 6 || (n >= 3 && v >= 2)) {
      result.tailwind = { version: null, major: null, minor: null, source: "class di DOM", confidence: "rendah" };
    }
  }

  return result;
}
