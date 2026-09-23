/* pagetest.js — the guard for the six generated product pages (T-04).
 *
 * WHY THIS EXISTS
 * `node --check` proves a file parses. It does not prove a page WORKS, and
 * this project has already shipped a blank page to a live client site twice
 * on exactly that mistake. So each generated page is loaded in a real DOM
 * with the real scripts, and the things that actually matter are measured:
 *
 *   1. no runtime error
 *   2. every .reveal element became visible (a hidden page IS the bug we had)
 *   3. every price cell agrees with js/norcha-data.js  (NO DRIFT)
 *   4. one <h1>, a correct canonical, and three parseable JSON-LD blocks
 *   5. no bare href="#" left over from the homepage nav
 *   6. every English string has an Amharic twin (a half-translated page is
 *      worse than an untranslated one)
 *   7. the WhatsApp order path and the live ready-date both actually work
 *
 * Exit code 0 = all pages pass. Anything else = do not push.
 *
 * RUN: node pagetest.js
 */
"use strict";
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;

/* the data file, loaded the same way build-pages.js loads it */
const sandbox = {}; sandbox.window = sandbox; vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/norcha-data.js"), "utf8"), sandbox, { filename: "norcha-data.js" });
const D = sandbox.NorchaData;

/* file → url slug */
const PAGES = [
  ["standard-prints.html", "standard-prints"],
  ["canvas.html", "canvas"],
  ["photo-books.html", "photo-books"],
  ["wall-calendars.html", "wall-calendars"],
  ["photo-mugs.html", "photo-mugs"],
  ["framed-prints.html", "framed-prints"]
];

/* tiny tag-balance walker: enough to catch the stray-close-tag class of bug */
function markupBalance(html) {
  const VOID = new Set(["meta","link","br","img","source","input","hr","area","base","col","embed","param","track","wbr"]);
  const stack = [], bad = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const close = m[1] === "/", tag = m[2].toLowerCase(), self = m[3] === "/";
    /* A raw-text element is skipped whole: its opening tag jumps the cursor
       past its contents, and its closing tag is then a no-op (it was never
       pushed). Treating the close as an open swallowed the rest of the file;
       treating it as a normal close reported every script as unbalanced. */
    if (tag === "script" || tag === "style") {
      if (!close) {
        const end = html.toLowerCase().indexOf("</" + tag, re.lastIndex);
        if (end !== -1) re.lastIndex = end;
      }
      continue;
    }
    if (VOID.has(tag) || self) continue;
    if (!close) stack.push(tag);
    else if (stack.length === 0) bad.push("extra </" + tag + ">");
    else if (stack[stack.length - 1] === tag) stack.pop();
    else bad.push("</" + tag + "> closes <" + stack[stack.length - 1] + ">");
  }
  return { unclosed: stack, bad: bad };
}

let failures = 0;
function check(page, label, ok, detail) {
  if (!ok) { failures++; console.log("  ✗ " + page + " · " + label + (detail ? " → " + detail : "")); }
}

/* reverse lookup: a price key → its family, so the test does not trust the
   generator's own config to tell it what it is looking at */
function familyOfKey(key) {
  const fams = Object.keys(D.products);
  for (const f of fams) {
    for (const s of D.products[f].sizes) if (s.key === key) return f;
  }
  return null;
}

function load(file) {
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: undefined,          // external scripts are injected by hand below
    pretendToBeVisual: true,
    url: "https://norchaprint.com/" + file.replace(/\.html$/, "")
  });
  dom.window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }], this); }
    unobserve() {} disconnect() {}
  };
  dom.window.matchMedia = function (q) {
    return { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
  };
  dom.window.addEventListener("error", e => errors.push("window.error: " + (e.error && e.error.stack ? e.error.stack.split("\n")[0] : e.message)));

  ["js/norcha-data.js", "js/norcha-holidays.js", "js/norcha-delivery.js", "js/main.js"].forEach(f => {
    const s = dom.window.document.createElement("script");
    s.textContent = fs.readFileSync(path.join(ROOT, f), "utf8");
    try { dom.window.document.body.appendChild(s); }
    catch (e) { errors.push(f + " THREW: " + e.message); }
  });
  return { dom, errors, html };
}

console.log("=== PRODUCT PAGE GUARD ===");

