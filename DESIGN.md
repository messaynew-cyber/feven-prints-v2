# DESIGN.md — Norcha Print

The design contract for this site. Read this before changing anything visual, so the decisions
below survive contact with the next person who edits it.

---

## 1. The thesis

**A white netela with coloured tibeb borders.**

Ethiopian handwoven cloth is a warm off-white ground with dense coloured woven borders. The site
follows that: the ground stays cream, and the Ethiopian identity lives in the **woven borders,
colour roles and Amharic typography** — not in a wash of colour over everything.

If a change makes the page look more like a flag and less like cloth, it is wrong.

## 2. The one-ceremonial-tricolour rule (locked with the Architect)

All three flag colours appear together in **exactly two places**:

1. The **ceremonial silk selvedge** — the band at the top of the page and above the footer.
2. The **scroll progress bar**.

Everywhere else green, yellow and red appear as **separate accent roles with separate jobs**.
Never add a third tricolour. If you want more colour somewhere, use an accent role, not the flag.

## 3. Colour

### Base tokens (light)
| Token | Value | Role |
|---|---|---|
| `--paper` | `#F8F4EE` | page ground (netela cream) |
| `--paper-2` | `#F0EAE1` | tinted section ground |
| `--ink` | `#241F18` | primary text |
| `--ink-soft` | `#6B6155` | secondary text |
| `--line` | `#E4DBCC` | hairlines, borders |
| `--white` | `#FFFDF9` | card surfaces |
| `--pine` | `#0E5C41` | primary UI green (not the flag green) |
| `--pine-deep` | `#0A4632` | green text on light |
| `--pine-soft` | `#DCE7DF` | green surface |
| `--gold` | `#C1922B` | Meskel gold — ornaments, Amharic accents |

### The flag, as thread
| Token | Value | Rule |
|---|---|---|
| `--flag-green` | `#078930` | ornament only |
| `--flag-yellow` | `#FCDD09` | **ornament only, never text** — unreadable on cream |
| `--flag-red` | `#DA121A` | ornament only (~4:1 on cream) |
| `--red` | `#B3261E` | the red to use for anything with text (≈6:1) |

### Accent roles
`accent-green` `#078930` · `accent-yellow` `#B98A16` · `accent-red` `#B3261E`

One per product, applied to the woven card trim and the hero slide badge:

| Product | Accent |
|---|---|
| Canvas prints | green |
| Photo books | red |
| Wall calendars | yellow |
| Photo mugs | green |
| Framed prints | red |
| Standard prints | yellow |

### The ceremonial selvedge
11px, three **dyed** threads — deep emerald `#17532F`, antique gold `#B8912F`, oxblood `#7E211C`
— hairline gold edges, a 7px diagonal weave and a top-light sheen. Flag-bright colours are
deliberately *not* used here: they read as a banner rather than cloth.

### Dark theme
Same tokens remapped under `[data-theme="dark"]`: deep warm charcoal, warmer greys for copy, pine
lightened to hold contrast, gold brightened, and the selvedge threads lifted to
`#2C7A4B / #D4AF4A / #A63229`. It is a **designed palette, not an inversion**.

**Contrast floor: 4.5:1 for body text, 3:1 for large text.** Measured values are in §8.

## 4. The motif

One motif, applied many ways — **never many motifs**.

**The diamond chain** is the single motif. It is drawn with the same SVG (a CSS `mask-image`, so
one shape serves every colour) at the same scale in:
- the heading ornament (`.section-h::after`, uses `--accent`)
- the woven card trim (`.tile::before`, `.price-card::before`, `.faq::before`)
- the section dividers (`.tibeb-div`, one colour per section, cycling green → yellow → red)

**Adey abeba** (the Meskel daisy) is the only other shape: it is the bullet in the hero facts, and
it opens on hover.

Do not introduce a new ornament without retiring one.

## 5. Typography

- **Display:** Bricolage Grotesque (variable 400–800) — headings, wordmark, numerals.
- **Body:** Outfit (variable 300–800).
- **Amharic:** Noto Sans Ethiopic — **must stay in the display stack**. Bricolage and Outfit are
  Latin-only; without the Ethiopic face, Amharic headings silently fall back to `system-ui` and
  stop matching the body. (This was a real bug.)
- **Amharic is visible by design:** a gold Amharic line sits above every section heading, and the
  Amharic wordmark sits beside the English one. Both hide when the language is switched to Amharic,
  because the headings are then already Amharic.
