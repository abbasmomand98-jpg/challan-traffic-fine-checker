// Challan — Traffic Fine Checker & Payer (UX Concept).
// IMPORTANT: every fine, plate, challan, figure and person below is
// SAMPLE data invented for this UX concept demo. No real fine, plate,
// challan, or person appears anywhere. Challan is an unofficial concept,
// not a traffic-police app: always check the challan and the plate
// before you pay anyone.

// VEHICLE (sample, Lahore): Suzuki Alto, plate LHR-4812. Owner Ahmed Raza.
var VEHICLE = { make: "Suzuki Alto", plate: "LHR-4812", city: "Lahore",
  owner: "Ahmed Raza" };

// CHALLANS (sample, checked 14 Nov 2026):
//   CH-2026-4812: Overspeeding, Ferozepur Road Lahore, 12 Nov 2026,
//     fine Rs 2,000, UNPAID, due 26 Nov 2026, late fee Rs 500 after due
//     (total Rs 2,500 if late).
//   CH-2026-077: Red-light jump, Mall Road Lahore, 28 Oct 2026,
//     Rs 1,000, PAID 30 Oct 2026.
//   CH-2026-310: Wrong-side driving, Canal Road Lahore, 3 Nov 2026,
//     Rs 1,500, UNPAID, due 17 Nov 2026, late fee Rs 500
//     (total Rs 2,000 if late).
// TOTALS: unpaid now Rs 3,500 (2 challans); if both go late Rs 4,500.
var CHALLANS = [
  { id: "CH-2026-4812", offence: "Overspeeding", road: "Ferozepur Road, Lahore",
    date: "12 Nov 2026", fine: 2000, status: "UNPAID",
    due: "26 Nov 2026", dueISO: "2026-11-26", lateFee: 500, paidDate: null },
  { id: "CH-2026-310", offence: "Wrong-side driving", road: "Canal Road, Lahore",
    date: "3 Nov 2026", fine: 1500, status: "UNPAID",
    due: "17 Nov 2026", dueISO: "2026-11-17", lateFee: 500, paidDate: null },
  { id: "CH-2026-077", offence: "Red-light jump", road: "Mall Road, Lahore",
    date: "28 Oct 2026", fine: 1000, status: "PAID",
    due: "11 Nov 2026", dueISO: "2026-11-11", lateFee: 500, paidDate: "30 Oct 2026" }
];
var LATE_FEE = 500;

// DISPUTE SAMPLE: a camera caught the wrong car — a white Corolla,
// plate LHR-9902, on challan CH-2026-902. The photo plate does not
// match the owner's LHR-4812, so it is flagged "plate mismatch — dispute".
var DISPUTE_SAMPLE = { id: "CH-2026-902", car: "white Corolla",
  photoPlate: "LHR-9902", offence: "Overspeeding",
  road: "Ferozepur Road, Lahore", date: "10 Nov 2026", fine: 2000 };

// PAY METHODS (sample): JazzCash / Easypaisa / bank. Payment mints a
// receipt like CHL-2026-XXXX, stored in localStorage by app.js.
var PAY_METHODS = ["JazzCash", "Easypaisa", "Bank"];

// REMINDERS: 3 days before each due date. CH-2026-310 is due
// 17 Nov 2026, so its reminder is 14 Nov 2026; CH-2026-4812 is due
// 26 Nov 2026, so its reminder is 23 Nov 2026.
var REMINDERS = [
  { id: "rem-310", challanId: "CH-2026-310",
    label: "CH-2026-310 due 17 Nov 2026 — remind 14 Nov 2026" },
  { id: "rem-4812", challanId: "CH-2026-4812",
    label: "CH-2026-4812 due 26 Nov 2026 — remind 23 Nov 2026" }
];

// AGENT SPOTTER: an agent outside the traffic office asks Rs 1,500 to
// "clear" a Rs 2,000 challan — the official cost is just the Rs 2,000
// fine; the agent fee is pure overcharge. 3 red flags, plus one safe
// habit as a control question.
var SPOTTER_FLAGS = [
  { id: "cash-no-receipt", scenario: "The agent demands cash and gives no receipt.",
    isFlag: true, why: "RED FLAG — cash with no receipt leaves no proof you paid. Pay online and keep the receipt." },
  { id: "doubles-tomorrow", scenario: "The agent claims the challan will \u201cdouble tomorrow\u201d to rush you.",
    isFlag: true, why: "RED FLAG — the late fee is Rs 500 after the due date, not a doubling tomorrow. Check the due date yourself." },
  { id: "cnic-whatsapp", scenario: "The agent asks for your CNIC photo on WhatsApp.",
    isFlag: true, why: "RED FLAG — never send your CNIC photo to a stranger on WhatsApp. An official payment never needs it." },
  { id: "official-receipt", scenario: "The agent shows you the official receipt for the fine amount only.",
    isFlag: false, why: "SAFE — an official receipt for the fine amount, and nothing extra, is how a real payment looks. The Rs 1,500 \u201cclearing\u201d fee is the overcharge." }
];

// PERSONA: Ahmed Raza, 34, Lahore — drives daily to work; found out
// about a Rs 2,000 overspeeding challan only when his licence renewal
// was blocked; an agent outside the traffic office asked Rs 1,500 to
// "clear" it. Illustrative proto-persona — a design hypothesis, not an
// interviewed participant.
var PERSONA = { name: "Ahmed Raza", age: 34, city: "Lahore",
  blockedBy: "licence renewal", agentFeeRs: 1500, fineRs: 2000 };

if (typeof module !== "undefined") {
  module.exports = { VEHICLE: VEHICLE, CHALLANS: CHALLANS,
    LATE_FEE: LATE_FEE, DISPUTE_SAMPLE: DISPUTE_SAMPLE,
    PAY_METHODS: PAY_METHODS, REMINDERS: REMINDERS,
    SPOTTER_FLAGS: SPOTTER_FLAGS, PERSONA: PERSONA };
}
