# Price sources — read before touching a price

**Last updated: 2026-10-07.** This file records where every number comes from,
what is still unconfirmed, and what is known to be wrong. It exists because on
this date the site was found to be publishing prices that were never the
shop's — every figure in `js/norcha-data.js` had been a placeholder since the
file was written.

---

## The two price kinds — do not confuse them

Norcha Print **outsources all printing** and takes a **40% margin** on every
print. That means there are two different kinds of number in circulation, and
mixing them up costs real money.

| Kind | What it is | How to turn it into a sell price |
|---|---|---|
| **Original** | what the supplier charges the shop — the COST | `sell = cost × 1.40`, then round |
| **Marked up** | the retail price, already done | use as-is |

A sell price of `cost × 1.40` is a **40% markup**, which is a **28.6% gross
margin** on the selling price (40 ÷ 140). It is *not* 40% of what the customer
pays. Worth saying plainly: of every 100 ETB that comes in, about 28.6 is gross
profit.

## Where the 2026-10-07 numbers came from

- **`Price_List_1.xlsx`** (the shop's own sheet, column headed **"BOARD"**) →
  the **ORIGINAL** prices. **"BOARD" means CANVAS.**
- **A typed list** supplied the same day → **already marked up**, used as given.

| Family | Source | Markup applied here? |
|---|---|---|
| `canvas` | the xlsx sheet | **yes** — ×1.40 |
| `frames` | typed list | no |
| `calendars` | typed list | no |
| `books` | typed list | no |
| `mugs` | typed list | no |
| `prints` | ⚠️ **nothing — still placeholders** | — |

---

## 🔴 What is still WRONG

### 1. Standard prints are placeholders

The six `std-*` entries are the **original placeholder figures**. The shop has
never supplied paper-print prices. They are retained only so the family
resolves — `prints` is the default selection on the order form.

**Do not quote these to a customer.** The Android app
([norcha-android](https://github.com/messaynew-cyber/norcha-android)) carries
the same placeholders on purpose, so the two surfaces agree. They agree on
being wrong, which is better than disagreeing in front of a customer — but it
is not good enough.

**Ask the shop for:** paper prices for 10×15, 13×18, 15×21, 20×30, A4, A3.
This is the last blocker. It is `F-1` in `TODO.md` and it gates five other
tasks.

### 2. Resolved on 2026-10-07

- **80 × 120 is removed** from both canvas and framed. It arrived as 3,500,
  which was impossible: `50 × 80` (4,000 cm²) is also 3,500 and `60 × 120`
  (7,200 cm²) is 6,440, so the *largest* canvas was priced below a smaller one.
  The tell — `3,500 ÷ 1.40 = 2,500`, exactly the sheet's `50 × 80` original —
  says the typed figure was that row mislabelled. The shop asked for the size
  gone rather than repriced.
  An 80 × 120 **frame** exists at 28,000 and was confirmed real; it is not
  listed because there is no print to put in it. Restore it with the size.

### 3. Still to confirm with the shop

- **`mugs` = 1,120** — per mug, or per pack? The page says per mug.
- **`books` = 1,820** — one fixed book, or the entry tier of a range?
  The old file had four size tiers; only one price came back.
- **Volume discounts on mugs.** Mugs now use the `gifts` ladder (2+ → 8% off).
  With one SKU that is sane, but confirm the shop actually discounts mugs.
- **Canvas `60 × 120` = 6,440** is the only size where cost per cm² ticks
  *up* (0.700 → 0.894). Mild, and it may be deliberate. Worth a glance.

---

## How to change a price

1. Edit **`js/norcha-data.js`**. It is the single source of truth.
2. Run **`node build-pages.js`** to regenerate the product pages, `prices.html`
   and the guides.
3. **`index.html` is NOT generated** — its price tables and its "from X ETB"
   teasers are hand-written. Update them by hand, and the `priceRange` field in
   the JSON-LD blocks on the pages that carry it.
4. Run **`node pagetest.js`**. It loads every page in a real DOM and asserts
   each price cell agrees with the data file. **If it says DO NOT PUSH, do not
   push.**
5. The Android app carries its own copy in `lib/core/pricing.dart`. **Change it
   too**, or the app and the site will quote different prices — which is the
   exact failure this whole file exists to prevent.

## Why there is a test for this

`pagetest.js` caught a real content bug while these prices were being entered.
Making mugs a single-size product left the generator asking *"Which sizes do
photo mugs come in?"* and answering *"Photo mug."* — not an answer. The guard
asserts every FAQ answer is longer than ten characters, which is the sort of
check that sounds pedantic until it is the only thing that notices your copy
stopped making sense.
