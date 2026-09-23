/* Norcha Print — the single source of truth for products, prices and lead times.
 *
 * WHY THIS FILE EXISTS
 * Prices are currently written into index.html in the prose AND in a table.
 * Every later feature (product pages, volume tiers, the holiday deadline,
 * the delivery estimator) needs the same numbers. If they each hardcode
 * their own copy, they will drift apart, and a customer will be quoted two
 * prices for the same print. So: one file, one number, read by everyone.
 *
 * ⚠️ [FEVEN] Every price below is marked TEMPORARY and must be confirmed
 * before this file is treated as final. They came from the existing page,
 * not from the shop. Changing a number here changes it everywhere.
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
    pricesAreTemporary: true            // flip to false when Feven confirms
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
      sizes: [
        { key: "canvas-30x40",  label: "30 × 40 cm",  price: 950 },
        { key: "canvas-40x60",  label: "40 × 60 cm",  price: 1600 },
        { key: "canvas-60x80",  label: "60 × 80 cm",  price: 2700 },
        { key: "canvas-80x120", label: "80 × 120 cm", price: 4600 }
      ]
    },
    books: {
      label: { en: "Photo books", am: "የፎቶ መጽሐፍ" },
      lead: 2,                          // 2-3 days; use the pessimistic number
      tier: "books",
      sizes: [
        { key: "book-20x20-20", label: "20 × 20 cm · 20 pages", price: 1800 },
        { key: "book-21x21-30", label: "21 × 21 cm · 30 pages", price: 2600 },
        { key: "book-28x28-40", label: "28 × 28 cm · 40 pages", price: 3800 },
        { key: "book-30x30-80", label: "30 × 30 cm · 80 pages", price: 6400 }
      ]
    },
    frames: {
      label: { en: "Framed prints", am: "የተከፈፈ ህትመት" },
      lead: 1,
      tier: "wall",
      sizes: [
        { key: "frame-a4",   label: "A4 framed",     price: 600 },
        { key: "frame-a3",   label: "A3 framed",     price: 900 },
        { key: "frame-40x60",label: "40 × 60 cm framed", price: 1500 }
      ]
    },
    calendars: {
      label: { en: "Wall calendars", am: "የግድግዳ የቀን መቁጠሪያ" },
      lead: 1,
      tier: "wall",
      sizes: [
        { key: "cal-a4", label: "A4 wall calendar", price: 450 },
        { key: "cal-a3", label: "A3 wall calendar", price: 700 }
      ]
    },
    mugs: {
      label: { en: "Photo mugs", am: "የፎቶ ሙግ" },
      lead: 0,
      /* 🔴 tier: "mugs" is DELIBERATELY its own ladder — a flat one.
         Mugs already carry pack pricing in `sizes` (1 / 2 / 4 at 350 / 650 /
         1200). Applying a percentage ladder on top of that double-discounts:
         "2 mugs" came out as 650 via the 2-pack and 644 via 350×2 −8%. Two
         prices for one order. So mugs use pack prices ONLY, and the tier
         below is a flat no-discount ladder that makes that explicit. */
      tier: "mugs",
      sizes: [
        { key: "mug-1", label: "1 mug",   price: 350 },
        { key: "mug-2", label: "2 mugs",  price: 650 },
        { key: "mug-4", label: "4 mugs",  price: 1200 }
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
    /* Mugs price by the pack, not by a percentage — see the note on
       `mugs` above. A flat ladder keeps quote() honest for them and leaves
       this key free for genuinely small goods that are NOT pack-priced. */
    mugs: [
      { min: 1, pct: 0 }
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
