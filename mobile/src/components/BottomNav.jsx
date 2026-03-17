import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";

function SearchIcon({ active }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#0A66C2" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
}
function GridIcon({ active }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#0A66C2" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
}
function BriefcaseIcon({ active }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#0A66C2" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
}
function UserIcon({ active }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#0A66C2" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function PlusIcon({ active }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#0A66C2" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>;
}
function MapIcon({ active }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#0A66C2" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
}
function ShieldIcon({ active }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#0A66C2" : "var(--muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}

const CANDIDATE_TABS = [
  { label: "Jobs",         path: "/jobs",         icon: SearchIcon    },
  { label: "Map",          path: "/jobs/map",     icon: MapIcon       },
  { label: "Dashboard",    path: "/dashboard",    icon: GridIcon      },
  { label: "Applications", path: "/applications", icon: BriefcaseIcon },
  { label: "Profile",      path: "/profile",      icon: UserIcon      },
];

const HR_TABS = [
  { label: "Jobs",      path: "/jobs",         icon: SearchIcon },
  { label: "Dashboard", path: "/hr/dashboard", icon: GridIcon   },
  { label: "Post Job",  path: "/hr/post-job",  icon: PlusIcon   },
  { label: "Profile",   path: "/hr/profile",   icon: UserIcon   },
];

const ADMIN_TABS = [
  { label: "Dashboard", path: "/admin/dashboard", icon: ShieldIcon },
];

const NO_NAV_PATHS = ["/login", "/register"];

// ── Suggestions dot helpers ────────────────────────────────────────────────
export function setSkillSuggestionsCount(count) {
  if (count > 0) {
    localStorage.setItem("skill_suggestions_count", String(count));
    localStorage.removeItem("skill_suggestions_seen");
  } else {
    localStorage.removeItem("skill_suggestions_count");
  }
  window.dispatchEvent(new Event("skill-suggestions-update"));
}

export function clearSkillSuggestionsDot() {
  localStorage.setItem("skill_suggestions_seen", "1");
  window.dispatchEvent(new Event("skill-suggestions-update"));
}

function hasSuggestionsDot() {
  const count = parseInt(localStorage.getItem("skill_suggestions_count") || "0");
  const seen  = localStorage.getItem("skill_suggestions_seen") === "1";
  return count > 0 && !seen;
}

export default function BottomNav() {
  const { role, isLoggedIn } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const path      = location.pathname;
  const [showDot, setShowDot] = useState(hasSuggestionsDot);

  useEffect(() => {
    const handler = () => setShowDot(hasSuggestionsDot());
    window.addEventListener("skill-suggestions-update", handler);
    return () => window.removeEventListener("skill-suggestions-update", handler);
  }, []);

  if (!isLoggedIn || NO_NAV_PATHS.includes(path)) return null;

  const tabs =
    role === "hr"    ? HR_TABS :
    role === "admin" ? ADMIN_TABS :
    CANDIDATE_TABS;

  function handleTabClick(tabPath) {
    if (tabPath === "/profile") clearSkillSuggestionsDot();
    navigate(tabPath);
  }

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      height: "var(--nav-height)",
      background: "var(--card)", borderTop: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-around",
      zIndex: 50, paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {tabs.map(tab => {
        const active =
          tab.path === "/jobs"
            ? path === "/jobs"
            : path === tab.path || path.startsWith(tab.path + "/");
        const Icon = tab.icon;
        const isProfile = tab.path === "/profile";
        return (
          <button key={tab.path} onClick={() => handleTabClick(tab.path)} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3,
            background: "none", border: "none", cursor: "pointer", padding: "8px 0",
          }}>
            <div style={{ position: "relative", display: "inline-flex" }}>
              <Icon active={active} />
              {isProfile && showDot && (
                <span style={{
                  position: "absolute", top: -2, right: -2,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#0A66C2",
                  border: "1.5px solid var(--card)",
                  boxShadow: "0 0 0 2px rgba(232,57,138,0.25)",
                }} />
              )}
            </div>
            <span style={{
              fontSize: "0.62rem", fontWeight: active ? 700 : 500,
              color: active ? "#0A66C2" : "var(--muted)",
              fontFamily: "var(--font-sans)",
            }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}