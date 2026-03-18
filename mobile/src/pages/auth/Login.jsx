import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { login } from "../../api/auth";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      authLogin(res.data);
      const from = location.state?.from?.pathname;
      if (from && from !== "/login") {
        navigate(from, { replace: true });
      } else if (res.data.role === "hr")    { navigate("/hr/dashboard",    { replace: true }); }
        else if (res.data.role === "admin") { navigate("/admin/dashboard", { replace: true }); }
        else                               { navigate("/dashboard",        { replace: true }); }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes("verify")) {
        setError("__VERIFY__:" + email);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
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
        <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "5px", letterSpacing: "0.01em" }}>
          Your career starts here
        </div>
      </div>

      {/* Card */}
      <div className="card" style={{ borderRadius: "18px", padding: "24px 22px" }}>

        <div style={{ marginBottom: "22px" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.35rem", marginBottom: "3px" }}>
            Welcome back
          </h2>
          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Sign in to continue</div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "16px", borderRadius: "10px" }}>
            {error.startsWith("__VERIFY__:") ? (
              <span>
                Email not verified.{" "}
                <span
                  onClick={() => navigate(`/verify?email=${encodeURIComponent(error.split(":")[1])}`)}
                  style={{ fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}
                >
                  Verify now →
                </span>
              </span>
            ) : error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email" />
          </div>

          <div style={{ marginBottom: "22px" }}>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Your password"
              value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password" />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>

        <div style={{
          textAlign: "center", marginTop: "20px",
          fontSize: "0.84rem", color: "var(--muted)",
        }}>
          No account?{" "}
          <span onClick={() => navigate("/register")}
            style={{ color: "var(--pink)", fontWeight: 700, cursor: "pointer" }}>
            Register here
          </span>
        </div>
      </div>
    </div>
  );
}