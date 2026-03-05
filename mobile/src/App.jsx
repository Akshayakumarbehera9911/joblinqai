import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import BottomNav from "./components/BottomNav";

import Login    from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Search   from "./pages/jobs/Search";
import Detail   from "./pages/jobs/Detail";
import MapPage  from "./pages/jobs/Map";
import CandidateDashboard    from "./pages/candidate/Dashboard";
import CandidateApplications from "./pages/candidate/Applications";
import CandidateProfile      from "./pages/candidate/Profile";
import HRDashboard  from "./pages/hr/Dashboard";
import HRPostJob    from "./pages/hr/PostJob";
import HRApplicants from "./pages/hr/Applicants";
import HRProfile    from "./pages/hr/Profile";
import AdminDashboard from "./pages/admin/Dashboard";

function Placeholder({ name }) {
  return (
    <div style={{ padding: "80px 20px", textAlign: "center", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🚧</div>
      <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "4px" }}>{name}</div>
      <div style={{ color: "#888", fontSize: "0.88rem" }}>Coming in next part</div>
    </div>
  );
}

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

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/"         element={<Navigate to="/login" replace />} />
        <Route path="/login"    element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/jobs"     element={<Search />} />
        <Route path="/jobs/map" element={<MapPage />} />
        <Route path="/jobs/:id" element={<Detail />} />
        <Route path="/dashboard"    element={<Protected allowedRoles={["candidate"]}><CandidateDashboard /></Protected>} />
        <Route path="/applications" element={<Protected allowedRoles={["candidate"]}><CandidateApplications /></Protected>} />
        <Route path="/profile"      element={<Protected allowedRoles={["candidate"]}><CandidateProfile /></Protected>} />
        <Route path="/hr/dashboard"      element={<Protected allowedRoles={["hr"]}><HRDashboard /></Protected>} />
        <Route path="/hr/post-job"       element={<Protected allowedRoles={["hr"]}><HRPostJob /></Protected>} />
        <Route path="/hr/profile"        element={<Protected allowedRoles={["hr"]}><HRProfile /></Protected>} />
        <Route path="/hr/applicants/:id" element={<Protected allowedRoles={["hr"]}><HRApplicants /></Protected>} />
        <Route path="/admin/dashboard"   element={<Protected allowedRoles={["admin"]}><AdminDashboard /></Protected>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <BottomNav />
    </>
  );
}