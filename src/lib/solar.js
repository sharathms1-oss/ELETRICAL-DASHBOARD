/**
 * Solar calculations. These reproduce the rules used in the Google Sheets
 * workbook (Summary Dashboard / Calc / Config). Thresholds come from Config:
 *   Investigate if YoY decline >= 20% (zero generation is always Investigate)
 *   Monitor     if YoY decline >= 10%
 *   Stable band +/- 5%
 *   No prior-year record: generation / 100% projection < 0.35 => Investigate
 * Comparison with vendor estimate uses Actual + Deemed (Config: Yes).
 */

export const RULES = {
  investigateDecline: 0.2,
  monitorDecline: 0.1,
  stableBand: 0.05,
  minRatioNoPY: 0.35,
  hoursPerDay: 5,
  fixedDays: 30,
  monthsForFullYear: 12,
  includeDeemedInVendorComparison: true,
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const mi = (ym) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5)) - 1;
export const fromMi = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
export const monthLabel = (ym) => (ym ? `${MON[Number(ym.slice(5)) - 1]}-${ym.slice(2, 4)}` : "");
export const fyStart = (ym) => {
  const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5));
  return m < 4 ? y - 1 : y;
};
export const fyLabel = (s) => `FY ${s}-${String(s + 1).slice(2)}`;

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const num = (v) => (isNum(v) ? v : null);
const sum = (arr) => arr.reduce((t, v) => t + (isNum(v) ? v : 0), 0);

// Data is loaded at runtime (see services/api.js) - nothing is bundled into the app.
export let stores = [];
export let records = [];
export let sourceFile = "";
export let meta = {};
export let allMonths = [];
export let locations = [];
export let statuses = [];
let byStore = {};

/** Call once with the JSON returned by the Apps Script backend ({stores, records, generatedAt, generatedFrom}). */
export function loadData(raw) {
  stores = raw.stores || [];
  records = raw.records || [];
  sourceFile = raw.generatedFrom || "";
  meta = { generatedAt: raw.generatedAt || null };
  byStore = {};
  records.forEach((r) => {
    (byStore[r.s] = byStore[r.s] || {})[r.m] = r;
  });
  allMonths = [...new Set(records.map((r) => r.m))].sort();
  locations = [...new Set(stores.map((s) => s.location))].sort();
  statuses = [...new Set(stores.map((s) => s.status))].sort();
}
export const storeRecords = (name) => byStore[name] || {};
const hasGen = (r) => !!r && (isNum(r.a) || isNum(r.d));


/** Latest month where at least half the stores have a record (avoids a half-filled newest month). */
export function defaultReportingMonth() {
  const counts = {};
  records.forEach((r) => { counts[r.m] = (counts[r.m] || 0) + 1; });
  const ok = allMonths.filter((m) => counts[m] >= stores.length / 2);
  return ok[ok.length - 1] || allMonths[allMonths.length - 1];
}


