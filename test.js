// Challan smoke tests — run with: node test.js
// Every canonical figure used in the mockups, slides and copy is asserted here.
var assert = require("assert");
var fs = require("fs");
var data = require("./data.js");
var L = require("./logic.js");

var n = 0;

function eq(a, b, msg) { assert.strictEqual(a, b, msg); n++; }
function ok(v, msg) { assert.ok(v, msg); n++; }
function deep(a, b, msg) { assert.deepStrictEqual(a, b, msg); n++; }

// 1. Vehicle: Suzuki Alto, plate LHR-4812, Lahore. Owner Ahmed Raza.
deep(data.VEHICLE, { make: "Suzuki Alto", plate: "LHR-4812", city: "Lahore",
  owner: "Ahmed Raza" },
     "Suzuki Alto, LHR-4812, Lahore, owner Ahmed Raza");

// 2. The 3 challans (sample, checked 14 Nov 2026).
eq(data.CHALLANS.length, 3, "board has 3 challans");
var c4812 = L.findChallan(data.CHALLANS, "CH-2026-4812");
deep(c4812, { id: "CH-2026-4812", offence: "Overspeeding",
  road: "Ferozepur Road, Lahore", date: "12 Nov 2026", fine: 2000,
  status: "UNPAID", due: "26 Nov 2026", dueISO: "2026-11-26",
  lateFee: 500, paidDate: null },
     "CH-2026-4812: Overspeeding, Ferozepur Road, 12 Nov 2026, Rs 2,000, UNPAID, due 26 Nov 2026");
var c077 = L.findChallan(data.CHALLANS, "CH-2026-077");
eq(c077.offence, "Red-light jump", "CH-2026-077 is a red-light jump");
eq(c077.road, "Mall Road, Lahore", "CH-2026-077 is on Mall Road");
eq(c077.date, "28 Oct 2026", "CH-2026-077 is dated 28 Oct 2026");
eq(c077.fine, 1000, "CH-2026-077 fine is Rs 1,000");
eq(c077.status, "PAID", "CH-2026-077 is PAID");
eq(c077.paidDate, "30 Oct 2026", "CH-2026-077 was paid 30 Oct 2026");
var c310 = L.findChallan(data.CHALLANS, "CH-2026-310");
eq(c310.offence, "Wrong-side driving", "CH-2026-310 is wrong-side driving");
eq(c310.road, "Canal Road, Lahore", "CH-2026-310 is on Canal Road");
eq(c310.date, "3 Nov 2026", "CH-2026-310 is dated 3 Nov 2026");
eq(c310.fine, 1500, "CH-2026-310 fine is Rs 1,500");
eq(c310.status, "UNPAID", "CH-2026-310 is UNPAID");
eq(c310.due, "17 Nov 2026", "CH-2026-310 is due 17 Nov 2026");
eq(c310.lateFee, 500, "CH-2026-310 late fee is Rs 500");
eq(L.findChallan(data.CHALLANS, "CH-2026-999"), null, "unknown challan id returns null");
eq(data.LATE_FEE, 500, "late fee is Rs 500");

// 3. Plate lookup: LHR-4812 finds 3 challans; anything else finds none.
eq(L.challansForPlate(data.CHALLANS, data.VEHICLE, "LHR-4812").length, 3,
   "LHR-4812 lookup finds 3 challans");
eq(L.challansForPlate(data.CHALLANS, data.VEHICLE, "lhr 4812").length, 3,
   "lookup is case-insensitive and ignores spaces");
eq(L.challansForPlate(data.CHALLANS, data.VEHICLE, "LHR4812").length, 3,
   "lookup ignores dashes too");
eq(L.challansForPlate(data.CHALLANS, data.VEHICLE, "LHR-9902").length, 0,
   "LHR-9902 is not the owner's plate — no challans");
eq(L.challansForPlate(data.CHALLANS, data.VEHICLE, "ABC-123").length, 0,
   "an unknown plate finds no challans");
