# STATE.md — Norcha Print website · verified state of the world

> **Single source of truth for this repo.** Every claim below was verified on the date shown. If something
> is not verified it is marked **UNVERIFIED**. Update this file in the same commit as the change it
> describes — a session that does not update `STATE.md` did not happen.
>
> Last updated: **2026-09-21** by `[tobia]` · handover to `[tobia]`.

**Read first:** `TOBIA-START-HERE.md` (how to work here) → this file (what is true) → `DESIGN.md` (the canon).

---

## 1. WHAT THIS IS

A **live, one-page, bilingual (EN / አማርኛ) marketing site** for **Norcha Print**, a print shop in Bole, Addis
Ababa. It is a **business card that takes orders**: every product tile and the order form compose a
prefilled **WhatsApp** message. There is no server, no database, no build step — plain HTML/CSS/JS on
Cloudflare Pages.

| | |
|---|---|
| live | **https://norchaprint.com** (+ `www`) — TLS valid, canonical/`og:url`/`og:image`/JSON-LD all point at the domain |
| repo | `messaynew-cyber/feven-prints-v2` (public, branch `main`) — 49 commits |
| deploy | push to `main` → `.github/workflows/deploy-pages.yml` → Cloudflare Pages `norcha-print` (~1 min) |
| origin | the repo root. `index.html` is the whole site. |
| history | this is **v2**. The old `feven-prints` repo and the GitHub-Pages URL still exist and still mirror; the domain's canonical points here. |

**Brand:** Norcha Print · Amharic wordmark **ኖርቻ ፕሪንት**. (Previously "Feven's Prints" — renamed 17 Sep to
match the domain, which is why older strings still say the old name in places.)

---

## 2. WHAT IS LIVE AND REAL

- ✅ **Ordering path** — order form (product, size, quantity, finish, needed-by, name, phone) → prefilled
  WhatsApp handoff, bilingual, with an on-device order history. *(No order-status lookup: that would need a
  server or a shared sheet, and it was deliberately **not** faked. Revisit only if the client asks.)*
- ✅ **Product tiles** — `tel:` links were replaced with **product-specific prefilled WhatsApp** messages
  (this stopped an accidental dialer on mobile).
- ✅ **Photo-send guide** — how to get photos to the shop, with one tap into the chat.
- ✅ **FAQ** — turnaround, file requirements, sizes, payment, delivery, framing, photo handling.
- ✅ **Delivery & turnaround** — including the strongest selling point: **same-day before 16:00**.
- ✅ **Sizes & prices block** — 22 rows across 6 products, localised (e.g. `25 ETB` / `25 ብር`).
- ✅ **Hero carousel**, **dark/light switcher**, **silk selvedge**, **scroll progress bar**.
- ✅ **Platform** — service worker (offline shell), `manifest.webmanifest` (installable PWA), print
  stylesheet, `robots.txt`, `LocalBusiness` JSON-LD, OG/Twitter cards + `img/og-card.jpg`.
- ✅ **Performance** — all images ship **WebP** via `<picture>` (~40% lighter), `decoding="async"`.
  Page height was cut 13,764 px → 9,122 px by fixing wrong intrinsic `width`/`height` attributes.
- ✅ **Accessibility, measured not assumed** — see `DESIGN.md` §8.

## 3. WHAT IS LIVE BUT PLACEHOLDER — 🔴 DO NOT TREAT AS FINAL

| what | why it is a placeholder |
|---|---|
| **Every price** | temporary. Every cell is tagged `data-temp-price`, so the real list drops in with one search-and-replace. Never quote these as final. |
| **Testimonials / social proof** | **absent on purpose.** Real customers only. Blank beats invented. |
| **Client contact email** | removed deliberately — the address never existed. |
| **Social links** | removed deliberately — dead `href="#"` links were worse than none. |
| **Photography** | the six product shots and the hero are **AI renders**, not the shop's real work. Real photography is the single biggest improvement available (see `B-01`). |
| **Refund policy** | not stated — needs a decision from the client. |

## 4. OPEN WORK — stable IDs, referenced in chat

