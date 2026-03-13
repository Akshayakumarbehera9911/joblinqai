import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import TopBar from "../../components/TopBar";
import Spinner from "../../components/Spinner";
import {
  getStats, getUsers, updateUser, deleteUser,
  getCompanies, toggleVerify, deleteCompany,
  getAdminJobs, setJobStatus,
  getReports, updateReport,
} from "../../api/admin";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const PINK  = "var(--pink)";
const GREEN = "var(--green)";
const RED   = "var(--red)";
const AMBER = "#B45309";
const BLUE  = "#3b82f6";

/* ── Debounce hook ── */
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── Confirm modal (replaces window.confirm) ── */
function ConfirmModal({ title, message, onConfirm, onCancel, danger = true }) {
  return (
    <>
      <div className="overlay" onClick={onCancel} style={{ zIndex: 200 }} />
      <div style={{
        position: "fixed", inset: "auto 0 0 0", zIndex: 201,
        background: "var(--card)", borderRadius: "16px 16px 0 0",
        padding: "24px 20px 36px",
        boxShadow: "0 -4px 32px rgba(0,0,0,.12)",
      }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 24, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "12px", background: "none",
            border: "1.5px solid var(--border)", borderRadius: "999px",
            fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", color: "var(--muted)",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: "12px",
            background: danger ? "var(--red)" : "var(--green)",
            border: "none", borderRadius: "999px", color: "#fff",
            fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
          }}>Confirm</button>
        </div>
      </div>
    </>
  );
}

function Badge({ type, label }) {
  const map = {
    active:    { bg: "rgba(45,184,125,.15)",  color: GREEN },
    inactive:  { bg: "rgba(224,60,60,.15)",   color: RED   },
    verified:  { bg: "rgba(45,184,125,.15)",  color: GREEN },
    unverified:{ bg: "rgba(245,158,11,.15)",  color: AMBER },
    open:      { bg: "rgba(224,60,60,.15)",   color: RED   },
    resolved:  { bg: "rgba(45,184,125,.15)",  color: GREEN },
    reviewed:  { bg: "rgba(59,130,246,.15)",  color: BLUE  },
    dismissed: { bg: "rgba(136,136,136,.15)", color: "var(--muted)" },
    candidate: { bg: "rgba(59,130,246,.15)",  color: BLUE  },
    hr:        { bg: "rgba(232,57,138,.15)",  color: PINK  },
    admin:     { bg: "rgba(245,158,11,.15)",  color: AMBER },
    closed:    { bg: "rgba(136,136,136,.15)", color: "var(--muted)" },
    draft:     { bg: "rgba(59,130,246,.15)",  color: BLUE  },
  };
  const s = map[type] || { bg: "rgba(136,136,136,.15)", color: "var(--muted)" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 999,
      fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.4px", background: s.bg, color: s.color,
    }}>{label || type}</span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: 12, overflow: "hidden", ...style,
    }}>{children}</div>
  );
}

function BtnSm({ onClick, color = BLUE, bg, children, danger }) {
  const bgFinal = bg || (danger ? "rgba(224,60,60,.12)" : "rgba(59,130,246,.12)");
  const clr = danger ? RED : color;
  return (
    <button onClick={onClick} style={{
      padding: "4px 10px", borderRadius: 6, border: "none",
      fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
      background: bgFinal, color: clr,
    }}>{children}</button>
  );
}

