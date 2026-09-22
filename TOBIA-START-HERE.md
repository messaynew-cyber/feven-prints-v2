# TOBIA — START HERE · Norcha Print

> ## ⚠️ THIS FILE IS NOW HISTORICAL
>
> It was written before the 2026-09-22 upgrade session. It is still accurate
> about the repo, the deploy and the working method — but the plan it refers to
> has moved on.
>
> **Read `CONTINUE-HERE.md` first, then `STATE.md`, then `TODO.md`.**
> Come back here for the background detail and the hard-won traps.

---


## 1. You can push this yourself — VERIFIED, not assumed

Checked on 2026-09-21: your Linux lane has **git 2.55.0** and **curl**, and your **GitHub Personal Access
Token is valid**. So you clone, edit, commit and push. **No bridge through Adwa.**

```bash
# via linux_run
cd ~ && rm -rf feven && git clone https://github.com/messaynew-cyber/feven-prints-v2.git feven && cd feven
git config user.name "Tobia"
git config user.email "tobia@adwa.local"
# authenticate ONCE, without leaving the token in the command line or in any committed file:
git remote set-url origin "https://<YOUR_GITHUB_PAT>@github.com/messaynew-cyber/feven-prints-v2.git"
```

**PUSH = DEPLOY.** `.github/workflows/deploy-pages.yml` runs on every push to `main` and publishes to
Cloudflare Pages via `cloudflare/wrangler-action@v3`. Both required secrets are already configured — you do
**not** deploy by hand and you must not try to. Commit → push → wait ~1 minute → verify (§3).

### Hard rules

- 🔴 **The repo is PUBLIC and it is the deploy source. Everything you commit is public.** No credentials, no
  client commercial terms, no internal notes — not in files, not in commit messages.
- 🔴 **Never force-push. Never rewrite history.** Do not commit to another branch unless you *want* it
  un-deployed.
- 🔴 **`DESIGN.md` and `styleguide.html` are internal working documents.** The deploy stages only visitor
  files (`rsync` excludes `*.md`, `DESIGN.md`, `styleguide.html`, `.gitignore`) so they are **not on the
  site** — but they **are** readable on GitHub. Keep them free of anything you would not put on a billboard.
- **No framework, no build step, no npm.** This is deliberately plain HTML/CSS/JS — it has to load fast on
  Ethiopian mobile data and keep working from a static host forever.

---

## 2. Before every push — the three checks

1. **It parses.** No unclosed tags, no stray `<!--`. `index.html` is one ~1,700-line file: one bad edit takes
   down the entire site *including the WhatsApp ordering path*.
2. **The links resolve.** Every `href="#x"` has a matching `id="x"`; every `<img src>` exists in `img/`; the
   language toggle still switches **every** string both ways (EN ⇄ አማርኛ) — it is a class flip, so a new
   element must carry both language variants.
3. **LOOK AT IT.** After the push:
   - `fetch_url https://norchaprint.com` — raw sanity.
   - `open_url` + `browser_snapshot`, or `take_photo` → `vision_analyze` — **verify the rendered page.**
   - Load it at **~390 px wide** too. Almost every visitor is on a phone.
   **Never report "done" from source code alone.** Every bug in §5 was found by *looking*, not by reading.

---

## 3. Confirming a deploy actually happened

Do not trust "pushed, therefore live":

```bash
# 1. did CI go green?
curl -s -H "Authorization: Bearer <YOUR_GITHUB_PAT>" \
  "https://api.github.com/repos/messaynew-cyber/feven-prints-v2/actions/runs?per_page=3" | head -c 800
```
Then fetch the live URL and confirm the change is actually in the HTML you get back. **A green CI run that
does not change the page has happened here before** (see §5, "the dead hover").

---

## 4. The design canon is LOCKED — read `DESIGN.md` before you touch a colour, a font or a spacing value

The single line that rules everything:

> **"A white netela with coloured tibeb borders."** Cream ground. Ethiopian identity lives in **woven
> borders, colour roles and Amharic typography** — never in a colour wash. If a change makes the site look
> more like a **flag** and less like **cloth**, it is wrong.

