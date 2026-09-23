/* norcha-upload.js — send photos straight from the website.
 *
 * WHAT IT DOES
 * Takes the files off the customer's phone at full quality and hands them to
 * the shop, with an order code that ties them to the WhatsApp conversation.
 * The existing WhatsApp steps stay above it: this is an extra door, not a
 * replacement, because a customer with no signal still needs the old one.
 *
 * 🔴 THE RULE THIS FILE OBEYS
 * It asks the server whether uploads are switched on BEFORE it offers them
 * (GET /api/upload). If the bucket is not bound, the card stays hidden and the
 * page is exactly as good as it was before this file existed. Under no
 * circumstance does it show a working upload box that cannot deliver — a
 * customer who thinks their photos are in and finds out they are not has lost
 * something we cannot give back.
 */
(function () {
  "use strict";

  var T = {
    title:   ["Or upload them here", "ወይም ከዚህ ይጫኑ"],
    sub:     ["Same originals, no compression — and you keep the chat.", "ዋናዎቹ ፋይሎች፣ ያለ መጨመቅ።"],
    name:    ["Your name", "ስምዎ"],
    phone:   ["Phone", "ስልክ"],
    product: ["What is it for?", "ለምንድን ነው?"],
    size:    ["Size (if you know)", "መጠን (ካወቁ)"],
    qty:     ["How many", "ብዛት"],
    note:    ["Anything else? (optional)", "ተጨማሪ መረጃ (አማራጭ)"],
    files:   ["Choose photos", "ፎቶዎችን ይምረጡ"],
    clear:   ["Clear", "አጽዳ"],
    hint:    ["No photos chosen yet — JPG, PNG or HEIC, up to 25 MB each.",
              "እስካሁን ፎቶ አልተመረጠም። JPG፣ PNG ወይም HEIC፣ እያንዳንዱ እስከ 25 MB።"],
    off:     ["Uploads are not switched on at the moment. Please send your photos on WhatsApp — that always works.",
              "መጫኑ አሁን አይሰራም። እባክዎ ፎቶዎችዎን በዋትስአፕ ይላኩ።"],
    chosen:  ["chosen", "ተመርጠዋል"],
    send:    ["Send to the studio", "ወደ ስቱዲዮ ላኩ"],
    sending: ["Sending…", "በመላክ ላይ…"],
    privacy: ["Your photos go straight to the studio. We delete them 30 days after you collect your order.",
              "ፎቶዎችዎ በቀጥታ ወደ ስቱዲዮ ይሄዳሉ። ትዕዛዙን ከወሰዱ ከ30 ቀን በኋላ እናጠፋለን።"],
    okTitle: ["Your photos arrived", "ፎቶዎችዎ ደርሰዋል"],
    okBody:  ["Quote this reference on WhatsApp and we will pick it up from there.",
              "ይህን ቁጥር በዋትስአፕ ይንገሩን፣ ከዚያ እንቀጥላለን።"],
    okCta:   ["Continue on WhatsApp", "በዋትስአፕ ይቀጥሉ"],
    again:   ["Send another batch", "ተጨማሪ ላኩ"],
    errNeed: ["Please add your name, a phone number and at least one photo.",
              "እባክዎ ስምዎን፣ ስልክ ቁጥርዎን እና ቢያንስ አንድ ፎቶ ያስገቡ።"],
    errBig:  ["One file is too big to upload here — send that one on WhatsApp.",
              "አንድ ፋይል በጣም ትልቅ ነው። ያንን በዋትስአፕ ይላኩ።"],
    errNet:  ["The upload did not go through. Your photos are still on your phone — try again, or send them on WhatsApp.",
              "መላኩ አልተሳካም። ፎቶዎቹ አሁንም በስልክዎ አሉ። እንደገና ይሞክሩ ወይም በዋትስአፕ ይላኩ።"],
    lang:    function () { return document.documentElement.lang === "am" ? 1 : 0; }
  };
  function t(k) { return T[k][T.lang()]; }

  var MAX_PER_FILE = 25 * 1024 * 1024;
  var OK_TYPE = /^image\/(jpe?g|png|webp|heic|heif|tiff?|avif)$/i;
  var OK_EXT = /\.(jpe?g|png|webp|heic|heif|tiff?|avif)$/i;

  function el(id) { return document.getElementById(id); }
  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  /* Small helper: set both language variants and follow the site's toggle. */
  function pair(node, k) {
    if (!node) return;
    node.setAttribute("data-en", T[k][0]);
    node.setAttribute("data-am", T[k][1]);
    node.textContent = document.documentElement.lang === "am" ? T[k][1] : T[k][0];
  }

  function boot() {
    var card = el("uploadCard");
    var form = el("uploadForm");
    if (!card || !form) return;

    /* Ask first. Silence is not consent — only an explicit "configured" shows
       the box. A network failure keeps it hidden. An environment with no fetch
       at all (an ancient browser, or jsdom in the test harness) simply never
       sees the card, which is the same safe answer. */
    if (typeof fetch !== "function") return;
    fetch("/api/upload", { headers: { accept: "application/json" } })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        if (!d || !d.configured) return;
        card.hidden = false;
        card.setAttribute("data-ready", "1");
        /* 🔴 .reveal is opacity:0 until main.js's IntersectionObserver adds
           .in. This card does not exist in the layout at boot (it is hidden
           until this very moment), so relying on the observer is how a
           perfectly good form ends up invisible — the exact failure this
           project has already shipped twice. Reveal it explicitly. */
        card.classList.add("in");
        buildProductOptions();
      })
      .catch(function () { /* stays hidden */ });

    var input = el("upFiles");
    var list = el("upFileList");
    var state = el("upState");
    var btn = el("upSend");

    /* Thumbnails, because "did my photos attach?" is the question that decides
       whether anyone trusts this form. A count alone does not answer it. */
    var objectUrls = [];
    function paintThumbs(files) {
      var box = el("upThumbs");
      objectUrls.forEach(function (u) { URL.revokeObjectURL(u); });
      objectUrls = [];
      if (!box) return;
      box.innerHTML = "";
      files.slice(0, 6).forEach(function (f) {
        if (!/^image\//.test(f.type || "")) return;
        var url = URL.createObjectURL(f);
        objectUrls.push(url);
        var li = document.createElement("li");
        var img = document.createElement("img");
        img.src = url; img.alt = f.name; img.loading = "lazy"; img.decoding = "async";
        li.appendChild(img);
        box.appendChild(li);
      });
    }

    function paintFiles() {
      var files = input.files ? Array.prototype.slice.call(input.files) : [];
      var hint = el("upHint");
      var clearBtn = el("upClear");
      var tooBig = files.filter(function (f) { return f.size > MAX_PER_FILE; });
      var wrong = files.filter(function (f) {
        return !(OK_TYPE.test(f.type || "") || (OK_EXT.test(f.name || "") && !f.type));
      });
      state.textContent = tooBig.length || wrong.length ? t("errBig") : "";
      state.hidden = !(tooBig.length || wrong.length);
      if (!files.length) {
        list.textContent = "";
        if (hint) { hint.hidden = false; }
        if (clearBtn) clearBtn.hidden = true;
        paintThumbs([]);
        return;
      }
      var bytes = files.reduce(function (n, f) { return n + f.size; }, 0);
      list.textContent = files.length + " " + t("chosen") + " · " + (bytes / 1048576).toFixed(1) + " MB";
      if (hint) hint.hidden = true;
      if (clearBtn) clearBtn.hidden = false;
      paintThumbs(files);
    }
    input.addEventListener("change", paintFiles);

    /* the button opens the picker; `hidden` on the input means no stylesheet is
       required to stop a native second picker appearing */
    if (el("upFilesBtn")) el("upFilesBtn").addEventListener("click", function () { input.click(); });
    if (el("upClear")) el("upClear").addEventListener("click", function () {
      try { input.value = ""; } catch (e) {}
      paintFiles();
    });

    /* keep the labels following the EN/አማ switch */
    var segs = document.querySelectorAll(".seg");
    for (var i = 0; i < segs.length; i++) {
      segs[i].addEventListener("click", function () {
        setTimeout(function () {
          pair(el("upTitle"), "title"); pair(el("upSub"), "sub");
          pair(el("upNameL"), "name"); pair(el("upPhoneL"), "phone");
          pair(el("upProductL"), "product"); pair(el("upSizeL"), "size");
          pair(el("upQtyL"), "qty"); pair(el("upNoteL"), "note");
          pair(el("upFilesBtn"), "files"); pair(el("upPrivacy"), "privacy");
          pair(el("upClear"), "clear"); pair(el("upHint"), "hint");
          if (!input.files || !input.files.length) paintFiles();
          if (btn && !btn.disabled) btn.textContent = t("send");
          paintFiles();
        }, 0);
      });
    }

    function buildProductOptions() {
      var sel = el("upProduct");
      if (!sel || sel.options.length > 1 || typeof NorchaData === "undefined") return;
      Object.keys(NorchaData.products).forEach(function (key) {
        var p = NorchaData.products[key];
        var o = document.createElement("option");
        o.value = p.label.en;
        o.textContent = document.documentElement.lang === "am" ? p.label.am : p.label.en;
        sel.appendChild(o);
      });
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var state0 = el("upState");
      if (card.getAttribute("data-ready") !== "1") {
        /* Never a silent return. A click that does nothing is the worst
           possible answer — the customer just taps send again and gives up. */
        if (state0) { state0.textContent = t("off"); state0.hidden = false; }
        return;
      }

      var files = input.files ? Array.prototype.slice.call(input.files) : [];
      var name = (el("upName").value || "").trim();
      var phone = (el("upPhone").value || "").trim();
      if (!files.length || name.length < 2 || phone.length < 6) {
        state.textContent = t("errNeed");
        state.hidden = false;
        return;
      }

      var fd = new FormData();
      files.forEach(function (f) { fd.append("photos", f, f.name); });
      fd.append("name", name);
      fd.append("phone", phone);
      fd.append("note", (el("upNote").value || "").slice(0, 1000));
      fd.append("product", el("upProduct").value || "");
      fd.append("size", (el("upSize").value || "").trim());
      fd.append("qty", (el("upQty").value || "").trim());
      fd.append("lang", T.lang() === 1 ? "am" : "en");
      var hp = el("upWebsite");
      fd.append("website", hp ? hp.value : "");

      var pct = el("upPct");
      btn.disabled = true;
      btn.textContent = t("sending");
      state.hidden = true;

      var xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload", true);
      xhr.upload.onprogress = function (e) {
        if (!pct || !e.lengthComputable) return;
        pct.textContent = Math.round((e.loaded / e.total) * 100) + "%";
        pct.hidden = false;
      };
      xhr.onload = function () {
        var d = {};
        try { d = JSON.parse(xhr.responseText); } catch (e) {}
        btn.disabled = false;
        btn.textContent = t("send");
        if (pct) { pct.hidden = true; pct.textContent = ""; }
        if (xhr.status === 200 && d && d.ok) { done(d.code); return; }
        state.textContent = (d && d.message) || t("errNet");
        state.hidden = false;
      };
      xhr.onerror = function () {
        btn.disabled = false;
        btn.textContent = t("send");
        if (pct) { pct.hidden = true; }
        state.textContent = t("errNet");
        state.hidden = false;
      };
      xhr.send(fd);
    });

    function done(code) {
      form.hidden = true;
      var panel = el("upDone");
      panel.hidden = false;
      el("upCode").textContent = code;
      pair(el("upDoneTitle"), "okTitle");
      pair(el("upDoneBody"), "okBody");
      pair(el("upDoneCta"), "okCta");
      pair(el("upAgain"), "again");
      var msg = "Hello Norcha Print - I uploaded my photos on the website. Reference: " + code;
      el("upDoneCta").setAttribute("href",
        "https://wa.me/" + ((typeof NorchaData !== "undefined" && NorchaData.shop.wa) || "251911729779") +
        "?text=" + encodeURIComponent(msg));
      el("upAgain").addEventListener("click", function () {
        panel.hidden = true;
        form.hidden = false;
        form.reset();
        list.textContent = "";
        state.hidden = true;
        paintThumbs([]);
        paintFiles();
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
