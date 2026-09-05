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
})();
