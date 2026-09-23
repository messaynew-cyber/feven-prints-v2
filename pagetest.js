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

  /* footer + scripts survived */
  check(file, "footer present", !!d.querySelector("footer.footer"));
  check(file, "related links present", d.querySelectorAll("a.related-link").length === PAGES.length - 1,
    String(d.querySelectorAll("a.related-link").length));

  dom.window.close();
  console.log("  · " + file + ": " + reveals.length + " reveals, " + cells.length + " prices, " + (errors.length ? errors.length + " ERRORS" : "clean"));
}

/* the sitemap must advertise every page, or the pages exist for nobody */
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
PAGES.forEach(([, slug]) => check("sitemap.xml", "advertises /" + slug, sm.indexOf("https://norchaprint.com/" + slug) !== -1));

console.log(failures === 0 ? "\nALL PRODUCT PAGES PASS" : "\n" + failures + " FAILURE(S) — DO NOT PUSH");
process.exit(failures === 0 ? 0 : 1);
