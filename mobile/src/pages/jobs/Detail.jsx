import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopBar   from "../../components/TopBar";
import Spinner  from "../../components/Spinner";
import SkillTag from "../../components/SkillTag";
import { getJob, applyJob } from "../../api/jobs";
import { apiFetch } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

function formatSalary(min, max, type) {
  if (!min && !max) return null;
  const fmt = n => n >= 100000 ? (n / 100000).toFixed(1) + "L" : (n / 1000).toFixed(0) + "K";
  const range = min && max ? `₹${fmt(min)} – ₹${fmt(max)}` : min ? `₹${fmt(min)}+` : `Up to ₹${fmt(max)}`;
  return type ? `${range} / ${type}` : range;
}

export default function Detail() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, role } = useAuth();

  const [job,     setJob]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied,  setApplied]  = useState(false);
  const [applyMsg, setApplyMsg] = useState("");
  const [applyErr, setApplyErr] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState("scam_job");
  const [reportDesc, setReportDesc] = useState("");
  const [reporting,  setReporting]  = useState(false);
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => {
    getJob(id)
      .then(res => setJob(res.data))
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApply() {
    if (!isLoggedIn) { navigate("/login"); return; }
    setApplying(true);
    setApplyErr("");
    try {
      await applyJob(id);
      setApplied(true);
      setApplyMsg("Application submitted successfully!");
    } catch (e) {
      setApplyErr(e.message);
    } finally {
      setApplying(false);
    }
  }

  async function handleReport() {
    if (!reportDesc.trim()) return;
    setReporting(true);
    try {
      await apiFetch("/admin/reports", {
        method: "POST",
        body: JSON.stringify({
          report_type: reportType,
          target_type: "job",
          target_id:   parseInt(id),
          title:       `Report: ${job?.title || "Job #" + id}`,
          description: reportDesc.trim(),
        }),
      });
      setReportDone(true);
      setShowReport(false);
      setReportDesc("");
    } catch {
      // fail silently — report submitted
    } finally {
      setReporting(false);
    }
  }

  if (loading) return (
    <>
      <TopBar title="Job Detail" back backTo="/jobs" />
      <div className="page"><Spinner /></div>
    </>
  );

  if (!job) return (
    <>
      <TopBar title="Job Detail" back backTo="/jobs" />
      <div className="page" style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ color: "var(--muted)" }}>Job not found</div>
        <button className="btn-outline" style={{ marginTop: "16px", width: "auto", padding: "10px 24px" }} onClick={() => navigate("/jobs")}>← Back to Jobs</button>
      </div>
    </>
  );

  const salary   = formatSalary(job.salary_min, job.salary_max, job.salary_type);
  const mandatory = (job.skills || []).filter(s => s.mandatory);
  const optional  = (job.skills || []).filter(s => !s.mandatory);
  const isCandidate = isLoggedIn && role === "candidate";

  return (
    <>
      <TopBar title={job.title} back backTo="/jobs" />

      <div className="page" style={{ padding: "calc(var(--topbar-height) + 16px) 16px calc(var(--nav-height) + 20px)" }}>

        {/* Header card */}
        <div className="card" style={{ marginBottom: "12px" }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", marginBottom: "6px" }}>{job.title}</h1>

          <div style={{ fontSize: "0.88rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
            {job.company?.is_verified && (
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
            )}
            {job.company?.name || "Unknown"}{job.company?.industry ? ` · ${job.company.industry}` : ""}
          </div>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
            {job.work_mode  && <Tag pink>{job.work_mode}</Tag>}
            {job.job_type   && <Tag>{job.job_type}</Tag>}
            {job.role_type  && <Tag>{job.role_type}</Tag>}
            {job.min_experience > 0 && <Tag>{job.min_experience}+ yrs exp</Tag>}
            {job.openings   && <Tag>{job.openings} opening{job.openings > 1 ? "s" : ""}</Tag>}
          </div>

          {/* Salary + Apply */}
          {salary && (
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", marginBottom: "4px" }}>{salary}</div>
          )}
          {job.city && (
            <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "16px" }}>📍 {job.city}{job.state ? `, ${job.state}` : ""}</div>
          )}

          {/* Apply button */}
          {isCandidate && (
            <>
              <button
                onClick={handleApply}
                disabled={applying || applied}
                style={{
                  width: "100%", padding: "13px",
                  background: applied ? "var(--green)" : "var(--pink)",
                  color: "#fff", border: "none", borderRadius: "999px",
                  fontWeight: 700, fontSize: "0.95rem", cursor: applied ? "default" : "pointer",
                }}
              >
                {applying ? "Applying..." : applied ? "✓ Applied!" : "Apply Now"}
              </button>
              {applyMsg && <div style={{ fontSize: "0.82rem", color: "var(--green)", textAlign: "center", marginTop: "8px" }}>{applyMsg}</div>}
              {applyErr && <div style={{ fontSize: "0.82rem", color: "var(--red)", textAlign: "center", marginTop: "8px" }}>{applyErr}</div>}
            </>
          )}

          {!isLoggedIn && (
            <div style={{ background: "var(--pink-light)", border: "1px solid #f8c5e0", borderRadius: "var(--radius)", padding: "12px", textAlign: "center", fontSize: "0.85rem", color: "var(--pink)" }}>
              <span onClick={() => navigate("/login")} style={{ fontWeight: 700, cursor: "pointer" }}>Login</span>
              {" "}or{" "}
              <span onClick={() => navigate("/register")} style={{ fontWeight: 700, cursor: "pointer" }}>Register</span>
              {" "}to apply
            </div>
          )}
        </div>

        {/* Meta info */}
        <div className="card" style={{ marginBottom: "12px" }}>
          {[
            ["Location",   job.city ? `${job.city}${job.state ? `, ${job.state}` : ""}` : "—"],
            ["Work Mode",  job.work_mode || "—"],
            ["Experience", job.min_experience ? `${job.min_experience}+ years` : "Any"],
            ["Education",  job.education_required || "Any"],
            ...(job.deadline ? [["Deadline", job.deadline]] : []),
          ].map(([key, val]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{key}</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        {job.description && (
          <div className="card" style={{ marginBottom: "12px" }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "1rem", marginBottom: "10px" }}>About this role</div>
            <div style={{ fontSize: "0.9rem", lineHeight: 1.8, color: "#444", whiteSpace: "pre-wrap" }}>{job.description}</div>
          </div>
        )}

        {/* Skills */}
        {(mandatory.length > 0 || optional.length > 0) && (
          <div className="card">
            {mandatory.length > 0 && (
              <>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "1rem", marginBottom: "10px" }}>Required Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: optional.length ? "16px" : 0 }}>
                  {mandatory.map(s => <SkillTag key={s.name} name={s.name} mandatory />)}
                </div>
              </>
            )}
            {optional.length > 0 && (
              <>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "1rem", marginBottom: "10px" }}>Nice to Have</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                  {optional.map(s => <SkillTag key={s.name} name={s.name} />)}
                </div>
              </>
            )}
          </div>
        )}

        {/* Report job */}
        {isLoggedIn && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            {reportDone ? (
              <div style={{ fontSize: "0.78rem", color: "var(--green)" }}>✓ Report submitted. Our team will review it.</div>
            ) : (
              <button onClick={() => setShowReport(true)} style={{
                background: "none", border: "none", color: "var(--muted)",
                fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline",
              }}>Report this job</button>
            )}
          </div>
        )}
      </div>

      {/* Report modal */}
      {showReport && (
        <>
          <div className="overlay" onClick={() => setShowReport(false)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem" }}>Report Job</span>
              <button onClick={() => setShowReport(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", color: "var(--muted)", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label className="label">Reason</label>
              <select className="input" value={reportType} onChange={e => setReportType(e.target.value)}>
                <option value="scam_job">Scam / Fake Job</option>
                <option value="fake_company">Fake Company</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="label">Details</label>
              <textarea className="input" rows={3} value={reportDesc}
                onChange={e => setReportDesc(e.target.value)}
                placeholder="Describe the issue…" style={{ resize: "none" }} />
            </div>
            <button className="btn-primary" onClick={handleReport} disabled={reporting || !reportDesc.trim()}>
              {reporting ? "Submitting…" : "Submit Report"}
            </button>
          </div>
        </>
      )}
    </>
  );
}

function Tag({ children, pink = false }) {
  return (
    <span style={{
      fontSize: "0.75rem", padding: "4px 11px", borderRadius: "999px", fontWeight: 500,
      background: pink ? "var(--pink-light)" : "var(--bg)",
      border: `1px solid ${pink ? "#f8c5e0" : "var(--border)"}`,
      color: pink ? "var(--pink)" : "var(--muted)",
    }}>{children}</span>
  );
}