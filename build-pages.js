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

/* ── 3b. the public price list (T-03) ────────────────────────────────────
   "How much?" is the single most common question this shop gets, and the
   answer was sitting inside a homepage section that cannot be linked to,
   printed cleanly, or found by anyone searching for a price. This page is
   the same numbers in a shape built to be forwarded on WhatsApp and printed
   at the counter.

   Every figure comes from js/norcha-data.js. Nothing here is typed by hand.
   The one-tap button reuses main.js's catalogue builder (id="catSend"), so
   the message it sends and the page you are reading cannot disagree. */
var ACCENT = {};
PAGES.forEach(function (p) { ACCENT[p.family] = p.accent; });
var FAMILY_ORDER = ["prints", "canvas", "books", "frames", "calendars", "mugs"];

/* Newly written strings — listed so the [FEVEN] proofread list stays honest
   about what has NOT been checked by a native speaker yet. */
var PRICES_STRINGS = {
  title:    ["Price list", "የዋጋ ዝርዝር"],
  lead:     ["Every size we print, and what it costs. Bulk orders get a discount — the ladder is on each card.",
             "የምናትመው ሁሉም መጠን እና ዋጋው። በብዛት ሲዘዙ ቅናሽ አለ።"],
  inBirr:   ["All prices in ETB.", "ሁሉም ዋጋዎች በብር ናቸው።"],
  send:     ["Send this list on WhatsApp", "ይህን ዝርዝር በዋትስአፕ ይላኩ"],
  print:    ["Print this list", "ዝርዝሩን ያትሙ"],
  order:    ["Order on WhatsApp", "በዋትስአፕ ይዘዙ"],
  packs:    ["Priced per pack — see the quantities above.", "ዋጋው በጥቅል ነው።"]
};

function pricesCards() {
  return FAMILY_ORDER.map(function (fam) {
    var d = D.products[fam];
    var rows = d.sizes.map(function (sz) {
      return '          <tr><td>' + esc(sz.label) + '</td>' +
        '<td data-temp-price="' + attr(sz.key) + '" data-en="' + attr(money(sz.price)) + '" data-am="' + attr(moneyAm(sz.price)) + '">' + esc(money(sz.price)) + '</td></tr>';
    }).join("\n");
    var tiers = (D.tiers[d.tier] || []).filter(function (t) { return t.min > 1; });
    var tail = tiers.length
      ? '<p class="price-note"><span data-en="Bulk" data-am="በብዛት">Bulk</span>: ' +
        tiers.map(function (t) { return t.min + '+ −' + t.pct + '%'; }).join(" · ") + '</p>'
      : '<p class="price-note" data-en="' + attr(PRICES_STRINGS.packs[0]) + '" data-am="' + attr(PRICES_STRINGS.packs[1]) + '">' + esc(PRICES_STRINGS.packs[0]) + '</p>';
    return [
      '      <div class="price-card ' + (ACCENT[fam] || "accent-green") + '">',
      '        <h3 data-en="' + attr(d.label.en) + '" data-am="' + attr(d.label.am) + '">' + esc(d.label.en) + '</h3>',
      '        <table>',
      '          <thead><tr><th data-en="Size" data-am="መጠን">Size</th><th data-en="Price" data-am="ዋጋ">Price</th></tr></thead>',
      '          <tbody>',
      rows,
      '          </tbody>',
      '        </table>',
      '        ' + tail,
      '      </div>'
    ].join("\n");
  }).join("\n");
}

