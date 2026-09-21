/* Fetch the LIVE site and run the LIVE scripts in a real DOM.
   This is the check that was missing: it proves the deployed page renders,
   not just that the local copy parses. */
const { JSDOM } = require("jsdom");
const https = require("https");

function get(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { "User-Agent": "tobia-domtest" } }, r => {
      let b = ""; r.on("data", d => b += d); r.on("end", () => res(b));
    }).on("error", rej);
  });
}

(async () => {
  const base = "https://norchaprint.com/";
  const html = await get(base);
  const scripts = {};
  for (const f of ["js/norcha-data.js", "js/norcha-holidays.js", "js/main.js"]) {
    scripts[f] = await get(base + f);
  }
  const css = await get(base + "css/style.css");

  const errors = [];
  const dom = new JSDOM(html, { runScripts: "dangerously", url: base });
  const w = dom.window;
  w.matchMedia = q => ({ matches:false, media:q, addEventListener(){}, removeEventListener(){} });
  w.IntersectionObserver = class { constructor(cb){this.cb=cb;} observe(el){this.cb([{target:el,isIntersecting:true,intersectionRatio:1}],this);} unobserve(){} disconnect(){} };
  w.addEventListener("error", e => errors.push(e.message));

  for (const f of ["js/norcha-data.js", "js/norcha-holidays.js", "js/main.js"]) {
    const s = w.document.createElement("script");
    s.textContent = scripts[f];
    try { w.document.body.appendChild(s); }
    catch (e) { errors.push(f + " THREW: " + e.message); }
  }

  const d = w.document;
  const rev = d.querySelectorAll(".reveal");
  let shown = 0; rev.forEach(r => { if (r.classList.contains("in")) shown++; });

  console.log("=== LIVE SITE VERIFICATION ===");
  console.log("runtime errors      :", errors.length ? errors : "NONE");
  console.log(`reveal elements     : ${rev.length}  visible: ${shown}  hidden: ${rev.length - shown}`);
  const strip = d.getElementById("holidayStrip");
  console.log("holiday strip shown :", strip && !strip.hidden);
  console.log("holiday text        :", d.getElementById("holidayText").textContent);
  console.log("sections present    :", ["products","how","send","order","faq","gallery","visit"].filter(id=>d.getElementById(id)).join(", "));
  console.log("CSS has .reveal{opacity:0}:", /\.reveal\s*\{[^}]*opacity:\s*0/.test(css));
  process.exit(0);
})();
