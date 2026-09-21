# TODO.md — Norcha Print upgrade plan

> Created 2026-09-22 by `[tobia]`, from the ifolor.fi/en benchmark.
> Every item below is an **upgrade**, not a copy. Ifolor serves a €-market
> with credit cards and ERP. Norcha serves Bole with Telebirr, WhatsApp and
> a family counter. A feature is only on this list if it survives that test.
>
> **Legend:** ID · title · why it pays for itself
> Priority: P0 = do first (highest revenue/effort) · P1 = high value · P2 = polish
> Blocker `[F]` = needs something from Feven · `[A]` = needs a decision from the Architect

---


---

## PROGRESS — updated 2026-09-22

**7 of 22 shipped and live on norchaprint.com.**

| ID | Item | State | Commit |
|---|---|---|---|
| T-00 | price data file | ✅ shipped | `b237716` |
| T-01 | holiday deadline engine | ✅ shipped | `b237716` |
| T-02 | volume pricing + live quote | ✅ shipped | `9dafaf1` |
| T-09 | delivery estimator | ✅ shipped | `7187e1c` |
| T-14 | hreflang | ✅ shipped | `eeaefda` |
| T-17 | FAQ anchors + schema | ✅ shipped | `eeaefda` |
| T-19 | Amharic font subset (−76.5%) | ✅ shipped | `676d904` |
| T-18 | gift vouchers | ⬜ next | — |
| T-20 | counter mode / staff sheet | ⬜ | — |
| T-21 | WhatsApp catalogue message | ⬜ | — |
| T-10 | draft orders + reorder | ⬜ | — |
| T-11 | quote requests (weddings) | ⬜ | — |
| T-12 | order reference reply | ⬜ | — |
| T-13 | returns policy | ⛔ blocked [F-4] | — |
| T-03 | public price list | ⛔ blocked [F-1] | — |
| T-04 | 6 product pages (0 → 6 indexable URLs) | ⛔ blocked [F-1] | — |
| T-05 | greeting cards | ⛔ blocked [F-1] | — |
| T-06 | wall materials | ⛔ blocked [F-1,F-3] | — |
| T-07 | calendar range | ⛔ blocked [F-1] | — |
| T-08 | textiles + small goods | ⛔ blocked [F-3] | — |
| T-15 | social proof slot | ⛔ blocked [F-6] | — |
| T-16 | Google Business Profile + map pin | ⛔ blocked [F-2] | — |

**Also shipped outside the plan:** 404.html, sitemap.xml, robots, scroll-target fix,
the blank-page regression hotfix, and the `domtest.js`/`livetest.js` guard.

**Two rules learned the hard way, now in STATE.md:**
1. `node --check` proves a file *parses*, not that it *works*. A hoisting bug is valid
   JavaScript that throws at runtime — it shipped a blank page twice. Run
   `node livetest.js` after any deploy touching `js/` or `index.html`.
2. Deleting a file from the repo does **not** remove it from Cloudflare. Add a
   `_redirects` tombstone and allow ~4 hours for the edge cache to release the old copy.
   Verify with a cache-buster before concluding anything is broken.

---

## PHASE 0 — FOUNDATION (do before anything else)

### T-00 · Armenian... no: **the work queue itself**
- [x] Audit pass 1-9 shipped (`fb809fd`) — 404, sitemap, entities, lazy, tap targets
- [x] `hreflang` pairs — EN/AM declared as one page in two languages
- [ ] Split prices into a **data file** so every later feature reads one source

---

## PHASE 1 — THE MONEY FEATURES (P0)

### T-01 · Holiday deadline engine  ⭐ highest revenue-per-byte
**Ifolor:** "Last order dates for Christmas" — one static line.
**Norcha upgrade:** a **live Ethiopian-calendar deadline strip** that knows
Meskel, Genna, Timket, Fasika, Enkutatash, Eid, plus school graduation.
- Runs on real dates, not a hardcoded string — next deadline computed in JS
- Shows days remaining ("Order within 4 days for Genna")
- **Different print products get different lead times** (canvas +1 day,
  photo books +2-3 days) so the deadline is product-aware, not one number
- Bilingual, and it disappears by itself when there is no upcoming holiday
- **Why:** every family in Addis prints photos before a holiday. A countdown
  converts. Nobody in Ethiopia is doing this.