eq(L.challansForPlate(data.CHALLANS, data.VEHICLE, "").length, 0,
   "an empty plate finds no challans");
eq(L.normalisePlate("lhr-4812"), "LHR4812", "plate normalisation strips dashes and upper-cases");

// 4. Paid/unpaid filter.
deep(L.filterChallans(data.CHALLANS, "UNPAID").map(function (c) { return c.id; }),
     ["CH-2026-4812", "CH-2026-310"], "unpaid filter keeps the 2 unpaid challans");
deep(L.filterChallans(data.CHALLANS, "PAID").map(function (c) { return c.id; }),
     ["CH-2026-077"], "paid filter keeps the 1 paid challan");
eq(L.filterChallans(data.CHALLANS, "all").length, 3, "all filter keeps 3 challans");

// 5. Totals: unpaid now Rs 3,500 (2 challans); if both go late Rs 4,500.
var unpaid = L.unpaidTotal(data.CHALLANS);
eq(unpaid.total, 3500, "unpaid total is Rs 3,500");
eq(unpaid.count, 2, "2 unpaid challans");
var totals = L.lateTotals(data.CHALLANS);
eq(totals.now, 3500, "pay now: Rs 3,500");
eq(totals.late, 4500, "if both go late: Rs 4,500");
eq(totals.save, 1000, "paying on time saves Rs 1,000");
eq(totals.count, 2, "late-fee calculator counts 2 unpaid challans");
eq(L.unpaidTotal([]).total, 0, "empty board has zero unpaid");
eq(L.lateTotals([]).late, 0, "empty board has zero late total");

// 6. Due-date maths (today pinned to 14 Nov 2026).
eq(L.daysUntilDue("2026-11-14", "2026-11-17"), 3, "CH-2026-310 is due in 3 days");
eq(L.daysUntilDue("2026-11-14", "2026-11-26"), 12, "CH-2026-4812 is due in 12 days");
eq(L.daysUntilDue("2026-11-14", "2026-11-11"), -3, "CH-2026-077 was due 3 days ago");
eq(L.isLate("2026-11-14", c4812), false, "CH-2026-4812 is not late on 14 Nov");
eq(L.isLate("2026-11-27", c4812), true, "CH-2026-4812 is late on 27 Nov");
eq(L.amountDue("2026-11-14", c4812), 2000, "CH-2026-4812 costs Rs 2,000 on time");
eq(L.amountDue("2026-11-27", c4812), 2500, "CH-2026-4812 costs Rs 2,500 if late");
eq(L.amountDue("2026-11-14", c310), 1500, "CH-2026-310 costs Rs 1,500 on time");
eq(L.amountDue("2026-11-18", c310), 2000, "CH-2026-310 costs Rs 2,000 if late");

// 7. Reminders: 3 days before each due date.
eq(L.reminderDate("2026-11-17"), "14 Nov 2026", "CH-2026-310 reminder is 14 Nov 2026");
eq(L.reminderDate("2026-11-26"), "23 Nov 2026", "CH-2026-4812 reminder is 23 Nov 2026");
eq(data.REMINDERS.length, 2, "two reminders, one per unpaid challan");
eq(data.REMINDERS[0].challanId, "CH-2026-310", "first reminder is for CH-2026-310");
eq(data.REMINDERS[1].challanId, "CH-2026-4812", "second reminder is for CH-2026-4812");

// 8. Receipts: CHL-2026-XXXX format.
var ref = L.mintReceipt();
ok(L.isReceipt(ref), "minted receipt " + ref + " matches CHL-2026-XXXX");
ok(L.isReceipt("CHL-2026-4812"), "CHL-2026-4812 is a valid receipt");
ok(!L.isReceipt("CHL-2026-481"), "a 3-digit receipt is invalid");
ok(!L.isReceipt("KRY-2026-4812"), "a different-prefix receipt is invalid here");
ok(!L.isReceipt(""), "an empty receipt is invalid");

