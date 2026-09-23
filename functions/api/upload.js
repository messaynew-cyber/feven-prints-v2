/* POST /api/upload — the photo intake for Norcha Print.
 *
 * WHY THIS EXISTS
 * The site's whole order flow is "send us your photos", and the only way to do
 * that was WhatsApp — which shrinks photographs by default. A shrunk photo
 * prints soft, and the shop has to ask for it again. This endpoint takes the
 * files at full quality, straight from the phone that took them.
 *
 * It does NOT replace WhatsApp: the customer still gets the same handoff, and
 * the order code ties the two together ("Reference: NOR-XXXX").
 *
 * DESIGN CONSTRAINTS, DELIBERATELY
 *  - No database. R2 holds the files and one meta.json per submission. Nothing
 *    to migrate, nothing to back up beyond the bucket itself.
 *  - No personal data beyond what the customer types, and the IP is used only
 *    to rate-limit (a hash, never stored in the upload record).
 *  - The notification is best-effort: if Telegram is unreachable the upload
 *    still succeeds. The customer must never lose photos because a bot is down.
 *  - ⚠️ If the R2 binding is absent this returns 503 and says so plainly. It
 *    must never tell a customer their photos arrived when they did not. The
 *    dashboard binding (UPLOADS → norcha-uploads) turns it on with no code
 *    change: the site is deployed, this endpoint is simply dormant until then.
 *
 * Env expected (Cloudflare Pages → Settings):
 *   UPLOADS            R2 bucket binding          (required to accept files)
 *   TELEGRAM_BOT_TOKEN bot token                  (optional, for the ping)
 *   TELEGRAM_CHAT_ID   where the ping goes        (optional)
 *   UPLOAD_MAX_MB      per-file cap, default 25   (optional)
 *   UPLOAD_DAILY_CAP   submissions per IP/day, default 6 (optional)
 */

const ALLOWED = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp",
  "image/heic", "image/heif", "image/tiff", "image/avif"
]);
const EXT_OK = /\.(jpe?g|png|webp|heic|heif|tiff?|avif)$/i;
const MAX_FILES = 40;
const MAX_TOTAL_MB = 200;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

/* An order code a customer can read down a phone line. No 0/O/1/I/L. */
function makeCode() {
  const A = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let s = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) s += A[bytes[i] % A.length];
  return "NOR-" + s;
}

function safeName(name, i) {
  const base = String(name || "photo-" + (i + 1)).split(/[\\/]/).pop();
  return base.replace(/[^\w.\-]+/g, "_").slice(-80);
}

/* A short, stable, non-reversible tag for rate limiting. The raw IP is never
   written to the bucket. */
