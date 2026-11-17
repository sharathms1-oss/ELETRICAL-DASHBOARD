import { useEffect, useState } from "react";
import {
  Bell, Building2, CalendarDays, ChevronDown, ChevronRight, ClipboardCheck, FileBarChart,
  Gauge, IndianRupee, LayoutDashboard, Menu, Settings, ShieldCheck, Sun, X, Zap, Factory, CircleHelp, BarChart3, Scale, RefreshCw
} from "lucide-react";
import GenerationPage from "./pages/GenerationPage";
import SavingsPage from "./pages/SavingsPage";
import EstimatePage from "./pages/EstimatePage";
import StorePage from "./pages/StorePage";
import { allMonths, defaultReportingMonth, loadData, meta, monthLabel } from "./lib/solar";
import { fetchSolarData } from "./services/api";

const nav = [
  { label: "Executive overview", icon: LayoutDashboard },
  { label: "Solar performance", icon: Sun },
  { label: "EB & energy", icon: Zap },
  { label: "Maximum demand", icon: Gauge },
  { label: "Electrical audits", icon: ClipboardCheck },
  { label: "DC asset management", icon: Factory },
  { label: "Reports", icon: FileBarChart }
];

const TABS = [
  { id: "generation", label: "Solar generation", icon: BarChart3, title: "Solar generation", sub: "Monitor generation, compare with last month and last year, and find locations that need attention." },
  { id: "savings", label: "Solar savings", icon: IndianRupee, title: "Solar savings", sub: "Projected value against vendor invoices, and the estimated saving for each location." },
  { id: "estimate", label: "Vendor estimate", icon: Scale, title: "Vendor estimate vs actual", sub: "Each location's last completed operating year against the vendor estimate and assured generation." }
];