### P — technical / performance
| ID | Item | State |
|---|---|---|
| P-01 | WebP for all images | ✅ done |
| P-02 | `srcset` + `sizes` (a 640 px variant alongside the 1024 px) | **OPEN** — images are 1024 px for a ~700 px slot; a second variant buys ~⅓ off image weight. Needs a generated file set. Not a correctness issue. |
| P-03 | Higher-res masters (≥1200 px) | only if the images are replaced |
| P-04 | Gallery section | ✅ resolved — it is now "See it on the wall" (a **scale display**: 3 hung prints at 3 real sizes with plaques). Re-check when real photos arrive (it could become a genuine gallery then). |
| P-05 | Analytics + Search Console + **Google Business Profile** | **OPEN** — nothing measures anything today. GBP is the single best free discovery win for a Bole shop (maps, hours, phone, photos, reviews). |
| P-06 | `.gitignore` + `README` + `LICENSE` | ✅ done 2026-09-21 (LICENSE still open — needs a decision: this is client work) |
| P-07 | ~~🔴 **Every unknown URL returns the homepage with HTTP 200**~~ **FIXED 2026-09-21** | ✅ done (fb809fd) — `404.html` added. Re-measured live: `/definitely-missing-xyz123.txt` → **404** (3361 B), `/404.html` → 200, `/styleguide.html` → **404**, `/DESIGN.md` → **404**. Unknown paths no longer return the homepage and the internal docs are no longer reachable. |

### T1 — were actively costing orders
| ID | Item | State |
|---|---|---|
| T1-01 | Ordering path | ✅ done |
| T1-02 | Per-product pages with sizes + **real** prices | 🟡 **PARTIAL** — sizes + *temp* prices live inside the page. Still to do: split into real pages (`/canvas`, `/photo-books`, `/calendars`, `/mugs`, `/frames`, `/prints`) → 6 indexable URLs instead of 0. **Blocked on real prices.** |
| T1-03 | Photo upload / "send us your photos" | ✅ done |
| T1-04 | FAQ | ✅ done |
| T1-05 | Delivery & turnaround | ✅ done |
| T1-06 | Reviews / social proof | **OPEN — needs real customers.** Never invent. |
| T1-07 | Terms + privacy policy | **OPEN** — needed once Telebirr/bank orders and customer photos are handled. Plain language, not EU-scale legalese. Needs the client's refund decision. |

### T2 / T3 — bigger, parked
Long-form list (content, SEO, national-scale features) lives with the Architect. **Tier 3 items (cart,
checkout, customer accounts, an online designer) are explicitly NOT planned** — this is a walk-in shop, not
ifolor. Do not start them unprompted.

### B — 🔴 BLOCKED ON THE CLIENT (no code fixes these)
| ID | Item |
|---|---|
| B-01 | **Real photography** (hero + 6 products + gallery) — biggest single lever. A print shop whose photos look AI-generated is self-defeating; phone photos in natural light beat stock every time. |
| B-02 | One real testimonial / prints-delivered count (unblocks T1-06) |
| B-03 | Exact street address / Plus Code / landmark — "Bole" cannot be routed to |
| B-04 | Real email address (only if she wants one listed) |
| B-05 | Social handles — re-add the footer block when URLs exist |
| B-06 | Refund policy + delivery zones/fees (unblocks T1-07, T1-05 detail) |


### T0 — audit fix pass, 2026-09-21 (`fb809fd`)

Everything below was **measured against the live site** before and after, not inferred from the source.

