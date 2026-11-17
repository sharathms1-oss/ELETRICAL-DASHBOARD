import { useMemo, useState } from "react";
import { Activity, ArrowDown, ArrowUp, Download, Gauge, ShieldCheck, Sun } from "lucide-react";
import { downloadCsv, toCsv } from "../lib/format";

const TONE_ICON = { good: [Activity, "green"], bad: [ShieldCheck, "amber"], warn: [ShieldCheck, "amber"], info: [Gauge, "blue"], neutral: [Sun, "sun"] };

/** Metric card in the portal's design (title, icon, big value, note). */
export function KpiCard({ title, value, unit, sub, tone = "neutral", hint, icon }) {
  const [DefaultIcon, color] = TONE_ICON[tone] || TONE_ICON.neutral;
  const Icon = icon || DefaultIcon;
  return (
    <div className="metric-card" title={hint || ""}>
      <div className="metric-top"><span>{title}</span><div className={`metric-icon ${color}`}><Icon size={18} /></div></div>
      <div className="metric-value">{value}{unit && <small>{unit}</small>}</div>
      <div className="metric-foot"><span className="metric-note">{sub}</span></div>
    </div>
  );
}

export function Card({ title, subtitle, actions, children }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
        {actions}
      </div>
      {children}
    </section>
  );
}

const TONES = {
  Good: "good", "Met estimate": "good",
  Monitor: "warn", "Below estimate, above assured": "warn",
  Investigate: "bad", "Below assured": "bad",
  "Deemed Only": "info", "No Data": "mute", "Incomplete data": "mute", "Year in progress": "mute", "No estimate": "mute",
};
export const Badge = ({ text }) => <span className={`status status-${TONES[text] || "mute"}`}>{text}</span>;

export const deltaClass = (v) => (typeof v !== "number" ? "" : v > 0 ? "pos" : v < 0 ? "neg" : "");

/**
 * Sortable table with CSV export.
 * columns: { key, label, render?(row), sort?(row)->value, align?, csv?(row) }
 */
export function DataTable({ columns, rows, defaultSort, filename, onRowClick, empty = "No rows match the filters." }) {
  const [sort, setSort] = useState(defaultSort || null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const val = (r) => (col.sort ? col.sort(r) : r[col.key]);
    return [...rows].sort((x, y) => {
      const a = val(x), b = val(y);
      const an = a === null || a === undefined || a === "", bn = b === null || b === undefined || b === "";
      if (an && bn) return 0;
      if (an) return 1;
      if (bn) return -1;
      const c = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
      return sort.dir === "asc" ? c : -c;
    });
  }, [rows, sort, columns]);

  const click = (key) => setSort((s) => (s && s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  return (
    <div>
      {filename && (
        <div className="table-tools">
          <span>{sorted.length} rows</span>
          <button className="button button-outline compact" onClick={() => downloadCsv(filename, toCsv(columns, sorted))}><Download size={14} /> Export CSV</button>
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.align === "right" ? "r" : ""} onClick={() => click(c.key)}>
                  {c.label}
                  {sort?.key === c.key && (sort.dir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.name || r.key || i} className={onRowClick ? "click" : ""} onClick={() => onRowClick && onRowClick(r)}>
                {columns.map((c) => (
                  <td key={c.key} className={c.align === "right" ? "r" : ""}>{c.render ? c.render(r) : r[c.key]}</td>
                ))}
              </tr>
            ))}
            {!sorted.length && <tr><td colSpan={columns.length} className="empty">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
