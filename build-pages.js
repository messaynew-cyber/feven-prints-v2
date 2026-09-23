#!/usr/bin/env node
/* build-pages.js — generate the six product pages (T-04).
 *
 * WHY A GENERATOR AND NOT SIX HAND-WRITTEN PAGES
 * Six pages with hand-typed price tables is six places to drift. The whole
 * point of js/norcha-data.js is that a number lives in ONE place, so these
 * pages are rendered from it: change a price in the data file, run
 *   node build-pages.js
 * and the website, the counter sheet, the WhatsApp catalogue and these six
 * pages all move together.
 *
 * The OUTPUT IS REAL STATIC HTML — prices and sizes are in the markup, not
 * fetched by JavaScript. That matters: a product page whose prices only
 * exist after JS runs is a page Google cannot read, and the entire reason
 * these pages exist is to turn 1 indexable URL into 7.
 *
 * The chrome (nav + footer) is lifted verbatim out of index.html so it can
 * never drift from the homepage. If index.html changes, run this again.
 *
 * RUN:  node build-pages.js            (writes the six .html files)
 *       node build-pages.js --check    (verify only, writes nothing)
 */
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = __dirname;
var CHECK = process.argv.indexOf("--check") !== -1;
var DOMAIN = "https://norchaprint.com";

/* ── 1. the data file is the source of truth ─────────────────────────── */
var sandbox = {};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/norcha-data.js"), "utf8"),
  sandbox, { filename: "norcha-data.js" });
var D = sandbox.NorchaData;
if (!D || !D.products) { console.error("FATAL: norcha-data.js did not load"); process.exit(1); }

var indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/* ── 2. lift the shared chrome out of index.html ─────────────────────── */
function sliceOnce(html, startMark, endMark, label) {
  var i = html.indexOf(startMark);
  if (i === -1) throw new Error("chrome: start marker not found: " + label);
  if (html.indexOf(startMark, i + 1) !== -1) throw new Error("chrome: duplicated marker: " + label);
  var j = html.indexOf(endMark, i);
  if (j === -1) throw new Error("chrome: end marker not found: " + label);
  return html.slice(i, j + endMark.length);
}
function rewriteForSubpage(chunk) {
  /* The nav is anchor-based on the homepage. On a subpage every one of those
     anchors has to go home first. `#top` is the page top → "/" directly. */
  return chunk
    .replace(/href="#top"/g, 'href="/"')
    .replace(/href="#/g, 'href="/#');
}
var NAV = rewriteForSubpage(sliceOnce(indexHtml, '<header class="nav" id="nav">', "</header>", "header"));
var FOOTER = rewriteForSubpage(sliceOnce(indexHtml, '<footer class="footer">', "</footer>", "footer"));
var THEME_SCRIPT = sliceOnce(indexHtml, "<script>\n  /* Set the theme before first paint", "</script>", "theme script");
var TO_TOP = sliceOnce(indexHtml, '<button class="to-top" id="toTop"', "</button>", "to-top");

/* Bilingual strings reused from index.html so nothing is re-translated by
   hand and the pages cannot contradict the homepage. Each one is verified
   against index.html below — a typo here fails the build instead of
   shipping a page that says something different from the front page. */
/* The FAQ answers are LIFTED OUT OF index.html, never retyped. Hand-copying
   them would put the Amharic at risk: the homepage wording is the approved
   copy, and a paraphrase on a product page is a translation nobody checked.
   Parsing them guarantees the two can never disagree. */
var FAQ_POOL = {};
(function () {
  var re = /<details class="faq reveal reveal-scale" id="([^"]+)">([\s\S]*?)<\/details>/g;
  var m, count = 0;
  while ((m = re.exec(indexHtml)) !== null) {
    var id = m[1], body = m[2];
    var sum = body.match(/<summary data-en="([^"]*)" data-am="([^"]*)">/);
    var par = body.match(/<p data-en="([^"]*)" data-am="([^"]*)">/);
    if (!sum || !par) throw new Error("faq: could not parse " + id);
    FAQ_POOL[id] = { id: id, q: [sum[1], sum[2]], a: [par[1], par[2]] };
    count++;
  }
  if (count < 6) throw new Error("faq: expected 6+ questions, parsed " + count);
})();

/* ── 3. the six pages ────────────────────────────────────────────────── */
/* `family` must exist in js/norcha-data.js. `img` must exist in img/.
   `name` / `blurb` are copied verbatim from the matching tile on
   index.html — verified below, so a reworded tile fails the build. */
