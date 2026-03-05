import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopBar     from "../../components/TopBar";
import Spinner    from "../../components/Spinner";
import ScoreRing  from "../../components/ScoreRing";
import EmptyState from "../../components/EmptyState";
import { getApplicants, updateAppStatus } from "../../api/hr";

const STATUS_OPTIONS = ["viewed", "shortlisted", "rejected"];
const STATUS_COLORS  = {
  applied:     { bg: "#f0f0f0",  color: "#555" },
  viewed:      { bg: "#fffbeb",  color: "var(--gold)" },
  shortlisted: { bg: "#e8f5e9",  color: "var(--green)" },
  rejected:    { bg: "#fdecea",  color: "var(--red)" },
};

export default function HRApplicants() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [updating,   setUpdating]   = useState(null);
  const [filter,     setFilter]     = useState("all");

  useEffect(() => {
    getApplicants(id)
      .then(res => setApplicants(res.data || []))
      .catch(() => setApplicants([]))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatus(appId, status) {
    setUpdating(appId);
    try {
      await updateAppStatus(appId, status);
      setApplicants(prev => prev.map(a => a.application_id === appId ? { ...a, status } : a));
    } catch (e) { alert(e.message); }
    finally { setUpdating(null); }
  }

  const filtered = filter === "all" ? applicants : applicants.filter(a => a.status === filter);

  return (
    <>
      <TopBar title="Applicants" back backTo="/hr/dashboard" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 12px) 16px calc(var(--nav-height) + 20px)" }}>

        {/* Count + filter */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", marginBottom: "16px" }}>
          {["all", "applied", "viewed", "shortlisted", "rejected"].map(f => (
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
          <EmptyState icon="empty-applicants.png" title="No applicants yet" subtitle="Share your job to get applications" />
        ) : (
          filtered.map((app, i) => (
            <div key={app.application_id} className="card" style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                {/* Rank number */}
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                  background: i === 0 ? "var(--gold)" : i === 1 ? "#adb5bd" : i === 2 ? "#cd7f32" : "var(--bg)",
                  border: i > 2 ? "1.5px solid var(--border)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: "0.78rem",
                  color: i < 3 ? "#fff" : "var(--muted)",
                }}>{i + 1}</div>
                <img
                  src={app.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.full_name)}&background=E8398A&color=fff`}
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }}
                  onError={e => e.target.src = `https://ui-avatars.com/api/?name=U&background=E8398A&color=fff`}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{app.full_name}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    {app.city || ""}{app.experience != null ? ` · ${app.experience} yrs exp` : ""}
                  </div>
                </div>
                <ScoreRing score={app.match_score} size={48} strokeWidth={4} />
              </div>

              {/* Contact info (only if shortlisted) */}
              {app.status === "shortlisted" && (app.email || app.phone) && (
                <div style={{ background: "var(--pink-light)", border: "1px solid #f8c5e0", borderRadius: "var(--radius)", padding: "8px 12px", marginBottom: "10px", fontSize: "0.8rem" }}>
                  {app.email && <div>📧 {app.email}</div>}
                  {app.phone && <div style={{ marginTop: "2px" }}>📞 {app.phone}</div>}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{
                  padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700,
                  background: STATUS_COLORS[app.status]?.bg || "#f0f0f0",
                  color: STATUS_COLORS[app.status]?.color || "var(--muted)",
                  textTransform: "capitalize",
                }}>{app.status}</span>

                {/* Status update buttons */}
                <div style={{ display: "flex", gap: "6px" }}>
                  {STATUS_OPTIONS.filter(s => s !== app.status).map(s => (
                    <button key={s} onClick={() => handleStatus(app.application_id, s)}
                      disabled={updating === app.application_id}
                      style={{
                        padding: "5px 10px", fontSize: "0.72rem", fontWeight: 700,
                        border: "none", borderRadius: "999px", cursor: "pointer",
                        background: s === "shortlisted" ? "var(--green)" : s === "rejected" ? "var(--red)" : "var(--gold)",
                        color: "#fff", opacity: updating === app.application_id ? 0.6 : 1,
                        textTransform: "capitalize",
                      }}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}