// ── Base URL ───────────────────────────────────────────────────────────────
const API_BASE = "https://joblinqai-api.onrender.com/api";

// ── Token helpers ──────────────────────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem("token"),
  setToken: (t) => localStorage.setItem("token", t),
  getRole:  () => localStorage.getItem("role"),
  setRole:  (r) => localStorage.setItem("role", r),
  getUser:  () => JSON.parse(localStorage.getItem("user") || "null"),
  setUser:  (u) => localStorage.setItem("user", JSON.stringify(u)),
  clear:    () => { localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("user"); },
  isLoggedIn: () => !!localStorage.getItem("token"),
};

// ── Core fetch wrapper ─────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = Auth.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    const msg = data.detail || data.error || "Something went wrong";
    throw new Error(msg);
  }
  return data;
}

// ── Auth API ───────────────────────────────────────────────────────────────
const AuthAPI = {
  register: (body) => apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login:    (body) => apiFetch("/auth/login",    { method: "POST", body: JSON.stringify(body) }),
  me:       ()     => apiFetch("/auth/me"),
};