function renderPrices() {
  var url = DOMAIN + "/prices";
  var waText = encodeURIComponent("Hello Norcha Print - I have a question about your prices.");
  var desc = "Every print size and price at Norcha Print, Bole, Addis Ababa — canvas, photo books, calendars, framed prints, mugs and standard prints, with bulk discounts.";
  var itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Norcha Print price list",
    "itemListElement": PAGES.map(function (p, i) {
      return { "@type": "ListItem", "position": i + 1, "name": p.name[0], "url": DOMAIN + "/" + p.slug };
    })
  };
  var head = [
    '<!DOCTYPE html>', '<html lang="en" data-lang-default="en">', '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + esc(PRICES_STRINGS.title[0]) + ' — every size and price | Norcha Print</title>',
    '<meta name="description" content="' + attr(desc) + '">',
    '<meta name="theme-color" content="#F8F4EE" id="metaThemeColor">',
    '<meta name="msapplication-TileColor" content="#0E5C41">',
    '<meta name="color-scheme" content="light dark">',
    THEME_SCRIPT,
    '<meta name="mobile-web-app-capable" content="yes">',
    '<link rel="manifest" href="/manifest.webmanifest">',
    '<link rel="apple-touch-icon" href="/img/icons/apple-touch-icon.png">',
    '<link rel="canonical" href="' + url + '">',
    '<link rel="alternate" hreflang="en" href="' + url + '">',
    '<link rel="alternate" hreflang="am" href="' + url + '">',
    '<link rel="alternate" hreflang="x-default" href="' + url + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Norcha Print">',
    '<meta property="og:title" content="Price list — Norcha Print, Addis Ababa">',
    '<meta property="og:description" content="' + attr(desc) + '">',
    '<meta property="og:url" content="' + url + '">',
    '<meta property="og:image" content="' + DOMAIN + '/img/og/prices.jpg">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:image" content="' + DOMAIN + '/img/og/prices.jpg">',
    ldJson(itemList),
    ldJson({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": DOMAIN + "/" },
      { "@type": "ListItem", "position": 2, "name": "Price list", "item": url } ] }),
    '<link rel="icon" href="/img/icons/icon-192.png">',
    '<link rel="stylesheet" href="/css/style.css">',
    '</head>'
  ].join("\n");

  var body = [
    '<body>',
    '',
    '<a class="skip" href="#prices">Skip to content</a>',
    '<div class="print-only">',
    '  <h2>Norcha Print — price list</h2>',
    '  <p>' + esc(D.shop.phone) + ' · ' + esc(D.shop.city) + ' · ' + esc(D.shop.hours) + '</p>',
    '</div>',
    '<div class="progress" id="progress" aria-hidden="true"></div>',
    '',
    NAV,
    '',
    '<main id="top">',
    '<div class="tibeb-wrap reveal" aria-hidden="true"><i class="tibeb"></i></div>',
    '',
    '<section class="section" id="prices">',
    '  <div class="wrap">',
    '    <nav class="crumbs" aria-label="Breadcrumb">',
    '      <a href="/" data-en="Home" data-am="መግቢያ">Home</a><span aria-hidden="true">/</span>',
    '      <span data-en="' + attr(PRICES_STRINGS.title[0]) + '" data-am="' + attr(PRICES_STRINGS.title[1]) + '">' + esc(PRICES_STRINGS.title[0]) + '</span>',
    '    </nav>',
    '    <p class="am-eye">' + esc(PRICES_STRINGS.title[1]) + '</p>',
    '    <h1 class="section-h reveal reveal-blur" data-en="' + attr(PRICES_STRINGS.title[0]) + '" data-am="' + attr(PRICES_STRINGS.title[1]) + '">' + esc(PRICES_STRINGS.title[0]) + '</h1>',
    '    <p class="lead reveal" data-en="' + attr(PRICES_STRINGS.lead[0]) + '" data-am="' + attr(PRICES_STRINGS.lead[1]) + '">' + esc(PRICES_STRINGS.lead[0]) + '</p>',
    '    <p class="lead-meta reveal"><span class="chip chip-quiet" data-en="' + attr(PRICES_STRINGS.inBirr[0]) + '" data-am="' + attr(PRICES_STRINGS.inBirr[1]) + '">' + esc(PRICES_STRINGS.inBirr[0]) + '</span></p>',
    '  </div>',
    '  <div class="wrap">',
    '    <div class="price-block">',
    '      <p class="price-note reveal" data-en="Prices depend on paper and finish — we confirm the exact price when you order." data-am="ዋጋው እንደ ወረቀቱ እና አጨራረሱ ይለያያል፤ ትክክለኛውን ዋጋ ሲያዙ እናረጋግጣለን።">Prices depend on paper and finish — we confirm the exact price when you order.</p>',
    '      <div class="price-grid reveal">',
    pricesCards(),
    '      </div>',
    '      <div class="prod-cta reveal">',
    '        <button class="btn btn-primary" id="catSend" type="button" data-en="' + attr(PRICES_STRINGS.send[0]) + '" data-am="' + attr(PRICES_STRINGS.send[1]) + '">' + esc(PRICES_STRINGS.send[0]) + '</button>',
    '        <button class="btn btn-outline" id="printList" type="button" data-en="' + attr(PRICES_STRINGS.print[0]) + '" data-am="' + attr(PRICES_STRINGS.print[1]) + '">' + esc(PRICES_STRINGS.print[0]) + '</button>',
    '        <a class="btn btn-outline" href="https://wa.me/' + D.shop.wa + '?text=' + waText + '" target="_blank" rel="noopener" data-en="' + attr(PRICES_STRINGS.order[0]) + '" data-am="' + attr(PRICES_STRINGS.order[1]) + '">' + esc(PRICES_STRINGS.order[0]) + '</a>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</section>',
    '',
    relatedBlock({ file: "prices.html" }),
    '',
    '</main>',
    '',
    FOOTER,
    '',
    '<script src="/js/norcha-data.js"></script>',
    '<script src="/js/main.js"></script>',
    TO_TOP,
    '<script>',
    '  (function () {',
    '    var b = document.getElementById("printList");',
    '    if (b) b.addEventListener("click", function () { window.print(); });',
    '  })();',
    '</script>',
    '</body>', '</html>', ''
  ].join("\n");
  return head + "\n" + body;
}

