#!/usr/bin/env node
/* build-og-cards.js — the social preview card for every page (1200x630).
 *
 * WHY THIS EXISTS
 * WhatsApp and Telegram are this shop's sales channel. A link pasted into a
 * chat with no card — or with the same generic card every time — is a link
 * nobody opens. Every page now gets its own: the product, its name in both
 * languages, the price it starts at, and the wordmark.
 *
 * WHY HTML AND NOT AN IMAGE MODEL
 * A card is ~90% typography. Diffusion models cannot set type; they produce
 * confident gibberish, which on a link preview is worse than no card at all.
 * So the card is real HTML using the site's own fonts and colour tokens, and
 * Chromium rasterises it. What it says cannot drift from what the site says,
 * because the text comes from js/norcha-data.js.
 *
 * HOW IT RUNS
 *   node build-og-cards.js        → writes .ogtmp/<slug>.html (11 files)
 *   bash build-og-cards.sh        → ships them to the VPS, rasterises, pulls
 *                                   the JPGs back into img/og/, cleans up
 *
 * The heavy work (Chromium) happens on the VPS, deliberately: this phone is
 * the vessel and it does not need to render eleven 1200x630 canvases.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const OUT = path.join(ROOT, ".ogtmp");
const SITE = "https://norchaprint.com";

const sandbox = {}; sandbox.window = sandbox; vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/norcha-data.js"), "utf8"), sandbox, { filename: "norcha-data.js" });
const D = sandbox.NorchaData;

/* ── the cards ─────────────────────────────────────────────────────────── */
const CARDS = [
  {
    slug: "home", img: "canvas",
    title: ["Photo printing in Bole", "የፎቶ ህትመት በቦሌ"],
    sub: "Prints, canvas, photo books, calendars, mugs — same day.",
    chip: "from " + D.money(D.products.prints.sizes[0].price),
    url: "norchaprint.com"
  },
  { slug: "standard-prints", img: "flatlay", family: "prints",
    title: ["Standard prints", "መደበኛ ህትመት"],
    sub: "Passport photos to large posters · lustre and matte." },
  { slug: "canvas", img: "canvas", family: "canvas",
    title: ["Canvas prints", "የካንቫስ ህትመት"],
    sub: "Gallery-wrapped canvas · up to 120 cm." },
  { slug: "photo-books", img: "photobook", family: "books",
    title: ["Photo books", "የፎቶ መጽሐፍ"],
    sub: "Hardcover and softcover, 20 to 80 pages." },
  { slug: "wall-calendars", img: "calendar", family: "calendars",
    title: ["Wall calendars", "የግድግዳ የቀን መቁጠሪያ"],
    sub: "Your photos, all twelve months." },
  { slug: "photo-mugs", img: "mug", family: "mugs",
    title: ["Photo mugs", "የፎቶ ሙግ"],
    sub: "A daily reminder, dishwasher safe." },
  { slug: "framed-prints", img: "frames", family: "frames",
    title: ["Framed prints", "የተከፈፈ ህትመት"],
    sub: "Ready to hang · classic and modern frames." },
  {
    slug: "prices", img: null,
    title: ["Price list", "የዋጋ ዝርዝር"],
    sub: "Every size, every price, with the bulk discount. All in birr.",
    chip: Object.keys(D.products).length + " product families",
    url: "norchaprint.com/prices"
  },
  {
    slug: "contact", img: null,
    title: ["Contact", "አግኙን"],
    sub: "Call or message the studio in Bole — and send your photos.",
    chip: D.shop.phone,
    url: "norchaprint.com/contact"
  },
  {
    slug: "about", img: null,
    title: ["A family print studio", "የቤተሰብ ህትመት ስቱዲዮ"],
    sub: "The person who answers your message prints your order.",
    url: "norchaprint.com/about"
  },
  {
    slug: "order", img: null,
    title: ["Did my photos arrive?", "ፎቶዎቼ ደርሰዋል?"],
    sub: "Look up your order with the reference and your phone number.",
    chip: "Reference + phone",
    url: "norchaprint.com/order"
  },
  {
    slug: "accessibility", img: null,
    title: ["Accessibility", "ተደራሽነት"],
    sub: "What works, what we measured, and how to tell us when it fails.",
    url: "norchaprint.com/accessibility"
  },
  {
    slug: "privacy", img: null,
    title: ["Your photos, handled properly", "ፎቶዎችዎ በአግባቡ"],
    sub: "Private bucket, deleted after 30 days, never sold.",
    url: "norchaprint.com/privacy"
  }
];