// 9. Paying a challan marks it PAID without mutating the original list.
var paid = L.payChallan(data.CHALLANS, "CH-2026-4812", "14 Nov 2026");
eq(L.findChallan(paid, "CH-2026-4812").status, "PAID", "paying marks CH-2026-4812 PAID");
eq(L.findChallan(paid, "CH-2026-4812").paidDate, "14 Nov 2026", "paying records the paid date");
eq(L.findChallan(data.CHALLANS, "CH-2026-4812").status, "UNPAID", "paying never mutates the original list");
eq(L.unpaidTotal(paid).total, 1500, "after paying CH-2026-4812 only Rs 1,500 is unpaid");
var paidAll = L.payChallan(paid, "CH-2026-310", "14 Nov 2026");
eq(L.unpaidTotal(paidAll).total, 0, "after paying both, nothing is unpaid");
eq(L.lateTotals(paidAll).late, 0, "after paying both, the late total is zero");

// 10. Dispute: photo plate must match the owner's plate.
var mismatch = L.disputeVerdict("LHR-9902", "LHR-4812");
eq(mismatch.mismatch, true, "LHR-9902 vs LHR-4812 is a mismatch");
eq(mismatch.verdict, "PLATE MISMATCH — DISPUTE", "mismatch verdict is PLATE MISMATCH — DISPUTE");
var match = L.disputeVerdict("LHR-4812", "LHR-4812");
eq(match.mismatch, false, "LHR-4812 vs LHR-4812 matches");
eq(match.verdict, "PLATE MATCHES — NO DISPUTE", "matching plate has no dispute");
var mismatchCase = L.disputeVerdict("lhr 9902", "LHR-4812");
eq(mismatchCase.mismatch, true, "dispute check ignores case and spaces");
deep(data.DISPUTE_SAMPLE, { id: "CH-2026-902", car: "white Corolla",
  photoPlate: "LHR-9902", offence: "Overspeeding",
  road: "Ferozepur Road, Lahore", date: "10 Nov 2026", fine: 2000 },
     "dispute sample: CH-2026-902, white Corolla, photo plate LHR-9902");

// 11. Pay methods: JazzCash / Easypaisa / Bank.
deep(data.PAY_METHODS, ["JazzCash", "Easypaisa", "Bank"],
     "pay methods are JazzCash, Easypaisa, Bank");

// 12. Agent-spotter quiz: 3 red flags + 1 safe habit.
eq(data.SPOTTER_FLAGS.length, 4, "spotter quiz has 4 scenarios");
eq(data.SPOTTER_FLAGS.filter(function (f) { return f.isFlag; }).length, 3,
   "spotter quiz has 3 red flags");
eq(L.spotterAnswer(data.SPOTTER_FLAGS[0], true), true, "cash with no receipt is a red flag");
eq(L.spotterAnswer(data.SPOTTER_FLAGS[0], false), false, "calling it safe is wrong");
eq(L.spotterAnswer(data.SPOTTER_FLAGS[1], true), true, "\u201cdoubles tomorrow\u201d rush is a red flag");
eq(L.spotterAnswer(data.SPOTTER_FLAGS[2], true), true, "CNIC photo on WhatsApp is a red flag");
eq(L.spotterAnswer(data.SPOTTER_FLAGS[3], false), true, "official receipt for the fine only is safe");
eq(L.spotterAnswer(data.SPOTTER_FLAGS[3], true), false, "calling the safe habit a flag is wrong");
var perfect = {};
data.SPOTTER_FLAGS.forEach(function (f) { perfect[f.id] = f.isFlag; });
var sPerfect = L.scoreQuiz(data.SPOTTER_FLAGS, perfect);
eq(sPerfect.correct, 4, "perfect answers score 4 of 4");
eq(sPerfect.perfect, true, "perfect answers are perfect");
var sNone = L.scoreQuiz(data.SPOTTER_FLAGS, {});
eq(sNone.correct, 0, "no answers score 0 of 4");
eq(sNone.perfect, false, "no answers are not perfect");
var sHalf = L.scoreQuiz(data.SPOTTER_FLAGS, { "cash-no-receipt": true, "doubles-tomorrow": true });
eq(sHalf.correct, 2, "two right answers score 2 of 4");