var PAGES = [
  {
    file: "standard-prints.html", slug: "standard-prints", family: "prints", img: "flatlay",
    accent: "accent-yellow",
    name: ["Standard prints", "መደበኛ ህትመት"],
    blurb: ["From passport photos to large posters, on premium lustre and matte paper.",
            "ከፓስፖርት ፎቶ እስከ ትልቅ ፖስተር፣ በከፍተኛ ጥራት ወረቀት ላይ።"],
    alt: ["Assorted printed landscape photographs laid out on linen",
          "የተለያዩ የታተሙ ፎቶዎች በጨርቅ ላይ ተዘርግተው"],
    faq: ["how-fast-can-i-get-my-prints", "which-file-types-work", "how-do-i-pay", "do-you-keep-my-photos"],
    wa: "some prints"
  },
  {
    file: "canvas.html", slug: "canvas", family: "canvas", img: "canvas",
    accent: "accent-green",
    name: ["Canvas prints", "የካንቫስ ህትመት"],
    blurb: ["Gallery-wrapped canvas, every size up to 120 cm.",
            "እስከ 120 ሳ.ሜ ድረስ በሁሉም መጠን።"],
    alt: ["Gallery-wrapped canvas print of a highland landscape hanging on a wall",
          "የካንቫስ ህትመት በግድግዳ ላይ ተሰቅሎ"],
    faq: ["how-fast-can-i-get-my-prints", "do-you-deliver", "how-do-i-pay", "what-if-something-is-wrong-with-my-print"],
    wa: "a canvas print"
  },
  {
    file: "photo-books.html", slug: "photo-books", family: "books", img: "photobook",
    accent: "accent-red",
    name: ["Photo books", "የፎቶ መጽሐፍ"],
    blurb: ["Hardcover and softcover, 20 to 80 pages.",
            "ከ20 እስከ 80 ገጽ።"],
    alt: ["Hardcover photo book with a printed landscape cover on a linen surface",
          "የፎቶ መጽሐፍ በጨርቅ ላይ"],
    faq: ["how-fast-can-i-get-my-prints", "do-you-deliver", "which-file-types-work", "what-if-something-is-wrong-with-my-print"],
    wa: "a photo book"
  },
  {
    file: "wall-calendars.html", slug: "wall-calendars", family: "calendars", img: "calendar",
    accent: "accent-yellow",
    name: ["Wall calendars", "የግድግዳ የቀን መቁጠሪያ"],
    blurb: ["Your photos, all twelve months.",
            "ፎቶዎችዎ ለ12 ወራት።"],
    alt: ["Wall calendar printed with a landscape photograph",
          "የግድግዳ የቀን መቁጠሪያ በፎቶ የታተመ"],
    faq: ["how-fast-can-i-get-my-prints", "do-you-deliver", "how-do-i-pay", "what-if-something-is-wrong-with-my-print"],
    wa: "a wall calendar"
  },
  {
    file: "photo-mugs.html", slug: "photo-mugs", family: "mugs", img: "mug",
    accent: "accent-green",
    name: ["Photo mugs", "የፎቶ ሙግ"],
    blurb: ["A daily reminder, dishwasher safe.",
            "ለዕለታዊ አገልግሎት የሚመች።"],
    alt: ["White ceramic mug printed with a landscape photograph",
          "ነጭ ሙግ በፎቶ የታተመ"],
    faq: ["how-fast-can-i-get-my-prints", "do-you-deliver", "how-do-i-pay", "do-you-keep-my-photos"],
    wa: "a photo mug"
  },
  {
    file: "framed-prints.html", slug: "framed-prints", family: "frames", img: "frames",
    accent: "accent-red",
    name: ["Framed prints", "የተከፈፈ ህትመት"],
    blurb: ["Ready-to-hang, classic and modern frames.",
            "ለመስቀል ዝግጁ የሆኑ ክፈፎች።"],
    alt: ["Three framed landscape photographs arranged on a wall",
          "ሶስት በፍሬም የተዘጋጁ ፎቶዎች በግድግዳ ላይ"],
    faq: ["how-fast-can-i-get-my-prints", "do-you-deliver", "which-file-types-work", "what-if-something-is-wrong-with-my-print"],
    wa: "a framed print"
  }
];

