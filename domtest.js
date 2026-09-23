/* Load the real index.html in a real DOM, run the real scripts, and report
   any exception AND whether the reveal elements ever became visible. */
const { JSDOM } = require("jsdom");
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");

const errors = [];
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: undefined,       // we inject scripts ourselves
  pretendToBeVisual: true,
  url: "https://norchaprint.com/"
});

// jsdom has no IntersectionObserver; provide one that immediately fires,
// because that is what a browser effectively does for in-view elements.
dom.window.IntersectionObserver = class {
  constructor(cb) { this.cb = cb; }
  observe(el) { this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }], this); }
  unobserve() {} disconnect() {}
};
dom.window.addEventListener("error", e => errors.push("window.error: " + (e.error && e.error.stack ? e.error.stack.split("\n").slice(0,3).join(" | ") : e.message)));

/* jsdom lacks matchMedia; a real browser always has it. */
dom.window.matchMedia = function (q) {
  return { matches: false, media: q, addEventListener: function(){}, removeEventListener: function(){}, addListener: function(){}, removeListener: function(){} };
};

// inject the three scripts in order
["js/norcha-data.js", "js/norcha-holidays.js", "js/main.js", "js/norcha-upload.js"].forEach(f => {
  const s = dom.window.document.createElement("script");
  s.textContent = fs.readFileSync(f, "utf8");
  try {
    dom.window.document.body.appendChild(s);
  } catch (e) {
    errors.push(f + " THREW: " + e.message);
  }
});

const d = dom.window.document;

console.log("=== RESULT ===");
console.log("errors:", errors.length ? errors : "none");

const reveals = d.querySelectorAll(".reveal");
let hidden = 0, shown = 0;
reveals.forEach(r => {
  if (r.classList.contains("in")) shown++; else hidden++;
});
console.log(`reveal elements: ${reveals.length}  ->  .in shown: ${shown}  still hidden: ${hidden}`);

const strip = d.getElementById("holidayStrip");
console.log("holidayStrip hidden attr:", strip ? strip.hidden : "ELEMENT MISSING");
const txt = d.getElementById("holidayText");
console.log("holidayText content:", txt ? JSON.stringify(txt.textContent) : "MISSING");

console.log("NorchaData present:", typeof dom.window.NorchaData);
console.log("NorchaHolidays present:", typeof dom.window.NorchaHolidays);
