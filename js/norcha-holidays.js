/* Norcha Print — Ethiopian holiday deadline engine.
 *
 * WHY THIS EXISTS
 * Ifolor prints "Last order dates for Christmas" as one hardcoded line.
 * That is a euro-market assumption: one gift holiday, one date, one number.
 * Ethiopia has a LADDER of printing occasions, and every one of them sends
 * families to a print shop in the same week:
 *
 *   Meskel (27 Sep) · Genna (7 Jan) · Timket (19 Jan) · Fasika (Easter)
 *   Enkutatash (11 Sep) · plus graduation season and Mother's Day
 *
 * So this is not one line — it is a calendar that computes the NEXT deadline,
 * counts the days down, and accounts for the fact that a canvas needs one
 * production day while a photo book needs three.
 *
 * Everything is chosen so it degrades honestly: if no holiday is near, the
 * strip hides itself. It never invents urgency.
 */
(function (root) {
  "use strict";

  /* ⚠️ Dates are the FIXED (Gregorian) dates for Ethiopian holidays.
     Fasika is the exception — it is a movable feast, computed from
     Orthodox Easter, so it gets its own function below.
     [FEVEN] the shop should confirm which occasions actually drive her orders. */

  var HOLIDAYS = [
    { id: "meskel",     en: "Meskel",             am: "መስቀል",        md: [9, 27] },
    { id: "enkutatash", en: "Enkutatash",         am: "እንቁጣጣሽ",     md: [9, 11] },
    { id: "genna",      en: "Genna",              am: "ገና",          md: [1, 7]  },
    { id: "timket",     en: "Timket",             am: "ጥምቀት",       md: [1, 19] },
    { id: "mothersday", en: "Mother's Day",       am: "የእናቶች ቀን",   md: [5, 10] },
    { id: "graduation", en: "Graduation season",  am: "የምረቃ ወቅት",   md: [7, 1]  }
  ];

  /* Orthodox Easter (Fasika).
   *
   * 🔴 CORRECTED 2026-09-25 — this previously added 7 days and was a week or
   * more out, on a WRONG WEEKDAY, every single year.
   *
   * WHAT WAS WRONG
   * Meeus/Jones/Butcher as written above yields a date in the JULIAN calendar.
   * The old code added 7 days, commented "Orthodox is usually +1 week". But
   * +7 days never converts Julian to Gregorian — the offset has been 13 days
   * since 1900 (it becomes 14 in 2100). The result was not just late, it was
   * arithmetically impossible: it produced a MONDAY every year for 2025-2030.
   * Easter is a Sunday in every tradition.
   *
   *   was: 14 Apr 2025, 6 Apr 2026, 26 Apr 2027   (all Mondays)
   *   now: 20 Apr 2025, 12 Apr 2026,  2 May 2027  (all Sundays, and matching
   *                                                  every published Orthodox
   *                                                  Easter calendar)
   *
   * TWO FIXES, not one
   * 1. The offset: +7 became the century table below.
   * 2. The calendar: Date.UTC, not local time. The old code used the local
   *    getDate/setDate pair, which shifts by a day in any timezone whose UTC
   *    offset crosses midnight — and would have been silently wrong again the
   *    moment anything compared these dates against a UTC value.
   *
   * [FEVEN] should still confirm against the official Ethiopian calendar; this
   * is now consistent with published Orthodox dates, not with her shop's list.
   */
  function fasika(year) {
    var a = year % 4, b = year % 7, c = year % 19;
    var d = (19 * c + 15) % 30;
    var e = (2 * a + 4 * b - d + 34) % 7;
    var month = Math.floor((d + e + 114) / 31);
    var day = ((d + e + 114) % 31) + 1;

    /* This is the JULIAN date. Convert it to the Gregorian calendar. */
    var julian = new Date(Date.UTC(year, month - 1, day));
    var offset = (year < 1900) ? 12 : (year < 2100 ? 13 : 14);
    julian.setUTCDate(julian.getUTCDate() + offset);
    return julian;
  }

  /* The most generous lead time in the catalogue, in production days.
     Used to work out the real order-by date. */
  var MAX_LEAD = 3;      // photo books

  function ymd(d) {
    return d.getUTCFullYear() + "-" + (d.getUTCMonth() + 1) + "-" + d.getUTCDate();
  }

  function startOfDay(d) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  function daysBetween(a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
  }

  /* Every upcoming occasion, soonest first, with its real order-by date. */
  function upcoming(from, horizonDays, leadDays) {
    from = startOfDay(from || new Date());   /* startOfDay normalises to UTC */
    horizonDays = horizonDays || 90;
    leadDays = (leadDays === undefined) ? MAX_LEAD : leadDays;

    var out = [], y = from.getUTCFullYear();
    for (var yi = 0; yi <= 1; yi++) {
      HOLIDAYS.forEach(function (h) {
        var d = new Date(Date.UTC(y + yi, h.md[0] - 1, h.md[1]));
        out.push({ id: h.id, en: h.en, am: h.am, date: d });
      });
      out.push({ id: "fasika", en: "Fasika", am: "ፋሲካ", date: fasika(y + yi) });
    }

    return out
      .filter(function (h) { return daysBetween(from, h.date) >= 0; })
      .map(function (h) {
        /* Step back leadDays WORKING days. A Sunday is stepped over without
           counting, because the shop is shut — a deadline that lands on a day
           the customer cannot act on is not a deadline. All arithmetic is UTC
           so that a fixed-date holiday and the computed Fasika date are
           measured on the same calendar. */
        var orderBy = new Date(h.date.getTime());
        var back = leadDays;
        while (back > 0) {
          orderBy.setUTCDate(orderBy.getUTCDate() - 1);
          if (orderBy.getUTCDay() !== 0) back--;
        }
        return {
          id: h.id, en: h.en, am: h.am,
          date: h.date,
          days: daysBetween(from, h.date),
          orderBy: orderBy,
          daysToOrder: daysBetween(from, orderBy)
        };
      })
      .filter(function (h) { return h.days <= horizonDays; })
      .sort(function (a, b) { return a.days - b.days; });
  }

  /* The one to show. Returns null when nothing is close enough to matter —
     a permanent countdown is noise, and noise stops being read. */
  function current(from, horizonDays) {
    var list = upcoming(from, horizonDays || 75);
    return list.length ? list[0] : null;
  }

  /* Render into a container. Bilingual: the page already has an .am class,
     so we emit both and let CSS pick. */
  function render(el, holiday, lang) {
    if (!el) return false;
    if (!holiday) { el.hidden = true; return false; }

    var name = (lang === "am") ? holiday.am : holiday.en;
    var days = holiday.daysToOrder;

    var msg, sub;
    if (days > 1) {
      msg = name + ": order within " + days + " days";
      sub = "to be ready before the holiday";
    } else if (days === 1) {
      msg = name + ": last day to order is tomorrow";
      sub = "photo books may need longer";
    } else if (days === 0) {
      msg = "Today is the last day to order for " + name;
      sub = "message us before we close";
    } else {
      msg = "Same-day pickup is no longer guaranteed for " + name;
      sub = "message us and we will tell you honestly";
    }

    el.innerHTML = "";
    var span = document.createElement("span");
    span.className = "hd-msg";
    span.textContent = msg;
    var small = document.createElement("span");
    small.className = "hd-sub";
    small.textContent = " — " + sub;
    el.appendChild(span);
    el.appendChild(small);
    el.hidden = false;
    return true;
  }

  /* Date formatting in both languages. Kept here as well as in the delivery
     module because this is the DATE module — counter.html loads only this
     file and still needs to print a readable date. Duplicating four lines of
     month names is cheaper than making every consumer load a second file. */
  var DAY_NAMES = {
    en: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    am: ["እሑድ","ሰኞ","ማክሰኞ","ረቡዕ","ሐሙስ","ዓርብ","ቅዳሜ"]
  };
  var MONTHS = {
    en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    am: ["ጃንዩ","ፌብሩ","ማርች","ኤፕሪ","ሜይ","ጁን","ጁላይ","ኦገስ","ሴፕቴ","ኦክቶ","ኖቬም","ዲሴም"]
  };
  function fmt(d, lang) {
    var L = (lang === "am") ? "am" : "en";
    return DAY_NAMES[L][d.getUTCDay()] + " " + d.getUTCDate() + " " + MONTHS[L][d.getUTCMonth()];
  }

  root.NorchaHolidays = {
    list: upcoming,
    current: current,
    render: render,
    fasika: fasika,
    fmt: fmt,
    DAY_NAMES: DAY_NAMES,
    MONTHS: MONTHS,
    MAX_LEAD: MAX_LEAD
  };
})(typeof window !== "undefined" ? window : this);