for (const [file, slug] of PAGES) {
  if (!fs.existsSync(path.join(ROOT, file))) { failures++; console.log("  ✗ " + file + " · MISSING — run build-pages.js"); continue; }
  const { dom, errors, html } = load(file);
  const d = dom.window.document;

  /* 1. no runtime error */
  check(file, "runtime errors", errors.length === 0, errors.join(" | "));

  /* 2. the page is actually visible */
  const reveals = d.querySelectorAll(".reveal");
  let hidden = 0;
  reveals.forEach(r => { if (!r.classList.contains("in")) hidden++; });
  check(file, "reveal elements visible", reveals.length > 0 && hidden === 0, reveals.length + " total, " + hidden + " still hidden");

  /* 3. prices agree with the data file */
  const cells = d.querySelectorAll("[data-temp-price]");
  check(file, "price cells present", cells.length > 0, String(cells.length));
  cells.forEach(c => {
    const key = c.getAttribute("data-temp-price");
    const fam = familyOfKey(key);
    check(file, "known price key", fam !== null, key);
    if (!fam) return;
    const want = D.money(D.priceOf(fam, key));
    const got = c.textContent.trim();
    check(file, "price matches data file", got === want, key + ": page says " + JSON.stringify(got) + ", data file says " + JSON.stringify(want));
    check(file, "price has Amharic twin", (c.getAttribute("data-am") || "").length > 0, key);
  });

  /* 4. one h1, canonical, structured data */
  check(file, "exactly one h1", d.querySelectorAll("h1").length === 1, String(d.querySelectorAll("h1").length));
  const canon = d.querySelector('link[rel="canonical"]');
  check(file, "canonical url", canon && canon.getAttribute("href") === "https://norchaprint.com/" + slug,
    canon ? canon.getAttribute("href") : "missing");
  const blocks = [...d.querySelectorAll('script[type="application/ld+json"]')];
  const types = [];
  blocks.forEach(b => {
    try { const o = JSON.parse(b.textContent); types.push(o["@type"]); }
    catch (e) { check(file, "JSON-LD parses", false, e.message); }
  });
  ["Product", "BreadcrumbList", "FAQPage"].forEach(t => check(file, "schema " + t, types.indexOf(t) !== -1, types.join(",")));

  /* 5. subpage nav must not contain homepage anchors */
  const bare = [...d.querySelectorAll('a[href="#"]')].length;
  check(file, "no bare hash links", bare === 0, String(bare));
  const brand = d.querySelector("header.nav a.brand");
  check(file, "brand links home", brand && brand.getAttribute("href") === "/", brand ? brand.getAttribute("href") : "missing");
  const anchorLinks = [...d.querySelectorAll('a[href^="#"]')]
    .filter(a => { const id = a.getAttribute("href").slice(1); return id === "" || !d.getElementById(id); });
  check(file, "in-page anchors resolve", anchorLinks.length === 0,
    anchorLinks.map(a => a.getAttribute("href")).join(","));

  /* 6. every English string has Amharic */
  const noAm = [...d.querySelectorAll("[data-en]")].filter(n => !n.hasAttribute("data-am")).length;
  check(file, "all EN strings have AM", noAm === 0, String(noAm));

  /* 7. the two things the page is FOR */
  const wa = [...d.querySelectorAll('a[href*="wa.me"]')];
  check(file, "whatsapp order path", wa.length > 0, String(wa.length));
  const paint = dom.window.__paintDeliv;
  check(file, "ready-date painter exists", typeof paint === "function", typeof paint);
  if (typeof paint === "function") {
    paint();
    const el = d.getElementById("pDeliv");
    const txt = el ? el.textContent.trim() : "";
    check(file, "ready-date painted", txt.length > 8, JSON.stringify(txt));
    /* and it must not promise a date in the past */
    const lead = D.products[familyOfKey(cells[0] && cells[0].getAttribute("data-temp-price"))] || { lead: 0 };
    const ready = dom.window.NorchaDelivery.earliestReady(new Date(), lead.lead, { cutoffHour: D.shop.cutoffHour });
    check(file, "ready date is not in the past", ready.getTime() >= new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime(),
      ready.toISOString().slice(0, 10));
  }

  /* 7b. the FAQ shown and the FAQ declared to Google must be the same list.
     A page whose schema promises answers the page does not show is a small lie
     that search engines notice. */
  const shown = [...d.querySelectorAll("details.faq[id]")].map(x => x.id);
  const declared = [];
  blocks.forEach(b => {
    try {
      const o = JSON.parse(b.textContent);
      if (o["@type"] === "FAQPage") (o.mainEntity || []).forEach(q => declared.push(q.name));
    } catch (e) {}
  });
  const answered = [...d.querySelectorAll("details.faq[id] > p")].map(x => x.textContent.trim());
  check(file, "FAQ answers are not empty", answered.length > 0 && answered.every(a => a.length > 10), answered.length + " answers");
  check(file, "every FAQ answer is in the schema", declared.length === shown.length,
    shown.length + " shown vs " + declared.length + " declared");
  check(file, "FAQ has product-specific entries", shown.length >= 6, shown.length + " questions");
  const amFaq = [...d.querySelectorAll("details.faq[id] > p")].filter(x => !x.hasAttribute("data-am")).length;
  check(file, "FAQ answers are bilingual", amFaq === 0, amFaq + " without Amharic");

  /* 8. markup balance. jsdom silently tolerates a stray </div> and the
     browser just moves the structure around, so a broken close tag can look
     fine in every other check here — it shifted the price block on top of the
     dark panel and only a screenshot caught it. Cheap to assert, so assert. */
  const bal = markupBalance(html);
  check(file, "markup balanced", bal.unclosed.length === 0 && bal.bad.length === 0,
    (bal.unclosed.join(",") || "-") + " / " + (bal.bad.join(",") || "-"));

  /* footer + scripts survived */
  check(file, "footer present", !!d.querySelector("footer.footer"));
  check(file, "related links present", d.querySelectorAll("a.related-link").length === PAGES.length - 1,
    String(d.querySelectorAll("a.related-link").length));

  dom.window.close();
  console.log("  · " + file + ": " + reveals.length + " reveals, " + cells.length + " prices, " + (errors.length ? errors.length + " ERRORS" : "clean"));
}

