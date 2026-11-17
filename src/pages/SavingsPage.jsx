import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, DataTable, KpiCard, deltaClass } from "../components/ui";
import { fmtInr, fmtPct } from "../lib/format";
import { fyLabel, fytd, monthLabel, monthSeries, snapshot } from "../lib/solar";

export default function SavingsPage({ ym, onOpenStore }) {
  const rows = useMemo(() => snapshot(ym), [ym]);
  const compared = rows.filter((r) => r.savings !== null);
  const invoice = compared.reduce((t, r) => t + r.inv, 0);
  const projected = compared.reduce((t, r) => t + r.proj, 0);
  const savings = projected - invoice;
  const invoicesRecorded = rows.filter((r) => r.inv !== null).length;
  const ytd = useMemo(() => fytd(ym), [ym]);
  const series = useMemo(() => monthSeries(ym, 24), [ym]);

  const cols = [
    { key: "name", label: "Store / DC", render: (r) => <b>{r.name}</b> },
    { key: "location", label: "Location" },
    { key: "installStatus", label: "Installation status" },
    { key: "inv", label: "Invoice amount", align: "right", render: (r) => fmtInr(r.inv), csv: (r) => r.inv },
    { key: "proj", label: "Projected value", align: "right", render: (r) => fmtInr(r.proj), csv: (r) => r.proj },
    { key: "savings", label: "Savings vs projection", align: "right", render: (r) => <span className={deltaClass(r.savings)}>{fmtInr(r.savings)}</span>, csv: (r) => r.savings },
    { key: "savingsPct", label: "Savings %", align: "right", render: (r) => <span className={deltaClass(r.savingsPct)}>{fmtPct(r.savingsPct, false)}</span> },
  ];

  return (
    <>
      <div className="metrics-grid auto">
        <KpiCard title={`Projected value · ${monthLabel(ym)}`} value={fmtInr(projected)} sub={`${compared.length} stores with invoice + projection`} hint="Estimate: capacity × 5 hours × 30 days × unit price. It is not a measured value." />
        <KpiCard title="Vendor invoice" value={fmtInr(invoice)} sub={`${invoicesRecorded} stores have an invoice this month`} />
        <KpiCard title="Estimated saving" value={fmtInr(savings)} tone={savings >= 0 ? "good" : "bad"} sub="Projected value − vendor invoice (estimate, not verified cash saving)" />
        <KpiCard title="Saving %" value={projected > 0 ? fmtPct(savings / projected, false) : "—"} sub="Saving ÷ projected value" tone="good" />
        <KpiCard title={`${fyLabel(ytd.fy)} to date saving`} value={fmtInr(ytd.current.savings)} tone="good" sub={`${fmtPct(ytd.previous.savings > 0 ? ytd.current.savings / ytd.previous.savings - 1 : null)} vs ${fyLabel(ytd.fy - 1)} same ${ytd.months} months`} />
      </div>

      <Card title="Monthly invoice vs projected value – last 24 months" subtitle="Only stores that have both an invoice and a projection in the month are included, so both bars cover the same stores.">
        <div className="chart">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e5e9f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1e5).toFixed(0)}L`} />
              <Tooltip formatter={(v, n) => [fmtInr(v), n]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar isAnimationActive={false} dataKey="projected" name="Projected value" fill="#8fb8e8" />
              <Bar isAnimationActive={false} dataKey="invoiceCompared" name="Vendor invoice" fill="#d9822b" />
              <Line isAnimationActive={false} dataKey="savings" name="Estimated saving" stroke="#1d9a6c" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title={`Store-wise savings · ${monthLabel(ym)}`} subtitle="Savings = projected value − vendor invoice. Negative savings means the invoice is higher than the projection.">
        <DataTable columns={cols} rows={rows} defaultSort={{ key: "savings", dir: "desc" }} onRowClick={(r) => onOpenStore(r.name)} filename={`solar-savings-${ym}.csv`} />
        <p className="note">Capex stores are owned by the company, so a vendor invoice may not apply. Check the invoice column for those stores before reporting their savings.</p>
      </Card>
    </>
  );
}
