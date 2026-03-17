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
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";

/* ─── Theme constants — exact app variables ─────────────────────────────── */
const PINK   = "#0A66C2";
const GREEN  = "#00A651";
const RED    = "#E02020";
const GOLD   = "#F5A623";
const AMBER  = "#F5A623";
const BLUE   = "#3b82f6";
const MUTED  = "var(--muted)";
const BLACK  = "var(--black)";
const BG     = "var(--bg)";
const CARD   = "var(--card)";
const BORDER = "var(--border)";

/* ─── Shared primitives ─────────────────────────────────────────────────── */
function useDebounce(value, delay = 400) {
  const [d, setD] = useState(value);
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return d;
}

function useToast() {
  const [toast, setToast] = useState(null);
  function show(msg, type = "success") { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); }
  return { toast, show };
}

function Toast({ msg, type }) {
  return (
    <div style={{
      position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
      zIndex: 300, padding: "10px 18px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600,
      background: type === "error" ? "#3d1a1a" : "#1a3d2b",
      color: type === "error" ? RED : GREEN,
      border: `1px solid ${type === "error" ? RED : GREEN}`,
      boxShadow: "0 4px 20px rgba(0,0,0,.2)", whiteSpace: "nowrap",
    }}>{msg}</div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex: 200 }} />
      <div style={{
        position: "fixed", inset: "auto 0 0 0", zIndex: 201,
        background: CARD, borderRadius: "16px 16px 0 0",
        padding: "20px 20px 36px", maxHeight: "80vh",
        overflowY: "auto", boxShadow: "0 -4px 32px rgba(0,0,0,.12)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: "1.1rem" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", color: MUTED, cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel, danger = true }) {
  return (
    <>
      <div className="overlay" onClick={onCancel} style={{ zIndex: 200 }} />
      <div style={{
        position: "fixed", inset: "auto 0 0 0", zIndex: 201,
        background: CARD, borderRadius: "16px 16px 0 0", padding: "24px 20px 36px",
        boxShadow: "0 -4px 32px rgba(0,0,0,.12)",
      }}>
        <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: "1.1rem", marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: "0.85rem", color: MUTED, marginBottom: 24, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px", background: "none", border: `1.5px solid ${BORDER}`, borderRadius: "999px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", color: MUTED }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "12px", background: danger ? RED : GREEN, border: "none", borderRadius: "999px", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>Confirm</button>
        </div>
      </div>
    </>
  );
}

function Badge({ type, label }) {
  const map = {
    active:    { bg: "#00A651", color: "#fff" },
    inactive:  { bg: "#E02020", color: "#fff"   },
    verified:  { bg: "#00A651", color: "#fff" },
    unverified:{ bg: "#F5A623", color: "#fff"  },
    open:      { bg: "#E02020", color: "#fff"   },
    resolved:  { bg: "#00A651", color: "#fff" },
    reviewed:  { bg: "#0A66C2", color: "#fff"  },
    dismissed: { bg: "#888", color: "#fff" },
    candidate: { bg: "#0A66C2", color: "#fff"  },
    hr:        { bg: "#0A66C2", color: "#fff"  },
    admin:     { bg: "#F5A623", color: "#fff"  },
    closed:    { bg: "#888", color: "#fff" },
    draft:     { bg: "#0A66C2", color: "#fff"  },
  };
  const s = map[type] || { bg: "#888", color: "#fff" };
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", background: s.bg, color: s.color }}>{label || type}</span>
  );
}

function Card({ children, style }) {
  return <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", ...style }}>{children}</div>;
}

function BtnSm({ onClick, color = PINK, bg, children, danger }) {
  return (
    <button onClick={onClick} style={{ padding: "4px 10px", borderRadius: 6, border: "none", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", background: bg || (danger ? RED : PINK), color: "#fff" }}>{children}</button>
  );
}

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
    <button onClick={onClick} title={icon} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: bg, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {icons[icon]}
    </button>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return <input className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ fontSize: "0.82rem", padding: "8px 12px" }} />;
}

