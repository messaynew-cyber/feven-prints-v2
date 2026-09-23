/* norcha-order.js — "did my photos arrive?"
 *
 * Reads back the record the uploader wrote: how many files, when they landed,
 * what was asked for, and when they will be deleted. It deliberately does NOT
 * claim the order is printed — a person at the studio confirms sizes and price,
 * and saying otherwise would be the exact kind of lie this project keeps
 * refusing to tell.
 */
(function () {
  "use strict";

  var T = {
    title: ["Check your order", "ትዕዛዝዎን ይመልከቱ"],
    sub: ["Enter the reference we gave you and the phone number you ordered with.",
          "የተሰጠዎትን ቁጥር እና የዘዙበትን ስልክ ያስገቡ።"],
    code: ["Reference", "ቁጥር"],
    phone: ["Phone number", "ስልክ ቁጥር"],
    go: ["Check my order", "ፈልግ"],
    busy: ["Checking…", "በመፈለግ ላይ…"],
    need: ["Please fill in both the reference and the phone number.",
           "እባክዎ ሁለቱንም ይሙሉ።"],
    found: ["We have your photos", "ፎቶዎችዎ ደርሰዋል"],
    files: ["photos received", "ፎቶዎች ደርሰዋል"],
    arrived: ["Received", "የደረሱበት ቀን"],
    asked: ["You asked for", "የዘዙት"],
    del: ["We delete them on", "የምንያጠፋቸው ቀን"],
    cta: ["Message us on WhatsApp", "በዋትስአፕ ያግኙን"],
    retry: ["Try another reference", "ሌላ ቁጥር ይሞክሩ"],
    err: ["We could not find an order with that reference and phone number. Check both, or message us on WhatsApp.",
          "በዚህ ቁጥርና ስልክ ትዕዛዝ አልተገኘም። ያረጋግጡ ወይም በዋትስአፕ ያግኙን።"],
    off: ["Order lookup is not switched on yet. Message us on WhatsApp and we will check for you.",
          "ፍለጋው አልነቃም። በዋትስአፕ ያግኙን።"],
    net: ["Something went wrong reaching the studio. Try again, or message us on WhatsApp.",
          "ችግር ተፈጥሯል። እንደገና ይሞክሩ ወይም በዋትስአፕ ያግኙን።"]
  };
  function t(k) { return T[k][document.documentElement.lang === "am" ? 1 : 0]; }

  function el(id) { return document.getElementById(id); }
  function pair(node, k) {
    if (!node) return;
    node.setAttribute("data-en", T[k][0]);
    node.setAttribute("data-am", T[k][1]);
    node.textContent = document.documentElement.lang === "am" ? T[k][1] : T[k][0];
  }
  function fmtDate(iso, lang) {
    if (!iso) return "—";
    try {
      var d = new Date(iso);
      return d.toLocaleDateString(lang === "am" ? "am-ET" : "en-GB",
        { day: "numeric", month: "short", year: "numeric" });
    } catch (e) { return iso.slice(0, 10); }
  }

  function boot() {
    var form = el("orderLookup");
    if (!form) return;
    if (typeof fetch !== "function") return;

    /* If the endpoint is not switched on, do not offer the form at all — the
       same rule the uploader follows. A box that cannot answer is worse than
       no box: the customer concludes their order is lost. */
    fetch("/api/order?code=NOR-AAAAAA&phone=000000000").then(function (r) {
      return r.json().catch(function () { return {}; });
    }).then(function (d) {
      if (d && d.reason === "not-configured") {
        var warn = el("orderOff");
        if (warn) warn.hidden = false;
        form.hidden = true;
        return;
      }
      form.hidden = false;
    }).catch(function () { /* network trouble: leave the form, it will explain on submit */ });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var code = (el("olCode").value || "").trim().toUpperCase();
      var phone = (el("olPhone").value || "").trim();
      var state = el("olState"), result = el("olResult"), btn = el("olGo");
      if (!code || !phone) { state.textContent = t("need"); state.hidden = false; return; }
      state.hidden = true;
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = t("busy");

      fetch("/api/order?code=" + encodeURIComponent(code) + "&phone=" + encodeURIComponent(phone))
        .then(function (r) { return r.json().then(function (d) { return { s: r.status, d: d }; }); })
        .then(function (out) {
          btn.disabled = false; btn.textContent = label;
          var d = out.d || {};
          if (!d.ok) {
            state.textContent = d.reason === "not-configured" ? t("off")
              : (d.reason === "not-found" ? t("err") : (d.message || t("net")));
            state.hidden = false;
            result.hidden = true;
            return;
          }
          var lang = document.documentElement.lang === "am" ? "am" : "en";
          form.hidden = true;
          result.hidden = false;
          pair(el("orTitle"), "found");
          el("orCode").textContent = d.code;
          el("orCount").textContent = d.files + " " + t("files");
          el("orWhen").textContent = fmtDate(d.received, lang);
          el("orJob").textContent = [d.requested.product, d.requested.size,
            d.requested.qty ? "×" + d.requested.qty : "", d.requested.note].filter(Boolean).join(" · ") || "—";
          el("orDel").textContent = fmtDate(d.delete_after, lang);
          el("orNote").textContent = d.stage_note || "";
          var cta = el("orCta");
          cta.href = "https://wa.me/" + ((typeof NorchaData !== "undefined" && NorchaData.shop.wa) || "251911729779") +
            "?text=" + encodeURIComponent("Hello Norcha Print - about my order " + d.code);
          pair(el("orCta"), "cta");
          pair(el("orAgain"), "retry");
          pair(el("orWhenL"), "arrived");
          pair(el("orJobL"), "asked");
          pair(el("orDelL"), "del");
          el("orAgain").onclick = function () { result.hidden = true; form.hidden = false; };
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = label;
          state.textContent = t("net"); state.hidden = false;
        });
    });

    var segs = document.querySelectorAll(".seg");
    for (var i = 0; i < segs.length; i++) {
      segs[i].addEventListener("click", function () {
        setTimeout(function () {
          pair(el("olTitle"), "title"); pair(el("olSub"), "sub");
          pair(el("olCodeL"), "code"); pair(el("olPhoneL"), "phone");
          if (el("olGo") && !el("olGo").disabled) el("olGo").textContent = t("go");
        }, 0);
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