/* ── 3c. the trust set: privacy, contact, about ──────────────────────────
   Written because the site now takes names, phone numbers AND photographs.
   A shop that asks for a customer's pictures and says nothing about what
   happens to them has not earned the pictures.

   Every claim here is checkable against the code or the live setup:
   the R2 lifecycle rule really does delete uploads 30 days after they arrive
   (so the wording says 30 days from sending, not from collection — the
   difference matters and the old copy got it wrong); there really are no
   advertising trackers; the order history really is on the customer's device.
   Nothing here promises a policy the client has not decided — the refund
   question stays in her column. */
var TRUST_STRINGS = {
  privacy: {
    slug: "privacy", file: "privacy.html",
    title: ["Privacy", "ግላዊነት"],
    lead: ["What happens to your photos and your number, in plain language.",
           "ፎቶዎችዎና ስልክ ቁጥርዎ ምን ይሆናሉ — በቀላል ቋንቋ።"],
    desc: "What Norcha Print collects when you order or upload photos, where it is kept, how long we keep it, and how to have it deleted."
  },
  contact: {
    slug: "contact", file: "contact.html",
    title: ["Contact", "አግኙን"],
    lead: ["Call, message, or send photos — whichever is easiest.",
           "ይደውሉ፣ ይላኩ ወይም ፎቶ ይላኩ — ለእርስዎ የሚቀለውን ይምረጡ።"],
    desc: "How to reach Norcha Print in Bole, Addis Ababa: phone, WhatsApp, opening hours, and how to send your photos."
  },
  about: {
    slug: "about", file: "about.html",
    title: ["The studio", "ስቱዲዮው"],
    lead: ["A family print studio in Bole, printing the photographs people actually keep.",
           "በቦሌ የሚገኝ የቤተሰብ ህትመት ስቱዲዮ።"],
    desc: "Norcha Print is a family-run photo printing studio in Bole, Addis Ababa — prints, canvas, photo books, calendars, frames and mugs."
  }
};

