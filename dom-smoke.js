// Challan DOM smoke test — run with: node dom-smoke.js
// Executes data.js + logic.js + app.js in a tiny fake DOM (vm sandbox)
// and asserts the page renders the canonical figures.
var fs = require("fs");
var vm = require("vm");
var assert = require("assert");

function FakeEl(tag) {
  this.tagName = (tag || "div").toUpperCase();
  this.children = [];
  this._html = "";
  this.textContent = "";
  this.value = "";
  this.checked = false;
  this.disabled = false;
  this.className = "";
  this.style = {};
  this.listeners = {};
  this.attributes = {};
}
FakeEl.prototype.addEventListener = function (ev, fn) {
  (this.listeners[ev] = this.listeners[ev] || []).push(fn);
};
FakeEl.prototype.appendChild = function (child) { this.children.push(child); return child; };
FakeEl.prototype.setAttribute = function (k, v) { this.attributes[k] = v; };
FakeEl.prototype.getAttribute = function (k) { return this.attributes[k]; };
Object.defineProperty(FakeEl.prototype, "innerHTML", {
  get: function () { return this._html; },
  set: function (v) { this._html = String(v); this.children = []; }
});

var byId = {};
function el(id) {
  if (!byId[id]) byId[id] = new FakeEl("div");
  return byId[id];
}
var documentStub = {
  getElementById: el,
  createElement: function (tag) { return new FakeEl(tag); }
};
var store = {};
var localStorageStub = {
  getItem: function (k) { return store[k] || null; },
  setItem: function (k, v) { store[k] = String(v); }
};
function fire(id, ev, arg) {
  (byId[id].listeners[ev] || []).forEach(function (fn) { fn(arg || {}); });
}
function fireEl(node, ev, arg) {
  (node.listeners[ev] || []).forEach(function (fn) { fn(arg || {}); });
}

var sandbox = { document: documentStub, localStorage: localStorageStub, console: console,
  Date: Date, setInterval: function () { return 0; }, clearInterval: function () {} };
sandbox.window = sandbox;
vm.createContext(sandbox);
// Pre-seed the fake DOM with the defaults index.html declares in markup
// (the fake DOM does not parse value/selected attributes).
el("plate-input").value = "LHR-4812";
el("filter-select").value = "all";
el("pay-method").value = "JazzCash";
el("dispute-photo-plate").value = "LHR-9902";
el("dispute-own-plate").value = "LHR-4812";
["data.js", "logic.js", "app.js"].forEach(function (f) {
  vm.runInContext(fs.readFileSync(f, "utf8"), sandbox, { filename: f });
});

var n = 0;
function eq(a, b, msg) { assert.strictEqual(a, b, msg); n++; }
function ok(v, msg) { assert.ok(v, msg); n++; }

// 1. Board tab is active on load; lookup renders 3 challans for LHR-4812.
eq(el("section-board").style.display, "block", "board section shows on load");
eq(el("challan-list").children.length, 3, "board renders 3 challans on load");
ok(el("challan-list").children[0].innerHTML.indexOf("CH-2026-4812") !== -1, "first challan is CH-2026-4812");
ok(el("challan-list").children[0].innerHTML.indexOf("Rs 2,000") !== -1, "CH-2026-4812 shows Rs 2,000");
ok(el("challan-list").children[0].innerHTML.indexOf("UNPAID") !== -1, "CH-2026-4812 is UNPAID");
ok(el("challan-list").children[2].innerHTML.indexOf("CH-2026-077") !== -1, "last challan is CH-2026-077");
ok(el("challan-list").children[2].innerHTML.indexOf("PAID") !== -1, "CH-2026-077 is PAID");
ok(el("lookup-result").innerHTML.indexOf("3 CHALLANS FOUND") !== -1, "lookup shows 3 challans found");
ok(el("totals-box").innerHTML.indexOf("Rs 3,500") !== -1, "totals show Rs 3,500 unpaid now");
ok(el("late-box").innerHTML.indexOf("Rs 4,500") !== -1, "late-fee calculator shows Rs 4,500 if late");
ok(el("late-box").innerHTML.indexOf("Rs 1,000") !== -1, "late-fee calculator shows Rs 1,000 saved");
ok(el("challan-summary").textContent.indexOf("LHR-4812") !== -1, "summary names LHR-4812");
ok(el("challan-summary").textContent.indexOf("14 Nov 2026") !== -1, "summary names 14 Nov 2026");

