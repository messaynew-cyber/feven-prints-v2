/* Fasika arithmetic check.
 *
 * Run: node holiday-test.js
 *
 * WHY THIS FILE EXISTS
 * The Fasika date was wrong for years — a week out, and on a Monday. Nothing
 * caught it because nothing asserted anything about it: the banner either
 * showed text or it did not, and a wrong date still renders.
 *
 * So this asserts against EXTERNAL facts, not against the code's own output:
 *   - published Orthodox Easter dates for known years
 *   - the invariant that Easter is always a Sunday
 * A test that asserts what the code does only proves the code agrees with
 * itself.
 */
const fs = require("fs");
const vm = require("vm");

const src = fs.readFileSync("js/norcha-holidays.js", "utf8");
const ctx = { window: {} };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);

const H = ctx.NorchaHolidays;
let pass = 0, fail = 0;

function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); }
}
function iso(d) { return d.toISOString().slice(0, 10); }

console.log("\nFasika — published Orthodox Easter dates");
const published = {
  2024: "2024-05-05", 2025: "2025-04-20", 2026: "2026-04-12", 2027: "2027-05-02",
};
for (const [y, want] of Object.entries(published)) {
  const got = iso(H.fasika(Number(y)));
  ok(`${y}: ${want}`, got === want, "got " + got);
}

console.log("\nFasika — the invariant (this is what caught the bug)");
let allSunday = true, bad = [];
for (let y = 2020; y <= 2060; y++) {
  if (H.fasika(y).getUTCDay() !== 0) { allSunday = false; bad.push(y + "=" + iso(H.fasika(y))); }
}
ok("is a Sunday for every year 2020-2060", allSunday, bad.join(", "));

console.log("\nFasika — plausibility band");
let inBand = true;
for (let y = 2020; y <= 2060; y++) {
  const m = H.fasika(y).getUTCMonth() + 1;
  if (m < 3 || m > 5) { inBand = false; }
}
ok("always falls in Mar-May", inBand);

console.log("\norderBy — never lands on a Sunday, never after the occasion");
let okSun = true, okAfter = true;
for (let i = 0; i < 60; i++) {
  const from = new Date(Date.UTC(2026, 0, 1 + i * 6));
  const list = H.list(from, 400);
  for (const h of list) {
    if (h.orderBy.getUTCDay() === 0) okSun = false;
    if (h.orderBy.getTime() >= h.date.getTime()) okAfter = false;
  }
}
ok("order-by is never a Sunday", okSun);
ok("order-by is always before the occasion", okAfter);

console.log("\nLadder — sorted, and nothing in the past");
const ladder = H.list(new Date(Date.UTC(2026, 8, 1)), 400);
ok("sorted soonest first", ladder.every((h, i) => i === 0 || h.days >= ladder[i - 1].days));
ok("no past occasions", ladder.every(h => h.days >= 0));
ok("Enkutatash precedes Meskel from 1 Sep 2026",
   ladder[0].id === "enkutatash" && ladder.some(h => h.id === "meskel"),
   "first was " + ladder[0].id);

console.log("\ncurrent() — hides itself when nothing is close");
ok("returns null on an empty horizon",
   H.current(new Date(Date.UTC(2027, 2, 1)), 30) === null);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
