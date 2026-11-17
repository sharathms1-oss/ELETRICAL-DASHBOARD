import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Card, DataTable, KpiCard, deltaClass } from "../components/ui";
import { fmtDelta, fmtKwh, fmtPct } from "../lib/format";
import { fyLabel, fytd, locations, monthLabel, monthSeries, portfolioCapacity, snapshot, statuses } from "../lib/solar";

export default function GenerationPage({ ym, onOpenStore }) {
  const [loc, setLoc] = useState("All");
  const [st, setSt] = useState("All");
  const [perf, setPerf] = useState("All");
  const [q, setQ] = useState("");

  const all = useMemo(() => snapshot(ym), [ym]);
  const rows = all.filter(
    (r) => (loc === "All" || r.location === loc) && (st === "All" || r.installStatus === st) &&
      (perf === "All" || r.perf === perf) && r.name.toLowerCase().includes(q.toLowerCase())
  );

  const reporting = all.filter((r) => r.a !== null || r.d !== null).length;
  const actual = all.reduce((t, r) => t + (r.a || 0), 0);
  const deemed = all.reduce((t, r) => t + (r.d || 0), 0);
  // like-for-like: only stores that have BOTH this month and the comparison month
  const likeFor = (key) => {
    const pairs = all.filter((r) => r.a !== null && r[key] !== null);
    return { cur: pairs.reduce((t, r) => t + r.a, 0), base: pairs.reduce((t, r) => t + r[key], 0), n: pairs.length };
  };
  const mom = likeFor("pa"), yoy = likeFor("ya");
  const momPct = mom.base > 0 ? mom.cur / mom.base - 1 : null;
  const yoyPct = yoy.base > 0 ? yoy.cur / yoy.base - 1 : null;
  const ytd = useMemo(() => fytd(ym), [ym]);
  const ytdPct = ytd.previous.actual > 0 ? ytd.current.actual / ytd.previous.actual - 1 : null;
  const review = all.filter((r) => r.perf === "Investigate" || r.perf === "Monitor").length;
  const series = useMemo(() => monthSeries(ym, 24), [ym]);

  const cols = [
    { key: "name", label: "Store / DC", render: (r) => <b>{r.name}</b> },
    { key: "location", label: "Location" },
    { key: "capacity", label: "Capacity (kWp)", align: "right", render: (r) => fmtKwh(r.capacity) },
    { key: "a", label: "Actual (kWh)", align: "right", render: (r) => (r.a === null ? <span className="muted">{r.hasRecord ? "—" : "No record"}</span> : fmtKwh(r.a)) },
    { key: "d", label: "Deemed (kWh)", align: "right", render: (r) => fmtKwh(r.d) },
    { key: "pa", label: "Previous month (kWh)", align: "right", render: (r) => fmtKwh(r.pa) },
    { key: "ya", label: "Same month last year (kWh)", align: "right", render: (r) => fmtKwh(r.ya) },
    { key: "yoy", label: "YoY (kWh)", align: "right", render: (r) => <span className={deltaClass(r.yoy)}>{fmtDelta(r.yoy)}</span> },
    { key: "yoyPct", label: "YoY %", align: "right", render: (r) => <span className={deltaClass(r.yoyPct)}>{fmtPct(r.yoyPct)}</span> },
    { key: "hi", label: "Highest ever (kWh)", align: "right", render: (r) => (r.hi === null ? "—" : `${fmtKwh(r.hi)} (${monthLabel(r.hiM)})`) },
    { key: "perf", label: "Performance", render: (r) => <Badge text={r.perf} /> },
    { key: "remark", label: "Remark" },
  ];
  const csvCols = cols.map((c) => ({ ...c, csv: (r) => (c.key === "hi" ? r.hi : r[c.key]) }));

  return (
    <>
      <div className="metrics-grid auto">
        <KpiCard title="Installed capacity" value={fmtKwh(portfolioCapacity())} unit="kWp" sub={`${all.length} stores in registry`} />
        <KpiCard title={`Actual generation · ${monthLabel(ym)}`} value={fmtKwh(actual)} unit="kWh" sub={`${reporting} of ${all.length} stores have a record`} tone="good" hint="Actual units from the meter. Deemed units are shown separately and never added to actual." />
        <KpiCard title={`Deemed generation · ${monthLabel(ym)}`} value={fmtKwh(deemed)} unit="kWh" sub="Billed on deemed basis (not actual)" tone="info" />
        <KpiCard title="MoM change (actual)" value={fmtPct(momPct)} tone={momPct < 0 ? "bad" : "good"} sub={`Like-for-like: ${mom.n} stores · vs previous month`} hint="Only stores with an actual record in BOTH months are compared, so a missing bill does not look like a drop." />
        <KpiCard title="YoY change (actual)" value={fmtPct(yoyPct)} tone={yoyPct < 0 ? "bad" : "good"} sub={`Like-for-like: ${yoy.n} stores · vs same month last year`} />
        <KpiCard title={`${fyLabel(ytd.fy)} to date`} value={fmtKwh(ytd.current.actual)} unit="kWh" tone={ytdPct < 0 ? "bad" : "good"} sub={`${fmtPct(ytdPct)} vs ${fyLabel(ytd.fy - 1)} same ${ytd.months} months (Apr–${monthLabel(ym).slice(0, 3)})`} />
        <KpiCard title="Stores to review" value={review} sub="Status Investigate or Monitor" tone={review ? "warn" : "good"} />
      </div>

      <Card title="Monthly generation – last 24 months" subtitle="Actual and deemed kWh, with number of stores reporting (line, right axis). Missing bills are not treated as zero.">
        <div className="chart">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e5e9f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} />
              <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} domain={[0, 25]} />
              <Tooltip formatter={(v, n) => [n === "Stores reporting" ? v : `${fmtKwh(v)} kWh`, n]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar isAnimationActive={false} yAxisId="l" dataKey="actual" name="Actual (kWh)" stackId="g" fill="#1d9a6c" />
              <Bar isAnimationActive={false} yAxisId="l" dataKey="deemed" name="Deemed (kWh)" stackId="g" fill="#8fb8e8" />
              <Line isAnimationActive={false} yAxisId="r" dataKey="reporting" name="Stores reporting" stroke="#d9822b" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title={`Store-wise performance · ${monthLabel(ym)}`} subtitle="Click a row for the store's full history. YoY % = actual vs the same month last year.">
        <div className="filters-row">
          <input placeholder="Search store…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={loc} onChange={(e) => setLoc(e.target.value)}><option value="All">All locations</option>{locations.map((l) => <option key={l}>{l}</option>)}</select>
          <select value={st} onChange={(e) => setSt(e.target.value)}><option value="All">All installation status</option>{statuses.map((l) => <option key={l}>{l}</option>)}</select>
          <select value={perf} onChange={(e) => setPerf(e.target.value)}>
            <option value="All">All performance</option>{["Good", "Monitor", "Investigate", "Deemed Only", "No Data"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <DataTable columns={cols} rows={rows} defaultSort={{ key: "a", dir: "desc" }} onRowClick={(r) => onOpenStore(r.name)}
          filename={`solar-generation-${ym}.csv`} />
        <p className="note">Investigate = zero generation or YoY decline ≥ 20%; Monitor = decline ≥ 10% (Config sheet rules, marked "proposed – confirm" in the workbook).</p>
      </Card>
    </>
  );
}
