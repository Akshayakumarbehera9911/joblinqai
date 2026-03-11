import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar     from "../../components/TopBar";
import Spinner    from "../../components/Spinner";
import EmptyState from "../../components/EmptyState";
import { getApplications, withdrawApplication } from "../../api/candidate";

const FILTERS = ["all", "applied", "viewed", "shortlisted", "rejected", "withdrawn"];

const STATUS_STEPS = ["applied", "viewed", "shortlisted"];

const STATUS_COLORS = {
  applied:     { bg: "#f0f0f0",  color: "#555" },
  viewed:      { bg: "#fffbeb",  color: "var(--gold)" },
  shortlisted: { bg: "#e8f5e9",  color: "var(--green)" },
  rejected:    { bg: "#fdecea",  color: "var(--red)" },
  withdrawn:   { bg: "#f5f5f5",  color: "#999" },
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

  async function handleWithdraw(app) {
    if (!window.confirm(`Withdraw your application for "${app.job_title}"? You cannot reapply.`)) return;
    try {
      await withdrawApplication(app.application_id);
      setApps(prev => prev.map(a =>
        a.application_id === app.application_id ? { ...a, status: "withdrawn" } : a
      ));
    } catch (e) {
      alert(e.message || "Failed to withdraw application");
    }
  }

  return (
    <>
      <TopBar title="My Applications" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 16px) 14px calc(var(--nav-height) + 24px)" }}>

        {/* Filter tabs */}
        <div style={{
          display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "6px",
          marginBottom: "18px", scrollbarWidth: "none", msOverflowStyle: "none",
        }}>
          {FILTERS.map(f => {
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                flexShrink: 0,
                padding: "6px 16px",
                border: `1.5px solid ${active ? "var(--pink)" : "var(--border)"}`,
                borderRadius: "999px",
                background: active ? "var(--pink-light)" : "var(--card)",
                color: active ? "var(--pink)" : "var(--muted)",
                fontSize: "0.78rem",
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                textTransform: "capitalize",
                letterSpacing: "0.01em",
                transition: "border-color 0.15s, background 0.15s, color 0.15s",
              }}>{f}</button>
            );
          })}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map(app => (
              <AppCard key={app.application_id} app={app} navigate={navigate} onWithdraw={handleWithdraw} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function AppCard({ app, navigate, onWithdraw }) {
  const salary     = formatSalary(app.salary_min, app.salary_max);
  const date       = formatDate(app.applied_at);
  const isRejected  = app.status === "rejected";
  const isWithdrawn = app.status === "withdrawn";
  const sc         = STATUS_COLORS[app.status] || STATUS_COLORS.applied;
  const stepIndex  = STATUS_STEPS.indexOf(app.status);

  return (
    <div className="card" style={{ borderRadius: "14px", padding: "14px 14px 12px", overflow: "hidden" }}>

      {/* Header – title + status badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "2px" }}>
        <div style={{
          fontFamily: "var(--font-serif)", fontSize: "0.97rem", fontWeight: 600,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
        }}>
          {app.job_title}
        </div>
        <span style={{
          flexShrink: 0,
          padding: "3px 10px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700,
          background: sc.bg, color: sc.color, textTransform: "capitalize", letterSpacing: "0.02em",
        }}>
          {app.status}
        </span>
      </div>

      {/* Company */}
      <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "10px", fontWeight: 500 }}>
        {app.company_name}
      </div>

      {/* Tags row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
        {app.city && (
          <span style={{ fontSize: "0.73rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "2px" }}>
            📍 {app.city}
          </span>
        )}
        {app.work_mode && (
          <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)" }}>
            {app.work_mode}
          </span>
        )}
        {app.job_type && (
          <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)" }}>
            {app.job_type}
          </span>
        )}
        {salary && (
          <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "var(--pink)" }}>{salary}</span>
        )}
      </div>

      {/* Applied date */}
      {date && (
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "12px", opacity: 0.8 }}>
          Applied {date}
        </div>
      )}

      <div style={{ height: "1px", background: "var(--border)", marginBottom: "12px", opacity: 0.6 }} />

      {/* Status section */}
      {isWithdrawn ? (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px",
          padding: "8px 10px", borderRadius: "8px", background: "#f5f5f5",
        }}>
          <span style={{ fontSize: "0.9rem" }}>↩</span>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#999" }}>
            You withdrew this application
          </span>
        </div>
      ) : isRejected ? (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px",
          padding: "8px 10px", borderRadius: "8px", background: sc.bg,
        }}>
          <span style={{ fontSize: "0.9rem" }}>✕</span>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: sc.color }}>
            Application not moved forward
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
          {STATUS_STEPS.map((step, i) => {
            const done    = i <= stepIndex;
            const current = i === stepIndex;
            return (
              <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STATUS_STEPS.length - 1 ? 1 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: done ? "var(--green)" : "var(--bg)",
                    border: `2px solid ${done ? "var(--green)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.58rem", color: "#fff", fontWeight: 800,
                    boxShadow: current ? "0 0 0 3px #e8f5e9" : "none",
                    transition: "background 0.2s, border-color 0.2s",
                  }}>
                    {done ? "✓" : ""}
                  </div>
                  <span style={{
                    fontSize: "0.6rem", fontWeight: done ? 700 : 400,
                    color: done ? "var(--green)" : "var(--muted)",
                    whiteSpace: "nowrap", letterSpacing: "0.01em",
                  }}>
                    {step.charAt(0).toUpperCase() + step.slice(1)}
                  </span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, marginBottom: "14px",
                    background: i < stepIndex ? "var(--green)" : "var(--border)",
                    borderRadius: "999px", transition: "background 0.2s",
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer – View Job + Withdraw */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          onClick={() => navigate(`/jobs/${app.job_id}`)}
          style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8rem", fontWeight: 700, color: "var(--pink)", cursor: "pointer" }}
        >
          View Job <span style={{ fontSize: "0.85rem" }}>→</span>
        </div>

        {/* Withdraw button — only for "applied" status */}
        {app.status === "applied" && (
          <button
            onClick={() => onWithdraw(app)}
            style={{
              background: "none", border: "1.5px solid #ddd", borderRadius: "999px",
              padding: "4px 12px", fontSize: "0.72rem", fontWeight: 600,
              color: "#999", cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.target.style.borderColor = "var(--red)"; e.target.style.color = "var(--red)"; }}
            onMouseLeave={e => { e.target.style.borderColor = "#ddd"; e.target.style.color = "#999"; }}
          >
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
}