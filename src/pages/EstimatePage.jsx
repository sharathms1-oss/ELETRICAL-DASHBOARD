import { useMemo } from "react";
import { Badge, Card, DataTable, KpiCard, deltaClass } from "../components/ui";
import { fmtKwh, fmtPct } from "../lib/format";
import { lastCompletedYear, stores } from "../lib/solar";

export default function EstimatePage({ ym, onOpenStore }) {
  const rows = useMemo(
    () => stores.map((s) => ({ name: s.name, location: s.location, ...(lastCompletedYear(s, ym) || { status: "No data", remark: "No first bill month", periodLabel: "—" }) })),
    [ym]
  );
  const count = (t) => rows.filter((r) => r.status === t).length;

  const cols = [
    { key: "name", label: "Store / DC", render: (r) => <b>{r.name}</b> },
    { key: "periodLabel", label: "Last completed year (period)", sort: (r) => r.start },
    { key: "age", label: "Store age" },
    { key: "est", label: "Vendor estimate (kWh)", align: "right", render: (r) => fmtKwh(r.est) },
    { key: "assured", label: "Assured (kWh)", align: "right", render: (r) => fmtKwh(r.assured) },
    { key: "prod", label: "Production in year (kWh)", align: "right", render: (r) => (r.prod ? fmtKwh(r.prod) : "—") },
    { key: "pctVsAssured", label: "Production vs assured (% diff)", align: "right", render: (r) => <span className={deltaClass(r.pctVsAssured)}>{fmtPct(r.pctVsAssured)}</span> },
    { key: "status", label: "Estimate status", render: (r) => <Badge text={r.status} /> },
    { key: "remark", label: "Remark", render: (r) => <span className={/not available/.test(r.remark || "") ? "neg" : ""}>{r.remark}</span> },
  ];

  return (
    <>
      <div className="metrics-grid auto">
        <KpiCard title="Met estimate" value={count("Met estimate")} tone="good" sub="Production ≥ vendor estimate" />
        <KpiCard title="Below estimate, above assured" value={count("Below estimate, above assured")} tone="warn" sub="Within the assured guarantee" />
        <KpiCard title="Below assured" value={count("Below assured")} tone="bad" sub="Vendor shortfall vs guarantee" />
        <KpiCard title="Incomplete / in progress / no estimate" value={count("Incomplete data") + count("Year in progress") + count("No estimate")} tone="neutral" sub="Cannot be judged for a full year" />
      </div>
      <Card title="Last completed operating year vs vendor estimate and assured"
        subtitle="Each store's own 12-month year, counted from its first bill month. Production = actual + deemed. % diff = production ÷ assured − 1 (positive = above assured).">
        <DataTable columns={cols} rows={rows} defaultSort={{ key: "name", dir: "asc" }} onRowClick={(r) => onOpenStore(r.name)} filename={`vendor-estimate-comparison-${ym}.csv`} />
        <p className="note">A year is only judged when all 12 months have data. Where a bill is missing, the Remark lists the missing months and the % stays blank.</p>
      </Card>
    </>
  );
}
