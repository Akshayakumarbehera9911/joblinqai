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
      await register(fullName.trim(), email.trim(), phone.trim(), password, role);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-no-nav" style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px 20px 48px" }}>
      <div style={{ textAlign: "center", marginBottom: "28px", paddingTop: "16px" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "2rem" }}>
          Job<span style={{ color: "var(--pink)" }}>Portal</span>
        </div>
        <div style={{ fontSize: "0.88rem", color: "var(--muted)", marginTop: "4px" }}>Join thousands finding their next role</div>
      </div>

      <div className="card" style={{ borderRadius: "16px", padding: "24px" }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", marginBottom: "20px" }}>Create account</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
          {[
            { value: "candidate", label: "🎓 Job Seeker" },
            { value: "hr",        label: "🏢 Hire Talent" },
          ].map(tab => (
            <button key={tab.value} type="button" onClick={() => setRole(tab.value)} style={{
              padding: "12px",
              border: `1.5px solid ${role === tab.value ? "var(--pink)" : "var(--border)"}`,
              borderRadius: "var(--radius)",
              background: role === tab.value ? "var(--pink-light)" : "var(--card)",
              color: role === tab.value ? "var(--pink)" : "var(--muted)",
              fontFamily: "var(--font-sans)", fontSize: "0.88rem", fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s",
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {role === "hr" && (
          <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: "0.8rem", color: "#d97706", marginBottom: "16px" }}>
            ⚠️ HR must register with a <strong>company email</strong>. Gmail and personal emails are not accepted.
          </div>
        )}

        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">Account created! Redirecting to login...</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "14px" }}>
            <label className="label">Full Name</label>
            <input className="input" type="text" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          <div style={{ marginBottom: "14px" }}>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div style={{ marginBottom: "14px" }}>
            <label className="label">Phone</label>
            <input className="input" type="tel" placeholder="10-digit number" maxLength={10} value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <button className="btn-primary" type="submit" disabled={loading || success}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "0.88rem", color: "var(--muted)" }}>
          Already have an account?{" "}
          <span onClick={() => navigate("/login")} style={{ color: "var(--pink)", fontWeight: 700, cursor: "pointer" }}>
            Login
          </span>
        </div>
      </div>
    </div>
  );
}