// 2. Unknown plate finds nothing.
el("plate-input").value = "ABC-123";
fire("lookup-btn", "click");
eq(el("challan-list").children.length, 0, "unknown plate renders no challans");
ok(el("lookup-result").innerHTML.indexOf("No challans found") !== -1, "unknown plate shows not-found");
ok(el("totals-box").innerHTML === "", "unknown plate clears the totals");
el("plate-input").value = "LHR-4812";
fire("lookup-btn", "click");
eq(el("challan-list").children.length, 3, "looking up LHR-4812 again restores 3 challans");

// 3. Unpaid filter keeps 2; paid filter keeps 1.
el("filter-select").value = "UNPAID";
fire("filter-select", "change");
eq(el("challan-list").children.length, 2, "unpaid filter keeps 2 challans");
ok(el("challan-list").children[0].innerHTML.indexOf("Rs 2,000") !== -1, "unpaid filter starts with Rs 2,000");
el("filter-select").value = "PAID";
fire("filter-select", "change");
eq(el("challan-list").children.length, 1, "paid filter keeps 1 challan");
ok(el("challan-list").children[0].innerHTML.indexOf("CH-2026-077") !== -1, "paid filter shows CH-2026-077");
el("filter-select").value = "all";
fire("filter-select", "change");
eq(el("challan-list").children.length, 3, "all filter restores 3 challans");

// 4. Pay tab: detail shows CH-2026-4812 at Rs 2,000, due 26 Nov 2026.
fire("tab-pay", "click");
eq(el("section-pay").style.display, "block", "pay section shows on tab click");
eq(el("section-board").style.display, "none", "board section hides on tab click");
ok(el("pay-detail").innerHTML.indexOf("CH-2026-4812") !== -1, "pay detail names CH-2026-4812");
ok(el("pay-detail").innerHTML.indexOf("Rs 2,000") !== -1, "pay detail shows Rs 2,000");
ok(el("pay-detail").innerHTML.indexOf("26 Nov 2026") !== -1, "pay detail names the 26 Nov 2026 due date");
ok(el("pay-detail").innerHTML.indexOf("Rs 2,500 if late") !== -1, "pay detail shows Rs 2,500 if late");

// 5. Paying mints a CHL-2026-XXXX receipt and marks the challan paid.
fire("pay-btn", "click");
ok(el("pay-result").innerHTML.indexOf("PAID") !== -1, "pay result shows PAID");
ok(el("pay-result").innerHTML.indexOf("Rs 2,000") !== -1, "pay result shows Rs 2,000");
ok(/CHL-2026-\d{4}/.test(el("pay-result").innerHTML), "pay result mints a CHL-2026-XXXX receipt");
ok(/CHL-2026-\d{4}/.test(el("receipt-box").innerHTML), "receipt card shows the CHL-2026-XXXX receipt");
ok((store["challan-paid"] || "").indexOf("CH-2026-4812") !== -1, "payment persists in localStorage");
ok((store["challan-receipts"] || "").indexOf("CHL-2026-") !== -1, "receipt persists in localStorage");
ok(el("totals-box").innerHTML.indexOf("Rs 1,500") !== -1, "board totals drop to Rs 1,500 after paying");