| Item | Before | After |
|---|---|---|
| Unknown paths | 200 + byte-identical homepage (60221 B) | **404** (3361 B) |
| `styleguide.html` | 200, `max-age=0` — a billable Function hit per crawl | **404** |
| Internal docs (`DESIGN.md`, `STATE.md`, `TOBIA-START-HERE.md`) | 200, publicly readable | **404** |
| `sitemap.xml` | did not exist | live, `application/xml`, referenced from `robots.txt` |
| Raw entities in text nodes | 7 (`&middot;` `&ndash;` `&mdash;` rendered literally) | **0** |
| Hero slides 2–3 | eager, on the critical path | `loading="lazy"`; only slide 1 eager |
| `.seg` tap target | ~26 × 22 px | **44 × 44 px** min |
| `.seg` label contrast | `--text-faint` 2.93:1 (fails) | `--text-mute` 3.48:1 |
| Telegram buttons | 2 buttons labelled "Telegram" pointing at `t.me/+<phone>` — **never worked** | **removed** (no verified handle yet, B-05) |
| Maps link | `?q=Bole+Addis+Ababa` — unroutable district | maps/search deep link |
| `theme-color` | hardcoded cream | `id` + `msapplication-TileColor` added |

**Correction to an earlier claim:** an audit note said the dark-mode `theme-color` sync was missing. It was **not** — it already existed at `main.js:254`. The meta tag simply had no `id`. Recorded here so the mistake is not repeated.

**Copy change:** two strings promised Telegram. Since there is no verified handle, the copy now says WhatsApp only. When Feven supplies a handle (B-05), restore both the buttons and the strings.


### T-00 / T-01 — SHIPPED 2026-09-21 (`b237716`)

| Item | State |
|---|---|
| **T-00** price data file | ✅ `js/norcha-data.js` — all 22 price points, 6 product families, production lead times, volume-tier definitions, and a `quote()` that owns the arithmetic. All prices still flagged **TEMPORARY**. |
| **T-01** holiday deadline engine | ✅ `js/norcha-holidays.js` + strip under the nav. Computes the next Ethiopian occasion, converts it to a real order-by date per product lead time, steps back over Sundays. Four honest states; **hides itself** when nothing is within 75 days. Fully bilingual. |

**Why this is not a copy of Ifolor's Christmas line.** Ifolor has one gift
holiday. Ethiopia has a ladder — Meskel, Enkutatash, Genna, Timket, Fasika,
Mother's Day, graduation — and every one sends families to a print shop in
the same week. So the deadline is computed, not hardcoded, and it is
per-product: a canvas needs 1 production day, a photo book 3.

**A bug found and fixed during this pass:** the first version translated
only the holiday name, so with the site in Amharic the sentence still read
"order within 2 days" in English. Full-sentence translation now lives in
`HOLIDAY_COPY` in `main.js`.

**Not done, deliberately:** the strip does not invent urgency. Once the
deadline passes it stops counting down and says same-day is no longer
guaranteed. A banner that cries wolf is a banner nobody reads.

`TODO.md` holds the full 22-item plan this came from.


### 🔴 REGRESSION + HOTFIX 2026-09-22 (`101ba3a`)

**The live site rendered blank.** A screenshot showed a cream band where the
products, pricing and order form should be, then the footer. The Architect
caught it before any customer did.

**What was actually happening.** The HTML was fine — all 61 `.reveal`
elements were served. But `style.css` has `.reveal { opacity: 0 }`, and the
`.in` class that fades them in is added by `main.js`. So when `main.js`
dies, the page does not look broken. It looks **empty**.

`main.js` was dying on its first statement:

```
line 40:  applyLang(current);          <- calls renderHoliday
line 47:  var HOLIDAY_COPY = { ... };  <- declared AFTER the call
```

`var` hoisting made `HOLIDAY_COPY` undefined, `renderHoliday` read
`HOLIDAY_COPY.am`, and threw. That one throw killed every line after it,
including the `IntersectionObserver` that reveals the page.

**Reproduced before touching anything** (jsdom, real HTML, real script
order):
- before: 61 reveals, **0** visible, 1 thrown error
- after:  61 reveals, **61** visible, no errors

**Root cause of the mistake:** the holiday code was checked with
`node --check`, which only proves a file is *parseable*. It cannot catch a
hoisting bug, because the file is valid — it throws at runtime. Green syntax
was treated as green behaviour. It is not.

**The guard, now committed:** `domtest.js`. It loads the real page in a real
DOM, runs the three real scripts in the real order, and fails loudly if any
error is thrown **or** if any `.reveal` element is still hidden.
`livetest.js` does the same against the deployed URL.