/* ── 4. verification: every reused string must exist on index.html ───── */
var problems = [];
function mustExist(s, where) {
  if (indexHtml.indexOf(s) === -1) problems.push(where + ": not found in index.html → " + s.slice(0, 60));
}
PAGES.forEach(function (p) {
  mustExist(p.name[0], p.file + ".name");
  mustExist(p.name[1], p.file + ".name.am");
  mustExist(p.blurb[0], p.file + ".blurb");
  if (!D.products[p.family]) problems.push(p.file + ": unknown family " + p.family);
  if (!fs.existsSync(path.join(ROOT, "img", p.img + ".webp"))) problems.push(p.file + ": missing img/" + p.img + ".webp");
  if (!fs.existsSync(path.join(ROOT, "img", p.img + ".jpg"))) problems.push(p.file + ": missing img/" + p.img + ".jpg");
});
Object.keys(FAQ_POOL).forEach(function (k) {
  mustExist(FAQ_POOL[k].a[0], "faq." + k + ".en");
  mustExist(FAQ_POOL[k].a[1], "faq." + k + ".am");
});
if (problems.length) {
  console.error("FATAL — build stopped, nothing written:");
  problems.forEach(function (p) { console.error("  ✗ " + p); });
  process.exit(1);
}

/* ── 5. renderers ────────────────────────────────────────────────────── */
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function attr(s) { return esc(s); }
function money(n) { return D.money(n); }
function moneyAm(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " ብር"; }

/* Lead time in days → a plain sentence, not a date. A date baked into static
   HTML would be wrong tomorrow; the live estimate is computed in the browser
   (see the small script at the bottom of each page). */
function leadLine(lead) {
  if (lead === 0) return ["Ready the same day if you order before 16:00",
                          "ከ16:00 በፊት ካዘዙ በዚያው ቀን ዝግጁ"];
  if (lead === 1) return ["Ready in 1 working day", "በ1 የስራ ቀን ዝግጁ"];
  return ["Ready in " + lead + "–" + (lead + 1) + " working days", "በ" + lead + "–" + (lead + 1) + " የስራ ቀን ዝግጁ"];
}

function priceTable(p) {
  var fam = D.products[p.family];
  var rows = fam.sizes.map(function (s) {
    /* data-temp-price carries the key from the data file, exactly like the
       homepage, so the price-drift test can check these pages too. */
    return '          <tr><td>' + esc(s.label) + '</td>' +
      '<td data-temp-price="' + attr(s.key) + '" data-en="' + attr(money(s.price)) + '" data-am="' + attr(moneyAm(s.price)) + '">' + esc(money(s.price)) + '</td></tr>';
  }).join("\n");
  return [
    '      <div class="price-card ' + p.accent + '">',
    '        <h2 class="price-h" data-en="Sizes and prices" data-am="መጠን እና ዋጋ">Sizes and prices</h2>',
    '        <p class="price-note" data-en="Prices depend on paper and finish — we confirm the exact price when you order." data-am="ዋጋው እንደ ወረቀቱ እና አጨራረሱ ይለያያል፤ ትክክለኛውን ዋጋ ሲያዙ እናረጋግጣለን።">Prices depend on paper and finish — we confirm the exact price when you order.</p>',
    '        <table>',
    '          <thead><tr><th data-en="Size" data-am="መጠን">Size</th><th data-en="Price" data-am="ዋጋ">Price</th></tr></thead>',
    '          <tbody>',
    rows,
    '          </tbody>',
    '        </table>',
    '      </div>'
  ].join("\n");
}

function tierTable(p) {
  var tiers = (D.tiers[D.products[p.family].tier] || []).filter(function (t) { return t.min > 1; });
  if (!tiers.length) return "";
  var rows = tiers.map(function (t) {
    return '          <tr><td>' + t.min + '+</td><td>' + t.pct + '%</td></tr>';
  }).join("\n");
  return [
    '      <div class="price-card ' + p.accent + '">',
    '        <h2 class="price-h" data-en="Volume discounts" data-am="የብዛት ቅናሽ">Volume discounts</h2>',
    '        <table>',
    '          <thead><tr><th data-en="Quantity" data-am="ብዛት">Quantity</th><th data-en="Discount" data-am="ቅናሽ">Discount</th></tr></thead>',
    '          <tbody>',
    rows,
    '          </tbody>',
    '        </table>',
    '        <p class="price-note" data-en="Bigger job? Message us and we will quote it." data-am="ትልቅ ትዕዛዝ? ይንገሩን፣ ዋጋ እንሰጣለን።">Bigger job? Message us and we will quote it.</p>',
    '      </div>'
  ].join("\n");
}

