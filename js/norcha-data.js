/* Norcha Print — the single source of truth for products, prices and lead times.
 *
 * WHY THIS FILE EXISTS
 * Prices are currently written into index.html in the prose AND in a table.
 * Every later feature (product pages, volume tiers, the holiday deadline,
 * the delivery estimator) needs the same numbers. If they each hardcode
 * their own copy, they will drift apart, and a customer will be quoted two
 * prices for the same print. So: one file, one number, read by everyone.
 *
 * 🔴 SOURCE OF TRUTH FOR PRICES, AS OF 2026-10-07.
 *
 * The shop supplied its real prices that day: Price_List_1.xlsx (the "BOARD"
 * column) and a typed list. "BOARD" means CANVAS. Every number below is now
 * the shop's, replacing the placeholders that this file used to carry.
 *
 * TWO PRICE KINDS — DO NOT CONFUSE THEM
 * Norcha outsources all printing and takes a 40% margin on every print.
 *   • Price_List_1.xlsx holds the ORIGINAL (supplier) prices — the COST.
 *     A sell price is cost x 1.40.
 *   • The typed list holds prices ALREADY marked up. Used as given.
 * Canvas below comes from the first kind (x1.40 applied). Frames, calendar,
 * book and mug come from the second.
 *
 * 🔴 STANDARD PRINTS ARE STILL PLACEHOLDERS. The shop has never supplied
 *    paper-print prices. The `prints` family below is UNCONFIRMED and must
 *    not be published as real. The Android app (norcha-android) carries the
 *    same placeholders deliberately, so the two agree — they agree on being
 *    wrong, which is better than disagreeing in front of a customer.
 *
 * 80 x 120 is REMOVED (canvas and framed). It arrived at 3,500, which sat
 * below the smaller 60 x 120 (6,440) and equal to 50 x 80 (3,500) — 3,500
 * divided by 1.40 is exactly the sheet's 50 x 80 original, so the figure was
 * that row mislabelled. The Architect asked for the size gone rather than
 * repriced. See also norcha-android's PRICE-SOURCES.md.
 *
 * Lead times are in PRODUCTION DAYS (working days, before shipping/pickup).
 */
