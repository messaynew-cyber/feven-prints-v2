/* Norcha Print — delivery estimator (T-09).
 *
 * WHY THIS EXISTS
 * Ifolor prints "6-9 working days" on every product page. Useful, but a
 * single static number: it does not know what day it is, whether the shop
 * is open, whether a holiday is about to close the calendar, or which
 * product the customer actually chose.
 *
 * This computes a real answer:
 *   - when the order would actually be READY, from today + the product's
 *     production lead time, skipping Sundays because the shop is shut
 *   - whether a date the CUSTOMER asks for is achievable
 *   - why not, when it is not, naming the reason instead of just refusing
 *
 * It is deliberately pessimistic. It counts working days, not calendar
 * days, and it will say "no" rather than round in the customer's favour.
 * A promise the shop cannot keep costs more than a slower one it can.
 */
(function (root) {
  "use strict";

  var DAY_NAMES = {
    en: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    am: ["እሑድ","ሰኞ","ማክሰኞ","ረቡዕ","ሐሙስ","ዓርብ","ቅዳሜ"]
  };
  var MONTHS = {
    en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    am: ["ጃንዩ","ፌብሩ","ማርች","ኤፕሪ","ሜይ","ጁን","ጁላይ","ኦገስ","ሴፕቴ","ኦክቶ","ኖቬም","ዲሴም"]
  };

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function isSunday(d) { return d.getDay() === 0; }

  /* Add N working days, skipping Sundays. */
  function addWorkingDays(from, n) {
    var d = startOfDay(from);
    var left = n;
    while (left > 0) {
      d.setDate(d.getDate() + 1);
      if (!isSunday(d)) left--;
    }
    return d;
  }

  /* Working days between two dates, ignoring Sundays. Negative if b < a. */
  function workingDaysBetween(a, b) {
    var s = startOfDay(a), e = startOfDay(b);
    var sign = 1;
    if (e < s) { var t = s; s = e; e = t; sign = -1; }
    var count = 0, cur = new Date(s);
    while (cur < e) {
      cur.setDate(cur.getDate() + 1);
      if (!isSunday(cur)) count++;
    }
    return count * sign;
  }

  function fmt(d, lang) {
    var dn = DAY_NAMES[lang === "am" ? "am" : "en"][d.getDay()];
    var mo = MONTHS[lang === "am" ? "am" : "en"][d.getMonth()];
    return dn + " " + d.getDate() + " " + mo;
  }

  /* The earliest realistic ready date for a product ordered now.
     `lead` is the product's production days from norcha-data.js.
     The shop's own cut-off is 16:00 — after that, "today" no longer counts. */
  function earliestReady(now, lead, cutoffHour) {
    now = now || new Date();
    cutoffHour = (cutoffHour === undefined) ? 16 : cutoffHour;
    var start = startOfDay(now);
    /* If it is already past cut-off, or a Sunday, production starts the
       next working day — so the customer effectively loses today. */
    var afterCutoff = now.getHours() >= cutoffHour;
    var base = startOfDay(now);
    if (afterCutoff || isSunday(base)) {
      base = addWorkingDays(base, 1);
      lead = lead; /* lead counted from that new base */
      return addWorkingDays(base, Math.max(0, lead - 1));
    }
    /* lead 0 means same day */
    if (lead === 0) return base;
    return addWorkingDays(base, lead);
  }

  /* Can we hit the customer's requested date?
     Pessimistic on purpose: if it does not fit, say so and name the reason. */
  function assess(now, requested, lead, opts) {
    opts = opts || {};
    now = now || new Date();
    var ready = earliestReady(now, lead, opts.cutoffHour);

    if (!requested) {
      return { ok: true, ready: ready, days: workingDaysBetween(now, ready) };
    }

    var want = startOfDay(requested);
    var today = startOfDay(now);

    if (want < today) {
      return { ok: false, reason: "past", ready: ready, want: want };
    }
    if (isSunday(want)) {
      return { ok: false, reason: "sunday", ready: ready, want: want };
    }
    if (want >= ready) {
      return {
        ok: true, ready: ready, want: want,
        days: workingDaysBetween(now, want),
        slack: workingDaysBetween(ready, want)
      };
    }
    return {
      ok: false, reason: "tooSoon", ready: ready, want: want,
      short: workingDaysBetween(want, ready)
    };
  }

  root.NorchaDelivery = {
    earliestReady: earliestReady,
    assess: assess,
    fmt: fmt,
    addWorkingDays: addWorkingDays,
    workingDaysBetween: workingDaysBetween
  };
})(typeof window !== "undefined" ? window : this);
