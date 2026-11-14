// Challan — pure logic, no DOM here, so it can be unit-tested in Node.
(function (root) {
  // Pakistani / Indian digit grouping: 2500 -> "2,500",
  // 3500 -> "3,500", 4500 -> "4,500". Last three digits group
  // together, then groups of two — the way lakh and crore figures are
  // written in Pakistan.
  function formatPKR(n) {
    var s = String(Math.round(n));
    if (s.length <= 3) return s;
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3);
    var groups = [];
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest) groups.unshift(rest);
    return groups.join(",") + "," + last3;
  }

  // Normalise a plate for lookup: upper-case, strip spaces and dashes,
  // so "lhr 4812", "LHR-4812" and "LHR4812" all match.
  function normalisePlate(plate) {
    return String(plate || "").toUpperCase().replace(/[\s-]/g, "");
  }

  // Plate lookup: LHR-4812 returns the 3 sample challans; any other
  // plate returns an empty list (not found).
  function challansForPlate(challans, vehicle, plate) {
    if (normalisePlate(plate) !== normalisePlate(vehicle.plate)) return [];
    return challans.slice();
  }

  // Filter the board by status: "all", "UNPAID" or "PAID".
  function filterChallans(challans, status) {
    if (status === "UNPAID" || status === "PAID") {
      return challans.filter(function (c) { return c.status === status; });
    }
    return challans.slice();
  }

  function findChallan(challans, id) {
    for (var i = 0; i < challans.length; i++) {
      if (challans[i].id === id) return challans[i];
    }
    return null;
  }

  // Unpaid total: Rs 2,000 + Rs 1,500 = Rs 3,500 (2 unpaid challans).
  function unpaidTotal(challans) {
    var total = 0, count = 0;
    challans.forEach(function (c) {
      if (c.status === "UNPAID") { total += c.fine; count++; }
    });
    return { total: total, count: count };
  }

  // Days from "today" (ISO date) to a due date. 14 Nov -> 17 Nov is 3
  // days; 14 Nov -> 26 Nov is 12 days. Negative means already late.
  function daysUntilDue(todayISO, dueISO) {
    var ms = Date.parse(dueISO) - Date.parse(todayISO);
    return Math.round(ms / 86400000);
  }

  // A challan is late when today is past its due date.
  function isLate(todayISO, challan) {
    return daysUntilDue(todayISO, challan.dueISO) < 0;
  }

  // Amount due for one challan today: the fine, plus the Rs 500 late
  // fee only if it is already past its due date.
  // CH-2026-4812: Rs 2,000 on time, Rs 2,500 if late.
  function amountDue(todayISO, challan) {
    return challan.fine + (isLate(todayISO, challan) ? challan.lateFee : 0);
  }

  // Late-fee calculator for the whole board:
  //   now  = unpaid fines today (Rs 3,500 on 14 Nov 2026)
  //   late = unpaid fines + Rs 500 per unpaid challan (Rs 4,500)
  //   save = the difference (Rs 1,000) — what paying on time saves.
  function lateTotals(challans) {
    var unpaid = unpaidTotal(challans);
    var late = unpaid.total + unpaid.count * 500;
    return { now: unpaid.total, late: late, count: unpaid.count,
             save: late - unpaid.total };
  }

  // Reminder date: 3 days before the due date.
  // CH-2026-310 due 17 Nov 2026 -> remind 14 Nov 2026;
  // CH-2026-4812 due 26 Nov 2026 -> remind 23 Nov 2026.
  function reminderDate(dueISO) {
    var d = new Date(Date.parse(dueISO) - 3 * 86400000);
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return d.getUTCDate() + " " + months[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }

  // Payment: mint a receipt like CHL-2026-XXXX. The 4 digits are
  // random, so every payment gets its own receipt.
  function mintReceipt() {
    var n = Math.floor(1000 + Math.random() * 9000);
    return "CHL-2026-" + n;
  }

  function isReceipt(ref) {
    return /^CHL-2026-\d{4}$/.test(String(ref || ""));
  }

  // Paying a challan returns a new list with that challan marked PAID —
  // the original list is never mutated.
  function payChallan(challans, id, paidDate) {
    return challans.map(function (c) {
      if (c.id !== id) return c;
      var next = {};
      for (var k in c) next[k] = c[k];
      next.status = "PAID";
      next.paidDate = paidDate;
      return next;
    });
  }

  // Dispute: the photo plate must match the owner's plate. If it does
  // not — LHR-9902 on the photo vs LHR-4812 on the car — the challan
  // is a plate mismatch and can be disputed with one tap.
  function disputeVerdict(photoPlate, ownPlate) {
    var mismatch = normalisePlate(photoPlate) !== normalisePlate(ownPlate);
    return { mismatch: mismatch,
             verdict: mismatch ? "PLATE MISMATCH — DISPUTE" : "PLATE MATCHES — NO DISPUTE",
             advice: mismatch
               ? "The photo plate " + photoPlate + " is not your " + ownPlate +
                 ". The camera caught the wrong car — dispute it with one tap."
               : "The photo plate matches your " + ownPlate +
                 ". This challan is yours — pay it before the due date." };
  }

  // Checklist toggle: pure — returns a new array, never mutates.
  function toggleChecklist(doneIds, id) {
    var next = doneIds.slice();
    var i = next.indexOf(id);
    if (i === -1) next.push(id);
    else next.splice(i, 1);
    return next;
  }

  function checklistProgress(doneIds, checks) {
    return { done: doneIds.length, total: checks.length };
  }

  // Agent-spotter quiz: each flag has isFlag true/false. Answering
  // "flag" for a real flag (or "safe" for the safe habit) is correct.
  function spotterAnswer(flag, saidFlag) {
    return flag.isFlag === saidFlag;
  }

  function scoreQuiz(flags, answers) {
    var correct = 0;
    flags.forEach(function (f) {
      if (answers[f.id] === f.isFlag) correct++;
    });
    return { correct: correct, total: flags.length,
             perfect: correct === flags.length };
  }

  var api = { formatPKR: formatPKR,
              normalisePlate: normalisePlate,
              challansForPlate: challansForPlate,
              filterChallans: filterChallans,
              findChallan: findChallan,
              unpaidTotal: unpaidTotal,
              daysUntilDue: daysUntilDue,
              isLate: isLate,
              amountDue: amountDue,
              lateTotals: lateTotals,
              reminderDate: reminderDate,
              mintReceipt: mintReceipt,
              isReceipt: isReceipt,
              payChallan: payChallan,
              disputeVerdict: disputeVerdict,
              toggleChecklist: toggleChecklist,
              checklistProgress: checklistProgress,
              spotterAnswer: spotterAnswer,
              scoreQuiz: scoreQuiz };
  if (typeof module !== "undefined") { module.exports = api; }
  else { root.ChallanLogic = api; }
})(typeof window !== "undefined" ? window : globalThis);