function faqBlock(p) {
  var items = p.faq.map(function (k) {
    var f = FAQ_POOL[k];
    return [
      '      <details class="faq reveal reveal-scale" id="' + f.id + '">',
      '        <summary data-en="' + attr(f.q[0]) + '" data-am="' + attr(f.q[1]) + '">' + esc(f.q[0]) + '</summary>',
      '        <p data-en="' + attr(f.a[0]) + '" data-am="' + attr(f.a[1]) + '">' + esc(f.a[0]) + '</p>',
      '      </details>'
    ].join("\n");
  }).join("\n");
  return [
    '<section class="section section-tint" id="faq">',
    '  <div class="wrap">',
    '    <p class="am-eye">ጥያቄዎች</p>',
    '    <h2 class="section-h reveal reveal-blur" data-en="Common questions" data-am="ተደጋጋሚ ጥያቄዎች">Common questions</h2>',
    '    <div class="faq-list reveal d1">',
    items,
    '    </div>',
    '  </div>',
    '</section>'
  ].join("\n");
}

function relatedBlock(p) {
  var others = PAGES.filter(function (x) { return x.file !== p.file; });
  var links = others.map(function (x) {
    return '        <a class="related-link" href="/' + x.slug + '">' +
      '<span data-en="' + attr(x.name[0]) + '" data-am="' + attr(x.name[1]) + '">' + esc(x.name[0]) + '</span>' +
      '<i aria-hidden="true">→</i></a>';
  }).join("\n");
  return [
    '<section class="section" id="related">',
    '  <div class="wrap">',
    '    <p class="am-eye">ሌሎች ምርቶች</p>',
    '    <h2 class="section-h reveal reveal-blur" data-en="More from the studio" data-am="ተጨማሪ ምርቶች">More from the studio</h2>',
    '    <nav class="related-grid reveal" aria-label="Other products">',
    links,
    '    </nav>',
    '  </div>',
    '</section>'
  ].join("\n");
}

function productSchema(p) {
  var fam = D.products[p.family];
  var low = Math.min.apply(null, fam.sizes.map(function (s) { return s.price; }));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.name[0],
    "alternateName": p.name[1],
    "description": p.blurb[0],
    "image": DOMAIN + "/img/" + p.img + ".jpg",
    "brand": { "@type": "Brand", "name": "Norcha Print" },
    "inLanguage": "en",
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "ETB",
      "lowPrice": String(low),
      "highPrice": String(Math.max.apply(null, fam.sizes.map(function (s) { return s.price; }))),
      "offerCount": fam.sizes.length,
      "availability": "https://schema.org/InStock",
      "seller": { "@type": "LocalBusiness", "name": "Norcha Print", "telephone": "+358442715477" }
    }
  };
}
function breadcrumbSchema(p) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": DOMAIN + "/" },
      { "@type": "ListItem", "position": 2, "name": p.name[0], "item": DOMAIN + "/" + p.slug }
    ]
  };
}
function faqSchema(p) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "inLanguage": "en",
    "mainEntity": p.faq.map(function (k) {
      return { "@type": "Question", "name": FAQ_POOL[k].q[0],
               "acceptedAnswer": { "@type": "Answer", "text": FAQ_POOL[k].a[0] } };
    })
  };
}
function ldJson(o) {
  return '<script type="application/ld+json">\n' + JSON.stringify(o, null, 2) + '\n</script>';
}