function FilterChips({ options, active, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onSelect(o.value)} style={{ padding: "4px 12px", borderRadius: 999, border: "none", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", background: active === o.value ? PINK : BG, color: active === o.value ? "#fff" : MUTED }}>{o.label}</button>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: "1.1rem", marginBottom: 14 }}>{children}</div>;
}

/* ─── Chart section label ───────────────────────────────────────────────── */
function SH({ children }) {
  return <div style={{ fontSize: "0.7rem", fontWeight: 700, color: MUTED, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.7px" }}>{children}</div>;
}

/* ─── KPI card ──────────────────────────────────────────────────────────── */
function KCard({ value, label, sub, color }) {
  return (
    <div style={{ background: CARD, borderRadius: 12, padding: "14px", border: `1px solid ${BORDER}`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color }} />
      <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: "2rem", lineHeight: 1, color: BLACK }}>{value ?? "—"}</div>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: BLACK, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: "0.65rem", color: MUTED, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ─── Funnel row ────────────────────────────────────────────────────────── */
function FRow({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: "0.78rem", color: BLACK, fontWeight: 500 }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.68rem", color: MUTED }}>{pct}%</span>
          <span style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: "0.95rem", color, minWidth: 18, textAlign: "right" }}>{value}</span>
        </div>
      </div>
      <div style={{ background: BG, borderRadius: 999, height: 5, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

/* ─── Horizontal bar row ────────────────────────────────────────────────── */
function HRow({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: "0.75rem", color: BLACK, fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: "0.9rem", color }}>{value}</span>
      </div>
      <div style={{ background: BG, borderRadius: 999, height: 5, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/* ─── Tab icons ─────────────────────────────────────────────────────────── */
function TabIcon({ id, active }) {
  const c = active ? "#0A66C2" : "var(--muted)";
  const p = { fill: "none", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const s = { width: 19, height: 19 };
  if (id === "overview")  return <svg viewBox="0 0 24 24" style={s} stroke={c} {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>;
  if (id === "analytics") return <svg viewBox="0 0 24 24" style={s} stroke={c} {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
  if (id === "users")     return <svg viewBox="0 0 24 24" style={s} stroke={c} {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (id === "companies") return <svg viewBox="0 0 24 24" style={s} stroke={c} {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  if (id === "jobs")      return <svg viewBox="0 0 24 24" style={s} stroke={c} {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
  if (id === "reports")   return <svg viewBox="0 0 24 24" style={s} stroke={c} {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return null;
}

const TABS = [
  { id: "overview",  label: "Overview"  },
  { id: "analytics", label: "Analytics" },
  { id: "users",     label: "Users"     },
  { id: "companies", label: "Cos"       },
  { id: "jobs",      label: "Jobs"      },
  { id: "reports",   label: "Reports"   },
];

/* ════════════════════════════════════════════════════════════════════════
   OVERVIEW TAB
════════════════════════════════════════════════════════════════════════ */
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getStats().then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <Spinner />;
  if (!stats)  return <div style={{ color: MUTED, fontSize: "0.85rem" }}>Failed to load stats.</div>;

  const total = stats.total_applications || 0;
  const short = stats.shortlisted_apps   || 0;
  const avg   = stats.avg_readiness_score;
  const weekly = stats.weekly_apps || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 8 }}>

      {/* Open reports alert */}
      {(stats.open_reports || 0) > 0 && (
        <div style={{ background: "rgba(224,60,60,.08)", border: `1px solid ${RED}`, borderRadius: 10, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center" }}>
          <span>⚠️</span>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: RED }}>{stats.open_reports} open report{stats.open_reports > 1 ? "s" : ""}</div>
            <div style={{ fontSize: "0.68rem", color: MUTED }}>Switch to Reports tab</div>
          </div>
        </div>
      )}

      {/* 4 KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <KCard value={stats.total_users}       label="Total Users"   sub={`${stats.total_candidates || 0} candidates`} color={PINK} />
        <KCard value={stats.active_jobs}        label="Active Jobs"   sub={`of ${stats.total_jobs || 0} total`}         color={GREEN} />
        <KCard value={total}                    label="Applications"  sub={`${short} shortlisted`}                       color={BLUE} />
        <KCard value={avg ? `${avg}%` : "—"}   label="Avg Score"     sub="readiness"                                    color={GOLD} />
      </div>

      {/* Platform health strip */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-around" }}>
        {[
          { label: "HR Accounts", value: stats.total_hr || 0,         color: PINK  },
          { label: "Verified Cos", value: `${stats.verified_companies || 0}/${stats.total_companies || 0}`, color: GREEN },
          { label: "Inactive",    value: stats.inactive_users || 0,   color: (stats.inactive_users || 0) > 0 ? RED : MUTED },
          { label: "Open Reports",value: stats.open_reports   || 0,   color: (stats.open_reports   || 0) > 0 ? RED : MUTED },
        ].map(item => (
          <div key={item.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.value}</div>
            <div style={{ fontSize: "0.58rem", color: MUTED, marginTop: 3, lineHeight: 1.3 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly applications sparkline */}
      {weekly.length > 1 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Applications This Month</SH>
          <ResponsiveContainer width="100%" height={90}>
            <AreaChart data={weekly} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={PINK} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={PINK} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 8, fill: MUTED }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 8, fill: MUTED }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: "0.72rem", borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD }} labelFormatter={v => `Week of ${v}`} />
              <Area type="monotone" dataKey="count" stroke={PINK} strokeWidth={2} fill="url(#sparkGrad)" dot={{ fill: PINK, r: 2.5 }} name="Applications" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ANALYTICS TAB
════════════════════════════════════════════════════════════════════════ */
function AnalyticsTab() {
  const [sub, setSub]       = useState("people");
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getStats().then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const SUB_TABS = [
    { id: "people",   label: "People"   },
    { id: "jobs",     label: "Jobs"     },
    { id: "pipeline", label: "Pipeline" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 8 }}>
      {/* Sub-tab pills */}
      <div style={{ display: "flex", gap: 8 }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{
            padding: "6px 16px", borderRadius: 999, cursor: "pointer",
            fontSize: "0.78rem", fontWeight: 600,
            background: sub === t.id ? PINK : CARD,
            color:      sub === t.id ? "#fff" : MUTED,
            border:     sub === t.id ? "none" : `1px solid ${BORDER}`,
          }}>{t.label}</button>
        ))}
      </div>

      {loading && <Spinner />}
      {!loading && !stats && <div style={{ color: MUTED, fontSize: "0.85rem" }}>Failed to load.</div>}
      {!loading && stats && sub === "people"   && <PeopleCharts   stats={stats} />}
      {!loading && stats && sub === "jobs"     && <JobsCharts     stats={stats} />}
      {!loading && stats && sub === "pipeline" && <PipelineCharts stats={stats} />}
    </div>
  );
}

function PeopleCharts({ stats }) {
  const education  = stats.education_breakdown  || [];
  const experience = stats.experience_breakdown || [];
  const states     = stats.candidate_states     || [];
  const industries = stats.industry_breakdown   || [];
  const workModes  = stats.candidate_work_modes || [];
  const tooltipStyle = { fontSize: "0.75rem", borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD };

  const COLORS = ["#0A66C2", "#00A651", "#F5A623", "#E02020", "#9B59B6", "#00BCD4"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Education level */}
      {education.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Education Level</SH>
          {education.map((e, i) => (
            <HRow key={e.level} label={e.level} value={e.count} max={education[0]?.count || 1} color={COLORS[i % COLORS.length]} />
          ))}
        </div>
      )}

      {/* Experience range */}
      {experience.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Experience Range</SH>
          {experience.map((e, i) => (
            <HRow key={e.range} label={e.range} value={e.count} max={experience[0]?.count || 1} color={COLORS[i % COLORS.length]} />
          ))}
        </div>
      )}

      {/* Candidates by state */}
      {states.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Candidates by State</SH>
          {states.map((s, i) => (
            <HRow key={s.state} label={s.state} value={s.count} max={states[0]?.count || 1} color={PINK} />
          ))}
        </div>
      )}

      {/* Top industries */}
      {industries.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Top Industries</SH>
          {industries.map((ind, i) => (
            <HRow key={ind.industry} label={ind.industry} value={ind.count} max={industries[0]?.count || 1} color={BLUE} />
          ))}
        </div>
      )}

      {/* Work mode preference donut */}
      {workModes.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Work Mode Preference</SH>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={workModes} dataKey="count" nameKey="mode" cx="50%" cy="45%"
                innerRadius={44} outerRadius={62} paddingAngle={3} label={({ value }) => value} labelLine={false} fontSize={10}>
                {workModes.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n]} />
              <Legend iconType="circle" iconSize={7}
                formatter={(v) => <span style={{ fontSize: "0.7rem", color: MUTED, textTransform: "capitalize" }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* No data fallback */}
      {education.length === 0 && experience.length === 0 && states.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: MUTED, fontSize: "0.82rem" }}>
          No candidate data yet
        </div>
      )}

    </div>
  );
}

function JobsCharts({ stats }) {
  const cats      = stats.top_categories    || [];
  const weeklyJ   = stats.weekly_jobs       || [];
  const roleTypes = stats.jobs_by_role_type || [];
  const workModes = stats.jobs_by_work_mode || [];
  const tooltipStyle = { fontSize: "0.75rem", borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD };

  const statusData = [
    { name: "Active", value: stats.active_jobs || 0, fill: GREEN },
    { name: "Closed", value: stats.closed_jobs || 0, fill: MUTED },
    { name: "Draft",  value: stats.draft_jobs  || 0, fill: BLUE  },
  ].filter(d => d.value > 0);

  const COLORS = ["#0A66C2", "#00A651", "#F5A623", "#E02020", "#9B59B6"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Jobs posted over time */}
      {weeklyJ.length > 1 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Jobs Posted — Last 6 Weeks</SH>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={weeklyJ} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="jobsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={BLUE} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={BLUE} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 9, fill: MUTED }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: MUTED }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={v => `Week of ${v}`} />
              <Area type="monotone" dataKey="count" stroke={BLUE} strokeWidth={2} fill="url(#jobsGrad)" dot={{ fill: BLUE, r: 2.5 }} name="Jobs Posted" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Jobs by status */}
      {statusData.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Jobs by Status</SH>
          {statusData.map((s, i) => (
            <HRow key={s.name} label={s.name} value={s.value} max={stats.total_jobs || 1} color={s.fill} />
          ))}
        </div>
      )}

      {/* Top job categories */}
      {cats.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Top Categories</SH>
          {cats.map((c, i) => (
            <HRow key={c.category} label={c.category} value={c.count} max={cats[0]?.count || 1} color={COLORS[i % COLORS.length]} />
          ))}
        </div>
      )}

      {/* Jobs by role type donut */}
      {roleTypes.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Jobs by Role Type</SH>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={roleTypes} dataKey="count" nameKey="type" cx="50%" cy="45%"
                innerRadius={44} outerRadius={62} paddingAngle={3} label={({ value }) => value} labelLine={false} fontSize={10}>
                {roleTypes.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={7}
                formatter={(v) => <span style={{ fontSize: "0.7rem", color: MUTED, textTransform: "capitalize" }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Jobs by work mode */}
      {workModes.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Jobs by Work Mode</SH>
          {workModes.map((w, i) => (
            <HRow key={w.mode} label={w.mode} value={w.count} max={workModes[0]?.count || 1} color={COLORS[i % COLORS.length]} />
          ))}
        </div>
      )}

      {/* No data fallback */}
      {cats.length === 0 && roleTypes.length === 0 && workModes.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: MUTED, fontSize: "0.82rem" }}>
          No jobs data yet
        </div>
      )}

    </div>
  );
}

