/* GET /api/order — "did my photos arrive?"
 *
 * The honest version of order tracking. This does NOT pretend the shop has a
 * live status feed: it answers one real question — what did we actually
 * receive, and when — from the same R2 records the uploader wrote.
 *
 * 🔴 THE PRIVACY RULE
 * A lookup needs BOTH the code and the phone number the customer typed. One
 * without the other gets the same answer as a code that does not exist, so this
 * endpoint can never be used to confirm that an order exists, or to enumerate
 * them. Attempts are rate-limited per connection, which makes guessing a code
 * pointless as well as slow.
 *
 * 🔴 WHAT IT NEVER RETURNS
 * The photographs. They are the customer's, they already have them, and a
 * public endpoint that hands family photos to whoever holds a six-character
 * code is not a feature — it is a leak. The studio has the files; the customer
 * gets the facts.
 *
 * Env: UPLOADS (R2 binding), ORDER_DAILY_CAP (optional, default 20)
 */

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

async function ipTag(ip, salt) {
  const data = new TextEncoder().encode((ip || "?") + "|" + salt);
  const d = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(d)].slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

/* Phone numbers get written down in every shape there is: 0911..., +251911...,
   spaces, dashes. Compare the last nine digits, which is the part that
   identifies the line in every one of those forms. */
function phoneKey(s) {
  const d = String(s || "").replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : "";
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || "").trim().toUpperCase();
  const phone = phoneKey(url.searchParams.get("phone"));

  if (!env.UPLOADS) {
    return json({ ok: false, reason: "not-configured",
      message: "Order lookup is not switched on yet. Message us on WhatsApp and we will check for you." }, 503);
  }
  if (!/^NOR-[2-9A-HJ-NP-Z]{6}$/.test(code) || !phone) {
    return json({ ok: false, reason: "bad-request",
      message: "You need both the reference (like NOR-ABC123) and the phone number you ordered with." }, 400);
  }

  const ip = request.headers.get("cf-connecting-ip") || "";
  const tag = await ipTag(ip, env.ORDER_SALT || env.UPLOAD_SALT || "norcha");
  const day = new Date().toISOString().slice(0, 10);
  const rlKey = "rl-order/" + day + "/" + tag + ".json";
  const cap = Number(env.ORDER_DAILY_CAP) || 20;
  let used = 0;
  try {
    const prev = await env.UPLOADS.get(rlKey);
    if (prev) used = Number((await prev.json()).n) || 0;
  } catch (e) { /* a missing counter is not a reason to refuse anyone */ }
  if (used >= cap) {
    return json({ ok: false, reason: "rate-limited",
      message: "Too many lookups from this connection today. Message us on WhatsApp and we will check for you." }, 429);
  }
  await env.UPLOADS.put(rlKey, JSON.stringify({ n: used + 1 }), { httpMetadata: { contentType: "application/json" } });

  /* one read for the pointer, one for the record */
  let prefix = null;
  try {
    const idx = await env.UPLOADS.get("index/" + code + ".json");
    if (idx) prefix = (await idx.json()).prefix;
  } catch (e) { /* treated as not found below */ }

  let meta = null;
  if (prefix) {
    try {
      const obj = await env.UPLOADS.get(prefix + "meta.json");
      if (obj) meta = await obj.json();
    } catch (e) {}
  }

  /* One answer for every failure: unknown code, wrong phone, unreadable record.
     If these differed, the endpoint would tell a stranger whether a code is
     real, which is the one thing it must never do. */
  if (!meta || phoneKey(meta.customer && meta.customer.phone) !== phone) {
    return json({ ok: false, reason: "not-found",
      message: "We could not find an order with that reference and phone number. Check both, or message us on WhatsApp." }, 404);
  }

  const files = (meta.files || []).length;
  const bytes = Number(meta.bytes) || 0;
  const received = meta.received || null;
  const days = meta.retention_days || 30;

  return json({
    ok: true,
    code: code,
    received: received,
    files: files,
    bytes: bytes,
    /* the honest label: we have the files, a human still has to print them */
    stage: "received",
    stage_note: "The studio has your photos. A person confirms sizes and price before printing.",
    requested: {
      product: (meta.customer && meta.customer.product) || "",
      size: (meta.customer && meta.customer.size) || "",
      qty: (meta.customer && meta.customer.qty) || "",
      note: (meta.customer && meta.customer.note) || ""
    },
    retention_days: days,
    delete_after: received ? new Date(new Date(received).getTime() + days * 86400000).toISOString().slice(0, 10) : null
  });
}

export async function onRequestPost(context) {
  return json({ ok: false, reason: "use-get", message: "Use GET with ?code= and ?phone=." }, 405);
}