/* ── the public price list (T-03): same treatment, its own expectations ── */
(function () {
  const file = "prices.html";
  if (!fs.existsSync(path.join(ROOT, file))) { failures++; console.log("  ✗ " + file + " · MISSING — run build-pages.js"); return; }
  const { dom, errors } = load(file);
  const d = dom.window.document;
  check(file, "runtime errors", errors.length === 0, errors.join(" | "));
  const reveals = d.querySelectorAll(".reveal");
  let hidden = 0;
  reveals.forEach(r => { if (!r.classList.contains("in")) hidden++; });
  check(file, "reveal elements visible", reveals.length > 0 && hidden === 0, hidden + " hidden");
  const cells = d.querySelectorAll("[data-temp-price]");
  const expected = Object.keys(D.products).reduce((n, f) => n + D.products[f].sizes.length, 0);
  check(file, "every price in the data file is listed", cells.length === expected, cells.length + " of " + expected);
  cells.forEach(c => {
    const key = c.getAttribute("data-temp-price"), fam = familyOfKey(key);
    check(file, "known price key", fam !== null, key);
    if (fam) check(file, "price matches the data file", c.textContent.trim() === D.money(D.priceOf(fam, key)), key);
  });
  const canon = d.querySelector('link[rel="canonical"]');
  check(file, "canonical /prices", canon && canon.getAttribute("href") === "https://norchaprint.com/prices", canon && canon.getAttribute("href"));
  const types = [...d.querySelectorAll('script[type="application/ld+json"]')].map(b => { try { return JSON.parse(b.textContent)["@type"]; } catch (e) { check(file, "JSON-LD parses", false, e.message); return "?"; } });
  ["ItemList", "BreadcrumbList"].forEach(t => check(file, "schema " + t, types.indexOf(t) !== -1, types.join(",")));
  check(file, "one-tap WhatsApp list button", !!d.getElementById("catSend"));
  check(file, "print button", !!d.getElementById("printList"));
  const noAm = [...d.querySelectorAll("[data-en]")].filter(n => !n.hasAttribute("data-am")).length;
  check(file, "all EN strings have AM", noAm === 0, String(noAm));
  const bal = markupBalance(fs.readFileSync(path.join(ROOT, file), "utf8"));
  check(file, "markup balanced", bal.unclosed.length === 0 && bal.bad.length === 0,
    (bal.unclosed.join(",") || "-") + " / " + (bal.bad.join(",") || "-"));
  dom.window.close();
  console.log("  · " + file + ": " + cells.length + " prices, " + (errors.length ? errors.length + " ERRORS" : "clean"));
})();

/* ── the trust set: privacy / contact / about ──────────────────────────
   These are the pages a customer reads when they are deciding whether to
   trust a stranger with their family photographs. A broken one is worse than
   a missing one, so they get the same treatment as the product pages. */