function PipelineCharts({ stats }) {
  const total      = stats.total_applications || 0;
  const viewed     = stats.viewed_apps        || 0;
  const short      = stats.shortlisted_apps   || 0;
  const rej        = stats.rejected_apps      || 0;
  const avg        = stats.avg_readiness_score;
  const targetRoles = stats.top_target_roles  || [];
  const scoreDist  = stats.score_distribution || [];
  const tooltipStyle = { fontSize: "0.75rem", borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD };

  const shortlistRate = total > 0 ? Math.round((short  / total) * 100) : 0;
  const viewRate      = total > 0 ? Math.round((viewed / total) * 100) : 0;
  const rejectRate    = total > 0 ? Math.round((rej    / total) * 100) : 0;

  const funnelData = [
    { label: "Applied",     value: total,  pct: 100,          color: BLUE  },
    { label: "Viewed",      value: viewed, pct: viewRate,      color: "#8b5cf6" },
    { label: "Shortlisted", value: short,  pct: shortlistRate, color: GREEN },
    { label: "Rejected",    value: rej,    pct: rejectRate,    color: RED   },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 8 }}>

      {/* Application funnel with % */}
      {total > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Application Funnel</SH>
          {funnelData.map(f => (
            <div key={f.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: "0.78rem", color: BLACK, fontWeight: 500 }}>{f.label}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: "0.68rem", color: MUTED }}>{f.pct}%</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: f.color, minWidth: 18, textAlign: "right" }}>{f.value}</span>
                </div>
              </div>
              <div style={{ background: BG, borderRadius: 999, height: 6, overflow: "hidden" }}>
                <div style={{ width: `${f.pct}%`, height: "100%", background: f.color, borderRadius: 999, transition: "width 0.7s ease" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3 conversion rate metric cards */}
      {total > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "View Rate",      value: `${viewRate}%`,      color: BLUE  },
            { label: "Shortlist Rate", value: `${shortlistRate}%`, color: GREEN },
            { label: "Reject Rate",    value: `${rejectRate}%`,    color: RED   },
          ].map(m => (
            <div key={m.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: "0.58rem", color: MUTED, marginTop: 4, lineHeight: 1.3 }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Avg readiness score */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
        <SH>Avg Readiness Score</SH>
        <div style={{ textAlign: "center", padding: "8px 0 12px" }}>
          <div style={{ fontSize: "3.2rem", fontWeight: 800, color: avg ? GOLD : MUTED, lineHeight: 1 }}>
            {avg ? `${avg}%` : "—"}
          </div>
          <div style={{ fontSize: "0.7rem", color: MUTED, marginTop: 6 }}>
            {avg ? "average across all candidates" : "no scores calculated yet"}
          </div>
        </div>
        {avg && (
          <div style={{ background: BG, borderRadius: 999, height: 8, overflow: "hidden" }}>
            <div style={{ width: `${avg}%`, height: "100%", background: GOLD, borderRadius: 999, transition: "width 0.8s ease" }} />
          </div>
        )}
      </div>

      {/* Score distribution */}
      {scoreDist.some(s => s.count > 0) && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Score Distribution</SH>
          {scoreDist.map((s, i) => {
            const maxCount = Math.max(...scoreDist.map(d => d.count)) || 1;
            const COLORS = ["#E02020", "#F5A623", "#0A66C2", "#00A651"];
            return (
              <HRow key={s.band} label={s.band} value={s.count} max={maxCount} color={COLORS[i]} />
            );
          })}
        </div>
      )}

      {/* Top target roles */}
      {targetRoles.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px" }}>
          <SH>Top Target Roles</SH>
          {targetRoles.map((r, i) => (
            <HRow key={r.role} label={r.role} value={r.count} max={targetRoles[0]?.count || 1} color={PINK} />
          ))}
        </div>
      )}

      {/* No data fallback */}
      {total === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: MUTED, fontSize: "0.82rem" }}>
          No application data yet
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
        <div style={{
          display: "flex", borderBottom: `1px solid ${BORDER}`,
          background: CARD, position: "sticky", top: 0, zIndex: 10,
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              flex: 1, padding: "10px 0", border: "none",
              borderBottom: activeTab === t.id ? `2px solid #0A66C2` : "2px solid transparent",
              background: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <TabIcon id={t.id} active={activeTab === t.id} />
              <span style={{ fontSize: "0.55rem", fontWeight: 600, color: activeTab === t.id ? "#0A66C2" : "var(--muted)", letterSpacing: "0.2px" }}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
        <div style={{ padding: "16px 16px 0" }}>
          {activeTab === "overview"  && <OverviewTab />}
          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "users"     && <UsersTab />}
          {activeTab === "companies" && <CompaniesTab />}
          {activeTab === "jobs"      && <JobsTab />}
          {activeTab === "reports"   && <ReportsTab />}
        </div>
      </div>
    </>
  );
}
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
                      <IconBtn onClick={() => setEditing(u)} icon="edit" color="#fff" bg="#0A66C2" />
                      {u.role !== "admin" && (
                        <IconBtn
                          onClick={() => handleToggle(u)}
                          icon={u.is_active ? "deactivate" : "activate"}
                          color={u.is_active ? AMBER : GREEN}
                          bg={u.is_active ? "#F5A623" : "#00A651"}
                        />
                      )}
                      {u.role !== "admin" && (
                        <IconBtn onClick={() => setConfirm({ type: "user", data: u })} icon="trash" color={RED} bg="#E02020" />
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
                      bg={c.is_verified ? "#F5A623" : "#00A651"}
                    />
                    <IconBtn onClick={() => setConfirm({ type: "company", data: c })} icon="trash" color={RED} bg="#E02020" />
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
                    {j.status !== "active" && <IconBtn onClick={() => handleStatus(j, "active")} icon="open"  color="#fff" bg="#00A651" />}
                    {j.status !== "closed" && <IconBtn onClick={() => handleStatus(j, "closed")} icon="close" color={RED}   bg="#E02020"  />}
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
                    <div style={{ fontSize: "0.75rem", color: BLUE, background: "#E8F0FA", borderRadius: 6, padding: "6px 10px", marginBottom: 10 }}>
                      Note: {r.admin_note}
                    </div>
                  )}
                  {r.status === "open" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <BtnSm onClick={() => setResolving({ id: r.id, status: "reviewed" })} color="#fff" bg="#0A66C2">Review</BtnSm>
                      <BtnSm onClick={() => setResolving({ id: r.id, status: "resolved" })} color="#fff" bg="#00A651">Resolve</BtnSm>
                      <BtnSm onClick={() => handleUpdate(r.id, "dismissed", null)} color="#fff" bg="#888">Dismiss</BtnSm>
                    </div>
                  )}
                  {r.status === "reviewed" && (
                    <BtnSm onClick={() => setResolving({ id: r.id, status: "resolved" })} color="#fff" bg="#00A651">Mark Resolved</BtnSm>
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