- `text-wrap: balance` on headings, `pretty` on body copy.
- **Tabular numerals** on prices and price tables, so digits align.
- Sentence case. No ALL CAPS except the small tracked labels (`.eyebrow`-style, badges).

## 6. Spacing

One scale: **4 / 8 / 12 / 16 / 24 / 32**. Page gutter, card gap and section rhythm all come from
it. Section padding is `92px` desktop / reduced on mobile. Heading → content gap is `26px`.
Before adding a bespoke pixel value, ask whether one of the scale steps works.

## 7. Motion

- **Easing:** only the custom curves — `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`,
  `--ease-inout: cubic-bezier(0.77, 0, 0.175, 1)`. Never a built-in `ease` or `linear` for UI.
- **Properties:** `transform` and `opacity` only. If you need to animate something else, reach for
  a different mechanic (see the `mask-image` note in §4 for why).
- **Duration:** UI feedback under 300ms; entrances 420–520ms; the carousel slide 620ms; the
  ceremonial ribbon draw 950ms. Nothing longer.
- **Three entrance behaviours, by element type** — variety is deliberate, because everything
  entering the same way reads as machine-made:
  - headings → resolve out of a blur (`.reveal-blur`)
  - cards, tiles, FAQ, gallery → settle from `scale(.97)` (`.reveal-scale`)
  - prose → rise (`.reveal`)
- **Never animate from `scale(0)`.** Start at 0.95–0.98.
- **Stagger**: 70ms between siblings, cleared on `transitionend` so hover effects are never delayed.
- **Press feedback** on every button: `scale(.94–.985)`.
- **Hover effects are gated** behind `@media (hover: hover) and (pointer: fine)`.
- **Reduced motion**: everything above is disabled under `prefers-reduced-motion: reduce`, and the
  carousel's autoplay is turned off entirely (not just made instant).
- **Interruptible**: the carousel track follows the finger and the release decides. Gestures must be
  changeable mid-flight.
- One rAF-throttled scroll handler drives progress bar, back-to-top and parallax. Do not add
  another scroll listener.

## 8. Accessibility (measured, not assumed)

- **44px minimum touch target on every interactive element.** Verified zero exceptions. Where the
  visual must stay small (the 9px carousel dots), the *button* is 44×44 and the dot is a `::before`.
- **Contrast, both themes:** body 14.9 / 16.2 · tiles 7.5 / 8.4 · footer 6.0 / 7.2 · price cards
  16.1 / 14.8 · primary buttons 8.0 / 6.4.
- **Skip link** first in the document, hidden until focused.
- **Carousel live region** announces "Slide N of M: title" on arrows, dots, keyboard and swipe —
  **never on autoplay**.
- Every image has meaningful `alt`. `:focus-visible` rings everywhere.
- **If you change a colour, re-measure the contrast.** `--flag-yellow` is ornament-only for exactly
  this reason.

## 9. Platform

- **Images:** WebP + JPEG via `<picture>`, `decoding="async"`, `loading="lazy"` except the hero,
  and `width`/`height` on every image (a wrong attribute silently stretches an image — that was a
  real bug too).
- **Printable:** `@media print` hides all chrome, lays prices out two-up, and a `beforeprint`
  handler opens every FAQ answer. Customers print the price list.
- **Offline:** `sw.js` — network-first for navigations (content is never stale), stale-while-
  revalidate for assets, shell precached.
- **Installable:** `manifest.webmanifest` with maskable icons. `theme-color` follows the theme.
- No frameworks. Vanilla HTML/CSS/JS, no build step. Keep it that way.

## 10. Do not

- Add a third tricolour.
- Use `--flag-yellow` as text.
- Animate anything but `transform`/`opacity` (or `mask-image` for a deliberate wipe).
- Hide a reveal target with `clip-path: inset(0 100% 0 0)` — Chromium computes an **empty
  intersection rect**, so `IntersectionObserver` never fires and it stays invisible forever. Hide
  with an overflow wrapper + inner transform instead.
- Add an unquoted multi-class attribute (`class=obj flat`) — it parses as one class plus a stray
  boolean attribute and the styling silently dies.
- Add a scroll listener, a built-in easing, or a bespoke pixel value.
- Assume a colour is readable. Measure it.


---

**Brand note (17 Sep 2026):** the shop's public brand is now **Norcha Print**, domain
**norchaprint.com** (bought by the Architect; zone active on Cloudflare, no DNS records yet). The client is
still Feven; "Norcha" is the trading name. Site, manifest, service worker, style guide and the social card
were renamed the same day. The proposal documents still carry "Feven's Prints" pending a decision.
