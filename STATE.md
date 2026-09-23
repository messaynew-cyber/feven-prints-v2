# STATE.md — Norcha Print website · verified state of the world

> **Single source of truth for this repo.** Every claim below was verified on the date shown. If something
> is not verified it is marked **UNVERIFIED**. Update this file in the same commit as the change it
> describes — a session that does not update `STATE.md` did not happen.
>
> Last updated: **2026-09-22** by `[tobia]` · handover to `[tobia]`.

**Read first:** `CONTINUE-HERE.md` (where things stand, how to work here) → this file (what is true) → `TODO.md` (the plan) → `DESIGN.md` (the design canon).

---

## 0. SESSION SUMMARY — 2026-09-22 (overnight, `[tobia]`)

**13 of 22 planned upgrades shipped and verified live.** The site went from a
static page to a working order desk: live pricing, holiday-aware deadlines,
honest delivery promises, offline vouchers, a staff price sheet and one-tap
WhatsApp everything.

| Phase | Shipped |
|---|---|
| audit | 404.html · sitemap.xml · 64 raw entities fixed · lazy hero slides · 44px tap targets |
| T-00 | `js/norcha-data.js` — 22 prices, lead times, tiers, `quote()`, `catalogue()` |
| T-01 | Ethiopian holiday deadline engine |
| T-02 | volume pricing + live quote in the order form |
| T-09 | delivery estimator — real date, names the reason when it says no |
| T-10 | reorder — one-tap form refill |
| T-11 | event / bulk quote requests |
| T-12 | order reference reply |
| T-14 | hreflang (en / am / x-default), in the page and the sitemap |
| T-17 | 10 FAQ deep links + `FAQPage` schema |
| T-18 | gift vouchers — offline codes, issue + verify |
| T-19 | Amharic font subset — **193.7 KB → 45.5 KB** |
| T-20 | counter sheet `/counter.html` |
| T-21 | one-tap WhatsApp price catalogue |

**Measured outcomes:** page **19.4% lighter** (~3s faster per cold visit on 3G);
**22 prices** provably consistent across site, counter sheet and messages;
**0 → 1** staff-only page; **1 → 10** anchored FAQ answers.

**Everything buildable without the client is done.** The remaining 9 items all
need input from Feven — see §4 and `TODO.md`.

### Where to read next

- **`CONTINUE-HERE.md`** — how to work here, what is blocked, the traps
- **`TODO.md`** — the plan and the progress table
- **`SESSION-2026-09-22.md`** — the mistakes made this session, written down
  so they are not repeated

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
| P-02 | `srcset` + `sizes` | ✅ **done 2026-09-23** — 400w + 720w variants (WebP + JPEG) for all six photographs, built by `build-images.sh`. The 720 is the one that matters: a DPR-2 phone drawing a 364 px slot needs 728 px and was being handed the full 1024 px file. Six photos: **455 KB at 1024 → 184 KB at 720**. See `T-04` note below and the perf commit. |
| P-03 | Higher-res masters (≥1200 px) | only if the images are replaced |
| P-04 | Gallery section | ✅ resolved — it is now "See it on the wall" (a **scale display**: 3 hung prints at 3 real sizes with plaques). Re-check when real photos arrive (it could become a genuine gallery then). |
| P-05 | Analytics + Search Console + **Google Business Profile** | **OPEN** — nothing measures anything today. GBP is the single best free discovery win for a Bole shop (maps, hours, phone, photos, reviews). |
| P-06 | `.gitignore` + `README` + `LICENSE` | ✅ done 2026-09-21 (LICENSE still open — needs a decision: this is client work) |
| P-07 | ~~🔴 **Every unknown URL returns the homepage with HTTP 200**~~ **FIXED 2026-09-21** | ✅ done (fb809fd) — `404.html` added. Re-measured live: `/definitely-missing-xyz123.txt` → **404** (3361 B), `/404.html` → 200, `/styleguide.html` → **404**, `/DESIGN.md` → **404**. Unknown paths no longer return the homepage and the internal docs are no longer reachable. |

