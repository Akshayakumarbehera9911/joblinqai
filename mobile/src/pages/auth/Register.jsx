import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../../api/auth";

export default function Register() {
  const [role,     setRole]     = useState("candidate");
  const [fullName, setFullName] = useState("");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await register(fullName.trim(), email.trim(), phone.trim(), password, role);
      setSuccess(true);
      const emailFailed = res?.data?.email_failed === true;
      setTimeout(() => navigate("/verify", {
        state: {
          email: email.trim(),
          emailFailed,
        }
      }), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-no-nav" style={{
      minHeight: "100vh", background: "var(--bg)",
      padding: "24px 20px 48px",
    }}>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "24px", paddingTop: "16px" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", letterSpacing: "-0.5px" }}>
          Job<span style={{ color: "var(--pink)" }}>LinqAI</span>
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "5px", letterSpacing: "0.01em" }}>
          Join thousands finding their next role
        </div>
      </div>

      {/* Card */}
      <div className="card" style={{ borderRadius: "18px", padding: "24px 22px" }}>

        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.35rem", marginBottom: "3px" }}>
            Create account
          </h2>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Pick your role to get started</div>
        </div>

        {/* Role selector */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
          {[
            { value: "candidate", label: "Job Seeker",  icon: "/candidate.png" },
            { value: "hr",        label: "Hire Talent", icon: "/hr.png"        },
          ].map(tab => (
            <button key={tab.value} type="button" onClick={() => setRole(tab.value)} style={{
              padding: "11px 8px",
              border: `1.5px solid ${role === tab.value ? "var(--pink)" : "var(--border)"}`,
              borderRadius: "10px",
              background: role === tab.value ? "var(--pink-light)" : "var(--card)",
              color: role === tab.value ? "var(--pink)" : "var(--muted)",
              fontSize: "0.84rem", fontWeight: role === tab.value ? 700 : 500,
              cursor: "pointer", transition: "border-color 0.15s, background 0.15s, color 0.15s",
              letterSpacing: "0.01em",
              display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: "7px",
            }}>
              <img src={tab.icon} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* HR notice */}
        {role === "hr" && (
          <div style={{
            background: "#fffbeb", border: "1px solid #fcd34d",
            borderRadius: "10px", padding: "10px 13px",
            fontSize: "0.78rem", color: "#d97706", marginBottom: "16px",
            lineHeight: 1.5,
          }}>
            ⚠️ HR must register with a <strong>company email</strong>. Gmail and personal emails are not accepted.
          </div>
        )}

        {error   && <div className="alert alert-error"   style={{ marginBottom: "14px", borderRadius: "10px" }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: "14px", borderRadius: "10px" }}>Account created! Sending verification code…</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <label className="label">Full Name</label>
            <input className="input" type="text" placeholder="Your full name"
              value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email" />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label className="label">Phone</label>
            <input className="input" type="tel" placeholder="10-digit number"
              maxLength={10} value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>

          <div style={{ marginBottom: "22px" }}>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Min 6 characters"
              value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="new-password" />
          </div>

          <button className="btn-primary" type="submit" disabled={loading || success}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <div style={{
          textAlign: "center", marginTop: "20px",
          fontSize: "0.84rem", color: "var(--muted)",
        }}>
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}
            style={{ color: "var(--pink)", fontWeight: 700, cursor: "pointer" }}>
            Login
          </span>
        </div>
      </div>
    </div>
  );
}