function privacySections() {
  var R = [
    ["What we collect when you upload photos",
     "ፎቶ ሲጭኑ የምንሰበስበው",
     ["The photographs you choose, your name, your phone number, and anything you type in the notes or size fields. " +
      "Nothing else. We do not ask for an email address and we do not create an account.",
      "የመረጡት ፎቶዎች፣ ስምዎ፣ ስልክ ቁጥርዎ እና በማስታወሻ ወይም በመጠን ሳጥን የጻፉት። ከዚህ በላይ ምንም አይደለም።"]],
    ["Where it goes",
     "የሚቀመጥበት ቦታ",
     ["Uploaded photos are stored on Cloudflare's servers, in a private bucket that only this studio can read. " +
      "They are not published, not indexed by search engines, and there is no public link to them.",
      "የተጫኑ ፎቶዎች በCloudflare ሰርቨር ላይ በግል ቦታ ይቀመጣሉ። ለህዝብ አይታዩም፣ በፍለጋ ሞተሮችም አይገኙም።"]],
    ["How long we keep them",
     "ምን ያህል ጊዜ እንይዛቸዋለን",
     ["Thirty days after you send them, the files are deleted automatically. " +
      "If you want them gone sooner, call or message us and we will delete them that day — you do not need a reason.",
      "ከላኩ ከ30 ቀን በኋላ ፋይሎቹ በራስ-ሰር ይሰረዛሉ። ቶሎ እንዲሰረዙ ከፈለጉ ይደውሉልን ወይም ይላኩልን፣ በዚያው ቀን እናጠፋለን።"]],
    ["What we never do",
     "ፈጽሞ የማንሰራው",
     ["We do not sell your photographs or your number. We do not use your photographs to advertise anything. " +
      "We do not put them in a catalogue, on social media, or in an example for another customer.",
      "ፎቶዎችዎን ወይም ቁጥርዎን አንሸጥም። ፎቶዎችዎን ለማስታወቂያ አንጠቀምባቸውም። በሶሻል ሚዲያም አናወጣም።"]],
    ["WhatsApp",
     "ዋትስአፕ",
     ["If you send photos on WhatsApp instead, that conversation lives on WhatsApp and is covered by their privacy policy as well as ours. " +
      "We keep the chat for as long as we need it to print your order.",
      "በዋትስአፕ ከላኩ ውይይቱ በዋትስአፕ ላይ ይቀመጣል። ለትዕዛዙ የሚያስፈልገንን ያህል እንይዘዋለን።"]],
    ["On your own device",
     "በራስዎ መሳሪያ ላይ",
     ["Your language choice, light or dark theme, and a list of the references you have ordered are saved " +
      "in your own browser, so the site remembers you. They never leave your phone.",
      "የቋንቋ ምርጫዎ፣ ገጽታው እና የትዕዛዝ ቁጥሮችዎ በራስዎ አሳሽ ውስጥ ይቀመጣሉ። ከስልክዎ አይወጡም።"]],
    ["Cookies and tracking",
     "ኩኪዎችና ᭡ክት ማድረግ",
     ["There are no advertising cookies and no trackers on this site. We are not currently measuring traffic " +
      "at all — if that changes, it will be a privacy-friendly count, not a profile of you.",
      "በዚህ ገጽ ላይ የማስታወቂያ ኩኪዎች ወይም ᭡ክተሮች የሉም። አሁን ጉብኝቶችን አንለካም።"]]
  ];
  return R;
}

function contactSections() {
  return [
    ["Call or message",
     "ይደውሉ ወይም ይላኩ",
     ["Phone and WhatsApp: " + D.shop.phone + ". This is the fastest way to reach us and the way most orders happen.",
      "ስልክና ዋትስአፕ፦ " + D.shop.phone + "። በጣም ፈጣኑ መንገድ ይህ ነው።"]],
    ["Opening hours",
     "የስራ ሰዓት",
     [D.shop.hours + ". Same-day printing is possible for most products if you order before " + D.shop.cutoffHour + ":00.",
      D.shop.hours + "። ከ" + D.shop.cutoffHour + ":00 በፊት ካዘዙ በዚያው ቀን ማተም ይቻላል።"]],
    ["Where we are",
     "የምንገኝበት",
     ["Bole, Addis Ababa. We are a working studio rather than a shopfront on a main road, so ask us for the exact " +
      "location and we will send it to you on WhatsApp. A map pin is coming once it is confirmed.",
      "ቦሌ፣ አዲስ አበባ። ትክክለኛውን አድራሻ ስልክ ይጠይቁን፣ በዋትስአፕ እንልክልዎታለን።"]],
    ["Send your photos",
     "ፎቶዎችዎን ይላኩ",
     ["Use the upload box on the home page, or send them on WhatsApp as a Document — not as a Photo, because " +
      "WhatsApp shrinks photos and a shrunk photo prints soft.",
      "በዋናው ገጽ ላይ ያለውን መጫኛ ይጠቀሙ፣ ወይም በዋትስአፕ እንደ ሰነድ ይላኩ — እንደ ፎቶ አይደለም።"]]
  ];
}

