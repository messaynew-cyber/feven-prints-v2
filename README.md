# Norcha Print — website

**Live:** https://norchaprint.com · **Repo is PUBLIC and is the deploy source — every push to `main` publishes.**

A one-page, bilingual (EN / አማርኛ) site for a family print shop in Bole, Addis
Ababa. No build step, no framework, no server. Plain HTML/CSS/JS on Cloudflare
Pages.

The shop takes orders over **WhatsApp** — that is the whole commerce model.
Nothing on this site processes a payment.

---

## Picking this up cold?

Read, in order:

1. **`CONTINUE-HERE.md`** — where things stand, how to work here, what is blocked
2. **`STATE.md`** — what is true, with commit hashes and measurements
3. **`TODO.md`** — the 22-item plan and progress
4. **`DESIGN.md`** — the design canon. Read before changing anything visual.
5. **`SESSION-2026-09-22.md`** — what happened last session, including mistakes

---

## Working on it

```bash
cd $HOME/fpv2 && git pull

# make your change, then ALWAYS run both:
node domtest.js     # real page, real DOM, real script order
node livetest.js    # same, against the DEPLOYED url

git add -A && git commit -m "..." && git push   # push IS deploy
```

### 🔴 Before you push

- **`node --check` only proves a file parses.** It cannot catch a hoisting bug
  that throws at runtime. That shipped a **blank page to this live site twice.**
  Always run the test scripts above.
- **Bump `sw.js` `CACHE`** when `css/`, `js/` or any precached file changes, or
  returning visitors keep the old version.
- **Never hardcode a price.** They live in `js/norcha-data.js`, and only there.
- **Never invent** a price, testimonial, review or credential.
- **Removing a public file?** Deleting it from the repo does **not** remove it
  from Cloudflare. Add a `_redirects` tombstone (410) and allow ~4 hours for
  the edge cache. Verify with a cache-buster before assuming something broke.

---

## File map

| File | What it is |
|---|---|
| `index.html` | the entire site, one page |
| `counter.html` | staff price sheet — `noindex`, prints to one A4 |
| `404.html` | not-found page |
| `_redirects` | Cloudflare tombstones (410 Gone) |
| `js/norcha-data.js` | **single source of truth** — prices, lead times, tiers, `quote()`, `catalogue()` |
| `js/norcha-holidays.js` | Ethiopian occasion calendar, order-by dates, date formatting |
| `js/norcha-delivery.js` | ready-date maths — lead times, Sundays, the 16:00 cut-off |
| `js/norcha-voucher.js` | offline gift-voucher codes (issue + verify) |
| `js/main.js` | everything else — **ordering sensitive, see CONTINUE-HERE.md §3** |
| `css/style.css` | all styling |
| `domtest.js` / `livetest.js` | regression guards — run before every push |

---

## What is notable about this build

- **Zero dependencies.** No framework, no CDN, no analytics, no third-party
  scripts. The whole page is ~616 KB above the fold, and it works on one bar
  of signal in Bole.
- **Self-hosted fonts**, with the Amharic face subset to the 167 glyphs the
  site actually uses (193.7 KB → 45.5 KB).
- **A real Ethiopian holiday deadline engine** — computes the next occasion
  (Meskel, Genna, Timket, Fasika, Enkutatash…) and converts it to an honest
  order-by date per product.
- **A delivery estimator that says no.** It names the reason and the earliest
  real date rather than rounding in the customer's favour.
- **Everything orderable works offline**, including voucher verification at
  the counter.

---

## The one thing that matters most

Prices in `js/norcha-data.js` are marked **TEMPORARY**. They came from the
existing site, not from the shop. Everything else — the counter sheet, the
WhatsApp catalogue, the order form quotes — is generated from that file, so
**confirming them once updates all of it.**

See `TODO.md` §BLOCKED.
