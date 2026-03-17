export default function Spinner({ size = 32, color = "#0A66C2" }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 0" }}>
      <div style={{
        width: size,
        height: size,
        border: `3px solid var(--border)`,
        borderTop: `3px solid ${color}`,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }} />
    </div>
  );
}