### T-02 · Volume pricing tiers (Ethiopian buying behaviour)
**Ifolor:** 10% at 2, 20% at 3+, 50% at 100+ prints.
**Norcha upgrade:** tiers designed for **weddings, funerals, church events,
graduations** — the events where Ethiopians actually buy in bulk.
- Tier table on the order form: live total as quantity changes
- Configurable per product (photo prints tier differently to photo books)
- "Ask about 500+" WhatsApp path for the big church/wedding jobs
- **Why:** she is currently leaving margin on the table every single bulk order.

### T-03 · Real price list (public page + honest tiers)
**Ifolor:** a public Prices page.
**Norcha upgrade:** a **proper `/prices` page** — every product, every size,
every finish, in ETB **and** the bulk tiers from T-02.
- Kills the "temp prices" problem in STATE.md T1-02
- Printable / screenshot-able (customers forward it on WhatsApp)
- **Why:** "how much?" is the #1 WhatsApp question. Answer it before it's asked.
- Blocked `[F]` on real prices.

### T-04 · Product pages (6 indexable URLs)
**Ifolor:** one page per product, with variants.
**Norcha upgrade:** a **real page per product family** — `/canvas`,
`/photo-books`, `/calendars`, `/mugs`, `/frames`, `/prints`.
- Each with: sizes, prices, lead time, the holiday deadline, WhatsApp CTA
- Schema.org `Product` markup on each
- Turns **0 indexable URLs into 6**
- Blocked `[F]` on real prices.

---

## PHASE 2 — PRODUCT RANGE (P1)

### T-05 · Greeting cards  ⭐ highest margin product in print
**Ifolor:** Birthday / Wedding / Baby / Sympathy.
**Norcha upgrade:** **Ethiopian occasion set** —
Genna (Christmas) · Timket · Fasika (Easter) · Meskel · Enkutatash (New Year) ·
Wedding · New baby · Condolence · Graduation.
- Sent with the actual Amharic greeting printed on it
- Sold in packs (see T-02 tiers)
- **Why:** zero inventory, highest margin, occasion-driven, and nobody local
  is doing bilingual occasion cards properly.

### T-06 · Wall material expansion
**Ifolor:** 14 wall products.
**Norcha upgrade:** add what is **actually makeable in Bole** —
Acrylic block, HD metal print, Aluminium Dibond, poster + hanger, gallery print.
- Only add materials she can physically produce — verify first `[F]`
- **Why:** canvas is 1 product. Materials multiply the average basket.

### T-07 · Calendar range
**Ifolor:** 7 calendar types.
**Norcha upgrade:** Wall, Desk, and **Ethiopian-calendar wall calendar** —
the 13-month Ge'ez calendar is a genuinely differentiated product nobody
outside Ethiopia can offer.
- **Why:** the Ge'ez calendar version is unique and defensible.

### T-08 · Textiles + small goods
**Ifolor:** pillows, blankets, towels, T-shirts, mouse pads, magnets, keychains.
**Norcha upgrade:** start with what is cheap to make and high-margin —
photo mugs (have), **keychains, magnets, photo puzzles**.
- Blocked `[F]` on what equipment exists.

---

## PHASE 3 — ORDERING EXPERIENCE (P1)

### T-09 · Delivery estimator
**Ifolor:** "6-9 working days" per product.
**Norcha upgrade:** **date-aware delivery promise** —
pick a date, get told if it is achievable, per product.
- "Order today → ready Friday 26 Sep" instead of a vague "same day"
- Accounts for the product lead time AND the holiday cutoff (T-01)
- **Why:** removes the most common source of disappointment.

### T-10 · Draft orders + "Order again"
**Ifolor:** save projects, reorder.
**Norcha upgrade:** the localStorage order history already exists —
add **one-tap reorder** and **save a draft** before sending on WhatsApp.
- **Why:** repeat customers are the cheapest revenue there is.

### T-11 · Quote requests (bulk / wedding path)
**Ifolor:** QUOTE_MANAGEMENT for business buyers.
**Norcha upgrade:** a **"Wedding / event enquiry"** form that composes a
structured WhatsApp message: date, quantity, product, budget.
- **Why:** a 500-print wedding job deserves a different path than a mug.

