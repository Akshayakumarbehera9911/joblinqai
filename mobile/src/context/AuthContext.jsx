import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem("token"));
  const [role,  setRole]    = useState(() => localStorage.getItem("role"));
  const [user,  setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  });

  function login(data) {
    // data = { access_token, role, user_id, full_name }
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("role",  data.role);
    localStorage.setItem("user",  JSON.stringify({
      id:        data.user_id,
      full_name: data.full_name,
      role:      data.role,
    }));
    setToken(data.access_token);
    setRole(data.role);
    setUser({ id: data.user_id, full_name: data.full_name, role: data.role });
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    setToken(null);
    setRole(null);
    setUser(null);
  }

  const isLoggedIn = !!token;

  return (
    <AuthContext.Provider value={{ token, role, user, login, logout, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}