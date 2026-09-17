/* Feven's Prints — language toggle, nav, reveals */
(function () {
  "use strict";

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
  applyLang(current);

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
  if (form) {
    var lang = function () { return document.documentElement.lang === "am" ? "am" : "en"; };
    var val = function (id) { var e = document.getElementById(id); return e && e.value ? e.value.trim() : ""; };
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
