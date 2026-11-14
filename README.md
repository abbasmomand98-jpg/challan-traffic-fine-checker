# Challan — Traffic Fine Checker & Payer (UX Concept)

**Live demo:** https://abbasmomand98-jpg.github.io/challan-traffic-fine-checker/
**Code:** https://github.com/abbasmomand98-jpg/challan-traffic-fine-checker

Challan is a traffic fine checker and payer for Pakistan. E-challans are issued by traffic cameras, but the notice arrives late or never — drivers discover unpaid fines only when a licence renewal is blocked or they try to sell the car. By then late fees have doubled the fine, and agents outside traffic offices charge Rs 1,500 to "clear" a challan that officially costs the fine amount only.

Challan looks up any plate, shows every e-challan with its due date, pays online with JazzCash, Easypaisa or bank and mints a receipt, disputes a wrong plate in one tap, reminds you before the due date, and spots the agent overcharge.

## How it works

Open `index.html` in a browser — no build step, no framework, just HTML, CSS and JavaScript. The demo is split into three files so each part is easy to read and change:

- `data.js` — all the sample data: the Suzuki Alto (LHR-4812, Lahore, owner Ahmed Raza), the three challans, the plate-mismatch dispute sample, the pay methods, the reminders, and the three agent-spotter red flags.
- `logic.js` — all the rules, with no DOM code at all: the plate lookup, the paid/unpaid filter, the unpaid total, the due-date maths, the late-fee calculator, the reminder dates, the receipt, the payment, the dispute verdict, and the spotter-quiz scoring. Because it touches no DOM, it can be tested in Node with `node test.js`.
- `app.js` — the page wiring only: it reads the data, calls the logic, and renders the results into the page. Demo "today" is pinned to 14 Nov 2026 so the sample figures stay stable.

Try it with the sample figures:

1. **Challan Board** — type LHR-4812 and see all three challans: overspeeding on Ferozepur Road, Rs 2,000, due 26 Nov 2026 (unpaid); wrong-side driving on Canal Road, Rs 1,500, due 17 Nov 2026 (unpaid); and the red-light jump on Mall Road, Rs 1,000, paid 30 Oct 2026. Filter by unpaid or paid. The totals box shows Rs 3,500 unpaid now — and the late-fee calculator shows Rs 4,500 if both go late, so paying on time saves Rs 1,000. Try any other plate and the board finds nothing.
2. **Pay a Fine** — pick an unpaid challan and pay it with JazzCash, Easypaisa or bank. CH-2026-4812 costs Rs 2,000 on time and Rs 2,500 if late. Payment mints a receipt like CHL-2026-XXXX, saved on your device, and the challan flips to PAID on the board. No agent fee — the official cost is just the fine.
3. **Dispute** — check the camera photo plate against your plate. The sample case CH-2026-902 shows a white Corolla, photo plate LHR-9902 — not your LHR-4812 — so it is flagged "plate mismatch — dispute" and one tap files it. Type your own plate as the photo plate and the check says the challan is yours.
4. **Reminders** — tick the reminders on: CH-2026-310 is due 17 Nov 2026, so its reminder is 14 Nov 2026; CH-2026-4812 is due 26 Nov 2026, so its reminder is 23 Nov 2026 — 3 days before each due date. Your ticks are saved in the browser with localStorage.
5. **Agent Spotter** — a 4-question quiz: three red flags (agent demands cash with no receipt, agent claims the challan will "double tomorrow" to rush you, agent asks for your CNIC photo on WhatsApp) and one safe habit (the agent shows you the official receipt for the fine amount only). Score 4 of 4 and you spot them all.

Run the tests with `node test.js` — they assert every canonical figure above, plus that all element IDs referenced by `app.js` exist in `index.html` and that the HTML tags balance. `node dom-smoke.js` renders the whole page in a fake DOM and asserts the canonical figures appear on load.

## What you can learn from this project

- **Separating data, logic, and rendering.** `data.js` holds facts, `logic.js` holds rules, `app.js` holds rendering. When the facts change (a new challan, a new fine), only `data.js` changes. When a rule changes (how the late fee is calculated), only `logic.js` changes. This is the single most useful habit in front-end work.
- **Pure functions are testable functions.** Every rule in `logic.js` takes inputs and returns outputs — no DOM, no dates from the clock, no hidden state. That is why `node test.js` can check the late-fee maths (2,000 + 1,500 = 3,500; 3,500 + 2 × 500 = 4,500) without opening a browser.
- **Normalise before you compare.** `normalisePlate` upper-cases and strips spaces and dashes, so "lhr 4812", "LHR-4812" and "LHR4812" all find the same car — and "LHR-9902" never matches "LHR-4812". Any lookup that compares raw user input will miss matches; normalise first.
- **Make the hidden cost visible.** The late-fee calculator adds Rs 500 per unpaid challan to the unpaid total, so the Rs 1,000 saving is a number on the screen before the money moves. A fine list alone would never show it.
- **Due dates are just subtraction.** `daysUntilDue` subtracts two ISO dates, so "3 days left" and "12 days left" come from the same function — and `reminderDate` subtracts 3 days from the due date to place each reminder. Pin "today" to a fixed date in a demo so the numbers never drift.
- **Never mutate the list you are showing.** `payChallan` returns a new list with one challan marked PAID and leaves the original untouched — so the test can pay a challan and still assert the original board is unchanged.
- **Pakistani number formatting.** `formatPKR` groups digits the way Pakistan writes them — 3,500 stays "3,500" and 4,500 stays "4,500". Small detail, big difference in whether a number reads as real to a Pakistani user.
- **localStorage for payments, disputes, reminders and a quiz.** Your payments and receipts, your filed disputes, your reminders and your spotter answers survive a page refresh because `app.js` saves them under five keys (`challan-paid`, `challan-receipts`, `challan-disputes`, `challan-reminders-done`, `challan-spotter-answers`) and loads them back on start.

## Sample-data honesty note

Every fine, plate, challan, figure and person in this demo is invented sample data for an unofficial UX concept. No real fine, plate, challan, or person appears anywhere. Challan is not a traffic-police app — always check the challan and the plate before you pay anyone.

## Fork it and make it yours

This project is a pattern, not just a demo: a **lookup → total → pay → dispute** tool for any official notice that arrives late and doubles when ignored. Fork the repo and adapt it to a problem people face where you live — checking a utility bill before the surcharge date, verifying a property tax notice, tracking a passport or licence renewal, or disputing a wrong meter reading. Keep the data in `data.js`, the rules in `logic.js`, and the honesty note — and the same pattern will work for your problem too.

---

Challan is an unofficial UX concept by Muhammad Abbas Khan.
Available for new projects: abbasmomand98@gmail.com