/* icon keys: trash | edit | deactivate | activate | verify | unverify | close | open */
function IconBtn({ onClick, icon, color, bg }) {
  const p = { fill: "none", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    trash:      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
    edit:       <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    deactivate: <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" {...p}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
    activate:   <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    verify:     <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
    unverify:   <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>,
    close:      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>,
    open:       <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" {...p}><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  };
  return (
    <button onClick={onClick} title={icon} style={{
      width: 30, height: 30, borderRadius: 8, border: "none",
      background: bg, color,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {icons[icon]}
    </button>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <input className="input" value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ fontSize: "0.82rem", padding: "8px 12px" }}
    />
  );
}

function FilterChips({ options, active, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onSelect(o.value)} style={{
          padding: "4px 12px", borderRadius: 999, border: "none",
          fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
          background: active === o.value ? PINK : "var(--bg)",
          color: active === o.value ? "#fff" : "var(--muted)",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", marginBottom: 14 }}>{children}</div>;
}

function useToast() {
  const [toast, setToast] = useState(null);
  function show(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }
  return { toast, show };
}

function Modal({ title, onClose, children }) {
  return (
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex: 200 }} />
      <div style={{
        position: "fixed", inset: "auto 0 0 0", zIndex: 201,
        background: "var(--card)", borderRadius: "16px 16px 0 0",
        padding: "20px 20px 36px", maxHeight: "80vh",
        overflowY: "auto", boxShadow: "0 -4px 32px rgba(0,0,0,.12)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", color: "var(--muted)", cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </>
  );
}

function TabIcon({ id, active }) {
  const color = active ? "#E8398A" : "#aaa";
  const p = { fill: "none", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const s = { width: 20, height: 20 };
  if (id === "overview")  return <svg viewBox="0 0 24 24" style={s} stroke={color} {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>;
  if (id === "users")     return <svg viewBox="0 0 24 24" style={s} stroke={color} {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (id === "companies") return <svg viewBox="0 0 24 24" style={s} stroke={color} {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  if (id === "jobs")      return <svg viewBox="0 0 24 24" style={s} stroke={color} {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
  if (id === "reports")   return <svg viewBox="0 0 24 24" style={s} stroke={color} {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return null;
}

const TABS = [
  { id: "overview",  label: "Overview"  },
  { id: "users",     label: "Users"     },
  { id: "companies", label: "Companies" },
  { id: "jobs",      label: "Jobs"      },
  { id: "reports",   label: "Reports"   },
];

/* ── Overview ── */
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getStats().then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  if (!stats)  return <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Failed to load stats.</div>;

  const PINK2  = "#E8398A";
  const BLUE2  = "#3b82f6";
  const PURP   = "#8b5cf6";
  const SLATE  = "#64748b";

  const totalApps   = stats.total_applications || 0;
  const shortlisted = stats.shortlisted_apps   || 0;
  const rejected    = stats.rejected_apps      || 0;
  const viewed      = stats.viewed_apps        || 0;
  const applied     = totalApps;

  const funnelMax = applied || 1;

  const jobsDonut = [
    { name: "Active", value: stats.active_jobs  || 0, fill: PINK2 },
    { name: "Closed", value: stats.closed_jobs  || 0, fill: "#e2e8f0" },
    { name: "Draft",  value: stats.draft_jobs   || 0, fill: BLUE2  },
  ].filter(d => d.value > 0);

  const weeklyData  = stats.weekly_apps       || [];
  const topCats     = stats.top_categories    || [];
  const candStates  = stats.candidate_states  || [];
  const avgScore    = stats.avg_readiness_score || null;

  /* ── tiny stat card ── */
  function KCard({ value, label, sub, color }) {
    return (
      <div style={{
        background: "var(--card)", borderRadius: 14, padding: "16px 14px",
        border: "1px solid var(--border)", position: "relative", overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, background: color }} />
        <div style={{ fontSize: "1.9rem", fontWeight: 800, color, lineHeight: 1.05 }}>{value ?? "—"}</div>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--black)", marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 1 }}>{sub}</div>}
      </div>
    );
  }

  /* ── section header ── */
  function SH({ children }) {
    return <div style={{ fontSize: "0.78rem", fontWeight: 700, color: SLATE, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.6px" }}>{children}</div>;
  }

  /* ── funnel row ── */
  function FRow({ label, value, color }) {
    const pct = Math.round((value / funnelMax) * 100);
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
          <span style={{ fontSize: "0.78rem", color: "var(--black)", fontWeight: 500 }}>{label}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>{pct}%</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color, minWidth: 20, textAlign: "right" }}>{value}</span>
          </div>
        </div>
        <div style={{ background: "var(--bg)", borderRadius: 999, height: 6, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.7s cubic-bezier(.4,0,.2,1)" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>

      {/* Open reports alert */}
      {(stats.open_reports || 0) > 0 && (
        <div style={{
          background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 12,
          padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: "1rem" }}>⚠️</span>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#e11d48" }}>
              {stats.open_reports} open report{stats.open_reports > 1 ? "s" : ""} need attention
            </div>
            <div style={{ fontSize: "0.7rem", color: "#9f1239" }}>Switch to Reports tab</div>
          </div>
        </div>
      )}

      {/* KPI 2x2 grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <KCard value={stats.total_users}        label="Total Users"   sub={`${stats.total_candidates || 0} candidates`} color={BLUE2} />
        <KCard value={stats.active_jobs}         label="Active Jobs"   sub={`of ${stats.total_jobs || 0} total`}        color={PINK2} />
        <KCard value={totalApps}                 label="Applications"  sub={`${shortlisted} shortlisted`}                color={PURP}  />
        <KCard value={avgScore ? `${avgScore}%` : "—"} label="Avg Score" sub="readiness"                               color="#f59e0b" />
      </div>

      {/* Platform health strip */}
      <div style={{
        background: "var(--card)", borderRadius: 14, padding: "14px 16px",
        border: "1px solid var(--border)", display: "flex", justifyContent: "space-around",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        {[
          { label: "HR Accounts",  value: stats.total_hr || 0 },
          { label: "Companies",    value: `${stats.verified_companies || 0}/${stats.total_companies || 0}`, sub: "verified" },
          { label: "Inactive",     value: stats.inactive_users || 0, warn: (stats.inactive_users || 0) > 0 },
          { label: "Reports",      value: stats.open_reports || 0, warn: (stats.open_reports || 0) > 0 },
        ].map(item => (
          <div key={item.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: item.warn ? "#e11d48" : PINK2 }}>{item.value}</div>
            {item.sub && <div style={{ fontSize: "0.58rem", color: "var(--muted)" }}>{item.sub}</div>}
            <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: 1 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Application funnel */}
      <div style={{ background: "var(--card)", borderRadius: 14, padding: "16px", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <SH>Application Funnel</SH>
        <FRow label="Applied"     value={applied}     color={BLUE2} />
        <FRow label="Viewed"      value={viewed}      color={PURP}  />
        <FRow label="Shortlisted" value={shortlisted} color={PINK2} />
        <FRow label="Rejected"    value={rejected}    color="#f43f5e" />
      </div>

      {/* Jobs by status donut */}
      {jobsDonut.length > 0 && (
        <div style={{ background: "var(--card)", borderRadius: 14, padding: "16px", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <SH>Jobs by Status</SH>
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={jobsDonut} cx="50%" cy="45%" innerRadius={48} outerRadius={68} paddingAngle={3} dataKey="value">
                {jobsDonut.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: "0.75rem", borderRadius: 8, border: "1px solid var(--border)" }} />
              <Legend iconType="circle" iconSize={7}
                formatter={(v, e) => <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{v} ({e.payload.value})</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly applications */}
      {weeklyData.length > 1 && (
        <div style={{ background: "var(--card)", borderRadius: 14, padding: "16px", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <SH>Applications — Last 6 Weeks</SH>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={weeklyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={PINK2} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={PINK2} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#aaa" }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: "#aaa" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: "0.75rem", borderRadius: 8, border: "1px solid var(--border)" }} labelFormatter={v => `Week of ${v}`} />
              <Area type="monotone" dataKey="count" stroke={PINK2} strokeWidth={2} fill="url(#areaGrad)" dot={{ fill: PINK2, r: 3 }} name="Applications" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top job categories */}
      {topCats.length > 0 && (
        <div style={{ background: "var(--card)", borderRadius: 14, padding: "16px", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <SH>Top Job Categories</SH>
          {topCats.map((c, i) => (
            <div key={c.category} style={{ marginBottom: i < topCats.length - 1 ? 10 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--black)", fontWeight: 500 }}>{c.category}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: PINK2 }}>{c.count}</span>
              </div>
              <div style={{ background: "var(--bg)", borderRadius: 999, height: 5 }}>
                <div style={{
                  width: `${Math.round((c.count / (topCats[0]?.count || 1)) * 100)}%`,
                  height: "100%", borderRadius: 999,
                  background: `linear-gradient(90deg, ${PINK2}, ${BLUE2})`,
                  opacity: 1 - i * 0.15,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidates by state */}
      {candStates.length > 0 && (
        <div style={{ background: "var(--card)", borderRadius: 14, padding: "16px", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <SH>Candidates by State</SH>
          {candStates.map((s, i) => (
            <div key={s.state} style={{ marginBottom: i < candStates.length - 1 ? 10 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: "0.78rem", color: "var(--black)", fontWeight: 500 }}>{s.state}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: BLUE2 }}>{s.count}</span>
              </div>
              <div style={{ background: "var(--bg)", borderRadius: 999, height: 5 }}>
                <div style={{
                  width: `${Math.round((s.count / (candStates[0]?.count || 1)) * 100)}%`,
                  height: "100%", background: BLUE2, borderRadius: 999, opacity: 1 - i * 0.15,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

/* ── Main ── */
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <>
      <TopBar title="Admin Panel" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 0px) 0 calc(var(--nav-height) + 16px)" }}>
        {/* Icon-only tab bar — no scroll */}
        <div style={{
          display: "flex", borderBottom: "1px solid var(--border)",
          background: "var(--card)", position: "sticky", top: 0, zIndex: 10,
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              flex: 1, padding: "11px 0", border: "none",
              borderBottom: activeTab === t.id ? "2.5px solid #E8398A" : "2.5px solid transparent",
              background: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}>
              <TabIcon id={t.id} active={activeTab === t.id} />
              <span style={{
                fontSize: "0.58rem", fontWeight: activeTab === t.id ? 700 : 500,
                color: activeTab === t.id ? "#E8398A" : "#aaa", letterSpacing: "0.3px",
              }}>
                {t.id === "companies" ? "Cos" : t.label}
              </span>
            </button>
          ))}
        </div>
        <div style={{ padding: "16px 16px 0" }}>
          {activeTab === "overview"  && <OverviewTab />}
          {activeTab === "users"     && <UsersTab />}
          {activeTab === "companies" && <CompaniesTab />}
          {activeTab === "jobs"      && <JobsTab />}
          {activeTab === "reports"   && <ReportsTab />}
        </div>
      </div>
    </>
  );
}
/* ── Users ── */
function UsersTab() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("");
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null); // { user, action }
  const { toast, show } = useToast();

  // Debounce search — only fires API after 400ms of no typing
  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter)         params.role   = filter;
      if (debouncedSearch) params.search = debouncedSearch;
      const r = await getUsers(params);
      setUsers(r.data || []);
    } catch { show("Failed to load users", "error"); }
    finally   { setLoading(false); }
  }, [filter, debouncedSearch]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  async function handleToggle(u) {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      show(`User ${u.is_active ? "deactivated" : "activated"}`);
      load();
    } catch { show("Failed", "error"); }
  }

  async function handleDelete(u) {
    try {
      await deleteUser(u.id);
      show("User removed");
      setConfirm(null);
      load();
    } catch { show("Failed", "error"); }
  }

  async function handleSave(id, form) {
    try {
      await updateUser(id, form);
      show("User updated");
      setEditing(null);
      load();
    } catch(e) { show(e.message || "Failed", "error"); }
  }

  return (
    <div>
      {toast && <Toast {...toast} />}
      <SectionTitle>Users</SectionTitle>
      <div style={{ marginBottom: 10 }}>
        <SearchBar value={search} onChange={v => setSearch(v)} placeholder="Search name or email…" />
      </div>
      <FilterChips
        options={[
          { value: "",          label: "All"        },
          { value: "candidate", label: "Candidates" },
          { value: "hr",        label: "HR"         },
          { value: "admin",     label: "Admin"      },
        ]}
        active={filter} onSelect={setFilter}
      />
      {loading ? <Spinner /> : (
        <Card>
          {users.length === 0
            ? <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>No users found</div>
            : users.map((u, i) => (
              <div key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.full_name}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
                      <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                        <Badge type={u.role} />
                        <Badge type={u.is_active ? "active" : "inactive"} label={u.is_active ? "Active" : "Inactive"} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      <IconBtn onClick={() => setEditing(u)} icon="edit" color={BLUE} bg="rgba(59,130,246,.12)" />
                      {u.role !== "admin" && (
                        <IconBtn
                          onClick={() => handleToggle(u)}
                          icon={u.is_active ? "deactivate" : "activate"}
                          color={u.is_active ? AMBER : GREEN}
                          bg={u.is_active ? "rgba(245,158,11,.12)" : "rgba(45,184,125,.12)"}
                        />
                      )}
                      {u.role !== "admin" && (
                        <IconBtn onClick={() => setConfirm({ type: "user", data: u })} icon="trash" color={RED} bg="rgba(224,60,60,.12)" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          }
        </Card>
      )}
      {editing && <UserEditModal user={editing} onClose={() => setEditing(null)} onSave={handleSave} />}
      {confirm?.type === "user" && (
        <ConfirmModal
          title="Remove User"
          message={`Remove "${confirm.data.full_name}"? This permanently deactivates their account.`}
          onConfirm={() => handleDelete(confirm.data)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function UserEditModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({ full_name: user.full_name || "", email: user.email || "", role: user.role || "candidate" });
  const [saving, setSaving] = useState(false);
  async function submit() { setSaving(true); await onSave(user.id, form); setSaving(false); }
  return (
    <Modal title={`Edit: ${user.full_name}`} onClose={onClose}>
      <div style={{ marginBottom: 12 }}>
        <label className="label">Full Name</label>
        <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label className="label">Email</label>
        <input className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      {user.role !== "admin" && (
        <div style={{ marginBottom: 20 }}>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="candidate">Candidate</option>
            <option value="hr">HR</option>
          </select>
        </div>
      )}
      <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
    </Modal>
  );
}

/* ── Companies ── */
function CompaniesTab() {
  const [companies, setCompanies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("");
  const [confirm,   setConfirm]   = useState(null);
  const { toast, show } = useToast();

  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch)       params.search      = debouncedSearch;
      if (filter === "verified")   params.is_verified = "true";
      if (filter === "unverified") params.is_verified = "false";
      const r = await getCompanies(params);
      setCompanies(r.data || []);
    } catch { show("Failed to load", "error"); }
    finally   { setLoading(false); }
  }, [filter, debouncedSearch]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  async function handleVerify(c) {
    try { await toggleVerify(c.id); show(c.is_verified ? "Unverified" : "Verified ✓"); load(); }
    catch { show("Failed", "error"); }
  }

  async function handleDelete(c) {
    try { await deleteCompany(c.id); show("Company removed"); setConfirm(null); load(); }
    catch { show("Failed", "error"); }
  }

  return (
    <div>
      {toast && <Toast {...toast} />}
      <SectionTitle>Companies</SectionTitle>
      <div style={{ marginBottom: 10 }}>
        <SearchBar value={search} onChange={v => setSearch(v)} placeholder="Search company…" />
      </div>
      <FilterChips
        options={[
          { value: "",           label: "All"     },
          { value: "verified",   label: "Verified" },
          { value: "unverified", label: "Pending"  },
        ]}
        active={filter} onSelect={setFilter}
      />
      {loading ? <Spinner /> : (
        <Card>
          {companies.length === 0
            ? <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>No companies found</div>
            : companies.map((c, i) => (
              <div key={c.id} style={{ padding: "12px 14px", borderBottom: i < companies.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{c.company_name}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>{c.industry} · {c.city}, {c.state}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 1 }}>HR: {c.hr_name} · {c.job_count} jobs</div>
                    <div style={{ marginTop: 6 }}><Badge type={c.is_verified ? "verified" : "unverified"} label={c.is_verified ? "Verified" : "Pending"} /></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                    <IconBtn
                      onClick={() => handleVerify(c)}
                      icon={c.is_verified ? "unverify" : "verify"}
                      color={c.is_verified ? AMBER : GREEN}
                      bg={c.is_verified ? "rgba(245,158,11,.12)" : "rgba(45,184,125,.12)"}
                    />
                    <IconBtn onClick={() => setConfirm({ type: "company", data: c })} icon="trash" color={RED} bg="rgba(224,60,60,.12)" />
                  </div>
                </div>
              </div>
            ))
          }
        </Card>
      )}
      {confirm?.type === "company" && (
        <ConfirmModal
          title="Remove Company"
          message={`Remove "${confirm.data.company_name}" and close all its jobs?`}
          onConfirm={() => handleDelete(confirm.data)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

/* ── Jobs ── */
function JobsTab() {
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("");
  const { toast, show } = useToast();

  const debouncedSearch = useDebounce(search, 400);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filter)          params.status = filter;
      const r = await getAdminJobs(params);
      setJobs(r.data || []);
    } catch { show("Failed to load", "error"); }
    finally   { setLoading(false); }
  }, [filter, debouncedSearch]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  async function handleStatus(job, status) {
    try { await setJobStatus(job.id, status); show(`Job marked as ${status}`); load(); }
    catch { show("Failed", "error"); }
  }

  return (
    <div>
      {toast && <Toast {...toast} />}
      <SectionTitle>Jobs</SectionTitle>
      <div style={{ marginBottom: 10 }}>
        <SearchBar value={search} onChange={v => setSearch(v)} placeholder="Search job title…" />
      </div>
      <FilterChips
        options={[
          { value: "",       label: "All"    },
          { value: "active", label: "Active" },
          { value: "closed", label: "Closed" },
          { value: "draft",  label: "Draft"  },
        ]}
        active={filter} onSelect={setFilter}
      />
      {loading ? <Spinner /> : (
        <Card>
          {jobs.length === 0
            ? <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>No jobs found</div>
            : jobs.map((j, i) => (
              <div key={j.id} style={{ padding: "11px 14px", borderBottom: i < jobs.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{j.title}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>{j.company_name} · {j.city}</div>
                    <div style={{ display: "flex", gap: 5, marginTop: 6, alignItems: "center" }}>
                      <Badge type={j.status} />
                      <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{j.applicants} applicants</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                    {j.status !== "active" && <IconBtn onClick={() => handleStatus(j, "active")} icon="open"  color={GREEN} bg="rgba(45,184,125,.12)" />}
                    {j.status !== "closed" && <IconBtn onClick={() => handleStatus(j, "closed")} icon="close" color={RED}   bg="rgba(224,60,60,.12)"  />}
                  </div>
                </div>
              </div>
            ))
          }
        </Card>
      )}
    </div>
  );
}

/* ── Reports ── */
function ReportsTab() {
  const [reports,   setReports]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("open");
  const [resolving, setResolving] = useState(null);
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const r = await getReports(params);
      setReports(r.data || []);
    } catch { show("Failed to load", "error"); }
    finally   { setLoading(false); }
  }, [filter]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  async function handleUpdate(id, status, note) {
    try { await updateReport(id, { status, admin_note: note || null }); show(`Report marked as ${status}`); setResolving(null); load(); }
    catch { show("Failed", "error"); }
  }

  const TYPE_LABELS = { scam_job: "Scam Job", fake_company: "Fake Company", candidate_fraud: "Fraud", bug: "Bug", other: "Other" };

  return (
    <div>
      {toast && <Toast {...toast} />}
      <SectionTitle>Reports</SectionTitle>
      <FilterChips
        options={[
          { value: "open",      label: "Open"      },
          { value: "reviewed",  label: "Reviewed"  },
          { value: "resolved",  label: "Resolved"  },
          { value: "dismissed", label: "Dismissed" },
          { value: "",          label: "All"        },
        ]}
        active={filter} onSelect={setFilter}
      />
      {loading ? <Spinner /> : (
        <div>
          {reports.length === 0
            ? <Card><div style={{ padding: "32px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>No reports</div></Card>
            : reports.map(r => (
              <Card key={r.id} style={{ marginBottom: 10 }}>
                <div style={{ padding: "14px" }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Badge type={r.status} />
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: PINK, textTransform: "uppercase" }}>{TYPE_LABELS[r.report_type] || r.report_type}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 4 }}>{r.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5, marginBottom: 8 }}>{r.description}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: r.admin_note ? 6 : 10 }}>
                    By {r.reporter_name} ({r.reporter_role}) · {new Date(r.created_at).toLocaleDateString()}
                  </div>
                  {r.admin_note && (
                    <div style={{ fontSize: "0.75rem", color: BLUE, background: "rgba(59,130,246,.08)", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
                      Note: {r.admin_note}
                    </div>
                  )}
                  {r.status === "open" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <BtnSm onClick={() => setResolving({ id: r.id, status: "reviewed" })} color={BLUE} bg="rgba(59,130,246,.12)">Review</BtnSm>
                      <BtnSm onClick={() => setResolving({ id: r.id, status: "resolved" })} color={GREEN} bg="rgba(45,184,125,.12)">Resolve</BtnSm>
                      <BtnSm onClick={() => handleUpdate(r.id, "dismissed", null)} color="var(--muted)" bg="rgba(136,136,136,.1)">Dismiss</BtnSm>
                    </div>
                  )}
                  {r.status === "reviewed" && (
                    <BtnSm onClick={() => setResolving({ id: r.id, status: "resolved" })} color={GREEN} bg="rgba(45,184,125,.12)">Mark Resolved</BtnSm>
                  )}
                </div>
              </Card>
            ))
          }
        </div>
      )}
      {resolving && (
        <ReportNoteModal status={resolving.status} onClose={() => setResolving(null)} onSave={note => handleUpdate(resolving.id, resolving.status, note)} />
      )}
    </div>
  );
}

function ReportNoteModal({ status, onClose, onSave }) {
  const [note, setNote] = useState("");
  return (
    <Modal title={`Mark as ${status}`} onClose={onClose}>
      <div style={{ marginBottom: 16 }}>
        <label className="label">Admin Note (optional)</label>
        <textarea className="input" rows={3} value={note} onChange={e => setNote(e.target.value)}
          placeholder="Add a note about this report…" style={{ resize: "vertical" }} />
      </div>
      <button className="btn-primary" onClick={() => onSave(note)}>Confirm</button>
    </Modal>
  );
}

function Toast({ msg, type }) {
  return (
    <div style={{
      position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
      zIndex: 300, padding: "10px 18px", borderRadius: 10,
      fontSize: "0.82rem", fontWeight: 600,
      background: type === "error" ? "#3d1a1a" : "#1a3d2b",
      color: type === "error" ? RED : GREEN,
      border: `1px solid ${type === "error" ? RED : GREEN}`,
      boxShadow: "0 4px 20px rgba(0,0,0,.2)", whiteSpace: "nowrap",
    }}>{msg}</div>
  );
}