function render(p) {
  var url = DOMAIN + "/" + p.slug;
  var fam = D.products[p.family];
  var lead = leadLine(fam.lead);
  var waText = encodeURIComponent("Hello Norcha Print - I'd like to order " + p.wa + ".");
  var title = p.name[0] + " in Addis Ababa | Norcha Print";
  var desc = p.blurb[0] + " Printed in Bole, Addis Ababa. Order on WhatsApp: " + D.shop.phone;

  var head = [
    '<!DOCTYPE html>',
    '<html lang="en" data-lang-default="en">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + esc(title) + '</title>',
    '<meta name="description" content="' + attr(desc) + '">',
    '<meta name="theme-color" content="#F8F4EE" id="metaThemeColor">',
    '<meta name="msapplication-TileColor" content="#0E5C41">',
    '<meta name="color-scheme" content="light dark">',
    THEME_SCRIPT,
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-title" content="Norcha Print">',
    '<link rel="manifest" href="/manifest.webmanifest">',
    '<link rel="apple-touch-icon" href="/img/icons/apple-touch-icon.png">',
    '<link rel="canonical" href="' + url + '">',
    '<!-- one page, two languages, switched client-side — same as the homepage -->',
    '<link rel="alternate" hreflang="en" href="' + url + '">',
    '<link rel="alternate" hreflang="am" href="' + url + '">',
    '<link rel="alternate" hreflang="x-default" href="' + url + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Norcha Print">',
    '<meta property="og:title" content="' + attr(p.name[0] + " — Norcha Print, Addis Ababa") + '">',
    '<meta property="og:description" content="' + attr(desc) + '">',
    '<meta property="og:url" content="' + url + '">',
    '<meta property="og:image" content="' + DOMAIN + '/img/' + p.img + '.jpg">',
    '<meta property="og:locale" content="en_ET">',
    '<meta property="og:locale:alternate" content="am_ET">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + attr(p.name[0] + " — Norcha Print") + '">',
    '<meta name="twitter:description" content="' + attr(desc) + '">',
    '<meta name="twitter:image" content="' + DOMAIN + '/img/' + p.img + '.jpg">',
    ldJson(productSchema(p)),
    ldJson(breadcrumbSchema(p)),
    ldJson(faqSchema(p)),
    '<link rel="icon" href="/img/icons/icon-192.png">',
    '<link rel="preload" as="image" href="/img/' + p.img + '.webp" type="image/webp">',
    '<link rel="stylesheet" href="/css/style.css">',
    '</head>'
  ].join("\n");

  var body = [
    '<body>',
    '',
    '<a class="skip" href="#product">Skip to content</a>',
    '<div class="print-only">',
    '  <h2>' + esc(p.name[0]) + ' — Norcha Print</h2>',
    '  <p>' + esc(D.shop.phone) + ' · ' + esc(D.shop.city) + ' · ' + esc(D.shop.hours) + '</p>',
    '</div>',
    '<div class="progress" id="progress" aria-hidden="true"></div>',
    '',
    NAV,
    '',
    '<main id="top">',
    '<div class="tibeb-wrap reveal" aria-hidden="true"><i class="tibeb"></i></div>',
    '',
    '<section class="section" id="product">',
    '  <div class="wrap">',
    '    <nav class="crumbs" aria-label="Breadcrumb">',
    '      <a href="/" data-en="Home" data-am="መግቢያ">Home</a><span aria-hidden="true">/</span>',
    '      <span data-en="' + attr(p.name[0]) + '" data-am="' + attr(p.name[1]) + '">' + esc(p.name[0]) + '</span>',
    '    </nav>',
    '    <p class="am-eye">' + esc(p.name[1]) + '</p>',
    '    <h1 class="section-h reveal reveal-blur" data-en="' + attr(p.name[0]) + '" data-am="' + attr(p.name[1]) + '">' + esc(p.name[0]) + '</h1>',
    '    <p class="lead reveal" data-en="' + attr(p.blurb[0]) + '" data-am="' + attr(p.blurb[1]) + '">' + esc(p.blurb[0]) + '</p>',
    '    <p class="lead-meta reveal"><span class="chip" data-en="' + attr(lead[0]) + '" data-am="' + attr(lead[1]) + '">' + esc(lead[0]) + '</span>',
    '      <span class="chip chip-quiet" id="pDeliv" aria-live="polite"></span></p>',
    '  </div>',
    '  <div class="wall-band">',
    '    <div class="wrap">',
    '      <figure class="prod-media reveal reveal-scale"><picture>',
    /* responsive candidates, generated by build-images.sh. The 720 variant is
       the one a phone actually takes (364px slot at DPR 2 needs 728px). */
    '        <source type="image/webp" srcset="/img/' + p.img + '-400.webp 400w, /img/' + p.img + '-720.webp 720w, /img/' + p.img + '.webp 1024w" sizes="(max-width: 920px) calc(100vw - 48px), 880px">',
    '        <img src="/img/' + p.img + '.jpg" srcset="/img/' + p.img + '-400.jpg 400w, /img/' + p.img + '-720.jpg 720w, /img/' + p.img + '.jpg 1024w" sizes="(max-width: 920px) calc(100vw - 48px), 880px" alt="' + attr(p.alt[0]) + '" width="1024" height="1024" decoding="async"></picture></figure>',
    '    </div>',
    '  </div>',
    '  <div class="wrap">',
    '      <div class="prod-cards reveal">',
    priceTable(p),
    tierTable(p),
    '      </div>',
    '          <div class="prod-cta reveal">',
    '            <a class="btn btn-primary" href="https://wa.me/' + D.shop.wa + '?text=' + waText + '" target="_blank" rel="noopener" data-en="Order on WhatsApp" data-am="በዋትስአፕ ይዘዙ">Order on WhatsApp</a>',
    '            <a class="btn btn-outline" href="tel:+' + D.shop.wa + '" data-en="Call the studio" data-am="ይደውሉ">Call the studio</a>',
    '          </div>',
    '  </div>',
    '</section>',
    '',
    faqBlock(p),
    '',
    relatedBlock(p),
    '',
    '</main>',
    '',
    FOOTER,
    '',
    '<script src="/js/norcha-data.js"></script>',
    '<script src="/js/norcha-holidays.js"></script>',
    '<script src="/js/norcha-delivery.js"></script>',
    '<script src="/js/main.js"></script>',
    TO_TOP,
    '',
    '<script>',
    '  /* Live ready-date for THIS product, computed in the browser so it is',
    '     never stale in the HTML. Re-runs when the language changes. */',
    '  (function () {',
    '    var LEAD = ' + fam.lead + ';',
    '    function paint() {',
    '      var el = document.getElementById("pDeliv");',
    '      if (!el || typeof NorchaDelivery === "undefined" || typeof NorchaData === "undefined") return;',
    '      var lang = document.documentElement.lang === "am" ? "am" : "en";',
    '      var ready = NorchaDelivery.earliestReady(new Date(), LEAD, {cutoffHour: NorchaData.shop.cutoffHour});',
    '      el.textContent = (lang === "am" ? "ዛሬ ካዘዙ ዝግጁ: " : "Order today → ready ") + NorchaDelivery.fmt(ready, lang);',
    '    }',
    '    window.__paintDeliv = paint;   /* exposed so pagetest.js can prove it paints */',
    '    paint();',
    '    var segs = document.querySelectorAll(".seg");',
    '    for (var i = 0; i < segs.length; i++) segs[i].addEventListener("click", function () { setTimeout(paint, 0); });',
    '  })();',
    '</script>',
    '</body>',
    '</html>',
    ''
  ].join("\n");

  return head + "\n" + body;
}