Two rules you will otherwise break by accident:

- **One-ceremonial-tricolour rule:** all three flag colours appear together in **exactly two places** — the
  ceremonial silk selvedge and the scroll progress bar. Everywhere else they are separate **accent roles**.
- **Amharic is visible by design** (a gold Amharic line above every section heading, plus the Amharic
  wordmark). It is not decoration to be tidied away.

Then read **§10 "Do not"** in `DESIGN.md`. It is short, and every line of it cost somebody an afternoon.

---

## 5. Traps that already cost real hours — do not re-earn them

- **Never hand-write `width`/`height` attributes without checking the real file dimensions.** Thirteen
  attributes in the original page were `1024×1024` for `880×880` files; the gallery rendered 362×1024 —
  stretched 2.8× — and the hero 364×1200. The page was 13,764 px tall; the fix took it to 9,122 px.
- **Verify every sourced image.** A Wikimedia Commons pick carried a visible **"500px" watermark** onto a
  client site, and it was only caught in a proof pass. Use the Openverse API
  (`api.openverse.org/v1/images/?license=cc0,pdm`) for free media; Commons search returns little usable and
  rate-limits (429) if hammered.
- **Text-to-image cannot render "a photo printed ON a product."** Photo-inside-photo comes out blank-faced
  (measured: centre pixel sd=3 vs sd=28 once the printed content was described). **The fix is composition,
  not prompting:** a real photo for the content + a **constructed** mockup (wrap edge, weave, contact
  shadow) in HTML/CSS. Flat products work; curved ones (mugs, book spines) never will.
- **Assume no image generation is available.** FLUX.1-dev and FLUX.1-schnell both returned **402** (free
  quota exhausted) and Cloudflare's SDXL endpoint is **broken server-side**. Check before you design around
  a generated asset.
- **`sharp` is broken on the host device.** Image work must be pre-made or done in the browser (canvas).
- **A specificity bug can make a working change invisible.** `.reveal.reveal-scale.in { transform:none }`
  outranked `.tile:hover`, so a hover lift was dead code for weeks — the fix landed green and changed
  nothing visible. This is why §3 exists.
- **The brand name appears URL-encoded inside the WhatsApp links.** A rename (which has been done once)
  needs its own replacement pass, or half the ordering messages carry the old name.
- **Amharic headings can silently fall through to `system-ui`.** `'Noto Sans Ethiopic'` must stay in the
  `--display` stack — without it Amharic text renders in the wrong face at the wrong metrics.
- 🔴 **Every unknown URL returns the homepage with HTTP 200.** Measured 2026-09-21:
  `/definitely-missing-xyz123.txt` returns byte-identical `index.html` instead of a 404. So **`curl -o /dev/null -w "%{http_code}"`
  telling you 200 does NOT mean a file is published** — which is exactly how I nearly mistook this handoff pack for a leak.
  To check whether a path is *really* served, **compare the body**, never the status code. Fix is `P-07` (add `404.html`).
- **`content-visibility: auto` is deliberately NOT used** (scroll jumps on a 14,000 px page). Do not add it
  back as a "performance win".

---

## 6. Definition of done

A change is done when **all** of these are true:

1. It is pushed to `main`, CI is green, and the live page shows it.
2. You have **looked** at the live page (desktop width *and* ~390 px).
3. Both languages still work on every string you touched.
4. Nothing internal leaked into the repo.
5. It is ticked in `STATE.md` with the commit hash — **a session that does not update `STATE.md` did not
   happen.**

---

## 7. The work list, and the decider

- **Open items, by stable ID** (`T1-*`, `T2-*`, `P-*`, `B-*`): **`STATE.md`**.
- **Blocked on the client:** `B-*` in `STATE.md`. Those need real photos, real prices and real policy from
  Feven. **Never invent them** — no fake testimonials, no guessed prices, no fabricated credentials.
- **The decider is the Architect (Messay).** When an item is ambiguous or commercial, ask him — do not
  decide it on the client's website.