> **Run `node livetest.js` after any deploy that touches `js/` or
> `index.html`.** A blank page passes every other check we have.


### T-02 — SHIPPED 2026-09-22 (`9dafaf1`) · volume pricing + live quote

**The ladder, shaped for this market.** Ifolor runs 2 → −10%, 3+ → −20%,
100 → −50%. Ours is built for weddings, funerals, church events and
graduations, where quantity jumps fast:

| tier | prints | wall (canvas/frames/calendars) | books | gifts (mugs) |
|---|---|---|---|---|
| 1 | — | — | — | — |
| 2–4 | — | −10% | −8% (2+) | −8% (2+) |
| 5–9 | — | −15% | −15% (5+) | — |
| 10–49 | −10% | −22% (10+) | — | −15% (4+) |
| 50–99 | −20% | — | — | −25% (12+) |
| 100–499 | −35% | — | — | — |
| 500+ | −50% | — | — | — |

**Buyer-facing:** a live estimate under the quantity field (unit, discount,
total), plus a **nudge** — "Order 500 or more and get 50% off." Telling
someone the next rung of the ladder is the whole point of volume pricing.

**Shop-facing:** the estimate now travels inside the WhatsApp message —
`Estimated price: 2,437 ETB (volume discount 1,313 ETB, −35%)`. Without it
Feven re-prices every order by hand and the feature is decoration.

**Honest by omission:** "Something else", custom dimensions, and any size
that matches nothing show **no box** rather than a guessed number.

**Four bugs found by testing, before deploy** (see the reasoning below on
why that matters):
1. `renderQuote` called from `applyLang` during boot, but `val()` is defined
   ~200 lines below — the same hoisting class as the blank-page regression.
   Now guarded with a `typeof` check.
2. Mugs and photo books have no size field, so the buyer leaves it blank and
   the box bailed out entirely. Now falls back to the single/first variant —
   **only** when the field is genuinely empty.
3. The discount row was hidden at qty=1 but its `textContent` still held the
   previous product's discount. Cleared, not just hidden.
4. A test that *looked* like it found a pricing bug ("photo book qty=1 →
   −15%") turned out to be bug 3, read back through a stale node. The engine
   was right the whole time. Worth keeping: when a number looks wrong,
   confirm whether you are reading the value or its ghost.

Verified across 15 product/size/quantity combinations in a real DOM, in both
languages, before pushing.


### T-14 + T-17 — SHIPPED 2026-09-22 (`eeaefda`)

**T-14 · hreflang.** The site has called itself bilingual since it shipped,
but Google had no way to know the Amharic and English views are the same
document — so half the work of building two languages was being thrown away.

Three tags (`en`, `am`, `x-default`), all pointing at the **same** url,
because that is the honest description: one page, one language state,
switched client-side. `sitemap.xml` now carries matching `xhtml:link`
alternates and declares the `xhtml` namespace, so the relationship is
stated in both places a crawler looks.

**T-17 · FAQ deep links + schema.** Ten real questions with ten real answers
were on the page but **not linkable** — invisible to search, impossible to
send to a customer.

- Every answer has a stable id from its question (`#do-you-deliver`,
  `#how-do-i-pay`, …)
- Arriving on a deep link opens that answer and scrolls to it
- Opening an answer updates the address bar, so it can be **copied and sent
  on WhatsApp** — which is how this shop actually communicates
- `history.replaceState`, not `pushState`: a FAQ click should not fill the
  back button with ten entries
- `FAQPage` schema with all ten Q&As — answers become eligible to appear
  directly in search results

**Live verification:** 61/61 reveals visible, zero runtime errors, both
JSON-LD blocks valid (`LocalBusiness` + `FAQPage` with 10 questions), three
hreflang tags, ten anchored FAQ items, sitemap alternates present.

## 5. HOW TO UPDATE THIS FILE

- One row per item, with its **commit hash** when shipped. IDs are stable — never renumber them.
- Change a fact only because you **re-measured** it, not because you remember otherwise.
- Anything you have not verified gets **UNVERIFIED** next to it. That word has saved this project real
  embarrassment.
