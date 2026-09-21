/* Norcha Print — gift vouchers (T-18).
 *
 * WHY THIS SHAPE
 * Ifolor sells digital and PDF gift vouchers because it has a payment
 * processor. Norcha takes Telebirr, bank transfer, or cash at the counter.
 * So a voucher here cannot be a checkout product — it has to work when the
 * buyer is standing in the shop, or messaging on WhatsApp, with no card
 * involved anywhere.
 *
 * THE DESIGN THAT FITS THIS SHOP
 * A gift voucher is bought in person or over WhatsApp, paid the same way as
 * anything else, and issued as a CODE. The code is a set of characters
 * somebody can read off a printed slip or paste into a chat. There is no
 * server, so the code itself carries everything needed to verify it:
 *
 *     NP-4F2K-2500-E9
 *     │  │    │    └─ 2-char check, so a typo is caught before it is honoured
 *     │  │    └────── value in ETB
 *     │  └─────────── random part
 *     └────────────── shop prefix
 *
 * The check characters are what make this safe to accept over WhatsApp: a
 * mistyped or invented code fails the check and is refused, and the person
 * taking the order knows immediately.
 *
 * ⚠️ HONEST LIMIT, STATED PLAINLY: a code with no server behind it cannot
 * prove it has not already been used. Feven must keep a record of redeemed
 * codes — a notebook or a note on her phone. The tool that issues a voucher
 * therefore also produces a one-line record to keep. This is deliberate:
 * a system that pretended to prevent double-spending would be lying.
 */
(function (root) {
  "use strict";

  var PREFIX = "NP";
  var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; /* no I,O,0,1 — misreads */

  /* Values a customer is most likely to actually want. Not free text, so a
     voucher cannot be issued for an amount the shop has not agreed. */
  var DENOMINATIONS = [500, 1000, 1500, 2500, 5000];

  function randomBlock(n) {
    var s = "";
    for (var i = 0; i < n; i++) {
      s += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
    }
    return s;
  }

  /* A 2-character check derived from the body. Not a cryptographic MAC —
     it does not need to be. It only has to catch a human typo or a made-up
     code, which is exactly what it does. */
  function checkChars(body) {
    var h1 = 7, h2 = 13;
    for (var i = 0; i < body.length; i++) {
      var c = body.charCodeAt(i);
      h1 = (h1 * 31 + c) % 1021;
      h2 = (h2 * 37 + c) % 1013;
    }
    var h3 = 17;
    for (var k = 0; k < body.length; k++) {
      h3 = (h3 * 41 + body.charCodeAt(k)) % 2039;
    }
    return ALPHABET.charAt(h1 % ALPHABET.length) +
           ALPHABET.charAt(h2 % ALPHABET.length) +
           ALPHABET.charAt(h3 % ALPHABET.length);
  }

  function issue(value) {
    var body = randomBlock(4) + "-" + value;
    var code = PREFIX + "-" + body + "-" + checkChars(body);
    return {
      code: code,
      value: value,
      issued: new Date(),
      /* the line Feven keeps — this is the whole redemption ledger */
      record: code + "  " + value + " ETB  issued " +
              new Date().toISOString().slice(0, 10)
    };
  }

  /* Read a code back. Returns null when it is not a Norcha voucher at all,
     or { valid:false } when it looks like one but fails the check. */
  function parse(code) {
    if (!code) return null;
    /* People retype these. Uppercase, and drop everything that is not a
       letter, digit or dash, so "np 4f2k 2500 e9" still works. */
    var c = String(code).toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!c) return null;

    /* Customers drop the dashes. Re-insert them STRUCTURALLY rather than by
       fixed offsets, because the value block changes length (500 vs 5000).
       Shape after stripping dashes:  NP + 4 random + value + 3 check  */
    if (c.indexOf("-") === -1) {
      if (c.indexOf(PREFIX) !== 0) return null;
      var rest = c.slice(PREFIX.length);          /* 4 + value + 3 */
      if (rest.length < 4 + 1 + 3) return null;
      c = PREFIX + "-" + rest.slice(0, 4) + "-" +
          rest.slice(4, rest.length - 3) + "-" + rest.slice(rest.length - 3);
    }

    var parts = c.split("-");
    if (parts.length !== 4) return null;
    if (parts[0] !== PREFIX) return null;
    if (parts[3].length !== 3) return null;

    var body = parts[1] + "-" + parts[2];
    var value = parseInt(parts[2], 10);
    if (!isFinite(value) || value <= 0) return { valid: false, reason: "value" };

    if (parts[3] !== checkChars(body)) return { valid: false, reason: "check" };
    return { valid: true, code: c, value: value };
  }

  root.NorchaVoucher = {
    DENOMINATIONS: DENOMINATIONS,
    issue: issue,
    parse: parse,
    checkChars: checkChars
  };
})(typeof window !== "undefined" ? window : this);