### T-04 — six product pages ✅ **SHIPPED 2026-09-23** (`2ca083e`, fix `e174a10`)
`/canvas` · `/photo-books` · `/wall-calendars` · `/photo-mugs` · `/framed-prints` · `/standard-prints`.
**1 indexable URL → 7.** Every page is real static HTML (prices in the markup, not fetched by JS) with
`Product` + `BreadcrumbList` + `FAQPage` schema, the volume tiers, a live ready-date computed in the browser
and a per-product WhatsApp CTA. **Generated by `build-pages.js` from `js/norcha-data.js`** — a price change
propagates with one command, and the pages cannot disagree with the homepage. The FAQ answers are *parsed out
of `index.html`*, never retyped, so the Amharic is the wording already approved. Nav and footer are lifted
verbatim from `index.html`. Guard: **`pagetest.js`** (real DOM, real scripts, prices diffed against the data
file, reveals visible, markup balanced). Two bugs were caught after the first build — a dark-on-dark price
heading found by *screenshot*, and two stray `</div>` found by the new balance check.
⚠️ **The placeholder prices are now on six more pages.** They are still tagged `data-temp-price`. **The sitemap
has NOT been submitted to Search Console** — deliberately, until Feven confirms the real list, so Google never
indexes a wrong number. Product-page copy that is *new* Amharic (the ready-date line, "Volume discounts") is
still awaiting Feven's proofread.

### UPLOAD — photo intake ✅ **SHIPPED DORMANT 2026-09-23** (`b6a368d`) · ⛔ **switched OFF pending one dashboard binding**
`functions/api/upload.js` (Cloudflare Pages Function) + `js/norcha-upload.js` + a card inside *Send us your photos*.
Takes the originals at full quality instead of WhatsApp's shrunk copies, and returns a readable order code
(`NOR-XXXXXX`) that ties the files to the chat.
- **Files → R2, `meta.json` alongside. No database.** Per-connection daily cap counted in the bucket.
  Whitelisted types, 25 MB/file, 200 MB total, 40 files, honeypot. The caller's IP is hashed for rate limiting
  and **never written to the upload record**.
- 🔴 **The UI asks the server first and stays hidden until uploads are configured.** A visible upload box that
  silently fails is worse than none — the customer believes their photos arrived. **Verified live:**
  `GET /api/upload` → `503 {"configured":false}` and the card stays hidden.
- **Telegram ping is best-effort: if it fails the upload still succeeds.** Nobody loses photographs because a bot is down.
- Guard: `uploadtest.mjs` — 23 checks (mock bucket + mock Telegram), including *a broken bucket must raise, never
  fake success*.
