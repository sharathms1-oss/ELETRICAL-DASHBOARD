import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Card, DataTable, KpiCard } from "../components/ui";
import { fmtInr, fmtKwh, fmtPct } from "../lib/format";
import { fyLabel, lastCompletedYear, monthLabel, storeFySummary, storeHistory, storeRow, stores, yearTable } from "../lib/solar";

export default function StorePage({ name, ym, onBack }) {
  const store = stores.find((s) => s.name === name);
  const row = useMemo(() => storeRow(store, ym), [store, ym]);
  const lcy = useMemo(() => lastCompletedYear(store, ym), [store, ym]);
  const hist = useMemo(() => storeHistory(name), [name]);
  const fy = useMemo(() => storeFySummary(name), [name]);
  const years = useMemo(() => yearTable(store, ym), [store, ym]);
  const chart = hist.slice(-36).map((h) => ({ ...h, actual: h.a, deemed: h.d }));

  return (
    <>
      <button className="button button-outline back" onClick={onBack}><ArrowLeft size={14} /> Back</button>
      <div className="store-head">
        <h2>{store.name}</h2>
        <span className="muted">{store.location} · {store.capacity} kWp · {store.status} · {store.vendor || "—"}</span>
        <Badge text={row.perf} />
      </div>
      <div className="metrics-grid auto">
        <KpiCard title={`Actual · ${monthLabel(ym)}`} value={fmtKwh(row.a)} unit="kWh" sub={row.hasRecord ? row.remark || "" : "No record for the month"} tone="good" />
        <KpiCard title="Same month last year" value={fmtKwh(row.ya)} unit="kWh" sub={`YoY ${fmtPct(row.yoyPct)}`} />
        <KpiCard title="Highest ever" value={fmtKwh(row.hi)} unit="kWh" sub={row.hiM ? monthLabel(row.hiM) : ""} />
        <KpiCard title="Invoice" value={fmtInr(row.inv)} sub={`Projected ${fmtInr(row.proj)} · saving ${fmtInr(row.savings)}`} />
        <KpiCard title="Store age" value={lcy?.age || "—"} sub={`Year 1 starts ${store.yearOneStart ? monthLabel(store.yearOneStart) : "—"}`} />
      </div>

      <Card title="Monthly generation – last 36 months" subtitle="Actual and deemed kWh. Gaps are months with no bill.">
        <div className="chart">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e5e9f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v, n) => [`${fmtKwh(v)} kWh`, n]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar isAnimationActive={false} dataKey="actual" name="Actual (kWh)" stackId="g" fill="#1d9a6c" />
              <Bar isAnimationActive={false} dataKey="deemed" name="Deemed (kWh)" stackId="g" fill="#8fb8e8" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {lcy && (
        <Card title="Last completed year vs vendor estimate" subtitle={lcy.periodLabel}>
          <div className="metrics-grid auto">
            <KpiCard title="Vendor estimate" value={fmtKwh(lcy.est)} unit="kWh" />
            <KpiCard title="Assured" value={fmtKwh(lcy.assured)} unit="kWh" />
            <KpiCard title="Production (actual + deemed)" value={fmtKwh(lcy.prod)} unit="kWh" sub={`${lcy.monthsWithData} of 12 months`} />
            <KpiCard title="% diff vs assured" value={fmtPct(lcy.pctVsAssured)} tone={lcy.pctVsAssured < 0 ? "bad" : "good"} sub={lcy.status} />
          </div>
          <p className="note">{lcy.remark}</p>
        </Card>
      )}

      {years.length > 0 && (
        <Card title="All operating years" subtitle="Counted from the first bill month. % of assured = production ÷ assured, only for complete years.">
          <DataTable
            columns={[
              { key: "n", label: "Year" },
              { key: "from", label: "From", render: (r) => monthLabel(r.from) },
              { key: "to", label: "To", render: (r) => monthLabel(r.to) },
              { key: "est", label: "Estimated (kWh)", align: "right", render: (r) => fmtKwh(r.est) },
              { key: "assured", label: "Assured (kWh)", align: "right", render: (r) => fmtKwh(r.assured) },
              { key: "prod", label: "Production (kWh)", align: "right", render: (r) => (r.months ? fmtKwh(r.prod) : "—") },
              { key: "months", label: "Months with data", align: "right" },
              { key: "pctOfAssured", label: "% of assured", align: "right", render: (r) => (r.pctOfAssured === null ? (r.inProgress ? "In progress" : "—") : fmtPct(r.pctOfAssured, false)) },
            ]}
            rows={years.map((y) => ({ ...y, key: y.n }))}
          />
        </Card>
      )}

      <Card title="Financial-year summary" subtitle="April to March. Actual and deemed are never added together here.">
        <DataTable
          columns={[
            { key: "fy", label: "Financial year", render: (r) => fyLabel(r.fy) },
            { key: "months", label: "Months with data", align: "right" },
            { key: "actual", label: "Actual (kWh)", align: "right", render: (r) => fmtKwh(r.actual) },
            { key: "deemed", label: "Deemed (kWh)", align: "right", render: (r) => fmtKwh(r.deemed) },
            { key: "invoice", label: "Invoice", align: "right", render: (r) => fmtInr(r.invoice) },
          ]}
          rows={fy.map((f) => ({ ...f, key: f.fy }))}
          filename={`${name}-fy-summary.csv`}
        />
      </Card>
    </>
  );
}
