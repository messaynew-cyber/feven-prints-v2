/* ordertest.mjs — the guard for GET /api/order.
 *
 * The interesting failures here are not "does it find an order" but:
 *   - does it refuse to confirm that a code exists to someone who has only the
 *     code and not the phone number?
 *   - does it ever hand back the photographs?
 *   - does the phone number match across the shapes people actually type it in?
 *   - does a flood of guesses get cut off?
 *
 * RUN: node ordertest.mjs
 */
import assert from "node:assert/strict";

class MockBucket {
  constructor(seed) { this.map = new Map(Object.entries(seed || {})); }
  async get(key) {
    const v = this.map.get(key);
    if (v === undefined) return null;
    const text = typeof v === "string" ? v : JSON.stringify(v);
    return { json: async () => JSON.parse(text), text: async () => text };
  }
  async put(key, value) { this.map.set(key, value); return {}; }
  keys() { return [...this.map.keys()]; }
}

const mod = await import("./functions/api/order.js");

let pass = 0, fail = 0;
function ok(label, cond, detail) {
  if (cond) { pass++; console.log("  ✓ " + label); }
  else { fail++; console.log("  ✗ " + label + (detail ? " → " + detail : "")); }
}
async function ask(env, code, phone, ip) {
  const url = "https://norchaprint.com/api/order?code=" + encodeURIComponent(code || "") +
              "&phone=" + encodeURIComponent(phone || "");
  const res = await mod.onRequestGet({
    request: new Request(url, { headers: { "cf-connecting-ip": ip || "10.0.0.9" } }),
    env
  });
  return { status: res.status, body: await res.json() };
}

const CODE = "NOR-ABC234";
const seed = () => ({
  ["index/" + CODE + ".json"]: { code: CODE, prefix: "u/2026-09-23/" + CODE + "/", received: "2026-09-23T18:00:00.000Z" },
  ["u/2026-09-23/" + CODE + "/meta.json"]: {
    code: CODE, received: "2026-09-23T18:00:00.000Z", bytes: 1234567, retention_days: 30,
    files: [{ key: "01-a.jpg", bytes: 700000 }, { key: "02-b.jpg", bytes: 534567 }],
    customer: { name: "Feven", phone: "+251 911 223 344", note: "30x40 canvas", product: "Canvas prints", size: "30 × 40 cm", qty: "2" }
  },
  ["u/2026-09-23/" + CODE + "/01-a.jpg"]: "BINARY-PHOTO-BYTES"
});

console.log("=== ORDER LOOKUP GUARD ===");

/* 1. the happy path, in the shapes a phone number really gets typed in */
for (const typed of ["+251 911 223 344", "0911223344", "251911223344", "0911-223-344"]) {
  const r = await ask({ UPLOADS: new MockBucket(seed()) }, CODE, typed, "10.1.0." + typed.length);
  ok("finds the order when the phone is typed as \"" + typed + "\"", r.status === 200 && r.body.ok === true, r.status + " " + JSON.stringify(r.body).slice(0, 90));
}
{
  const r = await ask({ UPLOADS: new MockBucket(seed()) }, "nor-abc234", "0911223344");
  ok("accepts a lowercase reference", r.status === 200 && r.body.ok === true, String(r.status));
  ok("reports how many files arrived", r.body.files === 2, String(r.body.files));
  ok("says the studio has them, not that they are printed", r.body.stage === "received" && /confirms|confirm/.test(r.body.stage_note), r.body.stage);
  ok("reports the requested job", r.body.requested.product === "Canvas prints" && r.body.requested.qty === "2", JSON.stringify(r.body.requested));
  ok("computes the deletion date from retention", r.body.delete_after === "2026-10-23", String(r.body.delete_after));
}

/* 2. the privacy rules */
{
  const r = await ask({ UPLOADS: new MockBucket(seed()) }, CODE, "0900000000", "10.2.0.1");
  ok("wrong phone → not found", r.status === 404 && r.body.reason === "not-found", String(r.status));
  const r2 = await ask({ UPLOADS: new MockBucket(seed()) }, "NOR-ZZZ999", "0911223344", "10.2.0.2");
  ok("unknown code → identical answer to wrong phone", r2.status === 404 && r2.body.reason === r.body.reason, JSON.stringify(r2.body));
  const r3 = await ask({ UPLOADS: new MockBucket(seed()) }, CODE, "", "10.2.0.3");
  ok("code without a phone is refused", r3.status === 400, String(r3.status));
  const r4 = await ask({ UPLOADS: new MockBucket(seed()) }, "", "0911223344", "10.2.0.4");
  ok("phone without a code is refused", r4.status === 400, String(r4.status));
  const r5 = await ask({ UPLOADS: new MockBucket(seed()) }, "NOR-ABC23", "0911223344", "10.2.0.5");
  ok("a malformed reference is refused", r5.status === 400, String(r5.status));
  const r6 = await ask({ UPLOADS: new MockBucket(seed()) }, CODE, "0911223344", "10.2.0.6");
  const flat = JSON.stringify(r6.body);
  ok("never returns the photographs", flat.indexOf("BINARY-PHOTO-BYTES") === -1 && !/"url"/.test(flat), "leaked file data");
  ok("does not echo the customer's phone number back", flat.indexOf("911 223 344") === -1, "echoed phone");
}

/* 3. flooding */
{
  const env = { UPLOADS: new MockBucket(seed()), ORDER_DAILY_CAP: "3" };
  let last;
  /* NB: the codes below must be VALID FORMAT — a malformed reference is
     refused before the rate limiter is reached, so a guess loop built from
     invalid codes would never test the limiter at all. (My first version of
     this test used "NOR-GUESS0", which contains a zero and exits at 400.
     The endpoint was right and the test was wrong.) */
  const guesses = ["NOR-AAAA22", "NOR-BBBB33", "NOR-CCCC44", "NOR-DDDD55"];
  for (const g of guesses) last = await ask(env, g, "0911223344", "10.3.0.1");
  ok("a run of guesses gets cut off", last.status === 429, String(last.status));
  const other = await ask(env, CODE, "0911223344", "10.3.0.2");
  ok("a different connection is unaffected", other.status === 200, String(other.status));
}

/* 4. unconfigured must refuse honestly */
{
  const r = await ask({}, CODE, "0911223344");
  ok("unconfigured says so instead of \"not found\"", r.status === 503 && r.body.reason === "not-configured", String(r.status));
}

const { execSync } = await import("node:child_process");
const src = (await import("node:fs")).readFileSync(new URL("./functions/api/order.js", import.meta.url), "utf8");
ok("the source never expects to serve file bodies", !/\.body\b|\.writeHttpMetadata|download/i.test(src), "check order.js for a file-serving path");

console.log(fail === 0
  ? "\nALL ORDER LOOKUP CHECKS PASS (" + pass + ")"
  : "\n" + fail + " FAILURE(S) (" + pass + " passed) — DO NOT DEPLOY");
process.exit(fail === 0 ? 0 : 1);
