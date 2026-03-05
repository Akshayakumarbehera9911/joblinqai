import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import TopBar from "../../components/TopBar";
import Spinner from "../../components/Spinner";
import {
  getStats, getUsers, updateUser, deleteUser,
  getCompanies, toggleVerify, deleteCompany,
  getAdminJobs, setJobStatus,
  getReports, updateReport,
} from "../../api/admin";

/* ── Colour helpers ─────────────────────────────────────────── */
const PINK   = "var(--pink)";
const GREEN  = "var(--green)";
const RED    = "var(--red)";
const AMBER  = "#B45309";
const BLUE   = "#3b82f6";

function Badge({ type, label }) {
  const map = {
    active:    { bg: "rgba(45,184,125,.15)",  color: GREEN  },
    inactive:  { bg: "rgba(224,60,60,.15)",   color: RED    },
    verified:  { bg: "rgba(45,184,125,.15)",  color: GREEN  },
    unverified:{ bg: "rgba(245,158,11,.15)",  color: AMBER  },
    open:      { bg: "rgba(224,60,60,.15)",   color: RED    },
    resolved:  { bg: "rgba(45,184,125,.15)",  color: GREEN  },
    reviewed:  { bg: "rgba(59,130,246,.15)",  color: BLUE   },
    dismissed: { bg: "rgba(136,136,136,.15)", color: "var(--muted)" },
    candidate: { bg: "rgba(59,130,246,.15)",  color: BLUE   },
    hr:        { bg: "rgba(232,57,138,.15)",  color: PINK   },
    admin:     { bg: "rgba(245,158,11,.15)",  color: AMBER  },
    closed:    { bg: "rgba(136,136,136,.15)", color: "var(--muted)" },
    draft:     { bg: "rgba(59,130,246,.15)",  color: BLUE   },
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

function Row({ children }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "11px 14px", borderBottom: "1px solid var(--border)",
      fontSize: "0.82rem", gap: 8,
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

function SearchBar({ value, onChange, placeholder }) {
  return (
    <input
      className="input"
      value={value}
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
  return (
    <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", marginBottom: 14 }}>
      {children}
    </div>
  );
}

/* ── Toast ── */
function useToast() {
  const [toast, setToast] = useState(null);
  function show(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }
  return { toast, show };
}

/* ── Modal ── */
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

/* ═══════════════════════════════════════════════════════════════
   TABS
═══════════════════════════════════════════════════════════════ */
function TabIcon({ id }) {
  const s = { width: 15, height: 15, display: "inline-block", verticalAlign: "middle", marginRight: 4 };
  const p = { fill: "none", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (id === "overview")  return <svg viewBox="0 0 24 24" style={s} stroke="currentColor" {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
  if (id === "users")     return <svg viewBox="0 0 24 24" style={s} stroke="currentColor" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (id === "companies") return <svg viewBox="0 0 24 24" style={s} stroke="currentColor" {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  if (id === "jobs")      return <svg viewBox="0 0 24 24" style={s} stroke="currentColor" {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
  if (id === "reports")   return <svg viewBox="0 0 24 24" style={s} stroke="currentColor" {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return null;
}

const TABS = [
  { id: "overview",   label: "Overview"  },
  { id: "users",      label: "Users"     },
  { id: "companies",  label: "Companies" },
  { id: "jobs",       label: "Jobs"      },
  { id: "reports",    label: "Reports"   },
];

/* ═══════════════════════════════════════════════════════════════
   OVERVIEW TAB
═══════════════════════════════════════════════════════════════ */
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!stats)  return <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Failed to load stats.</div>;

  const statCards = [
    { label: "Total Users",     value: stats.total_users,        accent: BLUE  },
    { label: "Candidates",      value: stats.total_candidates,   accent: BLUE  },
    { label: "HR Accounts",     value: stats.total_hr,           accent: PINK  },
    { label: "Companies",       value: stats.total_companies,    accent: AMBER },
    { label: "Verified Cos",    value: stats.verified_companies, accent: GREEN },
    { label: "Total Jobs",      value: stats.total_jobs,         accent: AMBER },
    { label: "Active Jobs",     value: stats.active_jobs,        accent: GREEN },
    { label: "Applications",    value: stats.total_applications, accent: BLUE  },
    { label: "Open Reports",    value: stats.open_reports,       accent: RED   },
    { label: "Inactive Users",  value: stats.inactive_users,     accent: RED   },
  ];

  return (
    <div>
      <SectionTitle>Platform Overview</SectionTitle>
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 10, marginBottom: 8,
      }}>
        {statCards.map(sc => (
          <div key={sc.label} style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 12, padding: "14px 16px", position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: sc.accent }} />
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.7rem", lineHeight: 1 }}>
              {sc.value ?? "—"}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {sc.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   USERS TAB
═══════════════════════════════════════════════════════════════ */
function UsersTab() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("");
  const [editing, setEditing] = useState(null);
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.role = filter;
      if (search) params.search = search;
      const r = await getUsers(params);
      setUsers(r.data || []);
    } catch { show("Failed to load users", "error"); }
    finally   { setLoading(false); }
  }, [filter, search]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  async function handleToggle(u) {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      show(`User ${u.is_active ? "deactivated" : "activated"}`);
      load();
    } catch { show("Failed", "error"); }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Remove "${u.full_name}"? This permanently deactivates their account.`)) return;
    try {
      await deleteUser(u.id);
      show("User removed");
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
          { value: "", label: "All" },
          { value: "candidate", label: "Candidates" },
          { value: "hr", label: "HR" },
          { value: "admin", label: "Admin" },
        ]}
        active={filter}
        onSelect={setFilter}
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
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.full_name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.email}
                      </div>
                      <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                        <Badge type={u.role} />
                        <Badge type={u.is_active ? "active" : "inactive"} label={u.is_active ? "Active" : "Inactive"} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      <BtnSm onClick={() => setEditing(u)} color={BLUE} bg="rgba(59,130,246,.12)">Edit</BtnSm>
                      {u.role !== "admin" && (
                        <BtnSm onClick={() => handleToggle(u)} color={u.is_active ? AMBER : GREEN} bg={u.is_active ? "rgba(245,158,11,.12)" : "rgba(45,184,125,.12)"}>
                          {u.is_active ? "Deact." : "Activ."}
                        </BtnSm>
                      )}
                      {u.role !== "admin" && (
                        <BtnSm danger onClick={() => handleDelete(u)}>Delete</BtnSm>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          }
        </Card>
      )}
      {editing && (
        <UserEditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function UserEditModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: user.full_name || "",
    email:     user.email     || "",
    role:      user.role      || "candidate",
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    await onSave(user.id, form);
    setSaving(false);
  }

  return (
    <Modal title={`Edit: ${user.full_name}`} onClose={onClose}>
      <div style={{ marginBottom: 12 }}>
        <label className="label">Full Name</label>
        <input className="input" value={form.full_name}
          onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label className="label">Email</label>
        <input className="input" value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      {user.role !== "admin" && (
        <div style={{ marginBottom: 20 }}>
          <label className="label">Role</label>
          <select className="input" value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="candidate">Candidate</option>
            <option value="hr">HR</option>
          </select>
        </div>
      )}
      <button className="btn-primary" onClick={submit} disabled={saving}>
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPANIES TAB
═══════════════════════════════════════════════════════════════ */
function CompaniesTab() {
  const [companies, setCompanies] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("");
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filter === "verified")   params.is_verified = "true";
      if (filter === "unverified") params.is_verified = "false";
      const r = await getCompanies(params);
      setCompanies(r.data || []);
    } catch { show("Failed to load", "error"); }
    finally   { setLoading(false); }
  }, [filter, search]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  async function handleVerify(c) {
    try {
      await toggleVerify(c.id);
      show(c.is_verified ? "Unverified" : "Verified ✓");
      load();
    } catch { show("Failed", "error"); }
  }

  async function handleDelete(c) {
    if (!window.confirm(`Remove "${c.company_name}" and close all its jobs?`)) return;
    try {
      await deleteCompany(c.id);
      show("Company removed");
      load();
    } catch { show("Failed", "error"); }
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
          { value: "", label: "All" },
          { value: "verified", label: "Verified" },
          { value: "unverified", label: "Pending" },
        ]}
        active={filter}
        onSelect={setFilter}
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
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>
                      {c.industry} · {c.city}, {c.state}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 1 }}>
                      HR: {c.hr_name} · {c.job_count} jobs
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <Badge type={c.is_verified ? "verified" : "unverified"} label={c.is_verified ? "Verified" : "Pending"} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                    <BtnSm
                      onClick={() => handleVerify(c)}
                      color={c.is_verified ? AMBER : GREEN}
                      bg={c.is_verified ? "rgba(245,158,11,.12)" : "rgba(45,184,125,.12)"}
                    >
                      {c.is_verified ? "Unverify" : "Verify"}
                    </BtnSm>
                    <BtnSm danger onClick={() => handleDelete(c)}>Remove</BtnSm>
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

/* ═══════════════════════════════════════════════════════════════
   JOBS TAB
═══════════════════════════════════════════════════════════════ */
function JobsTab() {
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("");
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filter) params.status = filter;
      const r = await getAdminJobs(params);
      setJobs(r.data || []);
    } catch { show("Failed to load", "error"); }
    finally   { setLoading(false); }
  }, [filter, search]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  async function handleStatus(job, status) {
    try {
      await setJobStatus(job.id, status);
      show(`Job marked as ${status}`);
      load();
    } catch { show("Failed", "error"); }
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
        active={filter}
        onSelect={setFilter}
      />
      {loading ? <Spinner /> : (
        <Card>
          {jobs.length === 0
            ? <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>No jobs found</div>
            : jobs.map((j, i) => (
              <div key={j.id} style={{ padding: "11px 14px", borderBottom: i < jobs.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {j.title}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>
                      {j.company_name} · {j.city}
                    </div>
                    <div style={{ display: "flex", gap: 5, marginTop: 6, alignItems: "center" }}>
                      <Badge type={j.status} />
                      <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{j.applicants} applicants</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                    {j.status !== "active" && (
                      <BtnSm onClick={() => handleStatus(j, "active")} color={GREEN} bg="rgba(45,184,125,.12)">Activate</BtnSm>
                    )}
                    {j.status !== "closed" && (
                      <BtnSm danger onClick={() => handleStatus(j, "closed")}>Close</BtnSm>
                    )}
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

/* ═══════════════════════════════════════════════════════════════
   REPORTS TAB
═══════════════════════════════════════════════════════════════ */
function ReportsTab() {
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("open");
  const [resolving,setResolving]= useState(null);
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
    try {
      await updateReport(id, { status, admin_note: note || null });
      show(`Report marked as ${status}`);
      setResolving(null);
      load();
    } catch { show("Failed", "error"); }
  }

  const TYPE_LABELS = {
    scam_job: "Scam Job", fake_company: "Fake Company",
    candidate_fraud: "Fraud", bug: "Bug", other: "Other",
  };

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
        active={filter}
        onSelect={setFilter}
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
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: PINK, textTransform: "uppercase" }}>
                      {TYPE_LABELS[r.report_type] || r.report_type}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 4 }}>{r.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5, marginBottom: 8 }}>
                    {r.description}
                  </div>
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
        <ReportNoteModal
          status={resolving.status}
          onClose={() => setResolving(null)}
          onSave={note => handleUpdate(resolving.id, resolving.status, note)}
        />
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
        <textarea
          className="input"
          rows={3}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note about this report…"
          style={{ resize: "vertical" }}
        />
      </div>
      <button className="btn-primary" onClick={() => onSave(note)}>
        Confirm
      </button>
    </Modal>
  );
}

/* ── Toast notification ── */
function Toast({ msg, type }) {
  return (
    <div style={{
      position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)",
      zIndex: 300, padding: "10px 18px", borderRadius: 10,
      fontSize: "0.82rem", fontWeight: 600,
      background: type === "error" ? "#3d1a1a" : "#1a3d2b",
      color: type === "error" ? RED : GREEN,
      border: `1px solid ${type === "error" ? RED : GREEN}`,
      boxShadow: "0 4px 20px rgba(0,0,0,.2)",
      whiteSpace: "nowrap",
    }}>{msg}</div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { logout } = useAuth();

  return (
    <>
      <TopBar title="Admin Panel" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 0px) 0 calc(var(--nav-height) + 16px)" }}>

        {/* Tab bar */}
        <div style={{
          display: "flex", overflowX: "auto", borderBottom: "1px solid var(--border)",
          background: "var(--card)", paddingBottom: 0,
          scrollbarWidth: "none", position: "sticky", top: 0, zIndex: 10,
          alignItems: "center",
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              flexShrink: 0,
              padding: "10px 14px",
              border: "none",
              borderBottom: activeTab === t.id ? `2.5px solid ${PINK}` : "2.5px solid transparent",
              background: "none",
              cursor: "pointer",
              fontSize: "0.78rem",
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? PINK : "var(--muted)",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <TabIcon id={t.id} />
              {t.label}
            </button>
          ))}
          {/* Logout button pinned to end */}
          <button onClick={logout} style={{
            flexShrink: 0, marginLeft: "auto",
            padding: "10px 14px",
            border: "none", borderBottom: "2.5px solid transparent",
            background: "none", cursor: "pointer",
            fontSize: "0.78rem", fontWeight: 500, color: RED,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>

        {/* Tab content */}
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