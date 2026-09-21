/* Feven's Prints — language toggle, nav, reveals */
(function () {
  "use strict";

  /* Shared helpers, defined FIRST so every function below can use them.
     Three separate bugs were caused by defining a renderer before the
     helper it needed — JavaScript hoists `var` as undefined, so the call
     throws and takes the whole page down with it. Keeping helpers at the
     top removes the entire class of problem. */
var FAMILY_BY_LABEL = {
    "Canvas print":     "canvas",
    "Photo book":       "books",
    "Wall calendar":    "calendars",
    "Photo mug":        "mugs",
    "Framed print":     "frames",
    "Standard prints":  "prints"
    /* "Something else" is deliberately absent — a custom job has no price. */
  };

  var val = function (id) {
    var e = document.getElementById(id);
    return e && e.value ? e.value.trim() : "";
  };

  /* ── i18n: EN / AM ─────────────────────────────── */
  var LANG_KEY = "fevens-lang";
  var current = "en";
  try { current = localStorage.getItem(LANG_KEY) || "en"; } catch (e) {}

  function applyLang(lang) {
    current = lang;
    document.documentElement.lang = lang === "am" ? "am" : "en";
    document.body.classList.toggle("am", lang === "am");
    var nodes = document.querySelectorAll("[data-en][data-am]");
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.textContent = n.getAttribute(lang === "am" ? "data-am" : "data-en");
    }
    var phs = document.querySelectorAll("[data-en-ph][data-am-ph]");
    for (var p = 0; p < phs.length; p++) {
      phs[p].setAttribute("placeholder", phs[p].getAttribute(lang === "am" ? "data-am-ph" : "data-en-ph"));
    }
    if (typeof renderHistory === "function") renderHistory();
    if (typeof renderHoliday === "function") renderHoliday(lang);
    if (typeof renderQuote === "function") renderQuote();
    if (typeof renderDelivery === "function") renderDelivery();
    /* voucher copy is inside closures, so re-check whatever is on screen */
    var vci = document.getElementById("vcInput");
    if (vci && vci.value.trim()) vci.dispatchEvent(new Event("input"));
    var segs = document.querySelectorAll(".seg");
    for (var s = 0; s < segs.length; s++) {
      var on = segs[s].getAttribute("data-lang") === lang;
      segs[s].classList.toggle("active", on);
      segs[s].setAttribute("aria-pressed", String(on));
    }
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
  }

  var segs = document.querySelectorAll(".seg");
  for (var s = 0; s < segs.length; s++) {
    segs[s].addEventListener("click", function () {
      applyLang(this.getAttribute("data-lang"));
    });
  }
  /* ── holiday deadline strip ─────────────────────────
     Content comes from js/norcha-holidays.js, which computes the next
     Ethiopian printing occasion and the real order-by date. This block
     renders it, fully in both languages. If the script is missing or no
     holiday is near, the strip stays hidden — never invents urgency. */
  var HOLIDAY_COPY = {
    en: {
      within:  function (n, d) { return n + ": order within " + d + " days"; },
      sub:     "to be ready before the holiday",
      last:    function (n) { return n + ": last day to order is tomorrow"; },
      lastSub: "photo books may need longer",
      today:   function (n) { return "Today is the last day to order for " + n; },
      todaySub:"message us before we close",
      late:    function (n) { return "Same-day pickup is no longer guaranteed for " + n; },
      lateSub: "message us and we will tell you honestly"
    },
    am: {
      within:  function (n, d) { return n + "፦ በ" + d + " ቀናት ውስጥ ያዙ"; },
      sub:     "በበዓሉ በፊት እንዲዘጋጅ",
      last:    function (n) { return n + "፦ የመጨረሻው የትዕዛዝ ቀን ነገ ነው"; },
      lastSub: "የፎቶ መጽሐፍ ተጨማሪ ጊዜ ሊፈልግ ይችላል",
      today:   function (n) { return "ለ" + n + " ዛሬ የመጨረሻው የትዕዛዝ ቀን ነው"; },
      todaySub:"ከመዘጋታችን በፊት ያግኙን",
      late:    function (n) { return "ለ" + n + " በዚያው ቀን ማድረስ አይረጋገጥም"; },
      lateSub: "ያግኙን፤ በእውነት እንነግርዎታለን"
    }
  };

  function renderHoliday(lang) {
    var el = document.getElementById("holidayStrip");
    var txt = document.getElementById("holidayText");
    if (!el || !txt || typeof NorchaHolidays === "undefined") {
      if (el) el.hidden = true;
      return;
    }
    var h = NorchaHolidays.current(new Date());
    if (!h) { el.hidden = true; return; }

    var L = (lang === "am") ? HOLIDAY_COPY.am : HOLIDAY_COPY.en;
    var name = (lang === "am") ? h.am : h.en;
    var d = h.daysToOrder;
    var msg, sub;

    if (d > 1)            { msg = L.within(name, d); sub = L.sub; }
    else if (d === 1)     { msg = L.last(name);       sub = L.lastSub; }
    else if (d === 0)     { msg = L.today(name);      sub = L.todaySub; }
    else                  { msg = L.late(name);       sub = L.lateSub; }

    txt.textContent = "";
    var a = document.createElement("span");
    a.className = "hd-msg"; a.textContent = msg;
    var b = document.createElement("span");
    b.className = "hd-sub"; b.textContent = " \u2014 " + sub;
    txt.appendChild(a); txt.appendChild(b);
    el.hidden = false;
  }

  /* ── delivery estimate (T-09) ────────────────────────
     Uses NorchaDelivery + NorchaData. Reads the product to get the real
     production lead time, then answers two questions honestly:
       "when would this be ready?" and "can you actually do my date?" */
  var DELIV_COPY = {
    en: {
      readyFrom:  function (d) { return "Order now and it is ready <b>" + d + "</b>."; },
      pick:       "Pick a date and we will tell you if we can make it.",
      ok:         function (d) { return "Yes \u2014 <b>" + d + "</b> works."; },
      okSlack:    function (d, s) { return "Yes \u2014 <b>" + d + "</b> works, with " + s + " day" + (s === 1 ? "" : "s") + " to spare."; },
      past:       "That date has already passed \u2014 pick one from today onwards.",
      sunday:     "We are closed on Sundays. Pick another day and it is fine.",
      tooSoon:    function (d, n) { return "We cannot make <b>" + d + "</b>. The earliest is <b>" + n + "</b> \u2014 message us and we will see what is possible."; },
      tooSoonShort: function (n) { return "That is " + n + " working day" + (n === 1 ? "" : "s") + " sooner than we can manage."; }
    },
    am: {
      readyFrom:  function (d) { return "አሁን ካዘዙ <b>" + d + "</b> ዝግጁ ይሆናል።"; },
      pick:       "ቀን ይምረጡ፤ ማዘጋጀት እንደምንችል እንነግርዎታለን።",
      ok:         function (d) { return "አዎ \u2014 <b>" + d + "</b> ይሠራል።"; },
      okSlack:    function (d, s) { return "አዎ \u2014 <b>" + d + "</b> ይሠራል፤ " + s + " ተጨማሪ ቀን አለ።"; },
      past:       "ያ ቀን አልፏል \u2014 ከዛሬ ጀምሮ ቀን ይምረጡ።",
      sunday:     "እሁድ እንዘጋለን። ሌላ ቀን ይምረጡ።",
      tooSoon:    function (d, n) { return "<b>" + d + "</b> ማዘጋጀት አንችልም። የመጀመሪያው <b>" + n + "</b> ነው \u2014 ያግኙን።"; },
      tooSoonShort: function (n) { return "ከምንችለው በ" + n + " የሥራ ቀን ያነሰ ነው።"; }
    }
  };

  function renderDelivery() {
    var el = document.getElementById("delivNote");
    if (!el) return;
    if (typeof NorchaDelivery === "undefined" || typeof NorchaData === "undefined") {
      el.hidden = true; return;
    }
    var lang = (document.documentElement.lang === "am") ? "am" : "en";
    var L = DELIV_COPY[lang];

    var label = val("of-product");
    var family = FAMILY_BY_LABEL[label];
    if (!family) { el.hidden = true; return; }

    var lead = NorchaData.products[family].lead;
    var cutoff = NorchaData.shop.cutoffHour;
    var raw = val("of-date");
    var requested = raw ? new Date(raw + "T12:00:00") : null;

    var now = new Date();
    var r = NorchaDelivery.assess(now, requested, lead, { cutoffHour: cutoff });
    var fmtReady = NorchaDelivery.fmt(r.ready, lang);

    el.classList.remove("dn-ok", "dn-caution");

    if (!requested) {
      el.innerHTML = L.readyFrom(fmtReady) + " " + L.pick;
      el.hidden = false;
      return;
    }

    if (r.ok && r.reason === undefined) {
      var fmtWant = NorchaDelivery.fmt(r.want, lang);
      el.classList.add("dn-ok");
      el.innerHTML = (r.slack && r.slack > 0) ? L.okSlack(fmtWant, r.slack) : L.ok(fmtWant);
      el.hidden = false;
      return;
    }

    el.classList.add("dn-caution");
    if (r.reason === "past") {
      el.innerHTML = L.past;
    } else if (r.reason === "sunday") {
      el.innerHTML = L.sunday;
    } else {
      el.innerHTML = L.tooSoon(NorchaDelivery.fmt(r.want, lang), fmtReady) +
        " <span class='dn-sub'>" + L.tooSoonShort(r.short) + "</span>";
    }
    el.hidden = false;
  }


  applyLang(current);
  renderHoliday(current);




  /* ── gift vouchers (T-18) ────────────────────────────
     Two jobs in one section, because there are two different people:
     the buyer needs a code to give away, the shop needs to check one.
     Both run entirely on this device — there is no server to ask. */
  var VOUCHER_COPY = {
    en: {
      choose: "Choose an amount first.",
      made:   "Voucher made. Write the code on a card.",
      copied: "Copied.",
      check:  function (v) { return "Valid voucher \u2014 <span class='vc-big'>" + v + " ETB</span>. Accept it and note the code as redeemed."; },
      bad:    "That code is not right. Check for a mistyped letter or number.",
      unknown:"That does not look like one of our vouchers.",
      send:   function (code, amt) {
        return "Hello Norcha Print - I would like to buy a gift voucher.\n\nCode: " + code +
               "\nValue: " + amt + " ETB";
      }
    },
    am: {
      choose: "መጀመሪያ መጠን ይምረጡ።",
      made:   "ቫውቸሩ ተዘጋጅቷል። ኮዱን በካርድ ላይ ይጻፉ።",
      copied: "ተቀድቷል።",
      check:  function (v) { return "ትክክለኛ ቫውቸር \u2014 <span class='vc-big'>" + v + " ብር</span>። ተቀብለው ኮዱን እንደተከፈለ ይመዝግቡ።"; },
      bad:    "ያ ኮድ ትክክል አይደለም። የተሳሳተ ፊደል ወይም ቁጥር ካለ ይመልከቱ።",
      unknown:"ይህ የእኛ ቫውቸር ይመስል አይደለም።",
      send:   function (code, amt) {
        return "ሰላም ኖርቻ ፕሪንት - የስጦታ ቫውቸር መግዛት እፈልጋለሁ።\n\nኮድ: " + code +
               "\nዋጋ: " + amt + " ብር";
      }
    }
  };

  function voucherLang() {
    return (document.documentElement.lang === "am") ? "am" : "en";
  }

  (function initVouchers() {
    var denomWrap = document.getElementById("vcDenoms");
    if (!denomWrap || typeof NorchaVoucher === "undefined") return;

    var selected = null;
    var lastIssued = null;

    /* build the amount buttons from the data module, so the shop's actual
       denominations live in one place rather than being written twice */
    NorchaVoucher.DENOMINATIONS.forEach(function (v) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "vc-denom";
      b.setAttribute("aria-pressed", "false");
      b.setAttribute("data-value", String(v));
      b.textContent = v + " ETB";
      b.addEventListener("click", function () {
        selected = v;
        var all = denomWrap.querySelectorAll(".vc-denom");
        for (var i = 0; i < all.length; i++) {
          all[i].setAttribute("aria-pressed", all[i] === b ? "true" : "false");
        }
      });
      denomWrap.appendChild(b);
    });

    var makeBtn = document.getElementById("vcMake");
    var out     = document.getElementById("vcOut");
    var codeEl  = document.getElementById("vcCode");
    var recEl   = document.getElementById("vcRecord");

    if (makeBtn) {
      makeBtn.addEventListener("click", function () {
        var L = VOUCHER_COPY[voucherLang()];
        if (!selected) {
          out.hidden = false;
          codeEl.textContent = "";
          recEl.textContent = L.choose;
          recEl.hidden = false;
          return;
        }
        lastIssued = NorchaVoucher.issue(selected);
        codeEl.textContent = lastIssued.code;
        recEl.textContent = lastIssued.record + "  (keep this record)";
        recEl.hidden = false;
        out.hidden = false;
      });
    }

    var copyBtn = document.getElementById("vcCopy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        if (!lastIssued) return;
        var done = function () {
          var t = copyBtn.textContent;
          copyBtn.textContent = VOUCHER_COPY[voucherLang()].copied;
          setTimeout(function () { copyBtn.textContent = t; }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(lastIssued.code).then(done, done);
        } else {
          /* older Android WebViews: select the text so the user can copy */
          var r = document.createRange();
          r.selectNodeContents(codeEl);
          var s = window.getSelection();
          if (s) { s.removeAllRanges(); s.addRange(r); }
        }
      });
    }

    var sendBtn = document.getElementById("vcSend");
    if (sendBtn) {
      sendBtn.addEventListener("click", function () {
        if (!lastIssued) return;
        var L = VOUCHER_COPY[voucherLang()];
        var msg = L.send(lastIssued.code, lastIssued.value);
        window.open("https://wa.me/" + NorchaData.shop.wa + "?text=" + encodeURIComponent(msg),
                    "_blank", "noopener");
      });
    }

    /* the checker — live, so a typo is obvious while they type */
    var input  = document.getElementById("vcInput");
    var result = document.getElementById("vcResult");
    if (input && result) {
      var check = function () {
        var raw = input.value.trim();
        result.className = "vc-result";
        if (!raw) { result.textContent = ""; return; }

        var L = VOUCHER_COPY[voucherLang()];
        var p = NorchaVoucher.parse(raw);
        if (p === null) {
          result.classList.add("vc-bad");
          result.textContent = L.unknown;
        } else if (p.valid) {
          result.classList.add("vc-ok");
          result.innerHTML = L.check(p.value);
        } else {
          result.classList.add("vc-bad");
          result.textContent = L.bad;
        }
      };
      input.addEventListener("input", check);
      input.addEventListener("change", check);
    }
  })();

  /* ── FAQ deep links (T-17) ──────────────────────────
     Each answer has a stable id now, but a plain id is only half a feature:
     the link has to OPEN the answer and the address bar has to reflect which
     one is open, or the URL cannot be copied, shared on WhatsApp, or
     surfaced by a search engine.

     Native <details> means no JS is needed for the toggling itself — this
     only keeps the URL and the open state in step, in both directions. */
  (function () {
    var faqs = document.querySelectorAll("details.faq[id]");
    if (!faqs.length) return;

    function openFromHash() {
      var id = (location.hash || "").slice(1);
      if (!id) return;
      for (var i = 0; i < faqs.length; i++) {
        if (faqs[i].id === id) {
          faqs[i].open = true;
          /* let layout settle before scrolling to it */
          setTimeout(function (el) {
            return function () { el.scrollIntoView({ behavior: "smooth", block: "center" }); };
          }(faqs[i]), 60);
          return;
        }
      }
    }

    for (var i = 0; i < faqs.length; i++) {
      (function (el) {
        el.addEventListener("toggle", function () {
          if (el.open) {
            /* replaceState, not pushState: a FAQ click should not fill the
               back button with ten entries. */
            try { history.replaceState(null, "", "#" + el.id); }
            catch (e) { location.hash = el.id; }
          } else if ((location.hash || "").slice(1) === el.id) {
            try { history.replaceState(null, "", location.pathname + location.search); }
            catch (e) {}
          }
        });
      })(faqs[i]);
    }

    window.addEventListener("hashchange", openFromHash);
    openFromHash();
  })();

  /* ── nav: scroll border + mobile menu ───────────── */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 8);
    /* ambient hero animations pause when the hero is gone: three infinite
       animations running off-screen is pure heat on a phone */
    var hero = document.getElementById("main");
    var past = hero ? (window.scrollY > hero.offsetHeight + 120) : false;
    document.documentElement.classList.toggle("past-hero", past);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = document.getElementById("navBurger");
  var mobile = document.getElementById("navMobile");
  if (burger && mobile) {
    burger.addEventListener("click", function () {
      var open = mobile.hidden;
      mobile.hidden = !open;
      mobile.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
    });
    mobile.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { mobile.hidden = true; mobile.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ── scroll reveals (IntersectionObserver) ──────── */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    for (var r = 0; r < reveals.length; r++) reveals[r].classList.add("in");
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ── order form → WhatsApp (no server, nothing stored) ── */
  var ORDER_WA = "https://wa.me/358442715477?text=";
  var ORDER_KEY = "fevens-orders";
  var ORDER_MSG = {
    product: { en: "Please choose what you want printed.", am: "እባክዎ ምን ማተም እንደሚፈልጉ ይምረጡ።" },
    name:    { en: "Please add your name.", am: "እባክዎ ስምዎን ያስገቡ።" },
    phone:   { en: "Please add a phone number we can reach you on.", am: "እባክዎ የስልክ ቁጥርዎን ያስገቡ።" }
  };
  var form = document.getElementById("orderForm");

  /* ── live quote + volume tiers (T-02) ────────────────
     Prices live in js/norcha-data.js so this box, the price list and the
     product pages can never disagree. This only renders what quote() returns.

     The form's <select> values are human labels ("Canvas print"), while the
     data file is keyed by family ("canvas"). This table is the bridge. If a
     product is missing here the box simply stays hidden — it never guesses. */
  

  /* The form's size is free text, so match it loosely against the data keys.
     Everything is normalised to remove spaces, multiplication signs and the
     difference between "A4" and "A4 (21 × 30 cm)". */
  function normaliseSize(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[×x*]/g, "x")
      .replace(/\(.*?\)/g, "")      /* drop the parenthetical */
      .replace(/\s+/g, "")
      .replace(/፣/g, ",");
  }

  function findSizeKey(family, rawSize) {
    if (!rawSize || typeof NorchaData === "undefined") return null;
    var want = normaliseSize(rawSize);
    if (!want) return null;
    var sizes = NorchaData.products[family].sizes;
    /* exact first */
    for (var i = 0; i < sizes.length; i++) {
      if (normaliseSize(sizes[i].label) === want) return sizes[i].key;
    }
    /* then a loose contains, either direction */
    for (var k = 0; k < sizes.length; k++) {
      var have = normaliseSize(sizes[k].label);
      if (have && (have.indexOf(want) !== -1 || want.indexOf(have) !== -1)) return sizes[k].key;
    }
    return null;
  }

  var QUOTE_LANG = {
    en: {
      note: "Estimate only — we confirm the final price on WhatsApp.",
      hint: function (next, pct) {
        return "Order " + next + " or more and get " + pct + "% off.";
      },
      hintHave: function (pct) { return pct + "% off applied."; },
      save: function (pct) { return "\u2212" + pct + "%"; }
    },
    am: {
      note: "ግምት ብቻ ነው \u2014 የመጨረሻውን ዋጋ በዋትስአፕ እናረጋግጣለን።",
      hint: function (next, pct) {
        return next + " ወይም ከዚያ በላይ ካዘዙ " + pct + "% ቅናሽ ያገኛሉ።";
      },
      hintHave: function (pct) { return pct + "% ቅናሽ ተተግብሯል።"; },
      save: function (pct) { return "\u2212" + pct + "%"; }
    }
  };

  function renderQuote() {
    var box = document.getElementById("quoteBox");
    var hintEl = document.getElementById("qtyTier");
    if (!box || typeof NorchaData === "undefined") return;
    /* val() is defined further down this file. Guard so an early call (from
       applyLang during boot, before that definition runs) cannot throw and
       take the whole page down with it. */
    if (typeof val !== "function") return;

    var label = val("of-product");
    var family = FAMILY_BY_LABEL[label];
    var qty = parseInt(val("of-qty"), 10) || 0;

    if (!family || qty < 1) {
      box.hidden = true;
      if (hintEl) hintEl.hidden = true;
      return;
    }

    var rawSize = val("of-size");
    var key = findSizeKey(family, rawSize);

    /* Mugs, and photo books when only the format is given, have no size to
       match — the buyer leaves the field blank and we price the first/only
       variant. If they DID type something and it matches nothing, we show
       nothing rather than guess. */
    if (!key && !rawSize) {
      key = NorchaData.products[family].sizes[0].key;
    }

    if (!key) {
      /* The family is priced but this exact size is not known — most likely
         "Something else" text, or a custom dimension. Say so, honestly,
         instead of inventing a number. */
      box.hidden = true;
      if (hintEl) {
        var L0 = (lang() === "am") ? QUOTE_LANG.am : QUOTE_LANG.en;
        hintEl.textContent = "";
        hintEl.hidden = true;
      }
      return;
    }

    var q = NorchaData.quote(family, key, qty);
    var L = (lang() === "am") ? QUOTE_LANG.am : QUOTE_LANG.en;

    document.getElementById("qbUnit").textContent = NorchaData.money(q.unit);
    document.getElementById("qbTotal").textContent = NorchaData.money(q.total);

    var saveRow = document.getElementById("qbSaveRow");
    var saveEl = document.getElementById("qbSave");
    if (q.pct > 0) {
      saveRow.hidden = false;
      saveEl.textContent = L.save(q.pct) + "  (" + NorchaData.money(q.discount) + ")";
    } else {
      /* Clear the text as well as hiding the row. A hidden element that still
         holds the previous product's discount is a trap the moment anything
         changes visibility rules or a reader announces the subtree. */
      saveRow.hidden = true;
      saveEl.textContent = "";
    }
    document.getElementById("qbNote").textContent = L.note;
    box.hidden = false;

    /* The nudge: show what the NEXT tier would give, so the buyer can decide
       to add a few more. This is the whole point of volume pricing. */
    if (hintEl) {
      var list = NorchaData.tiers[NorchaData.products[family].tier] || [];
      var nextTier = null;
      for (var t = 0; t < list.length; t++) {
        if (list[t].min > qty) { nextTier = list[t]; break; }
      }
      if (nextTier) {
        hintEl.textContent = L.hint(nextTier.min, nextTier.pct);
        hintEl.hidden = false;
      } else if (q.pct > 0) {
        hintEl.textContent = L.hintHave(q.pct);
        hintEl.hidden = false;
      } else {
        hintEl.hidden = true;
      }
    }
  }

  if (form) {
    /* recompute the quote whenever anything relevant changes */
    (function () {
      var fired = 0;
      var onEdit = function (e) {
        var id = e && e.target && e.target.id;
        if (id === "of-product" || id === "of-size" || id === "of-qty") renderQuote();
        if (id === "of-product" || id === "of-date") renderDelivery();
      };
      form.addEventListener("input", onEdit);
      form.addEventListener("change", onEdit);
      renderQuote();
      renderDelivery();
    })();
    var lang = function () { return document.documentElement.lang === "am" ? "am" : "en"; };
    var setErr = function (id, key) {
      var err = document.getElementById("of-err-" + id);
      var input = document.getElementById("of-" + id);
      var field = input ? input.closest(".field") : null;
      if (!err || !field) return;
      if (key) { err.textContent = ORDER_MSG[key][lang()]; err.hidden = false; field.classList.add("invalid"); }
      else { err.textContent = ""; err.hidden = true; field.classList.remove("invalid"); }
    };
    var genRef = function () {
      var A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; /* no I, O, 0, 1 — avoids misreads on the phone */
      var s = "";
      for (var i = 0; i < 4; i++) s += A.charAt(Math.floor(Math.random() * A.length));
      return "FP-" + s;
    };
    var readStore = function () {
      try { var raw = localStorage.getItem(ORDER_KEY); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
    };
    var writeStore = function (list) {
      try { localStorage.setItem(ORDER_KEY, JSON.stringify(list.slice(0, 5))); } catch (e) {}
    };
    var buildMessage = function (ref) {
      var am = lang() === "am";
      var L = [];
      L.push(am ? "ሰላም የፌቨን ህትመቶች — አዲስ ትዕዛዝ" : "Hello Feven's Prints - new order");
      if (ref) L.push((am ? "ማጣቀሻ: " : "Reference: ") + ref);
      L.push("");
      L.push((am ? "ምርት: " : "Product: ") + val("of-product"));
      if (val("of-size")) L.push((am ? "መጠን: " : "Size: ") + val("of-size"));
      L.push((am ? "ብዛት: " : "Quantity: ") + (val("of-qty") || "1"));

      /* Carry the estimate into the message. Without this, Feven has to
         re-price every order by hand and the whole feature is decoration.
         It is labelled as an estimate so nobody treats it as final. */
      var qlabel = val("of-product");
      var qfam = FAMILY_BY_LABEL[qlabel];
      var qty = parseInt(val("of-qty"), 10) || 0;
      if (qfam && qty >= 1 && typeof NorchaData !== "undefined") {
        var qsize = val("of-size");
        var qkey = findSizeKey(qfam, qsize);
        if (!qkey && !qsize) qkey = NorchaData.products[qfam].sizes[0].key;
        if (qkey) {
          var est = NorchaData.quote(qfam, qkey, qty);
          var line = NorchaData.money(est.total);
          if (est.pct > 0) {
            line += (am ? "  (የብዛት ቅናሽ " : "  (volume discount ") +
                    NorchaData.money(est.discount) + ", -" + est.pct + "%)";
          }
          L.push((am ? "ግምታዊ ዋጋ: " : "Estimated price: ") + line);
        }
      }

      if (val("of-date")) L.push((am ? "የሚፈልጉበት ቀን: " : "Needed by: ") + val("of-date"));
      if (val("of-notes")) L.push((am ? "ተጨማሪ: " : "Notes: ") + val("of-notes"));
      L.push("");
      L.push((am ? "ስም: " : "Name: ") + val("of-name"));
      L.push((am ? "ስልክ: " : "Phone: ") + val("of-phone"));
      return L.join("\n");
    };
    var renderHistory = function () {
      var box = document.getElementById("orderHistory");
      var ul = document.getElementById("orderHistoryList");
      if (!box || !ul) return;
      var list = readStore();
      if (!list.length) { box.hidden = true; return; }
      box.hidden = false;
      var am = lang() === "am";
      ul.textContent = "";
      for (var i = 0; i < list.length; i++) {
        var o = list[i];
        var li = document.createElement("li");
        var meta = document.createElement("span");
        meta.className = "oh-meta";
        meta.textContent = o.ref + " · " + o.when + " · " + o.summary;
        var a = document.createElement("a");
        a.className = "oh-send";
        a.href = ORDER_WA + encodeURIComponent(o.msg || "");
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = am ? "እንደገና ላክ" : "Send again";
        li.appendChild(meta);
        li.appendChild(a);
        ul.appendChild(li);
      }
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      if (!val("of-product")) { setErr("product", "product"); ok = false; } else setErr("product");
      if (!val("of-name")) { setErr("name", "name"); ok = false; } else setErr("name");
      if (val("of-phone").replace(/[^0-9]/g, "").length < 9) { setErr("phone", "phone"); ok = false; } else setErr("phone");
      if (!ok) {
        var first = form.querySelector(".field.invalid input, .field.invalid select");
        if (first) first.focus();
        return;
      }
      var ref = genRef();
      var msg = buildMessage(ref);
      var done = document.getElementById("orderDone");
      var ta = document.getElementById("orderText");
      var refEl = document.getElementById("orderRef");
      if (ta) ta.value = msg;
      if (refEl) refEl.textContent = ref;
      if (done) done.hidden = false;
      var win = window.open(ORDER_WA + encodeURIComponent(msg), "_blank", "noopener");
      var list = readStore();
      list.unshift({
        ref: ref,
        when: new Date().toLocaleDateString(),
        summary: val("of-product") + (val("of-qty") ? " × " + val("of-qty") : ""),
        msg: msg
      });
      writeStore(list);
      renderHistory();
      if ((!win || win.closed) && done && done.scrollIntoView) {
        done.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    var copyBtn = document.getElementById("orderCopy");
    if (copyBtn) copyBtn.addEventListener("click", function () {
      var ta = document.getElementById("orderText");
      if (!ta) return;
      if (!ta.value) {
        var rf = genRef();
        ta.value = buildMessage(rf);
        var re = document.getElementById("orderRef");
        if (re) re.textContent = rf;
        var dn = document.getElementById("orderDone");
        if (dn) dn.hidden = false;
      }
      var text = ta.value;
      var done = function () {
        var old = copyBtn.getAttribute(lang() === "am" ? "data-am" : "data-en");
        copyBtn.textContent = lang() === "am" ? "ተቀድቷል" : "Copied";
        setTimeout(function () { copyBtn.textContent = old; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { ta.select(); try { document.execCommand("copy"); done(); } catch (e2) {} });
      } else {
        ta.removeAttribute("readonly"); ta.select();
        try { document.execCommand("copy"); done(); } catch (e3) {}
        ta.setAttribute("readonly", "readonly");
      }
    });

    var clearBtn = document.getElementById("orderHistoryClear");
    if (clearBtn) clearBtn.addEventListener("click", function () { writeStore([]); renderHistory(); });

    renderHistory();
  }
  /* ── Ethiopian calendar year (footer only) ──────────────
     Enkutatash falls on 11 September (12 in the year before a Gregorian leap
     year). Year-level only on purpose - no day or month, so a one-day edge
     case can never print something wrong. */
  (function () {
    var now = new Date();
    var g = now.getFullYear();
    var gNext = g + 1;
    var leapNext = (gNext % 4 === 0 && gNext % 100 !== 0) || gNext % 400 === 0;
    var newYear = new Date(g, 8, leapNext ? 12 : 11);
    var et = now >= newYear ? g - 7 : g - 8;
    var marks = document.querySelectorAll("[data-etyear]");
    for (var ei = 0; ei < marks.length; ei++) marks[ei].textContent = String(et);
  })();

  /* ── light / dark theme ───────────────────────────────── */
  (function () {
    var root = document.documentElement;
    var KEY = "fevens-theme";
    var meta = document.querySelector('meta[name="theme-color"]');
    var toggles = document.querySelectorAll(".theme-toggle");
    var LABEL = {
      en: { toDark: "Switch to dark theme", toLight: "Switch to light theme" },
      am: { toDark: "ወደ ጨለማ ገጽታ ቀይር", toLight: "ወደ ብሩህ ገጽታ ቀይር" }
    };
    function apply(t) {
      var dark = t === "dark";
      root.setAttribute("data-theme", dark ? "dark" : "light");
      if (meta) meta.setAttribute("content", dark ? "#15120E" : "#F8F4EE");
      var lang = document.documentElement.lang === "am" ? "am" : "en";
      for (var i = 0; i < toggles.length; i++) {
        toggles[i].setAttribute("aria-pressed", String(dark));
        toggles[i].setAttribute("aria-label", dark ? LABEL[lang].toLight : LABEL[lang].toDark);
      }
    }
    for (var j = 0; j < toggles.length; j++) {
      toggles[j].addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        try { localStorage.setItem(KEY, next); } catch (e) {}
        apply(next);
      });
    }
    apply(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
    /* keep the toggle labels in step with the language switch */
    var segsAll = document.querySelectorAll(".seg");
    for (var k = 0; k < segsAll.length; k++) {
      segsAll[k].addEventListener("click", function () { setTimeout(function () { apply(root.getAttribute("data-theme")); }, 0); });
    }
  })();

  /* ── hero carousel: auto-advance, arrows, dots, swipe, keyboard ── */
  var slidesEl = document.getElementById("heroSlides");
  if (slidesEl) {
    var slides = slidesEl.querySelectorAll(".hero-slide");
    var dotsWrap = document.getElementById("heroDots");
    var carousel = document.getElementById("heroCarousel");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var idx = 0, timer = null, paused = false;

    for (var si = 0; si < slides.length; si++) {
      (function (n) {
        var b = document.createElement("button");
        b.className = "hero-dot";
        b.type = "button";
        b.setAttribute("role", "tab");
        b.setAttribute("aria-label", "Slide " + (n + 1));
        b.setAttribute("aria-selected", n === 0 ? "true" : "false");
        b.addEventListener("click", function () { goTo(n, true); });
        dotsWrap.appendChild(b);
      })(si);
    }
    var dots = dotsWrap.querySelectorAll(".hero-dot");

    function goTo(n, announce) {
      idx = (n + slides.length) % slides.length;
      slidesEl.style.transform = "translateX(" + (-idx * 100) + "%)";
      for (var d = 0; d < dots.length; d++) {
        dots[d].setAttribute("aria-selected", String(d === idx));
      }
      for (var s2 = 0; s2 < slides.length; s2++) {
        slides[s2].setAttribute("aria-hidden", String(s2 !== idx));
        var links = slides[s2].querySelectorAll("a, button");
        for (var l = 0; l < links.length; l++) {
          if (s2 === idx) links[l].removeAttribute("tabindex");
          else links[l].setAttribute("tabindex", "-1");
        }
      }
      /* announce only when the user chose the slide - announcing autoplay every
         6.5s would be hostile to a screen reader */
      var status = document.getElementById("heroStatus");
      if (status && announce) {
        var t = slides[idx].querySelector(".hero-title");
        status.textContent = "Slide " + (idx + 1) + " of " + slides.length +
                             (t && t.textContent ? ": " + t.textContent.trim() : "");
      }
    }
    function startAuto() {
      if (reduceMotion) return;
      stopAuto();
      timer = setInterval(function () { if (!paused) goTo(idx + 1); }, 6500);
    }
    function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }

    var prevBtn = carousel.querySelector(".hero-arrow.prev");
    var nextBtn = carousel.querySelector(".hero-arrow.next");
    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(idx - 1, true); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(idx + 1, true); });

    carousel.addEventListener("pointerenter", function () { paused = true; });
    carousel.addEventListener("pointerleave", function () { paused = false; });
    carousel.addEventListener("focusin", function () { paused = true; });
    carousel.addEventListener("focusout", function () { paused = false; });
    document.addEventListener("visibilitychange", function () { paused = document.hidden; });
    carousel.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { goTo(idx - 1, true); }
      else if (e.key === "ArrowRight") { goTo(idx + 1, true); }
    });

    /* Interruptible drag: the track follows the finger and the release decides
       the outcome. A flick-only swipe cannot be changed mid-gesture, which is
       what makes a carousel feel like it is arguing with you. */
    var dragActive = false, dragStart = 0, dragBase = 0, dragX = 0;
    function trackWidth() { return slidesEl.getBoundingClientRect().width || 1; }
    slidesEl.addEventListener("touchstart", function (e) {
      dragActive = true;
      dragStart = e.touches[0].clientX;
      dragBase = -idx * trackWidth();
      dragX = dragBase;
      slidesEl.style.transition = "none";
    }, { passive: true });
    slidesEl.addEventListener("touchmove", function (e) {
      if (!dragActive) return;
      dragX = dragBase + (e.touches[0].clientX - dragStart);
      slidesEl.style.transform = "translateX(" + dragX + "px)";
    }, { passive: true });
    function endDrag() {
      if (!dragActive) return;
      dragActive = false;
      slidesEl.style.transition = "";
      var dx = dragX - dragBase;
      var w = trackWidth();
      if (Math.abs(dx) > w * 0.18) goTo(idx + (dx < 0 ? 1 : -1), true);
      else goTo(idx, false);   /* snap back */
    }
    slidesEl.addEventListener("touchend", endDrag, { passive: true });
    slidesEl.addEventListener("touchcancel", endDrag, { passive: true });

    goTo(0);
    startAuto();
  }

  /* ── offline: service worker + print behaviour ────────── */
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
  /* a collapsed <details> prints collapsed - open every answer for the printout,
     then restore what the reader had open when printing finishes */
  window.addEventListener("beforeprint", function () {
    var ds = document.querySelectorAll("details");
    for (var i = 0; i < ds.length; i++) {
      if (!ds[i].open) { ds[i].setAttribute("data-was-closed", "1"); ds[i].open = true; }
    }
  });
  window.addEventListener("afterprint", function () {
    var closed = document.querySelectorAll('details[data-was-closed]');
    for (var j = 0; j < closed.length; j++) {
      closed[j].open = false;
      closed[j].removeAttribute("data-was-closed");
    }
  });

  /* ── extra motion: progress bar, back-to-top, hero parallax, stagger ── */
  (function () {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var prog = null, topBtn = null;             /* resolved lazily: this script sits
                                                   before the to-top button in the DOM */
    var heroImgs = document.querySelectorAll(".hero-media img");
    var queued = false;

    function resolve() {
      if (!prog) prog = document.getElementById("progress");
      if (!topBtn) topBtn = document.getElementById("toTop");
    }
    /* Safety sweep. IntersectionObserver samples per frame, so a small element
       (a 12px woven divider) can be scrolled past between two samples and then
       never fires - it would stay hidden for good. This guarantees anything on
       screen or already scrolled past gets revealed. */
    var pending = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    function sweep() {
      if (!pending.length) return;
      var limit = window.innerHeight - 40;
      var keep = [];
      for (var i = 0; i < pending.length; i++) {
        var el = pending[i];
        if (el.classList.contains("in")) continue;
        if (el.getBoundingClientRect().top < limit) el.classList.add("in");
        else keep.push(el);
      }
      pending = keep;
    }

    function onScroll() {
      resolve();
      var y = window.scrollY;
      if (prog) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        prog.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
      }
      if (topBtn) topBtn.classList.toggle("show", y > 900);
      sweep();
      /* subtle parallax on the hero product photo, above the fold only */
      if (!reduce && y < 760 && heroImgs.length) {
        var shift = (y * 0.055).toFixed(2);
        for (var i = 0; i < heroImgs.length; i++) heroImgs[i].style.transform = "translateY(" + shift + "px)";
      }
    }
    function onScrollThrottled() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; onScroll(); });
    }
    function bindBackToTop() {
      resolve();
      if (topBtn && !topBtn.dataset.bound) {
        topBtn.dataset.bound = "1";
        topBtn.addEventListener("click", function () {
          window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        });
      }
      onScroll();
    }
    window.addEventListener("scroll", onScrollThrottled, { passive: true });
    window.addEventListener("resize", onScrollThrottled, { passive: true });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindBackToTop);
    else bindBackToTop();
    setTimeout(bindBackToTop, 400);   /* and once more, in case of late layout */

    /* staggered reveals: cascade the children of each grid instead of
       everything arriving at once. The delay is cleared as soon as the
       element has revealed, so hover transitions are never delayed. */
    var groups = document.querySelectorAll(".bento, .price-grid, .faq-list, .wall-stage, .send-steps, .how-grid");
    for (var g = 0; g < groups.length; g++) {
      var kids = groups[g].querySelectorAll(".reveal");
      for (var k = 0; k < kids.length; k++) {
        kids[k].style.transitionDelay = (k * 70) + "ms";
        kids[k].addEventListener("transitionend", function () {
          this.style.transitionDelay = "";
        }, { once: true });
      }
    }
  })();
})();