(function (root) {
  "use strict";

  /* Currency + shop facts */
  var SHOP = {
    name: "Norcha Print",
    phone: "+251 911 729 779",         // confirmed by the Architect 2026-09-23
    wa: "251911729779",                // digits only — this form goes into wa.me links
    currency: "ETB",
    city: "Bole, Addis Ababa",
    hours: "Mon-Sat 8:30-19:00, Sun 10:00-17:00",
    cutoffHour: 16,                     // same-day cut-off
    /* The shop supplied its sheet on 2026-10-07, so the prices are real.
       EXCEPT standard prints — the shop has never given paper-print prices,
       and those six entries remain placeholders. This flag drives the
       counter sheet's warning banner; keep the prints caveat in mind
       regardless of what it says. */
    pricesAreTemporary: false
  };

  /* Product families. `lead` = production days. `tier` = volume discount id. */
  var PRODUCTS = {
    prints: {
      label: { en: "Standard prints", am: "መደበኛ ህትመት" },
      lead: 0,                          // same day
      tier: "photos",
      sizes: [
        { key: "std-10x15", label: "10 × 15 cm", price: 25 },
        { key: "std-13x18", label: "13 × 18 cm", price: 40 },
        { key: "std-15x21", label: "15 × 21 cm", price: 60 },
        { key: "std-20x30", label: "20 × 30 cm", price: 120 },
        { key: "std-a4",    label: "A4 · 21 × 30 cm", price: 150 },
        { key: "std-a3",    label: "A3 · 30 × 42 cm", price: 280 }
      ]
    },
    canvas: {
      label: { en: "Canvas prints", am: "የካንቫስ ህትመት" },
      lead: 1,
      tier: "wall",
      /* Original x 1.40, from the shop's sheet. "45 x 60" is on the sheet
         with a dash and no price, so it is absent rather than guessed. */
      sizes: [
        { key: "canvas-10x15",  label: "10 × 15 cm",  price: 420 },
        { key: "canvas-15x20",  label: "15 × 20 cm",  price: 700 },
        { key: "canvas-20x30",  label: "20 × 30 cm",  price: 1050 },
        { key: "canvas-30x46",  label: "30 × 46 cm",  price: 1820 },
        { key: "canvas-30x60",  label: "30 × 60 cm",  price: 2240 },
        { key: "canvas-30x90",  label: "30 × 90 cm",  price: 2660 },
        { key: "canvas-40x60",  label: "40 × 60 cm",  price: 2660 },
        { key: "canvas-50x80",  label: "50 × 80 cm",  price: 3500 },
        { key: "canvas-60x90",  label: "60 × 90 cm",  price: 3780 },
        { key: "canvas-60x120", label: "60 × 120 cm", price: 6440 }
      ]
    },
    books: {
      label: { en: "Photo books", am: "የፎቶ መጽሐፍ" },
      lead: 2,                          // 2-3 days; use the pessimistic number
      tier: "books",
      /* One price from the shop. The four old size tiers were placeholders.
         ⚠️ Confirm whether 1,820 is one fixed book or the entry tier. */
      sizes: [
        { key: "book-standard", label: "Photo book", price: 1820 }
      ]
    },
    frames: {
      label: { en: "Framed prints", am: "የተከፈፈ ህትመት" },
      lead: 1,
      tier: "wall",
      /* Black wood frame with glass — a different product from framed
         canvas, and confirmed as such by the Architect on 2026-10-07.
         A 80 x 120 frame exists at 28,000 but is NOT listed: the print size
         it would hold was removed, and a frame for a print we do not sell
         is a dead entry. Restore it with the size if the size returns. */
      sizes: [
        { key: "frame-a4",   label: "A4 framed",     price: 2200 },
        { key: "frame-a3",   label: "A3 framed",     price: 2800 },
        { key: "frame-40x60",label: "40 × 60 cm framed", price: 5600 }
      ]
    },
    calendars: {
      label: { en: "Wall calendars", am: "የግድግዳ የቀን መቁጠሪያ" },
      lead: 1,
      tier: "wall",
      /* A5 ONLY — confirmed by the Architect: it is the only size the
         calendar comes in. The old A4/A3 entries were placeholders. */
      sizes: [
        { key: "cal-a5", label: "A5 calendar", price: 1680 }
      ]
    },
    mugs: {
      label: { en: "Photo mugs", am: "የፎቶ ሙግ" },
      lead: 0,
      /* ONE size at 1,120 from the shop. The old 1 / 2 / 4 pack ladder
         (350 / 650 / 1200) was a placeholder and is gone, which also removes
         the double-discount trap it created: a 2-pack price colliding with
         the gifts ladder gave two prices for the same order. With one size
         there is nothing to collide with.
         ⚠️ Confirm 1,120 is PER MUG, not a pack. */
      tier: "gifts",
      sizes: [
        { key: "mug-1", label: "Photo mug", price: 1120 }
      ]
    }
  };

  /* Volume discounts. Ifolor's ladder is 2 → -10%, 3+ → -20%, 100+ → -50%.
     Ours is shaped for ETHIOPIAN bulk buying: weddings, funerals, church
     events, graduations — where the quantity jumps fast and the buyer is
     price-sensitive at the low end but loyal at the high end. */
  var TIERS = {
    photos: [                             // standard prints — sold in hundreds
      { min: 1,   pct: 0 },
      { min: 10,  pct: 10 },
      { min: 50,  pct: 20 },
      { min: 100, pct: 35 },
      { min: 500, pct: 50 }
    ],
    wall: [                               // canvas / frames / calendars — few units
      { min: 1, pct: 0 },
      { min: 2, pct: 10 },
      { min: 5, pct: 15 },
      { min: 10, pct: 22 }
    ],
    books: [                              // photo books — expensive, low volume
      { min: 1, pct: 0 },
      { min: 2, pct: 8 },
      { min: 5, pct: 15 }
    ],
    gifts: [                              // small goods that price per unit
      { min: 1, pct: 0 },
      { min: 2, pct: 8 },
      { min: 4, pct: 15 },
      { min: 12, pct: 25 }
    ]
  };

  root.NorchaData = {
    shop: SHOP,
    products: PRODUCTS,
    tiers: TIERS,


    /* ── WhatsApp catalogue (T-21) ────────────────────────────────
       "What do you print?" is the single most common question this shop
       gets, and it is currently answered by typing it out again every
       time. This builds the whole answer as one message that can be sent
       with one tap, in either language.

       It is generated from the same data as everything else, so a price
       change updates the website, the counter sheet AND this message at
       once. Nothing to keep in sync by hand.

       Deliberately written as plain text: WhatsApp has no markdown, so
       *asterisks* are the only emphasis, and they only work either side
       of a whole word with no spaces inside. */
    catalogue: function (lang) {
      var am = (lang === "am");
      /* capture the formatter: inside the nested forEach callbacks below,
         `this` is no longer the NorchaData object. */
      var money = this.money;
      var names = {
        prints:   { en: "Standard prints", am: "መደበኛ ህትመት" },
        canvas:   { en: "Canvas prints",   am: "የካንቫስ ህትመት" },
        books:    { en: "Photo books",     am: "የፎቶ መጽሐፍ" },
        frames:   { en: "Framed prints",   am: "የተከፈፈ ህትመት" },
        calendars:{ en: "Wall calendars",  am: "የግድግዳ የቀን መቁጠሪያ" },
        mugs:     { en: "Photo mugs",      am: "የፎቶ ሙግ" }
      };

      var L = [];
      L.push(am ? "*ኖርቻ ፕሪንት — ምን እናትማለን*" : "*Norcha Print — what we print*");
      L.push("");
      L.push(am ? "ዋጋዎች ከተ.ብ. ተጨማሪ ናቸው።" : "All prices in ETB.");
      L.push("");

      Object.keys(this.products).forEach(function (key) {
        var p = this.products[key];
        L.push("*" + (names[key] ? names[key][am ? "am" : "en"] : p.label.en) + "*");
        p.sizes.forEach(function (s) {
          L.push("  " + s.label + " — " + money(s.price));
        });
        var tiers = this.tiers[p.tier].filter(function (t) { return t.min > 1; });
        if (tiers.length) {
          L.push("  " + (am ? "ቅናሽ" : "Discount") + ": " +
            tiers.map(function (t) { return t.min + "+ -" + t.pct + "%"; }).join(", "));
        }
        L.push("");
      }, this);

      L.push(am ? "*ማዘዝ*" : "*To order*");
      L.push(am ? "ፎቶዎችዎን እንደ ሰነድ ይላኩ (እንደ ፎቶ አይደለም) — ጥራቱ እንዲጠበቅ።"
                : "Send your photos as a Document, not a Photo — that keeps full quality.");
      L.push(am ? "መጠን እና ብዛት ይንገሩን።" : "Tell us the size and how many.");
      L.push("");
      L.push(this.shop.phone + " · " + this.shop.city);
      L.push(this.shop.hours);

      return L.join("\n");
    },

    /* price for one unit of a specific size */
    priceOf: function (family, key) {
      var p = PRODUCTS[family];
      if (!p) return null;
      for (var i = 0; i < p.sizes.length; i++) {
        if (p.sizes[i].key === key) return p.sizes[i].price;
      }
      return null;
    },

    /* the tier that applies at this quantity */
    tierFor: function (family, qty) {
      var p = PRODUCTS[family];
      if (!p) return { min: 1, pct: 0 };
      var list = TIERS[p.tier] || TIERS.photos, best = list[0];
      for (var i = 0; i < list.length; i++) {
        if (qty >= list[i].min) best = list[i];
      }
      return best;
    },

    /* the full breakdown, so the UI never does its own maths */
    quote: function (family, key, qty) {
      var unit = this.priceOf(family, key);
      if (unit === null) return null;
      var t = this.tierFor(family, qty);
      var gross = unit * qty;
      var discount = Math.round(gross * t.pct / 100);
      return {
        unit: unit, qty: qty, gross: gross,
        pct: t.pct, discount: discount, total: gross - discount,
        lead: PRODUCTS[family].lead
      };
    },

    /* money formatting — ETB with thousands separators, no decimals */
    money: function (n) {
      return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " " + SHOP.currency;
    }
  };
})(typeof window !== "undefined" ? window : this);
