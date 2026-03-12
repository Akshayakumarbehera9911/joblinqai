import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useEffect, useRef, useState } from "react";
import BottomNav from "./components/BottomNav";
import Login    from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Verify   from "./pages/auth/Verify";
import Search   from "./pages/jobs/Search";
import Detail   from "./pages/jobs/Detail";
import MapPage  from "./pages/jobs/Map";
import CandidateDashboard    from "./pages/candidate/Dashboard";
import CandidateApplications from "./pages/candidate/Applications";
import CandidateProfile      from "./pages/candidate/Profile";
import CandidateGaps         from "./pages/candidate/Gaps";
import HRDashboard  from "./pages/hr/Dashboard";
import HRPostJob    from "./pages/hr/PostJob";
import HRApplicants from "./pages/hr/Applicants";
import HRProfile    from "./pages/hr/Profile";
import AdminDashboard from "./pages/admin/Dashboard";

function Protected({ children, allowedRoles }) {
  const { isLoggedIn, role } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === "hr")    return <Navigate to="/hr/dashboard" replace />;
    if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function GuestOnly({ children }) {
  const { isLoggedIn, role } = useAuth();
  if (isLoggedIn) {
    if (role === "hr")    return <Navigate to="/hr/dashboard" replace />;
    if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// ── Icons ────────────────────────────────────────────────────────────────
const DotsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
  </svg>
);
const InstallIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const ShareIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);
const AboutIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);
const LoginIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
    <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const RegisterIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
  </svg>
);

// ── About modal ──────────────────────────────────────────────────────────
function AboutModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",
      zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"var(--card)",borderRadius:16,padding:"28px 24px",
        maxWidth:320,width:"100%",fontFamily:"DM Sans,sans-serif",
        boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
      }}>
        <div style={{fontWeight:800,fontSize:"1.5rem",color:"var(--pink)",marginBottom:4}}>JobPortal</div>
        <div style={{fontSize:"0.75rem",color:"var(--muted)",marginBottom:16}}>Version 1.0 · Built for India's job seekers</div>
        <div style={{fontSize:"0.85rem",lineHeight:1.75,marginBottom:16}}>
          Connects candidates with opportunities across India using ML-powered readiness scoring,
          semantic job matching, and a real-time job map.
        </div>
        <div style={{fontSize:"0.73rem",color:"var(--muted)",marginBottom:24}}>
          FastAPI · React PWA · PostgreSQL · Groq AI
        </div>
        <button onClick={onClose} style={{
          width:"100%",padding:"10px",borderRadius:999,
          background:"var(--pink)",color:"#fff",border:"none",
          fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:"DM Sans,sans-serif",
        }}>Close</button>
      </div>
    </div>
  );
}

