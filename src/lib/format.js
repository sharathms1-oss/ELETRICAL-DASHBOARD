const IN = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

export const fmtNum = (v) => (isNum(v) ? IN.format(Math.round(v)) : "—");
export const fmtKwh = (v) => (isNum(v) ? IN.format(Math.round(v)) : "—");
export const fmtPct = (v, signed = true) =>
  isNum(v) ? `${signed && v > 0 ? "+" : ""}${(v * 100).toFixed(1)}%` : "—";
export const fmtDelta = (v) => (isNum(v) ? `${v > 0 ? "+" : ""}${IN.format(Math.round(v))}` : "—");

/** Indian money format: ₹1.23 Cr / ₹4.56 L / ₹7,890 */
export function fmtInr(v) {
  if (!isNum(v)) return "—";
  const s = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)} L`;
  return `${s}₹${IN.format(Math.round(a))}`;
}

export function toCsv(columns, rows) {
  const esc = (x) => {
    const t = x === null || x === undefined ? "" : String(x);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const head = columns.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => esc(c.csv ? c.csv(r) : c.value ? c.value(r) : r[c.key])).join(","));
  return [head, ...body].join("\n");
}

export function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