function aboutSections() {
  return [
    ["What we do",
     "የምናደርገው",
     ["We print photographs: standard prints, gallery-wrapped canvas, photo books, wall calendars, framed prints " +
      "and photo mugs. Most orders are ready the same day if they come in before " + D.shop.cutoffHour + ":00.",
      "ፎቶዎችን እናትማለን፦ መደበኛ ህትመት፣ ካንቫስ፣ የፎቶ መጽሐፍ፣ የግድግዳ የቀን መቁጠሪያ፣ በፍሬም የተዘጋጁ እና ሙግ።"]],
    ["Who we are",
     "እኛ ማን ነን",
     ["A family-run studio in Bole. The person who answers your message is the person who prints your order — " +
      "which is why we care whether the colours came out right.",
      "በቦሌ የሚገኝ የቤተሰብ ስቱዲዮ። መልእክትዎን የሚመልሰው ሰው ትዕዛዙን የሚያትም ሰው ነው።"]],
    ["Two languages, on purpose",
     "ሁለት ቋንቋ፣ በሆን ተብሎ",
     ["This site works in English and Amharic, and the Amharic is not an afterthought bolted on at the end. " +
      "Most printing in Addis happens in Amharic — it should be as good as the English.",
      "ይህ ገጽ በእንግሊዝኛና በአማርኛ ይሰራል። አማርኛው በኋላ ላይ የተጨመረ አይደለም።"]],
    ["If something is wrong",
     "ስህተት ካለ",
     ["If the mistake is ours, we reprint it at no cost — that is already the answer in our FAQ and it is the answer here. " +
      "Bring it back and tell us what happened.",
      "ስህተቱ የእኛ ከሆነ በነፃ እንደግመዋለን። ይዘው ይምጡና ይንገሩን።"]]
  ];
}

/* A section's third element is EITHER one [EN, AM] pair OR a list of them.
   🔴 Getting this wrong does not throw: iterating a single pair treats each
   SENTENCE as a list and reads its first CHARACTER, so `data-en` silently
   becomes "T". The page renders, the tests pass, and the prose is gone. That
   is exactly what shipped for four minutes on 2026-09-23. Hence the length
   assertion below as well as this normaliser. */
function normalizeParas(x) {
  if (!Array.isArray(x) || !x.length) return [];
  return (typeof x[0] === "string") ? [x] : x;
}
function assertProse(html, file) {
  var bad = [];
  var re = /<p data-en="([^"]*)"/g, m;
  while ((m = re.exec(html)) !== null) {
    if (m[1].length < 8) bad.push(m[1]);
  }
  if (bad.length) {
    throw new Error("prose guard: " + file + " has " + bad.length +
      " paragraph(s) whose data-en is a stub (" + JSON.stringify(bad.slice(0, 5)) + ")");
  }
}