/** One store, one reporting month. */
export function storeRow(store, ym) {
  const m = byStore[store.name] || {};
  const cur = m[ym], prev = m[fromMi(mi(ym) - 1)], py = m[fromMi(mi(ym) - 12)];
  const a = num(cur?.a), d = num(cur?.d), pa = num(prev?.a), ya = num(py?.a);
  let hi = null, hiM = null;
  Object.keys(m).forEach((k) => {
    if (k <= ym && isNum(m[k].a) && m[k].a > 0 && (hi === null || m[k].a > hi)) { hi = m[k].a; hiM = k; }
  });
  const inv = num(cur?.i), proj = num(cur?.proj);
  const savings = proj !== null && inv !== null ? proj - inv : null;
  const yoy = a !== null && ya !== null ? a - ya : null;
  const yoyPct = yoy !== null && ya > 0 ? yoy / ya : null;
  const mom = a !== null && pa !== null ? a - pa : null;
  const momPct = mom !== null && pa > 0 ? mom / pa : null;

  // Mirrors Calc "Performance status" / "Remarks" in the workbook
  const paused = String(store.status || "").startsWith("Paused");
  const capex = store.status === "Capex";
  const genTypeDeemed = a === null && d !== null;
  const parts = [];
  if (!cur) parts.push("No record for selected month");
  if (cur && capex) parts.push("Capex store – no vendor invoice");
  let perf;
  if (!cur) perf = "No Data";
  else if (genTypeDeemed || (paused && d !== null)) { perf = "Deemed Only"; parts.push("Deemed generation only"); }
  else if (paused) perf = "No Data";
  else if (a === null) perf = "No Data";
  else if (a === 0) { perf = "Investigate"; parts.push("Zero generation – verify"); }
  else if (yoyPct !== null) {
    if (yoyPct <= -RULES.investigateDecline) perf = "Investigate";
    else if (yoyPct <= -RULES.monitorDecline) perf = "Monitor";
    else perf = "Good";
    if (!paused && yoyPct <= -RULES.monitorDecline) parts.push(`YoY decline ${Math.round(-yoyPct * 100)}%`);
  } else {
    const full = store.capacity ? store.capacity * RULES.hoursPerDay * RULES.fixedDays : 0;
    perf = full && a / full < RULES.minRatioNoPY ? "Monitor" : "Good";
    if (!paused) parts.push("No prior-year data");
  }
  const remark = parts.join("; ");
  const trend = yoyPct === null ? "No comparison" : yoyPct > RULES.stableBand ? "Improving" : yoyPct < -RULES.stableBand ? "Declining" : "Stable";
  return { store, name: store.name, location: store.location, capacity: store.capacity, installStatus: store.status,
    a, d, pa, ya, yoy, yoyPct, mom, momPct, hi, hiM, inv, proj, savings,
    savingsPct: savings !== null && proj > 0 ? savings / proj : null, perf, remark, trend, hasRecord: !!cur };
}

export const snapshot = (ym) => stores.map((s) => storeRow(s, ym));

/** Portfolio totals for one month (all stores). */
export function monthTotals(ym) {
  const rows = stores.map((s) => (byStore[s.name] || {})[ym]).filter(Boolean);
  const inv = rows.filter((r) => isNum(r.i) && isNum(r.proj));
  return {
    ym, label: monthLabel(ym),
    actual: sum(rows.map((r) => r.a)), deemed: sum(rows.map((r) => r.d)),
    reporting: rows.filter(hasGen).length,
    invoice: sum(rows.map((r) => r.i)),
    projected: sum(inv.map((r) => r.proj)),
    savings: sum(inv.map((r) => r.proj - r.i)),
    invoiceCompared: sum(inv.map((r) => r.i)),
  };
}

export function monthSeries(endYm, n) {
  const out = [];
  for (let k = n - 1; k >= 0; k--) out.push(monthTotals(fromMi(mi(endYm) - k)));
  return out;
}

/** Financial-year-to-date for the FY containing ym, plus the same span of the previous FY (like for like). */
export function fytd(ym) {
  const s = fyStart(ym);
  const span = mi(ym) - mi(`${s}-04`) + 1;
  const build = (startYear) => {
    const t = { actual: 0, deemed: 0, invoice: 0, projected: 0, savings: 0 };
    for (let k = 0; k < span; k++) {
      const x = monthTotals(fromMi(mi(`${startYear}-04`) + k));
      t.actual += x.actual; t.deemed += x.deemed; t.invoice += x.invoiceCompared; t.projected += x.projected; t.savings += x.savings;
    }
    return t;
  };
  return { fy: s, months: span, current: build(s), previous: build(s - 1),
    from: `${s}-04`, to: ym, prevFrom: `${s - 1}-04`, prevTo: fromMi(mi(ym) - 12) };
}

/** Monthly generation for one store (for drill-down). */
export function storeHistory(name) {
  const m = byStore[name] || {};
  return Object.keys(m).sort().map((k) => ({ ym: k, label: monthLabel(k), fy: fyStart(k), ...m[k] }));
}

