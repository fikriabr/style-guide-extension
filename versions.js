/*
 * Pemetaan versi framework -> URL dokumentasi, dan class -> topik docs.
 * Dipakai oleh popup dan inspector. Butuh data.js (ENTRIES) dimuat lebih dulu.
 */
var SGV = (function () {
  "use strict";

  // Halaman docs Tailwind v3 yang slug-nya berbeda dari v4.
  var TW3_SLUG = {
    "color": "text-color",
    "overflow-wrap": "word-break",
    "filter-blur": "blur",
    "filter-grayscale": "grayscale",
    "filter-brightness": "brightness",
    "backdrop-filter-blur": "backdrop-blur",
    "text-decoration-line": "text-decoration",
    "white-space": "whitespace",
    "styling-with-utility-classes": "utility-first",
    "colors": "customizing-colors",
    "box-shadow#adding-a-ring": "ring-width",
    "background-image#setting-gradient-color-stops": "gradient-color-stops",
    "border-width#between-children": "divide-width",
    "margin#adding-space-between-children": "space",
    "display#screen-reader-only": "screen-readers",
    "responsive-design#container-queries": "responsive-design",
    "styling-with-utility-classes#using-the-important-modifier": "configuration#important-modifier",
  };

  // Halaman Bootstrap 5 yang juga ada di 4.6 (path 4.6 sama atau dipetakan).
  var BS4_PATH = {
    "layout/grid/": "layout/grid/",
    "layout/columns/": "layout/grid/",
    "layout/gutters/": "layout/grid/#no-gutters",
    "layout/containers/": "layout/overview/#containers",
    "layout/breakpoints/": "layout/overview/#responsive-breakpoints",
    "utilities/spacing/": "utilities/spacing/",
    "utilities/display/": "utilities/display/",
    "utilities/flex/": "utilities/flex/",
    "utilities/text/": "utilities/text/",
    "utilities/colors/": "utilities/colors/",
    "utilities/background/": "utilities/colors/#background-color",
    "utilities/borders/": "utilities/borders/",
    "utilities/shadows/": "utilities/shadows/",
    "utilities/sizing/": "utilities/sizing/",
    "utilities/position/": "utilities/position/",
    "utilities/overflow/": "utilities/overflow/",
    "utilities/float/": "utilities/float/",
    "utilities/vertical-align/": "utilities/vertical-align/",
    "utilities/visibility/": "utilities/visibility/",
    "helpers/clearfix/": "utilities/clearfix/",
    "helpers/position/": "utilities/position/#fixed-top",
    "helpers/text-truncation/": "utilities/text/#text-wrapping-and-overflow",
    "helpers/visually-hidden/": "utilities/screen-readers/",
    "helpers/ratio/": "utilities/embed/",
    "content/typography/": "content/typography/",
    "content/images/": "content/images/",
    "content/tables/": "content/tables/",
    "content/figures/": "content/figures/",
    "forms/form-control/": "components/forms/",
    "forms/select/": "components/forms/#select-menu",
    "forms/checks-radios/": "components/forms/#checkboxes-and-radios",
    "forms/range/": "components/forms/#range",
    "forms/input-group/": "components/input-group/",
    "forms/floating-labels/": "components/forms/",
    "forms/layout/": "components/forms/#layout",
    "forms/validation/": "components/forms/#validation",
    "components/alerts/": "components/alerts/",
    "components/badge/": "components/badge/",
    "components/breadcrumb/": "components/breadcrumb/",
    "components/button-group/": "components/button-group/",
    "components/buttons/": "components/buttons/",
    "components/card/": "components/card/",
    "components/carousel/": "components/carousel/",
    "components/collapse/": "components/collapse/",
    "components/dropdowns/": "components/dropdowns/",
    "components/list-group/": "components/list-group/",
    "components/modal/": "components/modal/",
    "components/navbar/": "components/navbar/",
    "components/navs-tabs/": "components/navs/",
    "components/pagination/": "components/pagination/",
    "components/popovers/": "components/popovers/",
    "components/progress/": "components/progress/",
    "components/scrollspy/": "components/scrollspy/",
    "components/spinners/": "components/spinners/",
    "components/toasts/": "components/toasts/",
    "components/tooltips/": "components/tooltips/",
    "components/close-button/": "utilities/close-icon/",
  };

  // Halaman Bootstrap 5 yang baru ada sejak minor tertentu (diverifikasi dengan scripts/check-links.mjs).
  var BS5_SINCE = {
    "customize/color-modes/": 3,
    "helpers/focus-ring/": 3,
    "helpers/icon-link/": 3,
    "utilities/link/": 3,
    "utilities/z-index/": 3,
    "utilities/object-fit/": 3,
    "utilities/opacity/": 1,
    "components/placeholders/": 1,
    "helpers/stacks/": 1,
    "helpers/vertical-rule/": 1,
    "layout/css-grid/": 1,
  };

  function stripAnchor(p) { return p.split("#")[0]; }

  /**
   * det: { major, minor } dari deteksi, atau null.
   * Hasil: { url, approx } dengan approx=true bila halaman yang dibuka hanya perkiraan
   * (misalnya halaman umum untuk versi lama).
   */
  function docsUrl(fw, det, path) {
    var major = det && det.major;
    var minor = det && det.minor;

    if (fw === "bootstrap") {
      if (major === 4) {
        var p4 = BS4_PATH[path] || BS4_PATH[stripAnchor(path)];
        var b4 = "https://getbootstrap.com/docs/4.6/";
        return p4 ? { url: b4 + p4, approx: false } : { url: b4 + "getting-started/introduction/", approx: true };
      }
      if (major === 3) {
        var cat = path.indexOf("components/") === 0 ? "components/" : "css/";
        return { url: "https://getbootstrap.com/docs/3.4/" + cat, approx: true };
      }
      if (major === 5 && typeof minor === "number" && minor >= 0 && minor <= 2) {
        var since = BS5_SINCE[stripAnchor(path)];
        if (since && minor < since) {
          return { url: FRAMEWORKS.bootstrap.base + path, approx: true, note: "baru ada di Bootstrap 5." + since };
        }
        // Anchor #radius baru ada sejak 5.2 (sebelumnya #border-radius).
        var p5 = minor < 2 ? path.replace("utilities/borders/#radius", "utilities/borders/#border-radius") : path;
        return { url: "https://getbootstrap.com/docs/5." + minor + "/" + p5, approx: false };
      }
      return { url: FRAMEWORKS.bootstrap.base + path, approx: false };
    }

    if (major === 3) {
      var s3 = TW3_SLUG[path] || TW3_SLUG[stripAnchor(path)] || path;
      return { url: "https://v3.tailwindcss.com/docs/" + s3, approx: false };
    }
    if (major === 2 || major === 1) {
      return { url: "https://v" + major + ".tailwindcss.com/docs", approx: true };
    }
    return { url: FRAMEWORKS.tailwind.base + path, approx: false };
  }

  // Aturan class -> path docs. Aturan pertama yang cocok dipakai.
  var TW_RULES = [
    [/^content-\[/, "content"],
    [/^container$/, "container"],
    [/^(block|inline-block|inline|inline-flex|flex|grid|inline-grid|hidden|contents|flow-root|table|list-item)$/, "display"],
    [/^(static|fixed|absolute|relative|sticky)$/, "position"],
    [/^(inset(-[xy])?|top|right|bottom|left|start|end)-/, "top-right-bottom-left"],
    [/^z-/, "z-index"],
    [/^overflow-/, "overflow"],
    [/^float-/, "float"],
    [/^aspect-/, "aspect-ratio"],
    [/^object-(contain|cover|fill|none|scale-down)$/, "object-fit"],
    [/^object-/, "object-position"],
    [/^(visible|invisible|collapse)$/, "visibility"],
    [/^columns-/, "columns"],
    [/^isolat/, "isolation"],
    [/^flex-(row|col)(-reverse)?$/, "flex-direction"],
    [/^flex-(wrap|nowrap)(-reverse)?$/, "flex-wrap"],
    [/^flex-(1|auto|initial|none)$/, "flex"],
    [/^(grow|flex-grow)(-|$)/, "flex-grow"],
    [/^(shrink|flex-shrink)(-|$)/, "flex-shrink"],
    [/^justify-items-/, "justify-items"],
    [/^justify-/, "justify-content"],
    [/^items-/, "align-items"],
    [/^self-/, "align-self"],
    [/^content-/, "align-content"],
    [/^place-items-/, "place-items"],
    [/^place-content-/, "place-content"],
    [/^gap(-[xy])?-/, "gap"],
    [/^order-/, "order"],
    [/^grid-cols-/, "grid-template-columns"],
    [/^grid-rows-/, "grid-template-rows"],
    [/^col-(span|start|end|auto)/, "grid-column"],
    [/^row-(span|start|end|auto)/, "grid-row"],
    [/^grid-flow-/, "grid-auto-flow"],
    [/^space-[xy]-/, "margin#adding-space-between-children"],
    [/^p[xytrblse]?-/, "padding"],
    [/^m[xytrblse]?-/, "margin"],
    [/^size-/, "size"],
    [/^w-/, "width"],
    [/^h-/, "height"],
    [/^min-w-/, "min-width"],
    [/^max-w-/, "max-width"],
    [/^min-h-/, "min-height"],
    [/^max-h-/, "max-height"],
    [/^text-(xs|sm|base|lg|xl|\d+xl|\[\d[^\]]*\])$/, "font-size"],
    [/^text-(left|center|right|justify|start|end)$/, "text-align"],
    [/^text-(wrap|nowrap|balance|pretty)$/, "text-wrap"],
    [/^(text-ellipsis|text-clip|truncate)$/, "text-overflow"],
    [/^text-/, "color"],
    [/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/, "font-weight"],
    [/^font-(sans|serif|mono)$/, "font-family"],
    [/^(italic|not-italic)$/, "font-style"],
    [/^leading-/, "line-height"],
    [/^tracking-/, "letter-spacing"],
    [/^(underline|overline|line-through|no-underline)$/, "text-decoration-line"],
    [/^(uppercase|lowercase|capitalize|normal-case)$/, "text-transform"],
    [/^line-clamp-/, "line-clamp"],
    [/^whitespace-/, "white-space"],
    [/^(break-(normal|words|all|keep)|wrap-.+)$/, "overflow-wrap"],
    [/^list-(none|disc|decimal)/, "list-style-type"],
    [/^align-/, "vertical-align"],
    [/^bg-(auto|cover|contain)$/, "background-size"],
    [/^bg-(center|top|bottom|left|right)(-.+)?$/, "background-position"],
    [/^bg-(no-repeat|repeat)(-.+)?$/, "background-repeat"],
    [/^bg-(linear|gradient|radial|conic|\[url)/, "background-image"],
    [/^(from|via|to)-/, "background-image#setting-gradient-color-stops"],
    [/^bg-/, "background-color"],
    [/^border-(solid|dashed|dotted|double|hidden|none)$/, "border-style"],
    [/^border-(collapse|separate)$/, "border-collapse"],
    [/^border(-[xytrblse])?(-\d+|-\[[^\]]*\])?$/, "border-width"],
    [/^border-/, "border-color"],
    [/^rounded/, "border-radius"],
    [/^divide-[xy]/, "border-width#between-children"],
    [/^outline/, "outline-width"],
    [/^ring/, "box-shadow#adding-a-ring"],
    [/^shadow/, "box-shadow"],
    [/^opacity-/, "opacity"],
    [/^mix-blend-/, "mix-blend-mode"],
    [/^backdrop-blur/, "backdrop-filter-blur"],
    [/^blur/, "filter-blur"],
    [/^grayscale/, "filter-grayscale"],
    [/^brightness-/, "filter-brightness"],
    [/^transition/, "transition-property"],
    [/^duration-/, "transition-duration"],
    [/^ease-/, "transition-timing-function"],
    [/^delay-/, "transition-delay"],
    [/^animate-/, "animation"],
    [/^scale-/, "scale"],
    [/^rotate-/, "rotate"],
    [/^translate-/, "translate"],
    [/^skew-/, "skew"],
    [/^origin-/, "transform-origin"],
    [/^cursor-/, "cursor"],
    [/^pointer-events-/, "pointer-events"],
    [/^select-/, "user-select"],
    [/^resize/, "resize"],
    [/^scroll-(smooth|auto)$/, "scroll-behavior"],
    [/^snap-/, "scroll-snap-type"],
    [/^appearance-/, "appearance"],
    [/^accent-/, "accent-color"],
    [/^table-(auto|fixed)$/, "table-layout"],
    [/^(fill|stroke)-/, "fill"],
    [/^(sr-only|not-sr-only)$/, "display#screen-reader-only"],
  ];

  var BS_RULES = [
    [/^container(-(fluid|sm|md|lg|xl|xxl))?$/, "layout/containers/"],
    [/^row(-cols-.+)?$/, "layout/grid/"],
    [/^col(-(sm|md|lg|xl|xxl))?(-(\d+|auto))?$/, "layout/columns/"],
    [/^offset(-(sm|md|lg|xl|xxl))?-\d+$/, "layout/columns/"],
    [/^g[xy]?(-(sm|md|lg|xl|xxl))?-\d$/, "layout/gutters/"],
    [/^(pe-(none|auto)|user-select-(all|auto|none))$/, "utilities/interactions/"],
    [/^(m|p)[trblxyse]?(-(sm|md|lg|xl|xxl))?-(\d|auto|n\d)$/, "utilities/spacing/"],
    [/^(row-|column-)?gap(-(sm|md|lg|xl|xxl))?-\d$/, "utilities/spacing/#gap"],
    [/^order(-(sm|md|lg|xl|xxl))?-(first|last|\d)$/, "utilities/flex/#order"],
    [/^d-(sm-|md-|lg-|xl-|xxl-|print-)?(none|inline|inline-block|block|grid|inline-grid|table|table-cell|table-row|flex|inline-flex)$/, "utilities/display/"],
    [/^flex(-(sm|md|lg|xl|xxl))?-(row|column|row-reverse|column-reverse|fill|grow-\d|shrink-\d|wrap|nowrap|wrap-reverse)$/, "utilities/flex/"],
    [/^justify-content(-(sm|md|lg|xl|xxl))?-/, "utilities/flex/#justify-content"],
    [/^align-items(-(sm|md|lg|xl|xxl))?-/, "utilities/flex/#align-items"],
    [/^align-self(-(sm|md|lg|xl|xxl))?-/, "utilities/flex/#align-self"],
    [/^align-content(-(sm|md|lg|xl|xxl))?-/, "utilities/flex/#align-content"],
    [/^text-((sm|md|lg|xl|xxl)-)?(start|center|end)$/, "utilities/text/#text-alignment"],
    [/^text-(wrap|nowrap|break)$/, "utilities/text/#text-wrapping-and-overflow"],
    [/^text-(lowercase|uppercase|capitalize)$/, "utilities/text/#text-transform"],
    [/^text-decoration-/, "utilities/text/#text-decoration"],
    [/^text-truncate$/, "helpers/text-truncation/"],
    [/^text-/, "utilities/colors/"],
    [/^fs-\d$/, "utilities/text/#font-size"],
    [/^(fw|fst)-/, "utilities/text/#font-weight-and-italics"],
    [/^lh-/, "utilities/text/#line-height"],
    [/^font-monospace$/, "utilities/text/#monospace"],
    [/^bg-/, "utilities/background/"],
    [/^link-(opacity|offset|underline)/, "utilities/link/"],
    [/^link-/, "helpers/colored-links/"],
    [/^rounded/, "utilities/borders/#radius"],
    [/^border(-|$)/, "utilities/borders/"],
    [/^shadow/, "utilities/shadows/"],
    [/^opacity-/, "utilities/opacity/"],
    [/^(w|h|mw|mh|vw|vh|min-vw|min-vh)-(25|50|75|100|auto)$/, "utilities/sizing/"],
    [/^position-/, "utilities/position/"],
    [/^(top|bottom|start|end)-(0|50|100)$|^translate-middle(-[xy])?$/, "utilities/position/"],
    [/^(fixed|sticky)-(top|bottom)$|^sticky-(sm|md|lg|xl|xxl)-top$/, "helpers/position/"],
    [/^overflow(-[xy])?-/, "utilities/overflow/"],
    [/^float-/, "utilities/float/"],
    [/^clearfix$/, "helpers/clearfix/"],
    [/^align-(baseline|top|middle|bottom|text-bottom|text-top)$/, "utilities/vertical-align/"],
    [/^object-fit-/, "utilities/object-fit/"],
    [/^(visible|invisible)$/, "utilities/visibility/"],
    [/^z-/, "utilities/z-index/"],
    [/^(hstack|vstack)$/, "helpers/stacks/"],
    [/^ratio(-.+)?$/, "helpers/ratio/"],
    [/^visually-hidden(-focusable)?$/, "helpers/visually-hidden/"],
    [/^stretched-link$/, "helpers/stretched-link/"],
    [/^vr$/, "helpers/vertical-rule/"],
    [/^focus-ring/, "helpers/focus-ring/"],
    [/^icon-link/, "helpers/icon-link/"],
    [/^(h[1-6]|display-[1-6]|lead|small|mark|blockquote|list-unstyled|list-inline(-item)?|initialism)$/, "content/typography/"],
    [/^img-(fluid|thumbnail)$/, "content/images/"],
    [/^table(-.+)?$/, "content/tables/"],
    [/^figure(-.+)?$/, "content/figures/"],
    [/^form-select(-.+)?$/, "forms/select/"],
    [/^form-(check|switch)(-.+)?$/, "forms/checks-radios/"],
    [/^form-range$/, "forms/range/"],
    [/^form-floating$/, "forms/floating-labels/"],
    [/^form-(control|label|text)(-.+)?$/, "forms/form-control/"],
    [/^input-group(-.+)?$/, "forms/input-group/"],
    [/^(is-valid|is-invalid|valid-feedback|invalid-feedback|needs-validation|was-validated)$/, "forms/validation/"],
    [/^btn-group(-.+)?$|^btn-toolbar$/, "components/button-group/"],
    [/^btn-close(-.+)?$/, "components/close-button/"],
    [/^btn(-.+)?$/, "components/buttons/"],
    [/^alert(-.+)?$/, "components/alerts/"],
    [/^badge$/, "components/badge/"],
    [/^card(-.+)?$/, "components/card/"],
    [/^navbar(-.+)?$/, "components/navbar/"],
    [/^nav(-.+)?$/, "components/navs-tabs/"],
    [/^dropdown(-.+)?$/, "components/dropdowns/"],
    [/^modal(-.+)?$/, "components/modal/"],
    [/^offcanvas(-.+)?$/, "components/offcanvas/"],
    [/^(collapse|collapsing)$/, "components/collapse/"],
    [/^accordion(-.+)?$/, "components/accordion/"],
    [/^carousel(-.+)?$/, "components/carousel/"],
    [/^tooltip(-.+)?$/, "components/tooltips/"],
    [/^popover(-.+)?$/, "components/popovers/"],
    [/^toast(-.+)?$/, "components/toasts/"],
    [/^progress(-.+)?$/, "components/progress/"],
    [/^spinner-(border|grow)(-.+)?$/, "components/spinners/"],
    [/^list-group(-.+)?$/, "components/list-group/"],
    [/^breadcrumb(-.+)?$/, "components/breadcrumb/"],
    [/^(pagination|page-(item|link))(-.+)?$/, "components/pagination/"],
    [/^placeholder(-.+)?$/, "components/placeholders/"],
  ];

  // "md:hover:-mt-4!" -> "mt-4". Titik dua di dalam [] (nilai arbitrer) tidak dianggap varian.
  function baseClass(c) {
    var depth = 0, last = -1, i;
    for (i = 0; i < c.length; i++) {
      var ch = c.charAt(i);
      if (ch === "[") depth++;
      else if (ch === "]") depth--;
      else if (ch === ":" && depth === 0) last = i;
    }
    c = c.slice(last + 1);
    c = c.replace(/^!/, "").replace(/!$/, "").replace(/^-/, "");
    return c;
  }

  function entryName(fw, path) {
    var i, e;
    for (i = 0; i < ENTRIES.length; i++) {
      e = ENTRIES[i];
      if (e.fw === fw && e.path === path) return e.name;
    }
    var base = stripAnchor(path);
    for (i = 0; i < ENTRIES.length; i++) {
      e = ENTRIES[i];
      if (e.fw === fw && stripAnchor(e.path) === base) return e.name;
    }
    var seg = base.replace(/\/$/, "").split("/").pop() || base;
    return seg.replace(/-/g, " ");
  }

  function matchClass(fw, cls) {
    var rules = fw === "tailwind" ? TW_RULES : BS_RULES;
    var c = baseClass(cls);
    for (var i = 0; i < rules.length; i++) {
      if (rules[i][0].test(c)) {
        var path = rules[i][1];
        return { fw: fw, path: path, name: entryName(fw, path) };
      }
    }
    return null;
  }

  function isComponentPath(path) { return path.indexOf("components/") === 0; }

  function label(det) {
    if (!det) return "";
    if (det.version) return det.version;
    if (det.major) return det.major + ".x";
    return "versi tidak diketahui";
  }

  return { docsUrl: docsUrl, matchClass: matchClass, isComponentPath: isComponentPath, label: label };
})();
