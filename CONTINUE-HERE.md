# CONTINUE-HERE.md — Norcha Print

**Read this file, then `STATE.md`, then `TODO.md`. That is the whole context.**

Last session: **2026-09-22, overnight** by `[tobia]`. Handing to: **you, next session.**

---

## 1. WHERE THINGS STAND

**15 of 22 planned upgrades are shipped and live on https://norchaprint.com.**
Every one was verified against the deployed site, not just the repo.

| Phase | Item | State |
|---|---|---|
| — | audit pass: 404, sitemap, entities, lazy images, tap targets | ✅ |
| T-00 | price data file (`js/norcha-data.js`) | ✅ |
| T-01 | Ethiopian holiday deadline engine | ✅ |
| T-02 | volume pricing + live quote in the order form | ✅ |
| T-09 | delivery estimator (real date, not "6-9 days") | ✅ |
| T-10 | reorder — one-tap form refill | ✅ |
| T-11 | event / bulk quote requests | ✅ |
| T-12 | order reference reply | ✅ |
| T-14 | hreflang (en / am / x-default) | ✅ |
| T-17 | FAQ deep links + `FAQPage` schema | ✅ |
| T-18 | gift vouchers (offline codes) | ✅ |
| T-19 | Amharic font subset (−76.5%) | ✅ |
| T-20 | counter sheet (`/counter.html`) | ✅ |
| T-21 | one-tap WhatsApp price catalogue | ✅ |
| **T-04** | **six product pages (1 → 7 indexable URLs)** | ✅ **2026-09-23** |
| perf | responsive images (400w/720w + `sizes`) | ✅ **2026-09-23** |

**Everything buildable without the client is done.** The remaining 9 items all
need something from **Feven** — see §4.

**Update 2026-09-23 (`[adwa]`):** T-04 contradicts "blocked on F-1". The site was already serving placeholder
prices in public, and the data file is already the single source — so the six pages were built from the same
numbers rather than waiting. They must be **regenerated** (`node build-pages.js`) the moment real prices land;
that is one command, and the sitemap deliberately stays out of Search Console until then.

---

## 2. THE SINGLE MOST IMPORTANT THING

> ### 🔴 Get 20 minutes with Feven, with `/counter.html` open on a phone.

That page lists every product, size, price and lead time from the live data
file. She reads down it and says **yes / no / actually it's X**.

That one conversation unblocks **6 of the 9** remaining items at once —
including **T-04 (six product pages), which takes the site from 1 indexable
URL to 7.** It is the biggest commercial win left on the list.

Everything else on the plan is waiting on that, and I would rather not invent
prices for a real business.

---

## 3. HOW TO WORK IN THIS REPO

### The loop that works

```bash
# linux_run — the repo lives ONLY in the Termux rootfs
cd $HOME/fpv2 && git pull

# make the change, then ALWAYS:
node domtest.js          # loads the real page in a real DOM, real scripts
node livetest.js         # same, against the DEPLOYED url

# then commit and push — PUSH IS DEPLOY
TOK=$(cat /storage/emulated/0/Download/.ghtok)   # stage it first, see below
git add -A && git commit -m "..." && \
  git push "https://${TOK}@github.com/messaynew-cyber/feven-prints-v2.git" main
```

Stage the token from `get_api_key("GITHUB_TOKEN")` via `run_python`, write it
to `/storage/emulated/0/Download/.ghtok`, use it, then **delete it**. Never
commit it — **the repo is PUBLIC and it is the deploy source.**

### 🔴 THE TWO RULES THAT COST ME THE MOST TIME

**1. `node --check` proves a file PARSES, not that it WORKS.**
A hoisting bug is valid JavaScript that throws at runtime. It shipped a
**blank page to a live client site twice.** Always run `domtest.js` /
`livetest.js`. A blank page passes every other check we have.

**2. Write repo files with `linux_run`, never `run_python`.**
`run_python` sees the Android sandbox; the repo is in the Termux rootfs. Edits
via `run_python` go to a **copy**, silently, with no error.