// 13. Checklist toggle: pure, never mutates.
var start = ["rem-310"];
var added = L.toggleChecklist(start, "rem-4812");
deep(added, ["rem-310", "rem-4812"], "toggle adds a missing reminder");
deep(start, ["rem-310"], "toggle never mutates the original list");
deep(L.toggleChecklist(start, "rem-310"), [], "toggle removes a done reminder");
deep(L.checklistProgress(["rem-310"], data.REMINDERS), { done: 1, total: 2 },
     "progress is 1 of 2 reminders");
deep(L.checklistProgress([], data.REMINDERS), { done: 0, total: 2 }, "progress starts at 0 of 2");

// 14. Pakistani digit grouping.
eq(L.formatPKR(500), "500", "Rs 500");
eq(L.formatPKR(1000), "1,000", "Rs 1,000");
eq(L.formatPKR(1500), "1,500", "Rs 1,500");
eq(L.formatPKR(2000), "2,000", "Rs 2,000");
eq(L.formatPKR(2500), "2,500", "Rs 2,500");
eq(L.formatPKR(3500), "3,500", "Rs 3,500");
eq(L.formatPKR(4500), "4,500", "Rs 4,500");

// 15. Persona: the canonical facts.
deep(data.PERSONA, { name: "Ahmed Raza", age: 34, city: "Lahore",
  blockedBy: "licence renewal", agentFeeRs: 1500, fineRs: 2000 },
     "Ahmed Raza, 34, Lahore, blocked at licence renewal, agent asked Rs 1,500 for a Rs 2,000 fine");

// 16. Every element id referenced by app.js exists in index.html.
var html = fs.readFileSync(__dirname + "/index.html", "utf8");
var appJs = fs.readFileSync(__dirname + "/app.js", "utf8");
var ids = {};
var m;
var idRe = /el\("([^"]+)"\)/g;
while ((m = idRe.exec(appJs)) !== null) ids[m[1]] = true;
var idList = Object.keys(ids);
ok(idList.length >= 12, "app.js references at least 12 element ids (" + idList.length + " found)");
idList.forEach(function (id) {
  ok(html.indexOf('id="' + id + '"') !== -1, "index.html defines id " + id);
});
["data.js", "logic.js", "app.js"].forEach(function (f) {
  ok(html.indexOf('src="' + f + '"') !== -1, "index.html loads " + f);
});
ok(html.indexOf('href="style.css"') !== -1, "index.html loads style.css");
// Tab buttons and sections exist for all five tabs.
["board", "pay", "dispute", "reminders", "spotter"].forEach(function (t) {
  ok(html.indexOf('id="tab-' + t + '"') !== -1, "index.html defines tab " + t);
  ok(html.indexOf('id="section-' + t + '"') !== -1, "index.html defines section " + t);
});
// No phone number and no leftover text from previous projects.
ok(html.indexOf("0342") === -1 && html.indexOf("9011609") === -1, "index.html carries no phone number");
["Kiraya", "Silinder", "RemitPak"].forEach(function (word) {
  ok(html.indexOf(word) === -1, "index.html has no leftover " + word + " text");
});

// 17. HTML tag balance: every opened tag is closed (void elements excluded).
var voidTags = { meta: 1, link: 1, input: 1, br: 1, hr: 1, img: 1 };
var stack = [];
var tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g;
while ((m = tagRe.exec(html)) !== null) {
  var tag = m[1].toLowerCase();
  var raw = m[0];
  if (voidTags[tag]) continue;
  if (raw[1] === "/") {
    eq(stack.pop(), tag, "closing tag </" + tag + "> matches the last opened tag");
  } else if (raw[raw.length - 2] !== "/") {
    stack.push(tag);
  }
}
eq(stack.length, 0, "no unclosed tags remain (stack empty)");

console.log("\n" + n + " assertions passed.");