// ── Install instructions modal ───────────────────────────────────────────
function InstallModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",
      zIndex:9999,display:"flex",alignItems:"flex-end",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"var(--card)",borderRadius:"16px 16px 0 0",
        padding:"24px 24px 40px",width:"100%",
        fontFamily:"DM Sans,sans-serif",
        boxShadow:"0 -4px 24px rgba(0,0,0,0.14)",
      }}>
        <div style={{width:36,height:4,background:"var(--border)",borderRadius:999,margin:"0 auto 20px"}}/>
        <div style={{fontWeight:700,fontSize:"1rem",marginBottom:16}}>Install JobPortal</div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {[
            ["1","Open browser menu","Tap ⋮ or ··· at the top right of Chrome or Safari"],
            ["2","Tap 'Add to Home Screen'","Also shown as 'Install App' in some browsers"],
            ["3","Tap Install / Add","JobPortal will appear on your home screen like a native app"],
          ].map(([num,title,desc])=>(
            <div key={num} style={{display:"flex",gap:14,alignItems:"flex-start"}}>
              <div style={{
                width:28,height:28,borderRadius:"50%",background:"var(--pink)",
                color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:700,fontSize:"0.8rem",flexShrink:0,
              }}>{num}</div>
              <div>
                <div style={{fontWeight:600,fontSize:"0.85rem"}}>{title}</div>
                <div style={{fontSize:"0.75rem",color:"var(--muted)",marginTop:2}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{
          width:"100%",padding:"11px",borderRadius:999,marginTop:24,
          background:"var(--pink)",color:"#fff",border:"none",
          fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:"DM Sans,sans-serif",
        }}>Got it</button>
      </div>
    </div>
  );
}

// ── Global ⋮ Menu ────────────────────────────────────────────────────────
function GlobalMenu() {
  const { isLoggedIn, logout } = useAuth();
  const location = useLocation();
  const [open,         setOpen]         = useState(false);
  const [showAbout,    setShowAbout]    = useState(false);
  const [showInstall,  setShowInstall]  = useState(false);
  const [deferredPrompt, setDeferred]   = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = e => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("touchstart", close); };
  }, [open]);

  const hide = ["/login", "/register", "/verify"].includes(location.pathname);
  if (hide) return null;

  async function handleInstall() {
    setOpen(false);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDeferred(null);
    } else {
      setShowInstall(true);
    }
  }

  function handleShare() {
    setOpen(false);
    const url = "https://jobportal-mobile.onrender.com";
    if (navigator.share) {
      navigator.share({ title:"JobPortal", text:"Find jobs across India", url }).catch(()=>{});
    } else {
      navigator.clipboard?.writeText(url).then(()=>alert("Link copied!")).catch(()=>{});
    }
  }

  const Item = ({ icon, label, onClick, danger }) => (
    <button onClick={onClick} style={{
      display:"flex",alignItems:"center",gap:12,
      padding:"11px 16px",background:"none",border:"none",
      width:"100%",textAlign:"left",cursor:"pointer",
      fontFamily:"DM Sans,sans-serif",fontSize:"0.85rem",fontWeight:500,
      color: danger ? "#e03c3c" : "var(--black)",
    }}
    onMouseEnter={e=>e.currentTarget.style.background="var(--bg)"}
    onMouseLeave={e=>e.currentTarget.style.background="none"}>
      <span style={{color: danger ? "#e03c3c" : "var(--muted)",display:"flex"}}>{icon}</span>
      {label}
    </button>
  );

  const Sep = () => <div style={{height:1,background:"var(--border)",margin:"2px 0"}}/>;

  return (
    <>
      <div ref={menuRef} style={{position:"fixed",top:12,right:14,zIndex:1200}}>
        <button onClick={()=>setOpen(o=>!o)} style={{
          width:36,height:36,borderRadius:"50%",
          background: open ? "var(--pink)" : "var(--card)",
          border:"1px solid var(--border)",
          display:"flex",alignItems:"center",justifyContent:"center",
          cursor:"pointer",color: open ? "#fff" : "var(--black)",
          boxShadow:"0 2px 8px rgba(0,0,0,0.1)",transition:"all 0.15s",
        }}>
          <DotsIcon />
        </button>

        {open && (
          <div style={{
            position:"absolute",top:44,right:0,
            background:"var(--card)",borderRadius:12,
            border:"1px solid var(--border)",
            boxShadow:"0 4px 24px rgba(0,0,0,0.14)",
            minWidth:200,overflow:"hidden",
            animation:"menuFade 0.12s ease",
          }}>
            <Item icon={<InstallIcon/>} label="Install App" onClick={handleInstall}/>
            <Item icon={<ShareIcon/>}  label="Share App"   onClick={handleShare}/>
            <Sep/>
            <Item icon={<AboutIcon/>} label="About" onClick={()=>{setOpen(false);setShowAbout(true);}}/>
            <Sep/>
            {isLoggedIn
              ? <Item icon={<LogoutIcon/>} label="Logout" onClick={()=>{setOpen(false);logout();}} danger/>
              : <>
                  <Item icon={<LoginIcon/>}    label="Login"    onClick={()=>{setOpen(false);window.location.href="/login";}}/>
                  <Item icon={<RegisterIcon/>} label="Register" onClick={()=>{setOpen(false);window.location.href="/register";}}/>
                </>
            }
          </div>
        )}
      </div>

      {showAbout   && <AboutModal   onClose={()=>setShowAbout(false)}/>}
      {showInstall && <InstallModal onClose={()=>setShowInstall(false)}/>}

      <style>{`@keyframes menuFade{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  );
}

// ── App ──────────────────────────────────────────────────────────────────
export default function App() {
  const { isLoggedIn, role } = useAuth();

  // Register FCM token when candidate logs in
  useEffect(() => {
    if (!isLoggedIn || role !== "candidate") return;
    async function registerPush() {
      try {
        const { requestFCMToken } = await import("./firebase");
        const token = await requestFCMToken();
        if (!token) return;
        const { saveFCMToken } = await import("./api/candidate");
        await saveFCMToken(token);
      } catch (e) {
        console.warn("Push registration failed:", e);
      }
    }
    registerPush();
  }, [isLoggedIn, role]);
  return (
    <>
      <Routes>
        <Route path="/"         element={<Navigate to="/jobs" replace />} />
        <Route path="/login"    element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/verify"   element={<Verify />} />
        <Route path="/jobs"     element={<Search />} />
        <Route path="/jobs/map" element={<MapPage />} />
        <Route path="/jobs/:id" element={<Detail />} />
        <Route path="/dashboard"    element={<Protected allowedRoles={["candidate"]}><CandidateDashboard /></Protected>} />
        <Route path="/applications" element={<Protected allowedRoles={["candidate"]}><CandidateApplications /></Protected>} />
        <Route path="/profile"      element={<Protected allowedRoles={["candidate"]}><CandidateProfile /></Protected>} />
        <Route path="/gaps"         element={<Protected allowedRoles={["candidate"]}><CandidateGaps /></Protected>} />
        <Route path="/hr/dashboard"      element={<Protected allowedRoles={["hr"]}><HRDashboard /></Protected>} />
        <Route path="/hr/post-job"       element={<Protected allowedRoles={["hr"]}><HRPostJob /></Protected>} />
        <Route path="/hr/profile"        element={<Protected allowedRoles={["hr"]}><HRProfile /></Protected>} />
        <Route path="/hr/applicants/:id" element={<Protected allowedRoles={["hr"]}><HRApplicants /></Protected>} />
        <Route path="/admin/dashboard"   element={<Protected allowedRoles={["admin"]}><AdminDashboard /></Protected>} />
        <Route path="*" element={<Navigate to="/jobs" replace />} />
      </Routes>
      <GlobalMenu />
      <BottomNav />
    </>
  );
}