/* uploadtest.mjs — the guard for POST /api/upload (functions/api/upload.js).
 *
 * WHY NOT WRANGLER
 * `wrangler pages dev` would prove the HTTP layer too, but it is a ~80 MB
 * dependency and it cannot test the things that actually matter here: a
 * bucket that throws, a bot filling in the honeypot, the seventh upload from
 * one connection, Telegram being down. Those are the failure modes that
 * decide whether a customer loses their photographs.
 *
 * So the function is imported directly and given a mock R2 bucket, a mock
 * Telegram, and real Request/FormData/File objects (all native in Node 20+).
 * No network, no state on disk, ~1 second.
 *
 * RUN: node uploadtest.mjs
 */
import assert from "node:assert/strict";

/* ── a bucket that behaves like R2's small surface, and can be told to fail ── */
class MockBucket {
  constructor() { this.map = new Map(); this.failPut = false; }
  async put(key, value, opts) {
    if (this.failPut) throw new Error("R2 unavailable");
    let bytes;
    if (typeof value === "string") bytes = new TextEncoder().encode(value);
    else if (value && typeof value.getReader === "function") {
      const chunks = []; const r = value.getReader();
      for (;;) { const { done, value: v } = await r.read(); if (done) break; chunks.push(v); }
      bytes = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
      let o = 0; for (const c of chunks) { bytes.set(c, o); o += c.length; }
    } else bytes = new Uint8Array(await new Response(value).arrayBuffer());
    this.map.set(key, { bytes, opts });
  }
  async get(key) {
    const e = this.map.get(key);
    if (!e) return null;
    const text = new TextDecoder().decode(e.bytes);
    return { json: async () => JSON.parse(text), text: async () => text };
  }
  keys() { return [...this.map.keys()]; }
}

/* ── the harness ─────────────────────────────────────────────────────────── */
const mod = await import("./functions/api/upload.js");

let pass = 0, fail = 0;
function ok(label, cond, detail) {
  if (cond) { pass++; console.log("  ✓ " + label); }
  else { fail++; console.log("  ✗ " + label + (detail ? " → " + detail : "")); }
}
function form(fields, files) {
  const fd = new FormData();
  Object.entries(fields || {}).forEach(([k, v]) => fd.append(k, v));
  (files || []).forEach((f, i) => fd.append("photos", f, f.name || ("photo-" + (i + 1) + ".jpg")));
  return fd;
}
function img(name, bytes) {
  return new File([new Uint8Array(bytes)], name, { type: "image/jpeg" });
}
async function post(bucket, fields, files, headers) {
  const req = new Request("https://norchaprint.com/api/upload", {
    method: "POST",
    body: form(fields, files),
    headers: headers || { "cf-connecting-ip": "10.0.0.1" }
  });
  return mod.onRequestPost({ request: req, env: { UPLOADS: bucket } });
}

