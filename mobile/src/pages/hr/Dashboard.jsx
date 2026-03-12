import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar     from "../../components/TopBar";
import Spinner    from "../../components/Spinner";
import EmptyState from "../../components/EmptyState";
import { getHRDashboard, getHRJobs, deleteJob, updateJobStatus, updateJob } from "../../api/hr";
import { useAuth } from "../../context/AuthContext";

const JOB_TYPES  = ["full-time", "part-time", "contract", "internship"];
const WORK_MODES = ["onsite", "remote", "hybrid"];

const STATUS = {
  active: { bg: "rgba(45,158,107,.12)", color: "#1a7a4a" },
  closed: { bg: "rgba(220,53,53,.10)",  color: "#c0392b" },
  draft:  { bg: "rgba(130,130,130,.1)", color: "#777"    },
};

/* ── Tiny action button ── */
function Btn({ onClick, variant = "ghost", children, flex }) {
  const V = {
    ghost:   { bg: "var(--bg)",              color: "var(--muted)", border: "1px solid var(--border)"         },
    primary: { bg: "var(--pink-light)",       color: "var(--pink)",  border: "1px solid #f0b8d9"              },
    blue:    { bg: "rgba(59,130,246,.09)",    color: "#2563eb",      border: "1px solid rgba(59,130,246,.2)"  },
    success: { bg: "rgba(45,158,107,.10)",    color: "#1a7a4a",      border: "1px solid rgba(45,158,107,.22)" },
    danger:  { bg: "rgba(220,53,53,.08)",     color: "#c0392b",      border: "1px solid rgba(220,53,53,.18)"  },
  }[variant] || {};
  return (
    <button onClick={onClick} style={{
      flex: flex ? 1 : undefined,
      padding: "5px 10px",
      background: V.bg, color: V.color, border: V.border,
      borderRadius: 6, fontSize: "0.72rem", fontWeight: 600,
      cursor: "pointer", whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

/* ── Toast ── */
function Toast({ msg, type }) {
  return (
    <div style={{
      position: "fixed", top: 66, left: "50%", transform: "translateX(-50%)",
      zIndex: 300, padding: "8px 16px", borderRadius: 8,
      fontSize: "0.8rem", fontWeight: 600, whiteSpace: "nowrap",
      background: type === "error" ? "#3d1a1a" : "#1a3d2b",
      color: type === "error" ? "#e03c3c" : "#2d9e6b",
      border: `1px solid ${type === "error" ? "#e03c3c" : "#2d9e6b"}`,
      boxShadow: "0 4px 20px rgba(0,0,0,.2)",
    }}>{msg}</div>
  );
}

/* ── Confirm delete sheet ── */
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <>
      <div className="overlay" onClick={onCancel} style={{ zIndex: 200 }} />
      <div style={{
        position: "fixed", inset: "auto 0 0 0", zIndex: 201,
        background: "var(--card)", borderRadius: "16px 16px 0 0",
        padding: "22px 18px 36px", boxShadow: "0 -4px 32px rgba(0,0,0,.12)",
      }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem", marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 22, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: 11, background: "none",
            border: "1px solid var(--border)", borderRadius: 8,
            fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", color: "var(--muted)",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: 11, background: "#c0392b",
            border: "none", borderRadius: 8, color: "#fff",
            fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
          }}>Delete</button>
        </div>
      </div>
    </>
  );
}

/* ── Edit job bottom sheet ── */
function EditJobModal({ job, onClose, onSave }) {
  const [form, setForm] = useState({
    title:       job.title       || "",
    job_type:    job.job_type    || "",
    work_mode:   job.work_mode   || "",
    city:        job.city        || "",
    salary_min:  job.salary_min  || "",
    salary_max:  job.salary_max  || "",
    description: job.description || "",
    openings:    job.openings    || 1,
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  async function submit() {
    if (!form.title.trim()) { setErr("Title is required"); return; }
    setSaving(true); setErr("");
    try {
      await onSave(job.id, {
        ...form,
        openings:   parseInt(form.openings) || 1,
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
      });
    } catch (e) { setErr(e.message || "Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex: 200 }} />
      <div style={{
        position: "fixed", inset: "auto 0 0 0", zIndex: 201,
        background: "var(--card)", borderRadius: "20px 20px 0 0",
        padding: "16px 16px 36px", maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 -4px 32px rgba(0,0,0,.12)",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem" }}>Edit Job</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", color: "var(--muted)", cursor: "pointer" }}>×</button>
        </div>

        {err && (
          <div style={{ fontSize: "0.78rem", color: "#c0392b", marginBottom: 10, padding: "7px 10px", background: "rgba(220,53,53,.07)", borderRadius: 6 }}>{err}</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label className="label">Job Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="label">Job Type</label>
              <select className="input" value={form.job_type} onChange={e => setForm(f => ({ ...f, job_type: e.target.value }))}>
                <option value="">Select</option>
                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Work Mode</label>
              <select className="input" value={form.work_mode} onChange={e => setForm(f => ({ ...f, work_mode: e.target.value }))}>
                <option value="">Select</option>
                {WORK_MODES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label className="label">Openings</label>
              <input className="input" type="number" min="1" value={form.openings} onChange={e => setForm(f => ({ ...f, openings: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="label">Salary Min (₹)</label>
              <input className="input" type="number" value={form.salary_min} onChange={e => setForm(f => ({ ...f, salary_min: e.target.value }))} />
            </div>
            <div>
              <label className="label">Salary Max (₹)</label>
              <input className="input" type="number" value={form.salary_max} onChange={e => setForm(f => ({ ...f, salary_max: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ resize: "vertical" }} />
          </div>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════ */
export default function HRDashboard() {
  const [dash,    setDash]    = useState(null);
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toast,   setToast]   = useState(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function load() {
    setLoading(true);
    try {
      const [d, j] = await Promise.all([getHRDashboard(), getHRJobs()]);
      setDash(d.data);
      setJobs(j.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleDelete(job) {
    try {
      await deleteJob(job.id);
      setJobs(prev => prev.filter(j => j.id !== job.id));
      setConfirm(null);
      showToast("Job deleted");
    } catch (e) { showToast(e.message, "error"); }
  }

  async function handleStatusToggle(job) {
    const next = job.status === "active" ? "closed" : "active";
    try {
      await updateJobStatus(job.id, next);
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: next } : j));
      showToast(`Job ${next}`);
    } catch (e) { showToast(e.message, "error"); }
  }

  async function handleEditSave(id, form) {
    await updateJob(id, form);
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...form } : j));
    setEditing(null);
    showToast("Job updated");
  }

  if (loading) return (
    <>
      <TopBar title="Dashboard" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 12px) 14px calc(var(--nav-height) + 14px)" }}>
        {/* Company strip skeleton */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--border)", flexShrink: 0, animation: "pulse 1.4s ease-in-out infinite" }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 12, borderRadius: 6, background: "var(--border)", marginBottom: 6, width: "55%", animation: "pulse 1.4s ease-in-out infinite" }} />
            <div style={{ height: 10, borderRadius: 6, background: "var(--border)", width: "35%", animation: "pulse 1.4s ease-in-out infinite" }} />
          </div>
        </div>
        {/* Stats skeleton */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", height: 52, animation: "pulse 1.4s ease-in-out infinite" }} />
          ))}
        </div>
        {/* Job cards skeleton */}
        {[0,1,2].map(i => (
          <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ height: 13, borderRadius: 6, background: "var(--border)", width: "60%", marginBottom: 8, animation: "pulse 1.4s ease-in-out infinite" }} />
            <div style={{ height: 10, borderRadius: 6, background: "var(--border)", width: "40%", marginBottom: 12, animation: "pulse 1.4s ease-in-out infinite" }} />
            <div style={{ display: "flex", gap: 6 }}>
              {[0,1,2].map(j => (
                <div key={j} style={{ height: 26, borderRadius: 6, background: "var(--border)", flex: 1, animation: "pulse 1.4s ease-in-out infinite" }} />
              ))}
            </div>
          </div>
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      </div>
    </>
  );

  if (!dash?.company_exists) return (
    <>
      <TopBar title="Dashboard" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 16px) 16px calc(var(--nav-height) + 20px)" }}>
        <EmptyState
          icon="empty-jobs.png"
          title="Set up your company"
          subtitle="Create your company profile before posting jobs"
          action={
            <button className="btn-primary" style={{ width: "auto", padding: "10px 24px", marginTop: 8 }}
              onClick={() => navigate("/hr/post-job")}>Create Company Profile</button>
          }
        />
      </div>
    </>
  );

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 12px) 14px calc(var(--nav-height) + 14px)" }}>

        {toast && <Toast {...toast} />}

        {/* ── Company strip ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "10px 12px", marginBottom: 10,
        }}>
          {dash.logo_url ? (
            <img src={dash.logo_url} style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--pink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                {(dash.company_name || "?").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dash.company_name}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 1 }}>{dash.industry}{dash.city ? ` · ${dash.city}` : ""}</div>
          </div>
          {dash.is_verified && (
            <span style={{ fontSize: "0.62rem", color: "#1a7a4a", fontWeight: 700, background: "rgba(45,158,107,.1)", padding: "2px 7px", borderRadius: 999, flexShrink: 0, border: "1px solid rgba(45,158,107,.2)" }}>✓ Verified</span>
          )}
        </div>

        {/* ── Stats 2×2 grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Total Jobs",   value: dash.total_jobs       },
            { label: "Active",       value: dash.active_jobs      },
            { label: "Applicants",   value: dash.total_applicants },
            { label: "Shortlisted",  value: dash.shortlisted      },
          ].map(s => (
            <div key={s.label} style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", color: "var(--pink)", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px", lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Jobs header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Your Jobs</span>
          <button onClick={() => navigate("/hr/post-job")} style={{
            padding: "6px 13px", background: "var(--pink)", color: "#fff",
            border: "none", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
          }}>+ Post Job</button>
        </div>

        {/* ── Job cards ── */}
        {jobs.length === 0 ? (
          <EmptyState icon="empty-jobs.png" title="No jobs posted yet" subtitle="Post your first job to start receiving applications" />
        ) : (
          jobs.map(job => (
            <div key={job.id} style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "10px 12px", marginBottom: 8,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.86rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.title}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>
                    {job.city}{job.work_mode ? ` · ${job.work_mode}` : ""} · {job.applicant_count} applicant{job.applicant_count !== 1 ? "s" : ""}
                  </div>
                </div>
                <span style={{
                  flexShrink: 0, padding: "2px 8px", borderRadius: 999,
                  fontSize: "0.62rem", fontWeight: 700, textTransform: "capitalize",
                  background: STATUS[job.status]?.bg || "rgba(130,130,130,.1)",
                  color:      STATUS[job.status]?.color || "#777",
                }}>{job.status}</span>
              </div>

              <div style={{ display: "flex", gap: 6, marginTop: 9, alignItems: "center" }}>
                <Btn variant="primary" flex onClick={() => navigate(`/hr/applicants/${job.id}`)}>Applicants</Btn>
                <Btn variant="blue"        onClick={() => setEditing(job)}>Edit</Btn>
                <Btn variant={job.status === "active" ? "ghost" : "success"} onClick={() => handleStatusToggle(job)}>
                  {job.status === "active" ? "Close" : "Activate"}
                </Btn>
                {/* Trash icon delete */}
                <button onClick={() => setConfirm(job)} style={{
                  padding: "5px 8px", background: "rgba(220,53,53,.08)", border: "1px solid rgba(220,53,53,.2)",
                  borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#c0392b",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}

        {/* ── Logout ── */}
        <button onClick={logout} style={{
          width: "100%", padding: "10px 14px", marginTop: 14,
          background: "rgba(220,53,53,.06)", border: "1px solid rgba(220,53,53,.2)",
          borderRadius: 8, color: "#c0392b", fontWeight: 600,
          fontSize: "0.82rem", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Log out
        </button>

      </div>

      {confirm && (
        <ConfirmModal
          title="Delete Job"
          message={`Delete "${confirm.title}"? This cannot be undone.`}
          onConfirm={() => handleDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {editing && (
        <EditJobModal
          job={editing}
          onClose={() => setEditing(null)}
          onSave={handleEditSave}
        />
      )}
    </>
  );
}