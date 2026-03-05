export default function SkillTag({ name, mandatory = false, onRemove = null }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      fontSize: "0.78rem",
      fontWeight: 600,
      padding: "4px 10px",
      borderRadius: "999px",
      background: mandatory ? "var(--black)" : "var(--bg)",
      border: mandatory ? "none" : "1px solid var(--border)",
      color: mandatory ? "#fff" : "var(--muted)",
    }}>
      {name}
      {onRemove && (
        <button onClick={onRemove} style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          padding: 0,
          lineHeight: 1,
          fontSize: "0.85rem",
          opacity: 0.7,
        }}>×</button>
      )}
    </span>
  );
}