/* Telegram must never be called for real from a test. */
const realFetch = globalThis.fetch;
let telegramCalls = [];
function mockTelegram(behaviour) {
  telegramCalls = [];
  globalThis.fetch = async (url, init) => {
    if (String(url).indexOf("api.telegram.org") === -1) return realFetch(url, init);
    telegramCalls.push(JSON.parse(init.body));
    if (behaviour === "throw") throw new Error("network down");
    if (behaviour === "500") return new Response("nope", { status: 500 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
}

console.log("=== UPLOAD ENDPOINT GUARD ===");

/* 1. the whole point: it must NOT pretend to work before the bucket exists */
{
  const req = new Request("https://norchaprint.com/api/upload", { method: "GET" });
  const res = await mod.onRequestGet({ request: req, env: {} });
  const body = await res.json();
  ok("GET reports NOT configured when unbound", res.status === 503 && body.configured === false, JSON.stringify(body));
  const bad = await post(undefined, { name: "A", phone: "0911" }, [img("a.jpg", 10)]);
  const bb = await bad.json();
  ok("unbound POST refuses with 503 and says so", bad.status === 503 && bb.ok === false && /WhatsApp/.test(bb.message), JSON.stringify(bb));
}

/* 2. configured: the honest happy path */
{
  const bucket = new MockBucket();
  const res = await post(bucket, {
    name: "Feven", phone: "0911223344", note: "30x40 canvas", product: "Canvas prints", size: "30 × 40 cm", qty: "2", lang: "am"
  }, [img("one.jpg", 1200), img("two.jpg", 900), img("three.jpg", 400)]);
  const body = await res.json();
  ok("POST accepts 3 photos", res.status === 200 && body.ok === true && body.stored === 3, JSON.stringify(body));
  ok("returns a readable order code", /^NOR-[2-9A-HJ-NP-Z]{6}$/.test(body.code), body.code);
  const day = new Date().toISOString().slice(0, 10);
  const keys = bucket.keys();
  ok("files are keyed by day and code", keys.filter(k => k.startsWith("u/" + day + "/" + body.code + "/")).length === 4, keys.join(", "));
  const meta = await (await bucket.get("u/" + day + "/" + body.code + "/meta.json")).json();
  ok("meta.json records the customer's details", meta.customer.name === "Feven" && meta.customer.phone === "0911223344", JSON.stringify(meta.customer));
  ok("meta.json promises 30-day retention", meta.retention_days === 30);
  ok("meta.json does NOT store the caller's IP", JSON.stringify(meta).indexOf("10.0.0.1") === -1);
  const dayObj = await bucket.get(keys.find(k => k.endsWith("01-one.jpg")));
  ok("file bytes survive the round trip", (await dayObj.text()).length === 1200);
}

/* 3. the refusals — each one has to be a plain sentence, not a crash */
{
  const bucket = new MockBucket();
  const pdf = new File([new Uint8Array(10)], "contract.pdf", { type: "application/pdf" });
  const r1 = await post(bucket, { name: "A", phone: "0911223344" }, [pdf]);
  const b1 = await r1.json();
  ok("refuses a non-photo file", r1.status === 415 && b1.reason === "bad-type", JSON.stringify(b1));

  const r2 = await post(bucket, { name: "A", phone: "0911223344" }, []);
  ok("refuses an empty submission", r2.status === 400 && (await r2.json()).reason === "no-files");

  const big = new File([new Uint8Array(26 * 1024 * 1024)], "huge.jpg", { type: "image/jpeg" });
  const r3 = await post(bucket, { name: "A", phone: "0911223344" }, [big]);
  const b3 = await r3.json();
  ok("refuses an oversized file and points at WhatsApp", r3.status === 413 && /WhatsApp/.test(b3.message), JSON.stringify(b3));

  const many = Array.from({ length: 41 }, (_, i) => img("p" + i + ".jpg", 10));
  const r4 = await post(bucket, { name: "A", phone: "0911223344" }, many);
  ok("refuses too many files", r4.status === 413 && (await r4.json()).reason === "too-many");

  ok("a refused upload stores nothing", bucket.keys().length === 0, bucket.keys().join(", "));
}

/* 4. honeypot: pretend success, store nothing */
{
  const bucket = new MockBucket();
  const res = await post(bucket, { name: "bot", phone: "0911223344", website: "http://spam" }, [img("a.jpg", 10)]);
  const body = await res.json();
  ok("bot gets a plausible answer and nothing is stored", body.ok === true && bucket.keys().length === 0, JSON.stringify(body));
}

/* 5. rate limit — counted in the bucket, no extra service */
{
  const bucket = new MockBucket();
  let last;
  for (let i = 0; i < 7; i++) last = await post(bucket, { name: "A", phone: "0911223344" }, [img("a.jpg", 10)]);
  ok("the 7th upload from one connection is refused", last.status === 429, String(last.status));
  const other = await post(bucket, { name: "A", phone: "0911223344" }, [img("a.jpg", 10)], { "cf-connecting-ip": "10.0.0.2" });
  ok("a different connection is unaffected", other.status === 200, String(other.status));
}

/* 6. the notification must never be able to lose a customer's photos */
{
  mockTelegram("throw");
  const bucket = new MockBucket();
  const res = await post(bucket, { name: "A", phone: "0911223344" }, [img("a.jpg", 10)]);
  const body = await res.json();
  ok("Telegram throwing does not fail the upload", res.status === 200 && body.ok === true, JSON.stringify(body));
  ok("the photos are in the bucket anyway", bucket.keys().filter(k => k.includes("/meta.json")).length === 1);

  mockTelegram("500");
  const b2 = await new MockBucket();
  const r2 = await post(b2, { name: "A", phone: "0911223344" }, [img("a.jpg", 10)]);
  ok("a 500 from Telegram does not fail the upload", r2.status === 200);

  mockTelegram("ok");
  const b3 = new MockBucket();
  await mod.onRequestPost({
    request: new Request("https://norchaprint.com/api/upload", {
      method: "POST",
      body: form({ name: "Feven", phone: "0911", note: "hello" }, [img("a.jpg", 10)]),
      headers: { "cf-connecting-ip": "10.0.0.3" }
    }),
    env: { UPLOADS: b3, TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "-1001,-1002" }
  });
  ok("the shop is pinged on both chats when configured", telegramCalls.length === 2, String(telegramCalls.length));
  ok("the ping carries the order code", /NOR-/.test(telegramCalls[0].text), telegramCalls[0].text.split("\n")[0]);
  globalThis.fetch = realFetch;
}

/* 7. a broken bucket fails loudly instead of lying */
{
  const bucket = new MockBucket();
  bucket.failPut = true;
  let threw = false;
  try { await post(bucket, { name: "A", phone: "0911223344" }, [img("a.jpg", 10)]); }
  catch (e) { threw = true; }
  ok("a failing bucket surfaces as an error, never as a fake success", threw);
}

console.log(fail === 0
  ? "\nALL UPLOAD CHECKS PASS (" + pass + ")"
  : "\n" + fail + " FAILURE(S) (" + pass + " passed) — DO NOT DEPLOY");
process.exit(fail === 0 ? 0 : 1);
