export default function ScoreRing({ score, size = 80, strokeWidth = 6 }) {
  const radius      = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset      = circumference * (1 - (score || 0) / 100);
  const color       = score >= 80 ? "var(--green)" : score >= 60 ? "var(--gold)" : "var(--pink)";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--border)" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 700, color, lineHeight: 1 }}>
          {score ?? "—"}
        </span>
        {score != null && (
          <span style={{ fontSize: size * 0.14, color: "var(--muted)", lineHeight: 1, marginTop: 1 }}>%</span>
        )}
      </div>
    </div>
  );
}