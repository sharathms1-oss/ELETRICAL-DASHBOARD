# Electrical Intelligence – Solar Performance (Prototype v0.2)

React + Vite dashboard for solar generation and solar savings, built from the Solar Dashboard workbook. The look (sidebar, topbar, metric cards, fonts, colours) is the original starter's design, kept in `src/styles.css`.

Deep links for testing: `/?tab=savings`, `/?tab=estimate`, `/?store=NOIDA%20DC%201`.

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run build:appsscript   # single index.html into backend/
npm run deploy             # build + clasp push
```

## What is in this version
- **Generation tab**: KPI cards (like-for-like MoM/YoY, FY-to-date vs same months last FY), 24-month chart, filterable store table, CSV export.
- **Savings tab**: projected value vs vendor invoice, estimated saving, FY-to-date saving, store table.
- **Vendor estimate tab**: each store's last completed operating year, store age, vendor estimate, assured, production, % diff vs assured, estimate status, and a remark listing missing bills.
- **Store drill-down**: click any row for history, operating-year table and FY summary.
- Other modules are placeholders (marked "soon").

## Data
Nothing is bundled. The app loads data at start-up from the Apps Script backend (`backend/`), which reads the Google Sheet. Locally it reads `public/dev-data.json` (git-ignored). See `docs/SETUP.md` for connecting the sheet and hosting with Git.

## Rules (copied from workbook Config / Calc)
- Investigate: zero generation, or YoY decline ≥ 20%. Monitor: decline ≥ 10%. (Marked "proposed – confirm" in the workbook.)
- Vendor comparison uses actual + deemed; a year is judged only with 12 months of data.
- Projected value = capacity × 5 h × 30 days × unit price (estimate, not verified cash saving).

## Verified against the workbook (Sep-2026)
Capacity 4,362.09 kWp, actual 343,347.36 kWh, deemed 49,214.80 kWh, invoice ₹17,49,803.59, projected ₹25,27,598.57, savings ₹7,77,794.98, and the status counts all match the Summary Dashboard.

Access control is enforced by the Apps Script backend (company domain plus optional allow-list). Validate with IT before wide release.