// 6. Dispute tab: LHR-9902 vs LHR-4812 is a plate mismatch; filing works.
fire("tab-dispute", "click");
eq(el("section-dispute").style.display, "block", "dispute section shows on tab click");
ok(el("dispute-result").innerHTML.indexOf("PLATE MISMATCH") !== -1, "dispute check flags PLATE MISMATCH");
ok(el("dispute-result").innerHTML.indexOf("LHR-9902") !== -1, "dispute check names LHR-9902");
fire("dispute-submit-btn", "click");
ok(el("dispute-status").innerHTML.indexOf("DISPUTE FILED") !== -1, "dispute submit files the dispute");
ok(el("dispute-status").innerHTML.indexOf("CH-2026-902") !== -1, "dispute status names CH-2026-902");
ok((store["challan-disputes"] || "").indexOf("CH-2026-902") !== -1, "dispute persists in localStorage");
// Matching plates: no dispute to file.
el("dispute-photo-plate").value = "LHR-4812";
fire("dispute-check-btn", "click");
ok(el("dispute-result").innerHTML.indexOf("PLATE MATCHES") !== -1, "matching plates show PLATE MATCHES");
fire("dispute-submit-btn", "click");
ok(el("dispute-status").innerHTML.indexOf("NO DISPUTE TO FILE") !== -1, "matching plates refuse the dispute");
el("dispute-photo-plate").value = "LHR-9902";
fire("dispute-check-btn", "click");

// 7. Reminders tab: 2 reminders, progress 0 of 2, ticking persists.
fire("tab-reminders", "click");
eq(el("section-reminders").style.display, "block", "reminders section shows on tab click");
eq(el("reminders-list").children.length, 2, "reminders list renders 2 reminders");
eq(el("reminders-progress").textContent, "0 of 2 reminders set — tick them on and Challan reminds you 3 days before each due date.", "reminders progress starts at 0 of 2");
ok(el("reminders-list").children[0].children[1].textContent.indexOf("14 Nov 2026") !== -1, "first reminder is 14 Nov 2026");
ok(el("reminders-list").children[1].children[1].textContent.indexOf("23 Nov 2026") !== -1, "second reminder is 23 Nov 2026");
var first = el("reminders-list").children[0].children[0];
first.checked = true;
fireEl(first, "change");
eq(el("reminders-progress").textContent, "1 of 2 reminders set — tick them on and Challan reminds you 3 days before each due date.", "progress moves to 1 of 2 after ticking");
ok((store["challan-reminders-done"] || "").indexOf("rem-310") !== -1, "ticked reminder persists in localStorage");

// 8. Agent-spotter quiz: 4 questions, perfect score after correct answers.
fire("tab-spotter", "click");
eq(el("section-spotter").style.display, "block", "spotter section shows on tab click");
eq(el("spotter-quiz").children.length, 4, "spotter quiz renders 4 questions");
fire("spotter-btn", "click");
ok(el("spotter-result").innerHTML.indexOf("0 OF 4 CORRECT") !== -1, "no answers score 0 of 4");
var qs = el("spotter-quiz").children;
for (var i = 0; i < 3; i++) {
  fireEl(qs[i].children[1], "click"); // "Red flag" for the 3 real flags
}
fireEl(qs[3].children[2], "click"); // "Safe" for the official-receipt habit
fire("spotter-btn", "click");
ok(el("spotter-result").innerHTML.indexOf("4 OF 4 CORRECT") !== -1, "correct answers score 4 of 4");
ok(el("spotter-result").innerHTML.indexOf("never send your CNIC photo") !== -1, "spotter result explains the CNIC flag");

// 9. Reset restores the canonical defaults.
fire("reset-demo", "click");
eq(el("section-board").style.display, "block", "reset returns to the board tab");
eq(el("challan-list").children.length, 3, "reset restores 3 challans");
ok(el("totals-box").innerHTML.indexOf("Rs 3,500") !== -1, "reset restores Rs 3,500 unpaid now");
ok(el("late-box").innerHTML.indexOf("Rs 4,500") !== -1, "reset restores Rs 4,500 if late");
eq(el("reminders-progress").textContent, "0 of 2 reminders set — tick them on and Challan reminds you 3 days before each due date.", "reset clears the reminders");
eq(el("reminders-list").children.length, 2, "reset keeps both reminders");
ok(el("dispute-result").innerHTML.indexOf("PLATE MISMATCH") !== -1, "reset restores the PLATE MISMATCH verdict");
ok(el("spotter-result").innerHTML === "", "reset clears the spotter result");

console.log("\n" + n + " DOM assertions passed.");