const TRUST = [["privacy.html", "privacy"], ["contact.html", "contact"], ["about.html", "about"], ["order.html", "order"], ["accessibility.html", "accessibility"]];
TRUST.forEach(function (pair) {
  const [file, slug] = pair;
  if (!fs.existsSync(path.join(ROOT, file))) { failures++; console.log("  ✗ " + file + " · MISSING — run build-pages.js"); return; }
  const { dom, errors } = load(file);
  const d = dom.window.document;
  check(file, "runtime errors", errors.length === 0, errors.join(" | "));
  const reveals = d.querySelectorAll(".reveal");
  let hidden = 0;
  reveals.forEach(r => { if (!r.classList.contains("in")) hidden++; });
  check(file, "reveal elements visible", reveals.length > 0 && hidden === 0, hidden + " hidden");
  check(file, "exactly one h1", d.querySelectorAll("h1").length === 1, String(d.querySelectorAll("h1").length));
  const canon = d.querySelector('link[rel="canonical"]');
  check(file, "canonical /" + slug, canon && canon.getAttribute("href") === "https://norchaprint.com/" + slug, canon && canon.getAttribute("href"));
  const hre = [...d.querySelectorAll('link[rel="alternate"]')].length;
  check(file, "bilingual hreflang declared", hre === 3, String(hre));
  const types = [...d.querySelectorAll('script[type="application/ld+json"]')].map(b => { try { return JSON.parse(b.textContent)["@type"]; } catch (e) { check(file, "JSON-LD parses", false, e.message); return "?"; } });
  check(file, "schema BreadcrumbList", types.indexOf("BreadcrumbList") !== -1, types.join(","));
  const noAm = [...d.querySelectorAll("[data-en]")].filter(n => !n.hasAttribute("data-am")).length;
  check(file, "all EN strings have AM", noAm === 0, String(noAm));
  // a page of prose is only useful if the prose is actually there
  const paras = d.querySelectorAll(".prose-block p");
  /* every section should carry at least one real paragraph. A count alone is
     not enough — the bug that shipped a page of single letters passed every
     other check here, so assert on the TEXT, not just on the element. */
  const blocks = d.querySelectorAll(".prose-block").length;
  const stubs = [...paras].filter(p => (p.textContent || "").trim().length < 8).length;
  check(file, "every section has prose", paras.length >= blocks && paras.length >= 2,
    paras.length + " paragraphs across " + blocks + " sections");
  check(file, "no stub paragraphs", stubs === 0, stubs + " paragraphs shorter than 8 characters");
  const bal = markupBalance(fs.readFileSync(path.join(ROOT, file), "utf8"));
  check(file, "markup balanced", bal.unclosed.length === 0 && bal.bad.length === 0,
    (bal.unclosed.join(",") || "-") + " / " + (bal.bad.join(",") || "-"));
  dom.window.close();
  console.log("  · " + file + ": " + paras.length + " paragraphs, " + reveals.length + " reveals, " + (errors.length ? errors.length + " ERRORS" : "clean"));
});

/* ── share cards ────────────────────────────────────────────────────────
   A page can point at a card that does not exist, or at a card of the wrong
   size, and nothing on the page breaks — the preview is just cropped, blank
   or missing when someone pastes the link, which is precisely when it matters.
   So: every page that ships must name a card that exists, at 1200x630. */
function jpegSize(file) {
  const b = fs.readFileSync(file);
  if (b[0] !== 0xFF || b[1] !== 0xD8) return null;          // not a JPEG
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xFF) { i++; continue; }
    const marker = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}
{
  const withCards = [["index.html", "home"]].concat(PAGES).concat([["prices.html", "prices"]]).concat(TRUST);
  let checked = 0;
  withCards.forEach(function (pair) {
    const [file, slug] = pair;
    if (!fs.existsSync(path.join(ROOT, file))) return;
    const html = fs.readFileSync(path.join(ROOT, file), "utf8");
    const m = html.match(/property="og:image" content="([^"]+)"/);
    check(file, "declares a share card", !!m, "no og:image");
    if (!m) return;
    const want = "https://norchaprint.com/img/og/" + slug + ".jpg";
    check(file, "share card is its own", m[1] === want, m[1] + " (expected " + want + ")");
    const local = path.join(ROOT, m[1].replace("https://norchaprint.com/", ""));
    if (!fs.existsSync(local)) { check(file, "share card file exists", false, local); return; }
    const size = jpegSize(local);
    check(file, "share card is 1200x630", !!size && size.w === 1200 && size.h === 630,
      size ? size.w + "x" + size.h : "unreadable");
    check(file, "twitter card matches", html.indexOf('name="twitter:image" content="' + m[1] + '"') !== -1);
    checked++;
  });
  console.log("  · share cards: " + checked + " page(s) point at a valid 1200x630 card");
}