### T-12 · Order status sanity (no faking it)
**Ifolor:** full returns management + order tracking.
**Norcha upgrade:** **do NOT fake tracking.** Instead — the honest version:
the order reference already generated (`FP-XXXX`) gets a "reply with your
reference" WhatsApp deep link. No server, no lie.
- **Why:** STATE.md already decided not to fake this. Keeping that.

### T-13 · Returns / satisfaction policy
**Ifolor:** satisfaction guarantee page.
**Norcha upgrade:** the **plainest possible** reprint guarantee in EN + AM.
- "Print came out wrong? We reprint it. No argument."
- Unblocks T1-07 (privacy + terms).
- Blocked `[F]` on her decision.

---

## PHASE 4 — DISCOVERY & TRUST (P1/P2)

### T-14 · hreflang + proper bilingual SEO
Currently 2 languages, **zero** hreflang. Half the value is thrown away.
- `hreflang="en"` / `hreflang="am"` pairs + `x-default`
- **Why:** 10 lines for real search gain.

### T-15 · Social proof slot (never fabricated)
**Ifolor:** Trustpilot widget.
**Norcha upgrade:** a **placeholder that stays empty** until real customers
exist — plus an easy way to add them.
- Hard rule from STATE.md: never invent a testimonial.
- Add a "leave a review" WhatsApp path so reviews can start arriving.

### T-16 · Google Business Profile + real map pin
Single best free discovery win for a Bole shop. Blocked `[F]` on exact address.

### T-17 · FAQ as real URLs
FAQ exists but is not linkable. Give each answer its own anchor + `FAQPage`
schema so Google can surface them directly.

### T-18 · Gift vouchers
**Ifolor:** digital + PDF vouchers.
**Norcha upgrade:** a simple **code-based voucher** sold at the counter,
redeemable over WhatsApp. No payment processor needed.
- **Why:** the easiest new revenue line that needs no new equipment.

### T-19 · Accessibility & polish pass
- Full AA contrast audit, keyboard path through the order form
- Persian... no: **Amharic font subset** (193 KB → ~40 KB, −150 KB off load)

---

## PHASE 5 — THE CLIENT-FACING BITS (P2)

### T-20 · Counter mode / staff screen
A printable A4 + a phone-friendly page the shop can show customers:
prices, sizes, lead times, holiday cutoffs. No internet needed.
- **Why:** the website is for the customer at home; this is for the
  customer standing in the shop.

### T-21 · WhatsApp catalogue message
One tap that sends a **formatted product + price list** into a chat,
so Feven can answer "what do you print?" with a real answer.

---

## BLOCKED ON FEVEN `[F]`

| Ref | What | Unblocks |
|---|---|---|
| F-1 | **Real prices** for every product/size | T-03, T-04, T-02 |
| F-2 | Exact street address / Plus Code | T-16, maps |
| F-3 | Which wall materials she can actually make | T-06, T-08 |
| F-4 | Refund / reprint policy decision | T-13 |
| F-5 | Telegram handle (or confirm none) | restore Telegram buttons |
| F-6 | Real customer photos (no AI-generated) | T-15, gallery |
| F-7 | Social handles | footer social block |

---

## ORDER OF WORK

```
1. T-00 hreflang + price data file     (no blockers, 30 min)
2. T-01 holiday deadline engine        (no blockers, high value)
3. T-14 hreflang SEO                   (10 lines)
4. T-02 volume tiers                   (needs F-1 to be final, usable now)
5. T-17 FAQ anchors + schema           (no blockers)
6. T-13 returns policy                 (needs F-4)
7. T-18 gift vouchers                  (no blockers)
8. T-09 delivery estimator             (no blockers)
9. T-05 greeting cards                 (needs F-1)
10. T-03/T-04 prices + product pages   (needs F-1)
11. T-06/T-07/T-08 range expansion     (needs F-1, F-3)
12. T-10/T-11/T-12 order experience    (no blockers)
13. T-15/T-16 trust + discovery        (needs F-2, F-6)
14. T-19/T-20/T-21 polish + staff      (no blockers)
```

**Rule for every item:** the repo is PUBLIC and push is deploy. Nothing ships
with a fake number, a fake review, or a guess at a price.