function Sidebar({ active, setActive, open, setOpen }) {
  return <>
    {open && <div className="mobile-scrim" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand">
        <div className="brand-mark"><Zap size={21} fill="currentColor" /></div>
        <div><div className="brand-title">Electrical<span> Intelligence</span></div><div className="brand-sub">MANAGEMENT PORTAL</div></div>
        <button className="icon-button mobile-close" onClick={() => setOpen(false)}><X size={18} /></button>
      </div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace-switch"><div className="workspace-icon"><Building2 size={16} /></div><div><b>India Operations</b><small>Electrical & Energy</small></div><ChevronDown size={15} /></div>
      <div className="nav-label">ANALYTICS</div>
      <nav className="nav-list">
        {nav.map(item => {
          const Icon = item.icon;
          return <button key={item.label} className={`nav-item ${active === item.label ? "selected" : ""}`} onClick={() => { setActive(item.label); setOpen(false); }}>
            <Icon size={18} /><span>{item.label}</span>{item.label === "Solar performance" && <span className="nav-dot" />}
          </button>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><b>Need help?</b><p>Contact the dashboard administrator for access or data issues.</p></div>
        <button className="nav-item"><Settings size={18} /><span>Settings</span></button>
        <div className="user-profile"><div className="avatar">ED</div><div><b>Electrical Design</b><small>Company workspace</small></div><ChevronDown size={15} /></div>
      </div>
    </aside>
  </>;
}

function PlaceholderPage({ title }) {
  const descriptions = {
    "Executive overview": "A consolidated view of electrical and energy performance across India operations.",
    "EB & energy": "Track electricity consumption, EB bills, unit rates and energy cost trends.",
    "Maximum demand": "Monitor recorded demand against sanctioned load and contract demand.",
    "Electrical audits": "Track audit completion, risk observations and rectification progress.",
    "DC asset management": "Review electrical asset inventory, ratings and connected load.",
    "Reports": "Prepare and export management reports across dashboard modules."
  };
  return <div className="placeholder-page"><div className="placeholder-icon"><FileBarChart size={27} /></div><div className="eyebrow">MODULE IN DEVELOPMENT</div><h1>{title}</h1><p>{descriptions[title] || "This module will be added in a later development phase."}</p><div className="coming-soon">Planned for a future phase</div></div>;
}

function SolarModule({ onRefresh, refreshing }) {
  const q = new URLSearchParams(window.location.search); // optional deep links: ?tab=savings&store=Kundli%20DC
  const [tab, setTab] = useState(TABS.some((x) => x.id === q.get("tab")) ? q.get("tab") : "generation");
  const [ym, setYm] = useState(defaultReportingMonth());
  const [store, setStore] = useState(q.get("store"));
  const months = [...allMonths].reverse();
  const t = TABS.find((x) => x.id === tab);

  return <div className="page-content">
    {store ? (
      <StorePage name={store} ym={ym} onBack={() => setStore(null)} />
    ) : (
      <>
        <div className="page-heading">
          <div><div className="eyebrow">ENERGY MANAGEMENT / SOLAR</div><h1>{t.title}</h1><p>{t.sub}</p></div>
        </div>
        <div className="filters">
          <div className="filter-control"><CalendarDays size={16} /><select value={ym} onChange={(e) => setYm(e.target.value)}>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select><ChevronDown size={14} /></div>
          <span className="muted">Reporting month</span>
          <div className="filter-spacer" />
          <div className="data-refresh"><span className="status-pulse" /> Live from Google Sheet <span className="refresh-divider" /> Last refreshed: {meta.generatedAt ? new Date(meta.generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
            <button className="button button-outline compact" disabled={refreshing} onClick={onRefresh} style={{ marginLeft: 10 }}><RefreshCw size={13} /> {refreshing ? "Refreshing…" : "Refresh"}</button></div>
        </div>
        <div className="tabs">
          {TABS.map((x) => <button key={x.id} className={tab === x.id ? "on" : ""} onClick={() => setTab(x.id)}><x.icon size={14} /> {x.label}</button>)}
        </div>
        {tab === "generation" && <GenerationPage ym={ym} onOpenStore={setStore} />}
        {tab === "savings" && <SavingsPage ym={ym} onOpenStore={setStore} />}
        {tab === "estimate" && <EstimatePage ym={ym} onOpenStore={setStore} />}
      </>
    )}
    <div className="disclaimer"><ShieldCheck size={15} /> Data is read from the Solar Dashboard workbook through the company-authenticated backend. Results are cached for a few minutes; use Refresh for the latest.</div>
  </div>;
}

export default function App() {
  const [active, setActive] = useState("Solar performance");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [version, setVersion] = useState(0);

  const load = (force) => {
    setRefreshing(true);
    return fetchSolarData(force)
      .then((raw) => { loadData(raw); setStatus("ready"); setError(""); setVersion((v) => v + 1); })
      .catch((e) => { setError(e.message || String(e)); setStatus((s) => (s === "ready" ? "ready" : "error")); })
      .finally(() => setRefreshing(false));
  };
  useEffect(() => { load(false); }, []);

  return <div className="app-shell">
    <Sidebar active={active} setActive={setActive} open={sidebarOpen} setOpen={setSidebarOpen} />
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-button menu-toggle" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><span className="breadcrumb-muted">India Operations</span><ChevronRight size={14} /><b>{active}</b></div>
        <div className="topbar-right"><span className="secure-label"><ShieldCheck size={14} /> Company workspace</span><button className="icon-button notification"><Bell size={18} /><i /></button><div className="top-avatar">ED</div></div>
      </header>
      {active !== "Solar performance" ? <PlaceholderPage title={active} />
        : status === "loading" ? <div className="placeholder-page"><div className="placeholder-icon"><RefreshCw size={27} /></div><h1>Loading data…</h1><p>Reading the latest figures from the Solar Dashboard workbook.</p></div>
        : status === "error" ? <div className="placeholder-page"><div className="placeholder-icon"><ShieldCheck size={27} /></div><div className="eyebrow">COULD NOT LOAD DATA</div><h1>Data unavailable</h1><p>{error}</p><button className="button button-outline" onClick={() => load(true)}><RefreshCw size={14} /> Try again</button></div>
        : <SolarModule key={version} onRefresh={() => load(true)} refreshing={refreshing} />}
      {status === "ready" && error && <div className="disclaimer" style={{ padding: "0 34px" }}>Refresh failed: {error}. Showing the last loaded data.</div>}
      <footer className="app-footer"><span>Electrical Intelligence <span className="footer-dot">·</span> Prototype v0.2</span><span>Designed for internal management reporting</span></footer>
    </main>
  </div>;
}
