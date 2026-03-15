const ICON_BASE = "https://joblinqai-production.up.railway.app/static/icons/";

export default function EmptyState({ icon, title, subtitle, action = null }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      textAlign: "center",
    }}>
      {icon && (
        <img
          src={`${ICON_BASE}${icon}`}
          width={160} height={160}
          style={{ objectFit: "contain", marginBottom: "16px", opacity: 0.92 }}
          onError={e => e.target.style.display = "none"}
        />
      )}
      <div style={{
        fontFamily: "var(--font-serif)",
        fontSize: "1.1rem",
        color: "var(--black)",
        fontWeight: 400,
        marginBottom: "6px",
      }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: action ? "20px" : 0 }}>
          {subtitle}
        </div>
      )}
      {action}
    </div>
  );
}