/* ── 6. write ────────────────────────────────────────────────────────── */
var written = [];
PAGES.forEach(function (p) {
  var out = render(p);
  /* A page that renders no prices is a broken page. Cheap, loud guard. */
  var nPrices = (out.match(/data-temp-price=/g) || []).length;
  if (nPrices !== D.products[p.family].sizes.length) {
    console.error("FATAL: " + p.file + " wrote " + nPrices + " price cells, expected " +
      D.products[p.family].sizes.length);
    process.exit(1);
  }
  if (CHECK) { written.push(p.file + " (checked, " + nPrices + " prices)"); return; }
  fs.writeFileSync(path.join(ROOT, p.file), out, "utf8");
  written.push(p.file + " (" + nPrices + " prices, " + out.length + " bytes)");
});

/* ── 7. sitemap ──────────────────────────────────────────────────────── */
if (!CHECK) {
  var urls = ['<url>\n    <loc>' + DOMAIN + '/</loc>\n    <lastmod>2026-09-23</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n' +
    '    <xhtml:link rel="alternate" hreflang="en" href="' + DOMAIN + '/"/>\n' +
    '    <xhtml:link rel="alternate" hreflang="am" href="' + DOMAIN + '/"/>\n' +
    '    <xhtml:link rel="alternate" hreflang="x-default" href="' + DOMAIN + '/"/>\n  </url>'];
  PAGES.forEach(function (p) {
    var u = DOMAIN + "/" + p.slug;
    urls.push('<url>\n    <loc>' + u + '</loc>\n    <lastmod>2026-09-23</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n' +
      '    <xhtml:link rel="alternate" hreflang="en" href="' + u + '"/>\n' +
      '    <xhtml:link rel="alternate" hreflang="am" href="' + u + '"/>\n' +
      '    <xhtml:link rel="alternate" hreflang="x-default" href="' + u + '"/>\n  </url>');
  });
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!-- Norcha Print — one homepage plus one page per product family.\n' +
    '     Generated by build-pages.js. Do not hand-edit: run the generator. -->\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n  ' +
    urls.join("\n  ") + '\n</urlset>\n', "utf8");
  written.push("sitemap.xml (" + (PAGES.length + 1) + " urls)");
}

console.log((CHECK ? "CHECK " : "BUILT ") + PAGES.length + " product pages:");
written.forEach(function (w) { console.log("  ✓ " + w); });