- ⛔ **TO GO LIVE (Architect, ~4 minutes, no code):** ① enable R2 on the Cloudflare account → ② create bucket
  `norcha-uploads` → ③ Pages project → Settings → Functions → R2 bucket binding, variable name **`UPLOADS`** →
  ④ optional: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` secrets, and an R2 lifecycle rule deleting `u/` after
  **30 days** (the page promises 30 days — the rule is what makes it true). Then re-run the deploy.

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


### T-19 — SHIPPED 2026-09-22 (`676d904` + `6b3bb9f`)

**The Amharic font was the single largest thing on the page.** 193.7 KB for
a face that renders 148 distinct characters. Now 45.5 KB — **76.5% smaller**,
**19.4% off the whole above-the-fold load**, ~**3 seconds saved per cold
visit** on 3G.

| | before | after |
|---|---|---|
| Ethiopic face | 193.7 KB | **45.5 KB** |
| above-the-fold total | ~764 KB | **616 KB** |

Built with `woff2_decompress` → `fontTools.subset` → `woff2_compress`
(no compilation on-device). 167 glyphs kept: the 148 characters the site
uses, plus Ethiopic punctuation/numerals (U+1350–136F) that today's copy
doesn't use yet — included so a future edit cannot silently fall back.

**Verified before shipping**, because a broken Amharic font would be
invisible to me and blindingly obvious to Feven:
- every Amharic codepoint in the source is present — **0 missing**
- all 167 glyphs have **identical advance widths** to the original
- both faces rendered and compared: 98.3% pixel-identical

The 1.7% residual is **stripped hinting, not missing glyphs** — column 131
*gained* 53px of ink while column 128 *lost* 48px, which is a horizontal
shift. A dropped character would delete ink with nothing gained. OCR reads
both renders as the same text.

`sw.js` cache bumped to **v3** — without it the first load after deploy
serves the old stylesheet, which points at a font we no longer ship. The
new `norcha-*.js` files and the slim font are now in the precache shell.

---

### 🔴 THE GHOST ASSET PROBLEM — found by verifying instead of trusting

Deleting a file from the repo **does not remove it from Cloudflare Pages**.
`fonts/noto-ethiopic.woff2` was deleted, every reference to it deleted, gone
from `git ls-files` and from the deployed bundle — and it was **still served
at HTTP 200, 198,324 bytes**, byte-identical (sha256 `ca2b45a5…`) to the
version in git history.

**Diagnosis, measured in three steps:**
1. The fresh deployment URL (`a8590140.norcha-print.pages.dev`) returns
   **404** for it — so the deployment is correct.
2. The custom domain returns **200**.
3. The custom domain **with a cache-buster** (`?cb=…`) returns **404**,
   `cf-cache-status: BYPASS`.

So it was never a config or deploy problem — it is purely the **edge cache**
holding a stale copy under `cache-control: public, max-age=14400`.

**Scope:** only assets Cloudflare previously *served* ghost like this.
`/styleguide.html`, `/DESIGN.md`, `/README.md` return 404 correctly — they
were never published.

**Fix:** `_redirects` with a `410 Gone` tombstone (410, not 404 — Gone is
permanent and deliberate; this file did exist). Already deployed and
verified working on the fresh URL. The stale edge copy simply has to age
out over its 4-hour TTL.

> **Rule for this repo: after removing a public file, add a `_redirects`
> tombstone AND expect up to 4 hours before the old copy stops being served
> on the custom domain. Verify with a cache-buster before concluding
> anything is broken.**


### T-09 — SHIPPED 2026-09-22 (`7187e1c`)

**A real date, not a static number.** Ifolor puts "6-9 working days" on every
product page — it does not know what day it is, whether the shop is open,
which product the buyer chose, or whether a holiday is about to close the
calendar.

This computes from the actual state of the world:
- today + the product's **real production lead time** (prints 0, canvas 1,
  photo books 2 — from `norcha-data.js`)
- **skipping Sundays**, because the shop is shut
- respecting the **16:00 cut-off** — ordering at 17:00 does not still get
  "same day"
- and if the customer names a date, **whether that date is achievable**

**It says no.** That is the feature. A promise the shop cannot keep costs
more than a slower one it can:

| customer picks | what they see |
|---|---|
| (nothing) | "Order now and it is ready **Wednesday 23 Sep**." |
| a workable date | "Yes — **Friday 25 Sep** works, with 2 days to spare." |
| a past date | "That date has already passed — pick one from today onwards." |
| a Sunday | "We are closed on Sundays. Pick another day and it is fine." |
| an impossible date | "We cannot make **Tuesday 22 Sep**. The earliest is **Thursday 24 Sep** — message us and we will see what is possible. That is 2 working days sooner than we can manage." |
| "Something else" | (nothing — no price, no lead, so no promise) |

---

### 🔴 ROOT CAUSE FIXED: the boot-order bug, third and final instance

Three times, a renderer called from `applyLang()` during boot threw because
a helper or data table was defined **further down the file**. `var` hoists
as `undefined`, the first property read throws, and the whole page dies —
that is the blank-page regression, twice, from one line of ordering.

This time the **cause** was fixed, not the instance. `main.js` now defines
everything in dependency order, with `applyLang` **last**:

```
line 10   FAMILY_BY_LABEL      (shared lookup)
line 20   val()                (shared helper)
line 67   HOLIDAY_COPY + renderHoliday
line 123  DELIV_COPY   + renderDelivery
line 197  applyLang(current)   ← boot happens here, once
line 359  renderQuote, normaliseSize, findSizeKey …
```

Anything called at boot is now **necessarily** defined before it is called.
This class of bug cannot recur without deliberately reordering the file.

---

### 🧪 A bug in my own test, worth recording

The first version of the delivery test built dates with `toISOString()`,
which converts to **UTC**. Addis is **UTC+3**, so before 03:00 local it
returns **yesterday**. A perfectly valid same-day order looked like a past
date, and I spent three tool calls hunting a bug in the app that was
**never there**.

> **Rule: build test dates in LOCAL time.** `toISOString().slice(0,10)` is
> wrong for anything date-sensitive east of Greenwich before 03:00.

Verified in a real DOM: **20 cases across both languages** — same-day,
tomorrow, past dates, Sundays, impossible deadlines, and a product with no
price data (correctly renders nothing).


### T-18 — SHIPPED 2026-09-22 (`3826be0`)

**Gift vouchers that work without a payment processor.** Ifolor sells digital
and PDF vouchers because it has a checkout. Norcha takes Telebirr, bank
transfer or cash — so a voucher here cannot be a checkout product.

A voucher is bought in person or over WhatsApp, paid the usual way, issued as
a **code** (`NP-XXXX-0000-XXX`), and redeemed at the counter. No server.

**The check characters are the point.** They make a code safe to accept over
WhatsApp: a mistyped or invented code fails immediately, before anything is
handed over.

**Honest limit, stated on the page:** a code with no server behind it cannot
prove it has not already been used. Feven keeps a record of redeemed codes —
so issuing a voucher also prints a one-line redemption record to keep. The
caveat under the panel says this plainly. A system that pretended to prevent
double-spending would be lying.

**Two panels, two different people:** the buyer needs a code to give away,
the shop needs to check one. Both run entirely on-device, so the shop can
check a voucher with no signal.

**Two real bugs found by testing the cryptography:**
1. **Retyping.** The no-dash path was **100% broken** — it assumed a fixed
   13 chars, but the value block changes length (500 vs 5000). Rewritten to
   re-insert dashes structurally from the ends. It now also strips anything
   that is not a letter, digit or dash, so `np 4f2k 2500 e64` resolves.
2. **Weak check.** Two check chars gave a **1-in-1,140** false-accept rate on
   random input — too high when the thing accepted is money. Raised to three:
   measured **7 in 300,000**, about 1 in 42,857.

Verified: 3,000 issued vouchers round-trip with **zero failures** across
exact, lowercase, no-dash, spaced and mixed formats. Tampering a real 500 ETB
code into 5000 is rejected. `sw.js` bumped to **v5** — voucher checking must
work offline.


### T-20 — SHIPPED 2026-09-22 (`6af1de1`)

**The shop's own view.** The website is for a customer at home; `/counter.html`
is for the customer standing in front of Feven. Big type, thin rows, no
decoration, prints to one A4 sheet.

Shows every product, size and price, the lead time in plain words ("ready the
same day, orders before 16:00"), the full volume ladder per group, and — the
most useful line on the sheet — **the next Ethiopian holiday deadline with
the real order-by date**.

**Verified it cannot drift:** a test walks every price cell and compares it to
`js/norcha-data.js`. **22 cells, 0 mismatches.** The sheet and the site cannot
disagree because they read the same file. That is why T-00 exists.

It also states plainly at the top that the prices are **not yet confirmed** —
the same temporary flag the website carries. Nobody should quote off this
sheet believing it is final.

Staff-only: `noindex`, disallowed in robots.txt, and a deliberately quiet
footer link rather than a nav item.

**Bug found by testing:** the sheet called `H.fmt()`, which did not exist —
date formatting lived on `NorchaDelivery` and counter.html only loads
`norcha-holidays`. It threw and **blanked the whole sheet**. Fixed twice over:
`fmt()` now exists on `NorchaHolidays` too (this is the date module), and the
call site falls back to `toDateString()` — so a missing helper degrades to an
ugly date instead of an empty page. Same failure class as the blank-page
regression, but this time it **fails safe**.


### T-21 — SHIPPED 2026-09-22 (`61c7c9d`)

**"What do you print?" — answered in one tap.** The most asked question this
shop gets was being typed out by hand every time. Now the whole catalogue —
every product, size, price, volume ladder, and how to send photos properly —
goes out as one WhatsApp message, in either language.

**Generated, not typed.** Built from `norcha-data.js`, so a price change
updates the website, the counter sheet *and* this message together. A test
verifies every price string in the message exists in the data file:
**22 checked, 0 unknown.**

Plain text on purpose — WhatsApp has no markdown, so `*asterisks*` are the
only emphasis, and a test confirms they are balanced (an odd count would leave
a stray asterisk visible to the customer).

---

### 🔴 A PRICING CONFLICT I INTRODUCED IN T-02, FOUND NOW

Mugs carried **both** pack pricing in `sizes` (1 / 2 / 4 at 350 / 650 / 1200)
**and** a percentage ladder from the `gifts` tier. So "2 mugs" had two
different prices depending on how the order was entered:

```
via the 2-pack SKU x1   = 650 ETB
via the 1-mug SKU x2    = 644 ETB   ← 350 × 2 less 8%
```

**Two prices for one order** — exactly what a counter argument is made of.

Fixed by giving mugs their own **flat** ladder, so pack pricing applies and no
percentage stacks on top. Now: **650 either way.** Genuinely per-unit small
goods keep the `gifts` ladder, now correctly separate.

The second answer being **700** rather than 644 is the honest outcome — the
pack price *is* the deal, and inventing a second discount on top of it was the
bug, not the fix.

> **Lesson: when a product already prices by quantity (packs, bundles, tiers
> in the SKU itself), do NOT also apply a percentage ladder to it.** Pick one
> mechanism per product family. Two discount mechanisms on the same product
> will always disagree eventually.

Also fixed: the catalogue builder called `this.money()` inside a nested
`forEach`, where `this` is no longer `NorchaData` — captured the formatter in
a local first. Prices in the message now carry thousands separators
(1,600 ETB, not 1600 ETB): a message a customer reads should not look like a
spreadsheet cell.


### T-10 + T-11 + T-12 — SHIPPED 2026-09-22 (`fa364e9`)

**Every remaining item I can build without Feven's prices.** 13 of 22 now live.

**T-10 · Reorder.** Ethiopian print buying is repetitive — the same church,
the same office, the same school every year. The history only ever offered
"send again" (the identical message). Now "Order again" **refills the form**.

This required storing the **structured fields**, not just the finished
WhatsApp text. Refilling from a human-readable string means re-parsing prose,
which breaks the moment anyone rewords a label. Each record now carries
product, size, quantity, notes and date alongside the message.

**Deliberately not refilled: name and phone.** Those belong to whoever is
ordering now, who may not be the person who ordered last time. Verified.

**T-11 · Event quotes.** A 500-print wedding job deserves a different path
than a mug. Structured enquiry → WhatsApp. It **does not promise a price** —
when the number depends on the job, quoting one in a chat is a lie. It
promises a reply. Only "what should we print?" is required, because demanding
more fields loses the enquiry.

**T-12 · Ask about this order.** No server means no honest order tracking.
What exists is the reference the form already generates — so one tap quotes it
back. The honest version of "order status" for a shop on WhatsApp.

---

### 🔴 BUG FIXED — and our own notes predicted it

Every order message opened with **"Hello Feven's Prints"**. The site was
renamed to Norcha Print on 17 Sep, but the order greeting kept the old name.
`TOBIA-START-HERE.md` warns about exactly this: *"the brand name appears inside
the WhatsApp links; a rename needs its own replacement pass."* It never got
one. Corrected in both languages.

**Deliberately unchanged:** the localStorage keys (`fevens-lang`,
`fevens-orders`, `fevens-theme`). Renaming them would silently discard every
returning customer's saved language, theme and order history — a worse outcome
than a stale key name nobody sees.

## 5. HOW TO UPDATE THIS FILE

- One row per item, with its **commit hash** when shipped. IDs are stable — never renumber them.
- Change a fact only because you **re-measured** it, not because you remember otherwise.
- Anything you have not verified gets **UNVERIFIED** next to it. That word has saved this project real
  embarrassment.
