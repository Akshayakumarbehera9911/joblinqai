// ── Base URL ───────────────────────────────────────────────────────────────
const API_BASE = "https://joblinqai-api.onrender.com/api";

// ── Token helpers ──────────────────────────────────────────────────────────
const Auth = {
  getToken:  () => localStorage.getItem("token"),
  setToken:  (t) => localStorage.setItem("token", t),
  getRole:   () => localStorage.getItem("role"),
  setRole:   (r) => localStorage.setItem("role", r),
  getUser:   () => JSON.parse(localStorage.getItem("user") || "null"),
  setUser:   (u) => localStorage.setItem("user", JSON.stringify(u)),
  clear:     () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
  },
  isLoggedIn: () => !!localStorage.getItem("token"),

  // Returns true if token exists AND is not expired
  isTokenValid: () => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? payload.exp * 1000 > Date.now() : true;
    } catch {
      return false;
    }
  },
};

// ── Core fetch wrapper ─────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = Auth.getToken();

  // Check token expiry before making the request
  if (token) {
    if (!Auth.isTokenValid()) {
      Auth.clear();
      window.location.href = "/login";
      return;
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    // Backend says token is invalid or expired — clear and redirect
    if (res.status === 401) {
      Auth.clear();
      window.location.href = "/login";
      return;
    }
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