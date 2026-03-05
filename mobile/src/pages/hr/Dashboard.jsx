import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar     from "../../components/TopBar";
import Spinner    from "../../components/Spinner";
import EmptyState from "../../components/EmptyState";
import { getHRDashboard, getHRJobs, deleteJob, updateJobStatus } from "../../api/hr";
import { useAuth } from "../../context/AuthContext";

const STATUS_COLORS = {
  active: { bg: "#e8f5e9", color: "var(--green)" },
  closed: { bg: "#fdecea", color: "var(--red)" },
  draft:  { bg: "#f0f0f0", color: "var(--muted)" },
};

export default function HRDashboard() {
  const [dash,    setDash]    = useState(null);
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [d, j] = await Promise.all([getHRDashboard(), getHRJobs()]);
      setDash(d.data);
      setJobs(j.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this job?")) return;
    try {
      await deleteJob(id);
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch (e) { alert(e.message); }
  }

  async function handleStatusToggle(job) {
    const next = job.status === "active" ? "closed" : "active";
    try {
      await updateJobStatus(job.id, next);
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: next } : j));
    } catch (e) { alert(e.message); }
  }

  if (loading) return (
    <>
      <TopBar title="HR Dashboard" />
      <div className="page"><Spinner /></div>
    </>
  );

  // No company yet — prompt to create
  if (!dash?.company_exists) return (
    <>
      <TopBar title="HR Dashboard" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 16px) 16px calc(var(--nav-height) + 20px)" }}>
        <EmptyState
          icon="empty-jobs.png"
          title="Set up your company"
          subtitle="Create your company profile before posting jobs"
          action={
            <button className="btn-primary" style={{ width: "auto", padding: "10px 24px", marginTop: "8px" }}
              onClick={() => navigate("/hr/post-job")}>
              Create Company Profile
            </button>
          }
        />
      </div>
    </>
  );

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 16px) 16px calc(var(--nav-height) + 20px)" }}>

        {/* Company header */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
          {dash.logo_url ? (
            <img src={dash.logo_url} style={{ width: 52, height: 52, borderRadius: "10px", objectFit: "cover", border: "1px solid var(--border)" }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: "10px", background: "var(--pink-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>🏢</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}>{dash.company_name}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{dash.industry}{dash.city ? ` · ${dash.city}` : ""}</div>
            {dash.is_verified && (
              <span style={{ fontSize: "0.72rem", color: "var(--green)", fontWeight: 700 }}>✓ Verified</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          {[
            { label: "Total Jobs",    value: dash.total_jobs },
            { label: "Active Jobs",   value: dash.active_jobs },
            { label: "Total Applied", value: dash.total_applicants },
            { label: "Shortlisted",   value: dash.shortlisted },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: "center", padding: "14px" }}>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", color: "var(--pink)" }}>{s.value}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Jobs list */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "1rem" }}>Your Jobs</div>
          <button onClick={() => navigate("/hr/post-job")} style={{
            padding: "7px 14px", background: "var(--pink)", color: "#fff",
            border: "none", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
          }}>+ Post Job</button>
        </div>

        {jobs.length === 0 ? (
          <EmptyState icon="empty-jobs.png" title="No jobs posted yet" subtitle="Post your first job to start receiving applications" />
        ) : (
          jobs.map(job => (
            <div key={job.id} className="card" style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                <div style={{ flex: 1, paddingRight: "8px" }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "0.98rem" }}>{job.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "2px" }}>
                    {job.city}{job.work_mode ? ` · ${job.work_mode}` : ""}
                  </div>
                </div>
                <span style={{
                  padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700,
                  background: STATUS_COLORS[job.status]?.bg || "#f0f0f0",
                  color: STATUS_COLORS[job.status]?.color || "var(--muted)",
                  textTransform: "capitalize",
                }}>{job.status}</span>
              </div>

              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "10px" }}>
                {job.applicant_count} applicant{job.applicant_count !== 1 ? "s" : ""}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => navigate(`/hr/applicants/${job.id}`)} style={{
                  flex: 1, padding: "8px", background: "var(--pink-light)", border: "1.5px solid #f8c5e0",
                  borderRadius: "var(--radius)", color: "var(--pink)", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
                }}>View Applicants</button>
                <button onClick={() => handleStatusToggle(job)} style={{
                  padding: "8px 12px", background: "var(--bg)", border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius)", color: "var(--muted)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                }}>{job.status === "active" ? "Close" : "Activate"}</button>
                <button onClick={() => handleDelete(job.id)} style={{
                  padding: "8px 12px", background: "#fdecea", border: "none",
                  borderRadius: "var(--radius)", color: "var(--red)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                }}>Delete</button>
              </div>
            </div>
          ))
        )}

        {/* Logout */}
        <button onClick={logout} style={{
          width: "100%", padding: "12px", marginTop: "16px",
          background: "none", border: "1.5px solid var(--border)",
          borderRadius: "999px", color: "var(--red)",
          fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
        }}>Logout</button>
      </div>
    </>
  );
}