function renderStaticPage(cfg, sections, schemas) {
  var url = DOMAIN + "/" + cfg.slug;
  var body = [
    '<!DOCTYPE html>', '<html lang="en" data-lang-default="en">', '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + esc(cfg.title[0]) + ' | Norcha Print</title>',
    '<meta name="description" content="' + attr(cfg.desc) + '">',
    '<meta name="theme-color" content="#F8F4EE" id="metaThemeColor">',
    '<meta name="color-scheme" content="light dark">',
    THEME_SCRIPT,
    '<meta name="mobile-web-app-capable" content="yes">',
    '<link rel="manifest" href="/manifest.webmanifest">',
    '<link rel="apple-touch-icon" href="/img/icons/apple-touch-icon.png">',
    '<link rel="canonical" href="' + url + '">',
    '<link rel="alternate" hreflang="en" href="' + url + '">',
    '<link rel="alternate" hreflang="am" href="' + url + '">',
    '<link rel="alternate" hreflang="x-default" href="' + url + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Norcha Print">',
    '<meta property="og:title" content="' + attr(cfg.title[0] + " — Norcha Print") + '">',
    '<meta property="og:description" content="' + attr(cfg.desc) + '">',
    '<meta property="og:url" content="' + url + '">',
    '<meta property="og:image" content="' + DOMAIN + '/img/og/' + cfg.slug + '.jpg">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:image" content="' + DOMAIN + '/img/og/' + cfg.slug + '.jpg">',
    schemas.map(ldJson).join("\n"),
    '<link rel="icon" href="/img/icons/icon-192.png">',
    '<link rel="stylesheet" href="/css/style.css">',
    '</head>',
    '<body>',
    '<a class="skip" href="#mainContent">Skip to content</a>',
    '<div class="print-only"><h2>' + esc(cfg.title[0] + " — Norcha Print") + '</h2>',
    '<p>' + esc(D.shop.phone) + ' · ' + esc(D.shop.city) + ' · ' + esc(D.shop.hours) + '</p></div>',
    '<div class="progress" id="progress" aria-hidden="true"></div>',
    NAV,
    '<main id="top">',
    '<div class="tibeb-wrap reveal" aria-hidden="true"><i class="tibeb"></i></div>',
    '<section class="section" id="mainContent">',
    '  <div class="wrap">',
    '    <nav class="crumbs" aria-label="Breadcrumb">',
    '      <a href="/" data-en="Home" data-am="መግቢያ">Home</a><span aria-hidden="true">/</span>',
    '      <span data-en="' + attr(cfg.title[0]) + '" data-am="' + attr(cfg.title[1]) + '">' + esc(cfg.title[0]) + '</span></nav>',
    '    <p class="am-eye">' + esc(cfg.title[1]) + '</p>',
    '    <h1 class="section-h reveal reveal-blur" data-en="' + attr(cfg.title[0]) + '" data-am="' + attr(cfg.title[1]) + '">' + esc(cfg.title[0]) + '</h1>',
    '    <p class="lead reveal" data-en="' + attr(cfg.lead[0]) + '" data-am="' + attr(cfg.lead[1]) + '">' + esc(cfg.lead[0]) + '</p>',
    '    <div class="prose">',
    sections.map(function (sec, i) {
      return '      <div class="prose-block reveal' + (i ? " d" + Math.min(i, 3) : "") + '">\n' +
        '        <h2 data-en="' + attr(sec[0]) + '" data-am="' + attr(sec[1]) + '">' + esc(sec[0]) + '</h2>\n' +
        normalizeParas(sec[2]).map(function (pr) {
          return '        <p data-en="' + attr(pr[0]) + '" data-am="' + attr(pr[1]) + '">' + esc(pr[0]) + '</p>';
        }).join("\n") + '\n      </div>';
    }).join("\n"),
    '    </div>',
    '    <div class="prod-cta reveal" style="margin-top:32px">',
    '      <a class="btn btn-primary" href="https://wa.me/' + D.shop.wa + '" target="_blank" rel="noopener" data-en="Message us on WhatsApp" data-am="በዋትስአፕ ያግኙን">Message us on WhatsApp</a>',
    '      <a class="btn btn-outline" href="tel:+' + D.shop.wa + '" data-en="Call the studio" data-am="ይደውሉ">Call the studio</a>',
    '    </div>',
    '  </div>',
    '</section>',
    relatedBlock({ file: cfg.file }),
    '</main>',
    FOOTER,
    '<script src="/js/norcha-data.js"></script>',
    '<script src="/js/main.js"></script>',
    TO_TOP,
    '</body>', '</html>', ''
  ].join("\n");
  return body;
}

function trustPages() {
  var conf = [
    [TRUST_STRINGS.privacy, privacySections()],
    [TRUST_STRINGS.contact, contactSections()],
    [TRUST_STRINGS.about, aboutSections()]
  ];
  return conf.map(function (pair) {
    var cfg = pair[0];
    var crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": DOMAIN + "/" },
      { "@type": "ListItem", "position": 2, "name": cfg.title[0], "item": DOMAIN + "/" + cfg.slug } ] };
    var local = { "@context": "https://schema.org", "@type": "LocalBusiness", "name": "Norcha Print",
      "url": DOMAIN + "/", "telephone": "+358442715477", "priceRange": "ETB 25 - ETB 4,600",
      "currenciesAccepted": "ETB", "paymentAccepted": "Cash, Telebirr, Bank transfer",
      "address": { "@type": "PostalAddress", "addressLocality": "Bole, Addis Ababa", "addressCountry": "ET" } };
    return { cfg: cfg, html: renderStaticPage(cfg, pair[1], [crumbs, local]) };
  });
}

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