/* price chip for a product family comes from the data file, never typed */
CARDS.forEach(function (c) {
  if (c.family && !c.chip) {
    var low = Math.min.apply(null, D.products[c.family].sizes.map(function (s) { return s.price; }));
    c.chip = "from " + D.money(low);
  }
  if (!c.url) c.url = "norchaprint.com/" + c.slug;
  if (!c.family) c.family = null;
});

/* ── the card, in the site's own design language ───────────────────────── */
/* Palette and rules are DESIGN.md's: cream ground, pine ink, gold ornaments,
   the ceremonial tricolour in exactly ONE place (the selvedge), the diamond
   chain as the only motif, and Amharic visible by design. */
function cardHtml(c) {
  var photo = c.img
    ? '<div class="photo"><img src="' + SITE + '/img/' + c.img + '-720.webp" alt=""></div>'
    : '<div class="ornament" aria-hidden="true"></div>';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<style>
  @font-face { font-family:'Bricolage'; src:url('${SITE}/fonts/bricolage-latin.woff2') format('woff2'); font-weight:400 800; font-display:block; }
  @font-face { font-family:'Outfit'; src:url('${SITE}/fonts/outfit-latin.woff2') format('woff2'); font-weight:300 800; font-display:block; }
  @font-face { font-family:'Ethiopic'; src:url('${SITE}/fonts/noto-ethiopic-slim.woff2') format('woff2'); font-display:block; }
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1200px; height:630px; }
  body {
    font-family:'Outfit', sans-serif; background:#F8F4EE; color:#241F18;
    position:relative; overflow:hidden;
  }
  /* the netela ground: a faint woven texture, never a colour wash */
  body::before {
    content:''; position:absolute; inset:0; pointer-events:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='7' height='7'%3E%3Cpath d='M0 3.5h7M3.5 0v7' stroke='%23241F18' stroke-opacity='.028' stroke-width='.7'/%3E%3C/svg%3E");
  }
  /* the ceremonial selvedge — the ONE place all three flag colours meet */
  .selvedge { position:absolute; top:0; left:0; right:0; height:12px; display:flex; }
  .selvedge i { flex:1; }
  .selvedge i:nth-child(1) { background:#17532F; }
  .selvedge i:nth-child(2) { background:#B8912F; }
  .selvedge i:nth-child(3) { background:#7E211C; }
  .selvedge::after { content:''; position:absolute; left:0; right:0; bottom:-2px; height:1px; background:rgba(193,146,43,.55); }

  /* the footer is absolutely positioned, so the flow needs to end ABOVE it:
     without this bottom padding, margin-top:auto drove the price chip straight
     into the footer text. Caught by looking at the render, not by the code. */
  .card { position:relative; height:100%; padding:64px 72px 108px; display:flex; gap:56px; }
  .col { flex:1; display:flex; flex-direction:column; min-width:0; padding-top:22px; }
  .wordmark { font-family:'Bricolage', sans-serif; font-weight:700; font-size:25px; letter-spacing:-.02em; }
  .wordmark small { display:block; font-family:'Ethiopic', sans-serif; font-weight:600; font-size:15px;
    color:#A8761F; letter-spacing:.03em; margin-top:2px; }
  .eye { font-family:'Ethiopic', sans-serif; font-size:20px; font-weight:600; color:#A8761F; margin:44px 0 10px; }
  h1 { font-family:'Bricolage', sans-serif; font-weight:700; font-size:${c.title[0].length > 22 ? 62 : 74}px;
       line-height:1.02; letter-spacing:-.035em; color:#0A4632; max-width:16ch; text-wrap:balance; }
  .rule { width:170px; height:12px; margin:22px 0 20px;
    background-color:#C1922B; opacity:.95;
    -webkit-mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='9' viewBox='0 0 11 9'%3E%3Cg fill='none' stroke='%23000' stroke-width='1.9'%3E%3Cpath d='M5.5 1.1L9.4 4.5 5.5 7.9 1.6 4.5z'/%3E%3Cpath d='M0 4.5h1.6M9.4 4.5H11'/%3E%3C/g%3E%3C/svg%3E");
    mask-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='9' viewBox='0 0 11 9'%3E%3Cg fill='none' stroke='%23000' stroke-width='1.9'%3E%3Cpath d='M5.5 1.1L9.4 4.5 5.5 7.9 1.6 4.5z'/%3E%3Cpath d='M0 4.5h1.6M9.4 4.5H11'/%3E%3C/g%3E%3C/svg%3E");
    -webkit-mask-size:11px 9px; mask-size:11px 9px; -webkit-mask-repeat:repeat-x; mask-repeat:repeat-x; }
  .sub { font-size:24px; line-height:1.42; color:#6B6155; max-width:26ch; text-wrap:pretty; }
  .chip { display:inline-block; margin-top:auto; align-self:flex-start; padding:12px 24px; border-radius:999px;
    background:#DCE7DF; color:#0A4632; font-weight:700; font-size:22px; letter-spacing:.01em;
    font-variant-numeric:tabular-nums; }
  .foot { position:absolute; left:72px; right:72px; bottom:40px; height:26px; display:flex;
    justify-content:space-between; align-items:center; font-size:19px; color:#6B6155; letter-spacing:.02em; }
  .foot::before { content:''; position:absolute; left:0; right:0; top:-26px; height:1px; background:#E4DBCC; }
  .foot b { color:#0E5C41; font-weight:700; }
  .photo { width:456px; flex:none; align-self:center; margin-top:-8px; border-radius:14px; overflow:hidden;
    border:1px solid rgba(255,255,255,.35);
    box-shadow:0 2px 3px rgba(36,31,24,.10), 0 34px 60px -28px rgba(36,31,24,.45); }
  .photo img { display:block; width:100%; height:auto; }
  /* typographic cards carry a woven panel instead of a photograph */
  .ornament { width:456px; flex:none; align-self:center; height:340px; border-radius:14px; margin-top:-8px;
    background:linear-gradient(160deg,#0F5F44 0%,#0B4A35 60%,#083D2A 100%);
    position:relative; overflow:hidden; }
  .ornament::before { content:''; position:absolute; inset:0;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 26 26'%3E%3Cg fill='none' stroke='%23C1922B' stroke-opacity='.5' stroke-width='1.15'%3E%3Cpath d='M13 4.5L21.5 13 13 21.5 4.5 13z'/%3E%3C/g%3E%3C/svg%3E"); }
  .ornament::after { content:'ኖርቻ'; position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
    font-family:'Ethiopic', sans-serif; font-size:96px; font-weight:600; color:rgba(248,244,238,.93); }
</style></head>
<body>
  <div class="selvedge"><i></i><i></i><i></i></div>
  <div class="card">
    <div class="col">
      <div class="wordmark">Norcha Print<small>ኖርቻ ፕሪንት · Bole, Addis Ababa</small></div>
      <p class="eye">${c.title[1]}</p>
      <h1>${c.title[0]}</h1>
      <div class="rule"></div>
      <p class="sub">${c.sub}</p>
      ${c.chip ? '<span class="chip">' + c.chip + '</span>' : ''}
    </div>
    ${photo}
  </div>
  <div class="foot"><span><b>${c.url}</b></span><span>Same-day printing in Bole</span></div>
</body></html>`;
}

/* ── write ─────────────────────────────────────────────────────────────── */
fs.mkdirSync(OUT, { recursive: true });
CARDS.forEach(function (c) {
  fs.writeFileSync(path.join(OUT, c.slug + ".html"), cardHtml(c), "utf8");
});
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(CARDS.map(function (c) {
  return { slug: c.slug, url: "/img/og/" + c.slug + ".jpg" };
}), null, 2));
console.log("wrote " + CARDS.length + " card(s) to .ogtmp/");
console.log(CARDS.map(function (c) { return "  " + c.slug + " → " + c.title[0] + (c.chip ? " (" + c.chip + ")" : ""); }).join("\n"));
