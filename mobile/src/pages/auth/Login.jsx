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
  const navigate  = useNavigate();
  const location  = useLocation();

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
      } else if (res.data.role === "hr")    { navigate("/hr/dashboard", { replace: true }); }
        else if (res.data.role === "admin") { navigate("/admin/dashboard", { replace: true }); }
        else                               { navigate("/dashboard", { replace: true }); }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-no-nav" style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: "2rem" }}>
          Job<span style={{ color: "var(--pink)" }}>Portal</span>
        </div>
        <div style={{ fontSize: "0.88rem", color: "var(--muted)", marginTop: "4px" }}>Your career starts here</div>
      </div>
      <div className="card" style={{ borderRadius: "16px", padding: "24px" }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", marginBottom: "20px" }}>Welcome back</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "14px" }}>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div style={{ marginBottom: "20px" }}>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Your password"
              value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "0.88rem", color: "var(--muted)" }}>
          No account?{" "}
          <span onClick={() => navigate("/register")} style={{ color: "var(--pink)", fontWeight: 700, cursor: "pointer" }}>
            Register here
          </span>
        </div>
      </div>
    </div>
  );
}