async function ipTag(ip, salt) {
  const data = new TextEncoder().encode((ip || "?") + "|" + salt);
  const d = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(d)].slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.UPLOADS) {
    /* The site is live; the bucket is not bound yet. Say so honestly. */
    return json({
      ok: false,
      reason: "not-configured",
      message: "Photo upload is not switched on yet. Please send your photos on WhatsApp — it works right now."
    }, 503);
  }

  const maxPerFile = (Number(env.UPLOAD_MAX_MB) || 25) * 1024 * 1024;

  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return json({ ok: false, reason: "bad-body", message: "Could not read the upload." }, 400);
  }

  /* Honeypot: a field no human fills in. Bots do. Pretend success, store
     nothing — refusing outright just teaches the bot to try again. */
  if (String(form.get("website") || "").trim() !== "") {
    return json({ ok: true, code: makeCode(), stored: 0, note: "ignored" });
  }

  const files = form.getAll("photos").filter(f => f && typeof f === "object" && f.size > 0);
  if (files.length === 0) {
    return json({ ok: false, reason: "no-files", message: "No photos were attached." }, 400);
  }
  if (files.length > MAX_FILES) {
    return json({ ok: false, reason: "too-many", message: "That is " + files.length + " files. Please send at most " + MAX_FILES + "." }, 413);
  }

  let total = 0;
  for (const f of files) {
    if (f.size > maxPerFile) {
      return json({ ok: false, reason: "too-big",
        message: "One file is larger than " + Math.round(maxPerFile / 1048576) + " MB. Please send that one on WhatsApp." }, 413);
    }
    total += f.size;
    const type = (f.type || "").toLowerCase();
    const named = EXT_OK.test(f.name || "");
    if (!ALLOWED.has(type) && !(named && type === "")) {
      return json({ ok: false, reason: "bad-type", message: "Only photos are accepted (JPG, PNG, HEIC, WebP, TIFF)." }, 415);
    }
  }
  if (total > MAX_TOTAL_MB * 1048576) {
    return json({ ok: false, reason: "too-heavy", message: "That is over " + MAX_TOTAL_MB + " MB in one go. Please send in two batches." }, 413);
  }

  /* rate limit: N submissions per IP per day, counted in the bucket itself so
     there is nothing else to run and nothing to expire by hand. */
  const ip = request.headers.get("cf-connecting-ip") || "";
  const tag = await ipTag(ip, env.UPLOAD_SALT || "norcha");
  const day = new Date().toISOString().slice(0, 10);
  const rlKey = "rl/" + day + "/" + tag + ".json";
  const dailyCap = Number(env.UPLOAD_DAILY_CAP) || 6;
  let used = 0;
  try {
    const prev = await env.UPLOADS.get(rlKey);
    if (prev) used = Number((await prev.json()).n) || 0;
  } catch (e) { /* a missing counter is not a reason to refuse anyone */ }
  if (used >= dailyCap) {
    return json({ ok: false, reason: "rate-limited",
      message: "Too many uploads from this connection today. Please send the rest on WhatsApp." }, 429);
  }

  const code = makeCode();
  const stamp = new Date().toISOString();
  const prefix = "u/" + day + "/" + code + "/";
  const stored = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const key = prefix + String(i + 1).padStart(2, "0") + "-" + safeName(f.name, i);
    await env.UPLOADS.put(key, f.stream(), {
      httpMetadata: { contentType: f.type || "application/octet-stream" },
      customMetadata: { code, original: safeName(f.name, i) }
    });
    stored.push({ key, name: safeName(f.name, i), bytes: f.size, type: f.type || "" });
  }

  const meta = {
    code,
    received: stamp,
    files: stored,
    bytes: total,
    customer: {
      name: String(form.get("name") || "").slice(0, 80),
      phone: String(form.get("phone") || "").slice(0, 40),
      email: String(form.get("email") || "").slice(0, 120),
      note: String(form.get("note") || "").slice(0, 1000),
      product: String(form.get("product") || "").slice(0, 60),
      size: String(form.get("size") || "").slice(0, 60),
      qty: String(form.get("qty") || "").slice(0, 10),
      lang: String(form.get("lang") || "en").slice(0, 2)
    },
    /* retention: the photographs are personal. The shop deletes them after the
       order is collected; the bucket lifecycle rule is the backstop. */
    retention_days: 30
  };
  await env.UPLOADS.put(prefix + "meta.json", JSON.stringify(meta, null, 2), {
    httpMetadata: { contentType: "application/json" }
  });
  await env.UPLOADS.put(rlKey, JSON.stringify({ n: used + 1, tag }), {
    httpMetadata: { contentType: "application/json" }
  });

  /* A tiny pointer at a FIXED key, so an order lookup is one read instead of
     guessing which day the upload happened on. It holds no personal data:
     the customer's details stay in the meta.json under the day prefix. */
  await env.UPLOADS.put("index/" + code + ".json",
    JSON.stringify({ code: code, prefix: prefix, received: stamp }), {
      httpMetadata: { contentType: "application/json" }
    });

  /* Tell the shop. Best-effort on purpose — the photos are already safe. */
  let pinged = false;
  try {
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      const who = meta.customer.name || "someone";
      const tel = meta.customer.phone ? " · " + meta.customer.phone : "";
      const text = "📸 New photos — " + code + "\n" + who + tel + "\n" +
        stored.length + " files · " + (total / 1048576).toFixed(1) + " MB\n" +
        (meta.customer.product ? "Wants: " + meta.customer.product + (meta.customer.size ? " " + meta.customer.size : "") +
          (meta.customer.qty ? " ×" + meta.customer.qty : "") + "\n" : "") +
        (meta.customer.note ? "“" + meta.customer.note + "”\n" : "") +
        "Retention: " + meta.retention_days + " days";
      const ids = String(env.TELEGRAM_CHAT_ID).split(",").map(s => s.trim()).filter(Boolean);
      pinged = true;
      for (const chat of ids) {
        const r = await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendMessage", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ chat_id: chat, text })
        });
        if (!r.ok) pinged = false;
      }
    }
  } catch (e) { pinged = false; }

  return json({ ok: true, code, stored: stored.length, bytes: total, notified: pinged });
}

/* GET /api/upload — a health probe, so "is the upload switched on?" is a
   question with an answer instead of a guess. */
export async function onRequestGet(context) {
  const { env } = context;
  return json({
    ok: !!env.UPLOADS,
    configured: !!env.UPLOADS,
    notify: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
    maxFiles: MAX_FILES,
    maxPerFileMb: Number(env.UPLOAD_MAX_MB) || 25,
    maxTotalMb: MAX_TOTAL_MB
  }, env.UPLOADS ? 200 : 503);
}
