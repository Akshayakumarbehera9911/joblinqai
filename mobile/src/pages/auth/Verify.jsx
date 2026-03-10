import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { verifyOtp, resendOtp } from "../../api/auth";

export default function Verify() {
  const [digits,  setDigits]  = useState(["", "", "", "", "", ""]);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer,   setTimer]   = useState(0);   // countdown for resend

  const inputRefs = useRef([]);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login: authLogin } = useAuth();

  // Email passed from Register page via navigate state, or fallback to query param
  const email = location.state?.email ||
    new URLSearchParams(location.search).get("email") || "";

  // Start resend cooldown if coming fresh from register
  useEffect(() => {
    startTimer();
  }, []);

  function startTimer() {
    setTimer(60);
  }

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  // ── Digit input handlers ──────────────────────────────────────────────────
  function handleChange(i, val) {
    const ch = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    if (ch && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, j) => { next[j] = ch; });
    setDigits(next);
    const last = Math.min(pasted.length, 5);
    inputRefs.current[last]?.focus();
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleVerify() {
    const code = digits.join("");
    if (code.length < 6) { setError("Please enter all 6 digits."); return; }
    setError(""); setLoading(true);
    try {
      const res = await verifyOtp(email, code);
      authLogin(res.data);
      setSuccess("Email verified!");
      setTimeout(() => {
        navigate(res.data.role === "hr" ? "/hr/dashboard" : "/dashboard", { replace: true });
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Resend ─────────────────────────────────────────────────────────────────
  async function handleResend() {
    if (timer > 0) return;
    setError(""); setSuccess("");
    try {
      await resendOtp(email);
      setSuccess("New code sent to your email.");
      startTimer();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-no-nav" style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column", justifyContent: "center",
      padding: "24px 20px",
    }}>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", letterSpacing: "-0.5px" }}>
          Job<span style={{ color: "var(--pink)" }}>Portal</span>
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "5px" }}>
          One step away
        </div>
      </div>

      {/* Card */}
      <div className="card" style={{ borderRadius: "18px", padding: "24px 22px" }}>

        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.35rem", marginBottom: "6px" }}>
            Verify your email
          </h2>
          <div style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.6 }}>
            We sent a 6-digit code to{" "}
            <strong style={{ color: "var(--text)" }}>{email || "your email"}</strong>.
            Enter it below.
          </div>
        </div>

        {error   && <div className="alert alert-error"   style={{ marginBottom: "14px", borderRadius: "10px" }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: "14px", borderRadius: "10px" }}>{success}</div>}

        {/* OTP digit boxes */}
        <div style={{
          display: "flex", gap: "10px", justifyContent: "center",
          marginBottom: "24px",
        }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              style={{
                width: "46px", height: "56px",
                textAlign: "center", fontSize: "1.4rem", fontWeight: 700,
                border: `1.5px solid ${d ? "var(--pink)" : "var(--border)"}`,
                borderRadius: "10px",
                background: "var(--bg)", color: "var(--text)",
                outline: "none",
              }}
            />
          ))}
        </div>

        <button
          className="btn-primary"
          onClick={handleVerify}
          disabled={loading || !!success}
        >
          {loading ? "Verifying…" : "Verify Email"}
        </button>

        {/* Resend */}
        <div style={{
          textAlign: "center", marginTop: "18px",
          fontSize: "0.84rem", color: "var(--muted)",
        }}>
          Didn't get the code?{" "}
          {timer > 0 ? (
            <span style={{ color: "var(--pink)", fontWeight: 600 }}>
              Resend in {timer}s
            </span>
          ) : (
            <span
              onClick={handleResend}
              style={{ color: "var(--pink)", fontWeight: 700, cursor: "pointer" }}
            >
              Resend
            </span>
          )}
        </div>

        <div style={{
          textAlign: "center", marginTop: "12px",
          fontSize: "0.84rem", color: "var(--muted)",
        }}>
          Wrong email?{" "}
          <span
            onClick={() => navigate("/register")}
            style={{ color: "var(--pink)", fontWeight: 700, cursor: "pointer" }}
          >
            Register again
          </span>
        </div>
      </div>
    </div>
  );
}