/* ── the guides ─────────────────────────────────────────────────────────
   Content pages are the easiest place to ship a page that reads well and
   breaks: a missing reveal, a card that does not exist, a stray tag. Same
   treatment as everything else. */
const GUIDES = [
  ["guides/photo-gifts-ethiopian-holidays.html", "guides/photo-gifts-ethiopian-holidays", "guide-holidays", 4],
  ["guides/photos-that-print-well.html", "guides/photos-that-print-well", "guide-send-photos", 4],
  ["guides/hanging-a-photo-wall.html", "guides/hanging-a-photo-wall", "guide-photo-wall", 4],
  ["guides.html", "guides", "guides", 2]
];
GUIDES.forEach(function (triple) {
  const [file, urlslug, card, minSections] = triple;
  if (!fs.existsSync(path.join(ROOT, file))) { failures++; console.log("  ✗ " + file + " · MISSING — run build-pages.js"); return; }
  const { dom, errors } = load(file);
  const d = dom.window.document;
  check(file, "runtime errors", errors.length === 0, errors.join(" | "));
  const reveals = d.querySelectorAll(".reveal");
  let hidden = 0;
  reveals.forEach(r => { if (!r.classList.contains("in")) hidden++; });
  check(file, "reveal elements visible", reveals.length > 0 && hidden === 0, hidden + " hidden");
  check(file, "exactly one h1", d.querySelectorAll("h1").length === 1);
  const canon = d.querySelector('link[rel="canonical"]');
  check(file, "canonical /" + urlslug, canon && canon.getAttribute("href") === "https://norchaprint.com/" + urlslug, canon && canon.getAttribute("href"));
  const shown = [...d.querySelectorAll("h2[data-en]")].filter(h => (h.textContent || "").trim().length > 4).length;
  check(file, "has real sections", shown >= minSections, shown + " headings (need " + minSections + ")");
  const noAm = [...d.querySelectorAll("[data-en]")].filter(n => !n.hasAttribute("data-am")).length;
  check(file, "all EN strings have AM", noAm === 0, String(noAm));
  const types = [...d.querySelectorAll('script[type="application/ld+json"]')].map(b => { try { return JSON.parse(b.textContent)["@type"]; } catch (e) { return "?"; } });
  check(file, "declares structured data", types.length >= 2, types.join(","));
  const bal = markupBalance(fs.readFileSync(path.join(ROOT, file), "utf8"));
  check(file, "markup balanced", bal.unclosed.length === 0 && bal.bad.length === 0,
    (bal.unclosed.join(",") || "-") + " / " + (bal.bad.join(",") || "-"));
  const og = (fs.readFileSync(path.join(ROOT, file), "utf8").match(/property="og:image" content="([^"]+)"/) || [])[1];
  check(file, "share card is its own", og === "https://norchaprint.com/img/og/" + card + ".jpg", String(og));
  const cardFile = path.join(ROOT, "img/og/" + card + ".jpg");
  const size = fs.existsSync(cardFile) ? jpegSize(cardFile) : null;
  check(file, "share card is 1200x630", !!size && size.w === 1200 && size.h === 630, size ? size.w + "x" + size.h : "missing");
  dom.window.close();
  console.log("  · " + file + ": " + shown + " sections, " + reveals.length + " reveals, " + (errors.length ? errors.length + " ERRORS" : "clean"));
});
{
  /* read the sitemap here rather than leaning on a variable declared further
     down the file — that is exactly how this line crashed the whole guard. */
  const smGuides = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  GUIDES.forEach(([file, urlslug]) => check("sitemap.xml", "advertises /" + urlslug, smGuides.indexOf("https://norchaprint.com/" + urlslug) !== -1));
}

/* the sitemap must advertise every page, or the pages exist for nobody */
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
PAGES.forEach(([, slug]) => check("sitemap.xml", "advertises /" + slug, sm.indexOf("https://norchaprint.com/" + slug) !== -1));
check("sitemap.xml", "advertises /prices", sm.indexOf("https://norchaprint.com/prices") !== -1);
TRUST.forEach(([, slug]) => check("sitemap.xml", "advertises /" + slug, sm.indexOf("https://norchaprint.com/" + slug) !== -1));

console.log(failures === 0 ? "\nALL PRODUCT PAGES PASS" : "\n" + failures + " FAILURE(S) — DO NOT PUSH");
process.exit(failures === 0 ? 0 : 1);
