import { useNavigate } from "react-router-dom";

export default function TopBar({ title, back = false, backTo = null, right = null }) {
  const navigate = useNavigate();

  function handleBack() {
    if (backTo) navigate(backTo);
    else navigate(-1);
  }

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      height: "var(--topbar-height)",
      background: "var(--card)",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
      zIndex: 50,
    }}>
      {/* Left — back button or empty space */}
      <div style={{ width: 36 }}>
        {back && (
          <button onClick={handleBack} style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "6px",
            display: "flex",
            alignItems: "center",
            color: "var(--black)",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Center — title */}
      <div style={{
        fontFamily: "Plus Jakarta Sans, sans-serif",
        fontSize: "1.05rem",
        fontWeight: 400,
        color: "var(--black)",
        flex: 1,
        textAlign: "center",
      }}>
        {title}
      </div>

      {/* Right — optional action */}
      <div style={{ width: 36, display: "flex", justifyContent: "flex-end" }}>
        {right}
      </div>
    </div>
  );
}