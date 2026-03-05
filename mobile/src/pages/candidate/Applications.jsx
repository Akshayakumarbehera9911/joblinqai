import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar     from "../../components/TopBar";
import Spinner    from "../../components/Spinner";
import EmptyState from "../../components/EmptyState";
import { getApplications } from "../../api/candidate";

const FILTERS = ["all", "applied", "viewed", "shortlisted", "rejected"];

const STATUS_STEPS = ["applied", "viewed", "shortlisted"];

const STATUS_COLORS = {
  applied:     { bg: "#f0f0f0", color: "#555" },
  viewed:      { bg: "#fffbeb", color: "var(--gold)" },
  shortlisted: { bg: "#e8f5e9", color: "var(--green)" },
  rejected:    { bg: "#fdecea", color: "var(--red)" },
};

function formatSalary(min, max) {
  if (!min && !max) return null;
  const fmt = v => v >= 100000 ? `₹${(v/100000).toFixed(0)}L` : `₹${(v/1000).toFixed(0)}K`;
  if (min && max) return `${fmt(min)}–${fmt(max)}/mo`;
  if (min) return `${fmt(min)}+/mo`;
  return `Up to ${fmt(max)}/mo`;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function CandidateApplications() {
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    getApplications()
      .then(res => setApps(res.data || []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? apps : apps.filter(a => a.status === filter);

  return (
    <>
      <TopBar title="My Applications" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 12px) 16px calc(var(--nav-height) + 20px)" }}>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", marginBottom: "16px" }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              flexShrink: 0, padding: "6px 14px",
              border: `1.5px solid ${filter === f ? "var(--pink)" : "var(--border)"}`,
              borderRadius: "999px",
              background: filter === f ? "var(--pink-light)" : "var(--card)",
              color: filter === f ? "var(--pink)" : "var(--muted)",
              fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
            }}>{f}</button>
          ))}
        </div>

        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState
            icon={filter === "all" ? "empty-apply.png" : "empty-filter.png"}
            title={filter === "all" ? "No applications yet" : `No ${filter} applications`}
            subtitle={filter === "all" ? "Start applying to jobs" : "Try a different filter"}
            action={filter === "all" && (
              <button className="btn-primary" style={{ width: "auto", padding: "10px 24px", marginTop: "8px" }}
                onClick={() => navigate("/jobs")}>
                Browse Jobs
              </button>
            )}
          />
        ) : (
          filtered.map(app => (
            <AppCard key={app.application_id} app={app} navigate={navigate} />
          ))
        )}
      </div>
    </>
  );
}

function AppCard({ app, navigate }) {
  const salary  = formatSalary(app.salary_min, app.salary_max);
  const date    = formatDate(app.applied_at);
  const isRejected = app.status === "rejected";
  const sc = STATUS_COLORS[app.status] || STATUS_COLORS.applied;

  // Step index for progress bar
  const stepIndex = STATUS_STEPS.indexOf(app.status);

  return (
    <div className="card" style={{ marginBottom: "12px" }}>
      {/* Title + company */}
      <div style={{ fontFamily: "var(--font-serif)", fontSize: "1rem", marginBottom: "3px" }}>{app.job_title}</div>
      <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "8px" }}>{app.company_name}</div>

      {/* Tags row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
        {app.city && (
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>📍 {app.city}</span>
        )}
        {app.work_mode && (
          <span style={{
            padding: "2px 8px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600,
            background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)",
          }}>{app.work_mode}</span>
        )}
        {app.job_type && (
          <span style={{
            padding: "2px 8px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600,
            background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)",
          }}>{app.job_type}</span>
        )}
        {salary && (
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--pink)" }}>{salary}</span>
        )}
      </div>

      {/* Applied date */}
      {date && (
        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "12px" }}>
          Applied on {date}
        </div>
      )}

      {/* Status — rejected shows badge, otherwise show step progress */}
      {isRejected ? (
        <div style={{ marginBottom: "12px" }}>
          <span style={{
            padding: "4px 12px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700,
            background: sc.bg, color: sc.color,
          }}>Rejected</span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "12px" }}>
          {STATUS_STEPS.map((step, i) => {
            const done    = i <= stepIndex;
            const current = i === stepIndex;
            return (
              <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STATUS_STEPS.length - 1 ? 1 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: done ? "var(--green)" : "var(--bg)",
                    border: `2px solid ${done ? "var(--green)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.6rem", color: "#fff", fontWeight: 700,
                    boxShadow: current ? "0 0 0 3px #e8f5e9" : "none",
                  }}>
                    {done ? "✓" : "●"}
                  </div>
                  <span style={{ fontSize: "0.62rem", color: done ? "var(--green)" : "var(--muted)", fontWeight: done ? 700 : 400, whiteSpace: "nowrap" }}>
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, marginBottom: "14px",
                    background: i < stepIndex ? "var(--green)" : "var(--border)",
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* View job link */}
      <div onClick={() => navigate(`/jobs/${app.job_id}`)} style={{
        fontSize: "0.82rem", fontWeight: 700, color: "var(--pink)", cursor: "pointer",
      }}>View Job →</div>
    </div>
  );
}