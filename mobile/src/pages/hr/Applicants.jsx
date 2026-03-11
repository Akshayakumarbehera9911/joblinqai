import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import TopBar     from "../../components/TopBar";
import Spinner    from "../../components/Spinner";
import ScoreRing  from "../../components/ScoreRing";
import EmptyState from "../../components/EmptyState";
import { getApplicants, updateAppStatus } from "../../api/hr";

const STATUS_COLORS = {
  applied:     { bg: "#f0f0f0",  color: "#555" },
  viewed:      { bg: "#EEF4FF",  color: "#3B5BDB" },
  shortlisted: { bg: "#e8f5e9",  color: "var(--green)" },
  rejected:    { bg: "#fdecea",  color: "var(--red)" },
  withdrawn:   { bg: "#f5f5f0",  color: "#aaa" },
};

function Pill({ label }) {
  const sc = STATUS_COLORS[label] || { bg: "#f0f0f0", color: "#555" };
  return (
    <span style={{
      padding: "2px 9px", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 700,
      background: sc.bg, color: sc.color, textTransform: "capitalize",
    }}>{label}</span>
  );
}

function ActionBtn({ label, color, textColor = "#fff", onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "5px 14px", borderRadius: "999px", border: "none",
      background: color, color: textColor,
      fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
      opacity: disabled ? 0.55 : 1, fontFamily: "inherit",
      transition: "opacity .15s",
    }}>{label}</button>
  );
}

export default function HRApplicants() {
  const { id } = useParams();
  const [applicants, setApplicants] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState("all");
  const [selected,   setSelected]   = useState(null);
  const [updating,   setUpdating]   = useState(false);

  useEffect(() => { fetchApplicants(); }, [id]);

  async function fetchApplicants() {
    try {
      const res = await getApplicants(id);
      setApplicants(res.data || []);
    } catch { setApplicants([]); }
    finally { setLoading(false); }
  }

  async function openModal(app) {
    setSelected(app);
    if (app.status === "applied") {
      try {
        await updateAppStatus(app.application_id, "viewed");
        const updated = { ...app, status: "viewed" };
        setApplicants(prev => prev.map(a => a.application_id === app.application_id ? updated : a));
        setSelected(updated);
      } catch {}
    }
  }

  async function handleAction(appId, status) {
    setUpdating(true);
    try {
      await updateAppStatus(appId, status);
      const res = await getApplicants(id);
      const fresh = (res.data || []).find(a => a.application_id === appId);
      setApplicants(res.data || []);
      if (fresh) setSelected(fresh);
    } catch (e) { alert(e.message); }
    finally { setUpdating(false); }
  }

  const filtered = filter === "all" ? applicants : applicants.filter(a => a.status === filter);

  return (
    <>
      <TopBar title="Applicants" back backTo="/hr/dashboard" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 12px) 16px calc(var(--nav-height) + 20px)" }}>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", marginBottom: "14px" }}>
          {["all","applied","viewed","shortlisted","rejected"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              flexShrink: 0, padding: "5px 13px",
              border: `1.5px solid ${filter === f ? "var(--pink)" : "var(--border)"}`,
              borderRadius: "999px",
              background: filter === f ? "var(--pink-light)" : "var(--card)",
              color: filter === f ? "var(--pink)" : "var(--muted)",
              fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
              textTransform: "capitalize", fontFamily: "inherit",
            }}>{f}</button>
          ))}
        </div>

        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState icon="empty-applicants.png" title="No applicants yet" subtitle="Share your job to get applications" />
        ) : filtered.map((app, i) => (
          <div key={app.application_id} className="card" style={{ marginBottom: "8px", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Rank */}
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: i === 0 ? "var(--gold)" : i === 1 ? "#adb5bd" : i === 2 ? "#cd7f32" : "var(--bg)",
                border: i > 2 ? "1.5px solid var(--border)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "0.72rem",
                color: i < 3 ? "#fff" : "var(--muted)",
              }}>{i + 1}</div>

              {/* Avatar */}
              <img
                src={app.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.full_name)}&background=E8398A&color=fff`}
                style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }}
                onError={e => e.target.src = `https://ui-avatars.com/api/?name=U&background=E8398A&color=fff`}
              />

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.full_name}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: "1px" }}>
                  {[app.city, app.experience ? `${app.experience} exp` : null].filter(Boolean).join(" · ")}
                </div>
              </div>

              <ScoreRing score={app.match_score} size={40} strokeWidth={3.5} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <Pill label={app.status} />
              <ActionBtn label="View" color="var(--pink)" onClick={() => openModal(app)} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom sheet modal ── */}
      {selected && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "flex-end" }}
        >
          <div style={{
            background: "var(--card)", borderRadius: "14px 14px 0 0",
            width: "100%", maxHeight: "78vh", overflowY: "auto",
            paddingBottom: "28px",
          }}>
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}>
              <div style={{ width: 32, height: 3.5, borderRadius: 2, background: "var(--border)" }} />
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px 12px", borderBottom: "1px solid var(--border)" }}>
              <img
                src={selected.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selected.full_name)}&background=E8398A&color=fff`}
                style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }}
                onError={e => e.target.src = `https://ui-avatars.com/api/?name=U&background=E8398A&color=fff`}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{selected.full_name}</div>
                {selected.target_role && (
                  <div style={{ fontSize: "0.73rem", color: "var(--muted)", marginTop: "1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selected.target_role}</div>
                )}
                <div style={{ marginTop: "4px" }}><Pill label={selected.status} /></div>
              </div>
              <ScoreRing score={selected.match_score} size={44} strokeWidth={4} />
            </div>

            {/* Info list */}
            <div style={{ padding: "0 16px" }}>
              {[
                ["📍", "Location",     selected.city],
                ["💼", "Experience",   selected.experience],
                ["🕐", "Availability", selected.availability],
              ].filter(([,,v]) => v).map(([icon, label, val]) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 0", borderBottom: "1px solid var(--border)",
                }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{icon} {label}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div style={{ padding: "10px 16px" }}>
              {selected.status === "shortlisted" && (selected.email || selected.phone) ? (
                <div style={{ background: "var(--pink-light)", border: "1px solid #f8c5e0", borderRadius: "8px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--pink)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "5px" }}>Contact Details</div>
                  {selected.email && <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>📧 {selected.email}</div>}
                  {selected.phone && <div style={{ fontSize: "0.82rem", fontWeight: 600, marginTop: "3px" }}>📞 {selected.phone}</div>}
                </div>
              ) : selected.status !== "shortlisted" && selected.status !== "withdrawn" ? (
                <div style={{ background: "var(--bg)", borderRadius: "8px", padding: "9px 12px", fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>
                  Shortlist to reveal contact details
                </div>
              ) : null}
            </div>

            {/* Action buttons */}
            {selected.status !== "withdrawn" && (
              <div style={{ display: "flex", gap: "8px", padding: "4px 16px 0" }}>
                {selected.status !== "shortlisted" && (
                  <ActionBtn
                    label={updating ? "…" : "✓ Shortlist"}
                    color="var(--green)"
                    onClick={() => handleAction(selected.application_id, "shortlisted")}
                    disabled={updating}
                  />
                )}
                {selected.status !== "rejected" && (
                  <ActionBtn
                    label={updating ? "…" : "✗ Reject"}
                    color="var(--red)"
                    onClick={() => handleAction(selected.application_id, "rejected")}
                    disabled={updating}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}