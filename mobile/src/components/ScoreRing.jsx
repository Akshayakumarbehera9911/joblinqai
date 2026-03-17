export default function ScoreRing({ score, size = 80, strokeWidth = 6 }) {
  const radius       = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset       = circumference * (1 - (score || 0) / 100);
  const color        = score >= 80 ? "#00A651" : score >= 60 ? "#F5A623" : "#E02020";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth}/>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontWeight: 700, color, lineHeight: 1, fontSize: size * 0.22 }}>
          {score != null ? `${score}%` : "—"}
        </span>
      </div>
    </div>
  );
}