### Ordering rule inside `js/main.js` (this bit me three times)

Shared helpers and data tables **must** be defined before `applyLang(current)`
runs. Current safe order:

```
line ~10   FAMILY_BY_LABEL
line ~20   val()
line ~57   HOLIDAY_COPY + renderHoliday
line ~103  DEL_VOUCHER/QUOTE copy + renderers
line ~197  applyLang(current)      ← boot happens here, once, LAST
line ~359  renderQuote and friends
```

Anything called at boot is now necessarily defined first. **Do not reorder
these without re-running the tests.**

### Other repo rules

- **Removing a public file?** Deleting it from the repo does **not** remove it
  from Cloudflare. Add a `_redirects` tombstone (410) **and** allow ~4 hours
  for the edge cache to release the old copy. Verify with a cache-buster
  (`?cb=123`) before concluding anything is broken.
- **Bump `sw.js` `CACHE`** on any change to `css/`, `js/` or a precached file,
  or returning visitors keep the old copy.
- **Prices live in `js/norcha-data.js` and nowhere else.** Never hardcode one
  in a page. `counter.html` has a test proving it cannot drift. The six product
  pages are **generated** — edit the generator or the data file, never the output.
- **Never patch generated files by hand.** `build-pages.js` overwrites them.
- **Images:** run `bash build-images.sh` after adding or replacing a photograph,
  then `node build-pages.js`. It rewrites the srcset in `index.html` and verifies
  its own output (its first version emitted an invalid candidate list that would
  have silently pushed everyone onto the heavier JPEG).
- **One discount mechanism per product family.** Mugs had pack prices *and* a
  percentage ladder, which produced two prices for "2 mugs". Fixed; don't
  reintroduce it.
- **Never invent** a price, a testimonial, a review or a credential.

---

## 4. WHAT IS BLOCKED, AND ON WHAT

| Ref | Needed from Feven | Unblocks |
|---|---|---|
| **F-1** | **Real prices** | T-03 price list · **T-04 six product pages** · T-05 greeting cards · T-06 wall materials · T-07 calendar range |
| F-2 | Exact street address / Plus Code | T-16 Google Business Profile, real map pin |
| F-3 | Which materials she can physically make | T-06, T-08 |
| F-4 | Refund / reprint policy decision | T-13 |
| F-5 | Telegram handle (or confirm none) | restore the Telegram buttons |
| F-6 | Real customer photos (never AI ones) | T-15 social proof, gallery |
| F-7 | Social handles | footer social block |

---

## 5. FILE MAP

```
index.html                 the whole site (one page)
counter.html               staff price sheet — noindex, printable A4
404.html                   not-found page
_redirects                 Cloudflare tombstones (410 Gone)
js/norcha-data.js          🔴 SINGLE SOURCE OF TRUTH: prices, lead times,
                             tiers, quote(), catalogue()
js/norcha-holidays.js      Ethiopian occasion calendar + order-by dates + fmt()
js/norcha-delivery.js      ready-date maths: lead times, Sundays, 16:00 cutoff
js/norcha-voucher.js       offline voucher codes (issue + verify)
js/main.js                 everything else. ORDERING SENSITIVE — see §3.
domtest.js                 local regression guard — RUN BEFORE EVERY PUSH
livetest.js                same, against the deployed URL
STATE.md                   what is true, with commit hashes
TODO.md                    the 22-item plan + progress table
DESIGN.md                  the design canon (read before visual changes)
TOBIA-START-HERE.md        original brief (still accurate, but older)
```

---

## 6. USEFUL COMMANDS

```bash
# verify the live site end to end
cd $HOME/fpv2 && node livetest.js

# check what the LIVE data module actually says
curl -sL https://norchaprint.com/js/norcha-data.js

# are prices still drifting? (should be 0)
# the counter-sheet test does this; see STATE.md T-20
```

Deploy takes ~1 minute. Watch it with
`check_workflow_status("messaynew-cyber/feven-prints-v2")` or the GitHub API.

---

## 7. IF YOU ONLY DO ONE THING

Get the prices. Everything left is downstream of that.
