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
})();
