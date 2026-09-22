/* Norcha Print — service worker.
   Goal: the site keeps working when the signal does not. Prices, hours and the
   FAQ are exactly the things a customer wants when they are standing in Bole
   with one bar of signal.

   Strategy:
   - Navigations (the HTML): network-first, so prices and content are never
     stale, falling back to cache when offline.
   - Everything else: stale-while-revalidate — instant from cache, refreshed in
     the background.
   The shell is precached on install; images cache as they are first seen, which
   keeps the initial download small on a metered connection. */

/* Bump CACHE on every deploy that changes css/js: the shell is precached and
   assets are stale-while-revalidate, so without a bump the first load after a
   deploy serves the OLD stylesheet. */
/* v3: the Amharic face was replaced with a 76% smaller subset (T-19) and
   the new norcha-*.js files were added to the shell. Without this bump the
   first load after the deploy serves the OLD stylesheet, which points at a
   font that is no longer the one we ship. */
/* v4: norcha-delivery.js added to the shell (T-09). The order form now
   depends on it, so an offline visitor filling the form would otherwise
   lose the delivery estimate entirely. */
/* v5: norcha-voucher.js added to the shell (T-18) plus the voucher section.
   Voucher issuing and checking are entirely on-device, so they must work
   offline — a shop with no signal still has to be able to check a code. */
/* v6: counter.html added (T-20). It is staff-only and excluded from search,
   but it must still be cached — the whole point is that it works at the
   counter when the signal does not. */
/* v7: norcha-data.js changed (mug pricing fix + catalogue generator). It is
   precached, so without this bump a returning visitor keeps the old prices. */
const CACHE = "fevens-v7";

const SHELL = [
  "./",
  "./index.html",
  "./counter.html",
  "./css/style.css",
  "./js/norcha-data.js",
  "./js/norcha-holidays.js",
  "./js/norcha-delivery.js",
  "./js/norcha-voucher.js",
  "./js/main.js",
  "./manifest.webmanifest",
  "./fonts/noto-ethiopic-slim.woff2",
  "./img/icons/icon-192.png",
  "./img/icons/icon-512.png",
  "./img/canvas.webp",
  "./img/calendar.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  const isDocument = req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") !== -1;

  if (isDocument) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("./index.html"))
        )
    );
    return;
  }

  /* css/js go network-first: this site is under active iteration, and a stale
     stylesheet is worse than a slow one. Images stay stale-while-revalidate. */
  const isCode = /\.(css|js)$/.test(url.pathname);
  if (isCode) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
