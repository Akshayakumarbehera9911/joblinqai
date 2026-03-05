import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ── Icons (inline SVG, no library needed) ───────────────────────────────
function SearchIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? "var(--pink)" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function GridIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? "var(--pink)" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}
function BriefcaseIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? "var(--pink)" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
    </svg>
  );
}
function UserIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? "var(--pink)" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function PlusIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? "var(--pink)" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
    </svg>
  );
}

// ── Nav tabs per role ────────────────────────────────────────────────────
const CANDIDATE_TABS = [
  { label: "Jobs",         path: "/jobs",         icon: SearchIcon },
  { label: "Dashboard",   path: "/dashboard",    icon: GridIcon },
  { label: "Applications",path: "/applications", icon: BriefcaseIcon },
  { label: "Profile",     path: "/profile",      icon: UserIcon },
];

const HR_TABS = [
  { label: "Jobs",      path: "/jobs",         icon: SearchIcon },
  { label: "Dashboard", path: "/hr/dashboard", icon: GridIcon },
  { label: "Post Job",  path: "/hr/post-job",  icon: PlusIcon },
  { label: "Profile",   path: "/hr/profile",   icon: UserIcon },
];

function ShieldIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke={active ? "var(--pink)" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

const ADMIN_TABS = [
  { label: "Dashboard", path: "/admin/dashboard", icon: ShieldIcon },
];

// ── Pages that should NOT show bottom nav ────────────────────────────────
const NO_NAV_PATHS = ["/login", "/register"];

export default function BottomNav() {
  const { role, isLoggedIn } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const path = location.pathname;

  // Hide on auth pages or when not logged in
  if (!isLoggedIn || NO_NAV_PATHS.includes(path)) return null;

  const tabs =
    role === "hr"    ? HR_TABS :
    role === "admin" ? ADMIN_TABS :
    CANDIDATE_TABS;

  return (
    <div style={{
      position: "fixed",
      bottom: 0, left: 0, right: 0,
      height: "var(--nav-height)",
      background: "var(--card)",
      borderTop: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
      zIndex: 50,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {tabs.map(tab => {
        const active = path === tab.path || path.startsWith(tab.path + "/");
        const Icon   = tab.icon;
        return (
          <button key={tab.path} onClick={() => navigate(tab.path)} style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "3px",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px 0",
          }}>
            <Icon active={active} />
            <span style={{
              fontSize: "0.65rem",
              fontWeight: active ? 700 : 500,
              color: active ? "var(--pink)" : "var(--muted)",
              fontFamily: "var(--font-sans)",
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}