export function storeFySummary(name) {
  const map = {};
  storeHistory(name).forEach((r) => {
    const t = (map[r.fy] = map[r.fy] || { fy: r.fy, actual: 0, deemed: 0, invoice: 0, months: 0 });
    t.actual += r.a || 0; t.deemed += r.d || 0; t.invoice += r.i || 0; t.months += hasGen(r) ? 1 : 0;
  });
  return Object.values(map).sort((x, y) => y.fy - x.fy);
}

export function ageText(store, ym) {
  const start = store.installDate ? store.installDate.slice(0, 7) : store.yearOneStart;
  if (!start) return "";
  const m = mi(ym) - mi(start) + 1;
  if (m < 0) return "";
  return `${Math.floor(m / 12)} yr ${m % 12} mth`;
}

/** Last completed operating year, counted from the store's first bill month (as in Vendor Estimate). */
export function lastCompletedYear(store, ym) {
  if (!store.yearOneStart) return null;
  const s0 = mi(store.yearOneStart), r = mi(ym);
  const elapsed = r - s0 + 1;
  if (elapsed < 1) return null;
  const n = Math.max(1, Math.floor(elapsed / 12));
  const start = s0 + 12 * (n - 1), end = start + 11;
  const m = byStore[store.name] || {};
  const withData = [], missing = [];
  for (let i = start; i <= end && i <= r; i++) {
    const k = fromMi(i);
    (hasGen(m[k]) ? withData : missing).push(k);
  }
  const prod = sum(withData.map((k) => (m[k].a || 0) + (RULES.includeDeemedInVendorComparison ? m[k].d || 0 : 0)));
  const actual = sum(withData.map((k) => m[k].a));
  const deemed = sum(withData.map((k) => m[k].d));
  const est = store.estimates?.[String(n)] || null;
  const inProgress = end > r;
  const full = !inProgress && withData.length >= RULES.monthsForFullYear;
  const pctVsAssured = est && full ? prod / est.assured - 1 : null;
  const pctVsEstimate = est && full ? prod / est.est - 1 : null;

  let status;
  if (!est) status = "No estimate";
  else if (inProgress) status = "Year in progress";
  else if (!full) status = "Incomplete data";
  else if (prod >= est.est) status = "Met estimate";
  else if (prod >= est.assured) status = "Below estimate, above assured";
  else status = "Below assured";

  let remark;
  const missTxt = missing.map(monthLabel).join(", ");
  if (inProgress) remark = `Store is in its first year - ${withData.length} months billed so far`;
  else if (missing.length) remark = `${missTxt} ${missing.length > 1 ? "bills" : "bill"} not available - full-year generation not available (${withData.length} of 12 months)`;
  else remark = est ? "All 12 months available" : "No vendor estimate available";

  return { n, start: fromMi(start), end: fromMi(end), periodLabel: `Yr ${n}: ${monthLabel(fromMi(start))} to ${monthLabel(fromMi(end))}`,
    age: ageText(store, ym), est: est?.est ?? null, assured: est?.assured ?? null, prod, actual, deemed,
    monthsWithData: withData.length, missing, pctVsAssured, pctVsEstimate, status, remark, full };
}

export function yearTable(store, ym) {
  const m = byStore[store.name] || {};
  if (!store.yearOneStart) return [];
  const s0 = mi(store.yearOneStart), r = mi(ym);
  const rows = [];
  for (let n = 1; ; n++) {
    const start = s0 + 12 * (n - 1);
    if (start > r) break;
    const end = start + 11;
    const ks = [];
    for (let i = start; i <= end && i <= r; i++) ks.push(fromMi(i));
    const wd = ks.filter((k) => hasGen(m[k]));
    const prod = sum(wd.map((k) => (m[k].a || 0) + (m[k].d || 0)));
    const est = store.estimates?.[String(n)];
    const full = end <= r && wd.length >= 12;
    rows.push({ n, from: fromMi(start), to: fromMi(end), est: est?.est ?? null, assured: est?.assured ?? null, prod,
      months: wd.length, pctOfAssured: est && full ? prod / est.assured : null, full, inProgress: end > r });
  }
  return rows;
}

export const portfolioCapacity = () => sum(stores.map((s) => s.capacity));
