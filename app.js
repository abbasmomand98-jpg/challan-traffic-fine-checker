// Challan — page wiring. All rules live in logic.js; this file only renders.
// "Today" is pinned to 2026-11-14 so the sample figures (Suzuki Alto,
// LHR-4812, CH-2026-4812 Rs 2,000 due 26 Nov 2026, CH-2026-310 Rs 1,500
// due 17 Nov 2026, CH-2026-077 Rs 1,000 paid 30 Oct 2026, unpaid now
// Rs 3,500, Rs 4,500 if both go late, receipt CHL-2026-XXXX, dispute
// sample CH-2026-902 / LHR-9902, agent fee Rs 1,500) stay stable no
// matter when you open it.
(function () {
  var L = window.ChallanLogic;
  var TODAY = "2026-11-14";
  var TODAY_LABEL = "14 Nov 2026";
  var STORE_PAID = "challan-paid";
  var STORE_RECEIPTS = "challan-receipts";
  var STORE_DISPUTES = "challan-disputes";
  var STORE_REMINDERS = "challan-reminders-done";
  var STORE_SPOTTER = "challan-spotter-answers";

  function el(id) { return document.getElementById(id); }
  function rs(n) { return "Rs " + L.formatPKR(n); }

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; }
    catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  var paidIds = loadJSON(STORE_PAID, []);
  var receipts = loadJSON(STORE_RECEIPTS, {});
  var disputes = loadJSON(STORE_DISPUTES, []);
  var reminderDone = loadJSON(STORE_REMINDERS, []);
  var spotterAnswers = loadJSON(STORE_SPOTTER, {});
  var currentPlate = "LHR-4812";

  // ---- Tabs ----
  var TABS = ["board", "pay", "dispute", "reminders", "spotter"];
  function showTab(name) {
    TABS.forEach(function (t) {
      el("section-" + t).style.display = (t === name) ? "block" : "none";
      el("tab-" + t).className = "tab-btn" + (t === name ? " active" : "");
    });
  }
  TABS.forEach(function (t) {
    el("tab-" + t).addEventListener("click", function () { showTab(t); });
  });
  showTab("board");

  // Challans with any payments made in this demo applied on top.
  function currentChallans() {
    return CHALLANS.map(function (c) {
      if (paidIds.indexOf(c.id) === -1) return c;
      var next = {};
      for (var k in c) next[k] = c[k];
      next.status = "PAID";
      next.paidDate = TODAY_LABEL;
      return next;
    });
  }

  // ---- Challan board (plate lookup + paid/unpaid filter + totals) ----
  function renderBoard() {
    var all = L.challansForPlate(currentChallans(), VEHICLE, currentPlate);
    var filter = el("filter-select").value || "all";
    var list = L.filterChallans(all, filter);
    var result = el("lookup-result");
    var box = el("challan-list");
    box.innerHTML = "";
    if (all.length === 0) {
      result.innerHTML = '<div class="alert notfound"><strong>No challans found for ' + currentPlate + "</strong>" +
        "<p>No e-challan is recorded against this plate (sample data). Check the plate and try again — or try LHR-4812, the sample plate.</p></div>";
      el("challan-summary").textContent = "";
      el("totals-box").innerHTML = "";
      el("late-box").innerHTML = "";
      return;
    }
    result.innerHTML = '<div class="alert ok"><strong>' + all.length + " CHALLANS FOUND — " + VEHICLE.plate + "</strong>" +
      "<p>" + VEHICLE.make + " · " + VEHICLE.city + " · Owner " + VEHICLE.owner +
      " · checked " + TODAY_LABEL + " (sample).</p></div>";
    if (list.length === 0) {
      box.innerHTML = '<div class="alert warn"><strong>No ' + filter.toLowerCase() + ' challans here</strong>' +
        "<p>Switch the filter back to all challans to see the full board.</p></div>";
    }
    list.forEach(function (c) {
      var div = document.createElement("div");
      div.className = "provider " + (c.status === "UNPAID" ? "unpaid" : "paid");
      var statusLine = c.status === "UNPAID"
        ? "UNPAID · due " + c.due + " · " + L.daysUntilDue(TODAY, c.dueISO) + " days left"
        : "PAID · paid " + c.paidDate;
      div.innerHTML = "<div><h3>" + c.id + "</h3><p>" + c.offence + " · " + c.road +
        "</p><p>" + c.date + " · " + statusLine + "</p></div>" +
        '<div class="recv">' + rs(c.fine) +
        "<span>" + c.status + "</span></div>";
      box.appendChild(div);
    });
    var unpaid = L.unpaidTotal(all);
    el("challan-summary").textContent = VEHICLE.make + " · " + VEHICLE.plate +
      " · " + VEHICLE.city + " · " + all.length + " challans · " + unpaid.count +
      " unpaid · checked " + TODAY_LABEL + " (sample).";
    var totals = L.lateTotals(all);
    el("totals-box").innerHTML =
      '<div class="total"><strong>UNPAID NOW — ' + rs(totals.now) + " (" + totals.count + ' CHALLANS)</strong>' +
      "<p>CH-2026-4812 Rs 2,000 due 26 Nov 2026 and CH-2026-310 Rs 1,500 due 17 Nov 2026. " +
      "Pay before the due dates and save " + rs(totals.save) + ".</p></div>";
    el("late-box").innerHTML =
      '<div class="total"><strong>LATE-FEE CALCULATOR — ' + rs(totals.now) + " NOW vs " + rs(totals.late) + " IF LATE</strong>" +
      "<p>Each unpaid challan adds a Rs 500 late fee after its due date: " +
      rs(totals.now) + " + " + totals.count + " × Rs 500 = " + rs(totals.late) +
      ". Pay on time and keep the " + rs(totals.save) + ".</p></div>";
  }
  el("lookup-btn").addEventListener("click", function () {
    currentPlate = el("plate-input").value || "";
    renderBoard();
  });
  el("plate-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      currentPlate = el("plate-input").value || "";
      renderBoard();
    }
  });
  el("filter-select").addEventListener("change", renderBoard);
  renderBoard();

  // ---- Pay a fine (fine detail + pay flow minting CHL-2026-XXXX) ----
  function fillPaySelect() {
    var sel = el("pay-select");
    var prev = sel.value;
    sel.innerHTML = "";
    var unpaid = currentChallans().filter(function (c) { return c.status === "UNPAID"; });
    if (unpaid.length === 0) {
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No unpaid challans — all paid";
      sel.appendChild(opt);
    }
    unpaid.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.id + " — " + c.offence + " — " + rs(c.fine) + " · due " + c.due;
      sel.appendChild(opt);
    });
    sel.value = (prev && L.findChallan(unpaid, prev)) ? prev : (unpaid[0] ? unpaid[0].id : "");
    renderPayDetail();
  }

  function renderPayDetail() {
    var c = L.findChallan(currentChallans(), el("pay-select").value);
    var box = el("pay-detail");
    if (!c) {
      box.innerHTML = "";
      return;
    }
    var due = L.amountDue(TODAY, c);
    box.innerHTML = '<div class="alert ' + (due > c.fine ? "risk" : "warn") + '"><strong>' +
      c.id + " — " + c.offence.toUpperCase() + " — " + rs(c.fine) + "</strong>" +
      "<p>" + c.road + " · " + c.date + " · " + VEHICLE.make + " · " + VEHICLE.plate +
      " · " + VEHICLE.owner + ". Due " + c.due + " — " +
      L.daysUntilDue(TODAY, c.dueISO) + " days left. Late fee after due: Rs 500 — total " +
      rs(c.fine + c.lateFee) + " if late. Amount due today: <strong>" + rs(due) + "</strong>.</p></div>";
  }
  el("pay-select").addEventListener("change", renderPayDetail);

  function renderReceipt() {
    var box = el("receipt-box");
    var keys = Object.keys(receipts);
    if (keys.length === 0) {
      box.innerHTML = "";
      return;
    }
    var html = "";
    keys.forEach(function (id) {
      var r = receipts[id];
      var c = L.findChallan(CHALLANS, id);
      html += '<div class="receipt"><strong>RECEIPT</strong>' +
        "<h3>\u2713 PAID — " + rs(r.amount) + "</h3>" +
        "<p>Receipt " + r.ref + " · " + id + " · " + (c ? c.offence : "") + "</p>" +
        "<p>Paid " + r.date + " via " + r.method + " (sample). Saved on this device — show it at the traffic office if anyone asks.</p>" +
        '<p><span class="badge-ok">\u2713 PAID</span></p></div>';
    });
    box.innerHTML = html;
  }

  el("pay-btn").addEventListener("click", function () {
    var id = el("pay-select").value;
    var c = L.findChallan(currentChallans(), id);
    if (!c) {
      el("pay-result").innerHTML = '<div class="alert notfound"><strong>No unpaid challan selected</strong>' +
        "<p>All sample challans are paid — reset the demo to try paying again.</p></div>";
      return;
    }
    var method = el("pay-method").value || "JazzCash";
    var ref = L.mintReceipt();
    var amount = L.amountDue(TODAY, c);
    paidIds.push(id);
    receipts[id] = { ref: ref, amount: amount, method: method, date: TODAY_LABEL };
    saveJSON(STORE_PAID, paidIds);
    saveJSON(STORE_RECEIPTS, receipts);
    el("pay-result").innerHTML = '<div class="alert ok"><strong>\u2713 PAID — ' + rs(amount) + " VIA " + method.toUpperCase() + "</strong>" +
      "<p>" + c.id + " · " + c.offence + " · receipt " + ref +
      ". Paid " + TODAY_LABEL + " (sample). No agent fee — the official cost was just the fine.</p></div>";
    renderReceipt();
    renderPayDetail();
    fillPaySelect();
    renderBoard();
  });
  fillPaySelect();
  renderReceipt();

  // ---- Dispute (photo-evidence check + one-tap dispute) ----
  function renderDispute() {
    var photo = el("dispute-photo-plate").value || "";
    var own = el("dispute-own-plate").value || "";
    var v = L.disputeVerdict(photo, own);
    var cls = v.mismatch ? "risk" : "ok";
    el("dispute-result").innerHTML = '<div class="alert ' + cls + '"><strong>' + v.verdict + "</strong>" +
      "<p>" + v.advice + " Sample case: challan " + DISPUTE_SAMPLE.id + " shows a " +
      DISPUTE_SAMPLE.car + ", photo plate " + DISPUTE_SAMPLE.photoPlate +
      " — not your " + VEHICLE.plate + ".</p></div>";
    return v;
  }
  el("dispute-check-btn").addEventListener("click", renderDispute);
  renderDispute();

  el("dispute-submit-btn").addEventListener("click", function () {
    var v = renderDispute();
    var photo = el("dispute-photo-plate").value || "";
    if (!v.mismatch) {
      el("dispute-status").innerHTML = '<div class="alert warn"><strong>NO DISPUTE TO FILE</strong>' +
        "<p>The photo plate matches your plate — this challan is yours. Pay it before the due date instead.</p></div>";
      return;
    }
    if (disputes.indexOf(DISPUTE_SAMPLE.id) === -1) disputes.push(DISPUTE_SAMPLE.id);
    saveJSON(STORE_DISPUTES, disputes);
    el("dispute-status").innerHTML = '<div class="alert ok"><strong>\u2713 DISPUTE FILED — ' + DISPUTE_SAMPLE.id + "</strong>" +
      "<p>Photo plate " + photo + " vs your " + VEHICLE.plate +
      " — sent to the traffic office for review (sample). Disputes filed in this demo: " +
      disputes.join(", ") + ".</p></div>";
  });
  if (disputes.length > 0) {
    el("dispute-status").innerHTML = '<div class="alert ok"><strong>DISPUTES ON FILE</strong><p>' +
      disputes.join(", ") + " — sent to the traffic office for review (sample).</p></div>";
  }

  // ---- Reminders (3 days before each due date, persisted) ----
  function renderReminders() {
    var list = el("reminders-list");
    list.innerHTML = "";
    REMINDERS.forEach(function (item) {
      var li = document.createElement("li");
      var done = reminderDone.indexOf(item.id) !== -1;
      li.className = done ? "done" : "";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = done;
      cb.setAttribute("aria-label", item.label);
      cb.addEventListener("change", function () {
        reminderDone = L.toggleChecklist(reminderDone, item.id);
        saveJSON(STORE_REMINDERS, reminderDone);
        renderReminders();
      });
      var span = document.createElement("span");
      span.textContent = item.label + " — remind " +
        L.reminderDate(item.challanId === "CH-2026-310" ? "2026-11-17" : "2026-11-26") +
        " (3 days before due)";
      li.appendChild(cb);
      li.appendChild(span);
      list.appendChild(li);
    });
    var p = L.checklistProgress(reminderDone, REMINDERS);
    el("reminders-progress").textContent = p.done + " of " + p.total +
      " reminders set — tick them on and Challan reminds you 3 days before each due date.";
    el("reminders-status").innerHTML = p.done === p.total
      ? '<div class="alert ok"><strong>ALL REMINDERS ON</strong><p>Both due dates are covered — 14 Nov for CH-2026-310 and 23 Nov for CH-2026-4812. Never pay late again.</p></div>'
      : '<div class="alert warn"><strong>' + (p.total - p.done) + " REMINDER" + (p.total - p.done === 1 ? "" : "S") + " LEFT</strong><p>Tick every reminder on — a missed due date costs Rs 500 per challan.</p></div>";
  }
  renderReminders();

  // ---- Agent-spotter quiz ----
  function renderSpotter() {
    var box = el("spotter-quiz");
    box.innerHTML = "";
    SPOTTER_FLAGS.forEach(function (flag, i) {
      var div = document.createElement("div");
      div.className = "spotter-q";
      var chosen = spotterAnswers[flag.id];
      var btnFlag = document.createElement("button");
      btnFlag.textContent = "Red flag";
      btnFlag.className = chosen === true ? "flag-btn chosen" : "flag-btn";
      btnFlag.addEventListener("click", function () {
        spotterAnswers[flag.id] = true;
        saveJSON(STORE_SPOTTER, spotterAnswers);
        renderSpotter();
      });
      var btnSafe = document.createElement("button");
      btnSafe.textContent = "Safe";
      btnSafe.className = "secondary" + (chosen === false ? " chosen" : "");
      btnSafe.addEventListener("click", function () {
        spotterAnswers[flag.id] = false;
        saveJSON(STORE_SPOTTER, spotterAnswers);
        renderSpotter();
      });
      var p = document.createElement("p");
      p.innerHTML = "<strong>" + (i + 1) + ". </strong>" + flag.scenario;
      div.appendChild(p);
      div.appendChild(btnFlag);
      div.appendChild(btnSafe);
      box.appendChild(div);
    });
  }
  renderSpotter();

  el("spotter-btn").addEventListener("click", function () {
    var score = L.scoreQuiz(SPOTTER_FLAGS, spotterAnswers);
    var html = '<div class="alert ' + (score.perfect ? "ok" : "warn") + '"><strong>' +
      score.correct + " OF " + score.total + " CORRECT" + "</strong><p>" +
      (score.perfect ? "Perfect — you spot all three agent red flags and the safe habit."
                     : "Check the ones you missed below — the agent-spotter catches them before the money moves.") +
      "</p></div>";
    SPOTTER_FLAGS.forEach(function (flag) {
      var right = L.spotterAnswer(flag, spotterAnswers[flag.id]);
      var answered = spotterAnswers.hasOwnProperty(flag.id);
      html += '<div class="alert ' + (!answered ? "notfound" : (right ? "ok" : "risk")) + '"><strong>' +
        (answered ? (right ? "✓ CORRECT — " : "✗ MISSED — ") : "NOT ANSWERED — ") +
        (flag.isFlag ? "RED FLAG" : "SAFE") + "</strong><p>" + flag.why + "</p></div>";
    });
    el("spotter-result").innerHTML = html;
  });

  el("reset-demo").addEventListener("click", function () {
    paidIds = [];
    receipts = {};
    disputes = [];
    reminderDone = [];
    spotterAnswers = {};
    saveJSON(STORE_PAID, paidIds);
    saveJSON(STORE_RECEIPTS, receipts);
    saveJSON(STORE_DISPUTES, disputes);
    saveJSON(STORE_REMINDERS, reminderDone);
    saveJSON(STORE_SPOTTER, spotterAnswers);
    currentPlate = "LHR-4812";
    el("plate-input").value = "LHR-4812";
    el("filter-select").value = "all";
    el("pay-method").value = "JazzCash";
    el("dispute-photo-plate").value = "LHR-9902";
    el("dispute-own-plate").value = "LHR-4812";
    el("pay-result").innerHTML = "";
    el("dispute-status").innerHTML = "";
    el("spotter-result").innerHTML = "";
    showTab("board");
    renderBoard();
    fillPaySelect();
    renderReceipt();
    renderDispute();
    renderReminders();
    renderSpotter();
  });
})();