/* ── per-product FAQ (ifolor answers these per family; we had one shared set) ──
   Every answer here is one of two things, and nothing else:
     (a) arithmetic on js/norcha-data.js — sizes, prices, lead times; or
     (b) copy already approved on the site.
   A product page is exactly where someone invents a claim about a machine the
   shop does not own, so the rule for this function is: if it cannot be derived
   or quoted, it does not go in.

   New Amharic in here is on the [FEVEN] proofread list. The size lists and
   prices are numbers and units, so they are language-neutral by construction. */
function pickPixels(label) {
  /* "80 × 120 cm" → the pixels a 300 dpi print of that size needs. Pure
     arithmetic, so it cannot be wrong about a photo we have not seen. */
  var m = String(label).match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  var px = function (cm) { return Math.round(cm / 2.54 * 300 / 50) * 50; };
  return { w: px(parseFloat(m[1])), h: px(parseFloat(m[2])) };
}
function productFaqs(p) {
  var fam = D.products[p.family];
  var sizes = fam.sizes.map(function (x) { return x.label; }).join(" · ");
  var prices = fam.sizes.map(function (x) { return x.price; });
  var low = Math.min.apply(null, prices), high = Math.max.apply(null, prices);
  var big = fam.sizes[fam.sizes.length - 1];
  var px = pickPixels(big.label);
  var lead = fam.lead === 0
    ? ["the same day, if you order before " + D.shop.cutoffHour + ":00",
       "በዚያው ቀን፣ ከ" + D.shop.cutoffHour + ":00 በፊት ካዘዙ"]
    : ["in " + fam.lead + "–" + (fam.lead + 1) + " working days",
       "በ" + fam.lead + "–" + (fam.lead + 1) + " የስራ ቀን"];
  var tiers = (D.tiers[fam.tier] || []).filter(function (t) { return t.min > 1; });

  var list = [
    { id: "sizes-" + p.slug,
      q: ["Which sizes do " + p.name[0].toLowerCase() + " come in?", "የሚገኙት መጠኖች ምን ናቸው?"],
      a: [sizes + ".", sizes + "።"] },
    { id: "price-" + p.slug,
      q: ["How much does it cost?", "ዋጋው ስንት ነው?"],
      a: ["From " + D.money(low) + " to " + D.money(high) + ", depending on size." +
          (tiers.length ? " More than one gets a discount: " +
            tiers.map(function (t) { return t.min + "+ items, " + t.pct + "% off"; }).join("; ") + "." : "") +
          " Prices depend on paper and finish — we confirm the exact price when you order.",
          "ከ" + moneyAm(low) + " እስከ " + moneyAm(high) + "፣ እንደ መጠኑ። ዋጋው እንደ ወረቀቱና አጨራረሱ ይለያያል፤ ሲያዙ እናረጋግጣለን።"] },
    { id: "turnaround-" + p.slug,
      q: ["How long does it take?", "ምን ያህል ጊዜ ይወስዳል?"],
      a: [p.name[0] + " are ready " + lead[0] + ".", p.name[1] + " " + lead[1] + " ዝግጁ ይሆናሉ።"] }
  ];
  if (px) {
    list.push({ id: "resolution-" + p.slug,
      q: ["What size photo file do I need for the largest one?", "ለትልቁ መጠን ምን ያህል ፋይል ያስፈልጋል?"],
      a: ["For " + big.label + " at 300 dpi you would need about " + px.w.toLocaleString("en-US") +
          " × " + px.h.toLocaleString("en-US") + " pixels, which no phone camera makes — that is normal for large prints. " +
          "Send the biggest original you have, as a Document rather than a Photo, and we will tell you honestly " +
          "how it will look at that size before we print it.",
          "ለ" + big.label + " በ300 dpi ወደ " + px.w.toLocaleString("en-US") + " × " + px.h.toLocaleString("en-US") +
          " ፒክሰል ያስፈልጋል። የሚገኘውን ትልቁን ዋና ፋይል እንደ ሰነድ ይላኩ፤ ከማተም በፊት እንዴት እንደሚመስል በእውነት እንነግርዎታለን።"] });
  }
  /* then the approved site answers, so the product page still carries the
     things every customer needs: files, payment, delivery/handling */
  p.faq.filter(function (k) { return k !== "how-fast-can-i-get-my-prints"; }).slice(0, 3).forEach(function (k) {
    var f = FAQ_POOL[k];
    list.push({ id: f.id, q: f.q, a: f.a });
  });
  return list;
}

