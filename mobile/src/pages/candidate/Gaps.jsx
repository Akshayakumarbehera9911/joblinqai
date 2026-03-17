import { useState, useEffect } from "react";
import TopBar     from "../../components/TopBar";
import Spinner    from "../../components/Spinner";
import EmptyState from "../../components/EmptyState";
import { getDashboard } from "../../api/candidate";

const GAP_STYLE = {
  critical: { color: "#0A66C2", bg: "#E8F0FA", border: "#0A66C2", label: "Critical" },
  moderate: { color: "var(--black)", bg: "#f0f0ed",          border: "var(--border)", label: "Moderate" },
  minor:    { color: "var(--muted)", bg: "var(--bg)",        border: "var(--border)", label: "Minor" },
};

export default function Gaps() {
  const [gaps,    setGaps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await getDashboard();
        setGaps(res.data?.gaps || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const counts = {
    critical: gaps.filter(g => g.gap_level === "critical").length,
    moderate: gaps.filter(g => g.gap_level === "moderate").length,
    minor:    gaps.filter(g => g.gap_level === "minor").length,
  };

  const filtered = filter === "all" ? gaps : gaps.filter(g => g.gap_level === filter);

  return (
    <>
      <TopBar title="Skill Gaps" back backTo="/dashboard" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 16px) 16px calc(var(--nav-height) + 20px)" }}>

        {loading ? <Spinner /> : gaps.length === 0 ? (
          <EmptyState icon="empty-score.png" title="No gaps found" subtitle="Upload resume and re-analyze to see gaps" />
        ) : (
          <>
            {/* ── Filter tabs ── */}
            <div style={{ display: "flex", gap: 6, marginBottom: 18, overflowX: "auto" }}>
              {[
                { key: "all",      label: `All (${gaps.length})` },
                { key: "critical", label: `Critical (${counts.critical})` },
                { key: "moderate", label: `Moderate (${counts.moderate})` },
                { key: "minor",    label: `Minor (${counts.minor})` },
              ].map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
                  flexShrink: 0,
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  background: filter === tab.key ? "var(--black)" : "var(--card)",
                  color: filter === tab.key ? "#fff" : "var(--muted)",
                  border: `1.5px solid ${filter === tab.key ? "var(--black)" : "var(--border)"}`,
                }}>{tab.label}</button>
              ))}
            </div>

            {/* ── Gap grid ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {filtered.map((g, i) => {
                const s = GAP_STYLE[g.gap_level] || GAP_STYLE.minor;
                const isCritical = g.gap_level === "critical";
                return (
                  <div key={g.skill_name || i} style={{
                    background: "var(--card)",
                    border: `1.5px solid ${isCritical ? "#0A66C2" : "var(--border)"}`,
                    borderRadius: 12,
                    padding: "14px 12px",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    {/* Level badge */}
                    <span style={{
                      alignSelf: "flex-start",
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-sans)",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: isCritical ? "#0A66C2" : "var(--muted)",
                      background: isCritical ? "#E8F0FA" : "var(--bg)",
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: `1px solid ${isCritical ? "#0A66C2" : "var(--border)"}`,
                    }}>{s.label}</span>

                    {/* Skill name */}
                    <div style={{
                      fontFamily: "Plus Jakarta Sans, sans-serif",
                      fontSize: "0.95rem",
                      color: "var(--black)",
                      lineHeight: 1.2,
                      flex: 1,
                    }}>{g.skill_name}</div>

                    {/* Learn link */}
                    {g.udemy_link ? (
                      <a
                        href={g.udemy_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                          padding: "6px 0",
                          background: isCritical ? "#0A66C2" : "var(--black)",
                          color: "#fff",
                          borderRadius: 8,
                          textDecoration: "none",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        Learn
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                    ) : (
                      <div style={{
                        fontSize: "0.68rem", color: "var(--muted)",
                        fontFamily: "var(--font-sans)", textAlign: "center",
                      }}>No resource yet</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}