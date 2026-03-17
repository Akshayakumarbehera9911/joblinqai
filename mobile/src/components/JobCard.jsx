import { useNavigate } from "react-router-dom";

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff}d ago`;
}

function formatSalary(min, max) {
  if (!min && !max) return null;
  const fmt = n => n >= 100000 ? (n / 100000).toFixed(1) + "L" : (n / 1000).toFixed(0) + "K";
  if (min && max) return `₹${fmt(min)}–${fmt(max)}`;
  if (min) return `₹${fmt(min)}+`;
  return `Up to ₹${fmt(max)}`;
}

export default function JobCard({ job }) {
  const navigate = useNavigate();
  const salary   = formatSalary(job.salary_min, job.salary_max);

  return (
    <div onClick={() => navigate(`/jobs/${job.id}`)} style={{
      background: "var(--card)",
      border: "1.5px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "16px",
      marginBottom: "10px",
      cursor: "pointer",
      transition: "border-color 0.15s",
      active: { borderColor: "#0A66C2" },
    }}>
      {/* Title + time */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "1rem", flex: 1, paddingRight: "8px" }}>
          {job.title}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
          {job.created_at ? timeAgo(job.created_at) : ""}
        </div>
      </div>

      {/* Company */}
      <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
        {job.is_verified && (
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block", flexShrink: 0 }} />
        )}
        {job.company_name}
      </div>

      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {job.city && (
          <Tag>📍 {job.city}</Tag>
        )}
        {job.work_mode && (
          <Tag pink>{job.work_mode}</Tag>
        )}
        {job.job_type && (
          <Tag>{job.job_type}</Tag>
        )}
        {salary && (
          <Tag>{salary}</Tag>
        )}
      </div>

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "10px" }}>
          {job.skills.filter(s => s.mandatory).slice(0, 4).map(s => (
            <span key={s.name} style={{
              fontSize: "0.72rem",
              background: "var(--black)",
              color: "#fff",
              borderRadius: "999px",
              padding: "2px 9px",
              fontWeight: 600,
            }}>{s.name}</span>
          ))}
          {job.skills.filter(s => !s.mandatory).slice(0, 2).map(s => (
            <span key={s.name} style={{
              fontSize: "0.72rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
              borderRadius: "999px",
              padding: "2px 9px",
            }}>{s.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ children, pink = false }) {
  return (
    <span style={{
      fontSize: "0.75rem",
      padding: "3px 10px",
      borderRadius: "999px",
      fontWeight: 500,
      background: pink ? "#E8F0FA" : "var(--bg)",
      border: `1px solid ${pink ? "#b3d0f5" : "var(--border)"}`,
      color: pink ? "#0A66C2" : "var(--muted)",
    }}>
      {children}
    </span>
  );
}