function faqBlock(p) {
  var items = productFaqs(p).map(function (f) {
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
    '    <h2 class="section-h reveal reveal-blur" data-en="' + attr(p.name[0] + " — questions") + '" data-am="ጥያቄዎች">' + esc(p.name[0] + " — questions") + '</h2>',
    '    <div class="faq-list reveal d1">',
    items,
    '    </div>',
    '  </div>',
    '</section>'
  ].join("\n");
}

function relatedBlock(p) {
  var others = PAGES.filter(function (x) { return x.file !== p.file; });
  if (others.length < 5) others = PAGES;   /* called from the price list */
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
    "mainEntity": productFaqs(p).map(function (f) {
      return { "@type": "Question", "name": f.q[0],
               "acceptedAnswer": { "@type": "Answer", "text": f.a[0] } };
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
    '<meta property="og:image" content="' + DOMAIN + '/img/og/' + p.slug + '.jpg">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="' + attr(p.name[0] + " at Norcha Print, Bole, Addis Ababa") + '">',
    '<meta property="og:locale" content="en_ET">',
    '<meta property="og:locale:alternate" content="am_ET">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + attr(p.name[0] + " — Norcha Print") + '">',
    '<meta name="twitter:description" content="' + attr(desc) + '">',
    '<meta name="twitter:image" content="' + DOMAIN + '/img/og/' + p.slug + '.jpg">',
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

/* ── 6b. write the price list ───────────────────────────────────────── */
var pricesOut = renderPrices();
var nPrices = (pricesOut.match(/data-temp-price=/g) || []).length;
var expectPrices = FAMILY_ORDER.reduce(function (n, f) { return n + D.products[f].sizes.length; }, 0);
if (nPrices !== expectPrices) {
  console.error("FATAL: prices.html wrote " + nPrices + " price cells, expected " + expectPrices);
  process.exit(1);
}
if (CHECK) { written.push("prices.html (checked, " + nPrices + " prices)"); }
else { fs.writeFileSync(path.join(ROOT, "prices.html"), pricesOut, "utf8");
       written.push("prices.html (" + nPrices + " prices, " + pricesOut.length + " bytes)"); }

/* ── 6c. write the trust set ─────────────────────────────────────────── */
var TRUST_PAGES_OUT = trustPages();
TRUST_PAGES_OUT.forEach(function (t) {
  assertProse(t.html, t.cfg.file);
  if (CHECK) { written.push(t.cfg.file + " (checked)"); return; }
  fs.writeFileSync(path.join(ROOT, t.cfg.file), t.html, "utf8");
  written.push(t.cfg.file + " (" + t.html.length + " bytes)");
});

/* ── 7. sitemap ──────────────────────────────────────────────────────── */
if (!CHECK) {
  var urls = ['<url>\n    <loc>' + DOMAIN + '/</loc>\n    <lastmod>2026-09-23</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n' +
    '    <xhtml:link rel="alternate" hreflang="en" href="' + DOMAIN + '/"/>\n' +
    '    <xhtml:link rel="alternate" hreflang="am" href="' + DOMAIN + '/"/>\n' +
    '    <xhtml:link rel="alternate" hreflang="x-default" href="' + DOMAIN + '/"/>\n  </url>'];
  [["prices", "0.9", "monthly"], ["contact", "0.6", "yearly"], ["about", "0.5", "yearly"], ["privacy", "0.3", "yearly"]]
    .concat(PAGES.map(function (p) { return [p.slug, "0.8", "monthly"]; })).forEach(function (row) {
    var u = DOMAIN + "/" + row[0];
    urls.push('<url>\n    <loc>' + u + '</loc>\n    <lastmod>2026-09-23</lastmod>\n    <changefreq>' + row[2] + '</changefreq>\n    <priority>' + row[1] + '</priority>\n' +
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
  written.push("sitemap.xml (" + (PAGES.length + 5) + " urls)");
}

console.log((CHECK ? "CHECK " : "BUILT ") + PAGES.length + " product pages:");
written.forEach(function (w) { console.log("  ✓ " + w); });
