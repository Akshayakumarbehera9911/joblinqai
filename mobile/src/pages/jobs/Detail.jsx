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
    setApplying(true); setApplyErr("");
    try {
      await applyJob(id);
      setApplied(true);
      setApplyMsg("Application submitted successfully!");
    } catch (e) { setApplyErr(e.message); }
    finally { setApplying(false); }
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
    } catch { }
    finally { setReporting(false); }
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
        <div style={{ color: "var(--muted)", marginBottom: 16 }}>Job not found</div>
        <button className="btn-outline" style={{ width: "auto", padding: "10px 24px" }} onClick={() => navigate("/jobs")}>← Back to Jobs</button>
      </div>
    </>
  );

  const salary    = formatSalary(job.salary_min, job.salary_max, job.salary_type);
  const mandatory = (job.skills || []).filter(s => s.mandatory);
  const optional  = (job.skills || []).filter(s => !s.mandatory);
  const isCandidate = isLoggedIn && role === "candidate";

  return (
    <>
      <TopBar title={job.title} back backTo="/jobs" />

      <div className="page" style={{ padding: "calc(var(--topbar-height) + 14px) 14px calc(var(--nav-height) + 20px)" }}>

        {/* ── Header card ── */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 14px", marginBottom: 10 }}>

          {/* Company + verified */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              {job.company?.name || "Unknown"}{job.company?.industry ? ` · ${job.company.industry}` : ""}
            </span>
            {job.company?.is_verified && (
              <span style={{
                fontSize: "0.6rem", color: "#1a7a4a", fontWeight: 700,
                background: "rgba(45,158,107,.1)", padding: "2px 7px",
                borderRadius: 999, border: "1px solid rgba(45,158,107,.2)",
              }}>✓ Verified</span>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: "1.35rem", marginBottom: 12, lineHeight: 1.2 }}>{job.title}</h1>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {job.work_mode  && <Tag pink>{job.work_mode}</Tag>}
            {job.job_type   && <Tag>{job.job_type}</Tag>}
            {job.role_type  && <Tag>{job.role_type}</Tag>}
            {job.min_experience > 0 && <Tag>{job.min_experience}+ yrs exp</Tag>}
            {job.openings   && <Tag>{job.openings} opening{job.openings > 1 ? "s" : ""}</Tag>}
          </div>

          {/* Salary */}
          {salary && (
            <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: "1.45rem", marginBottom: 6, color: "var(--black)" }}>{salary}</div>
          )}

          {/* Location */}
          {job.city && (
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 14, display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              {job.city}{job.state ? `, ${job.state}` : ""}
            </div>
          )}

          {/* Apply button */}
          {isCandidate && (
            <div>
              <button onClick={handleApply} disabled={applying || applied} style={{
                width: "100%", padding: "12px",
                background: applied ? "var(--green)" : applying ? "#f0b8d8" : "#0A66C2",
                color: "#fff", border: "none", borderRadius: 10,
                fontWeight: 700, fontSize: "0.92rem",
                cursor: applied || applying ? "default" : "pointer",
                transition: "background 0.2s",
              }}>
                {applying ? "Applying…" : applied ? "✓ Applied!" : "Apply Now"}
              </button>
              {applyMsg && <div style={{ fontSize: "0.78rem", color: "var(--green)", textAlign: "center", marginTop: 8 }}>{applyMsg}</div>}
              {applyErr && <div style={{ fontSize: "0.78rem", color: "var(--red)", textAlign: "center", marginTop: 8 }}>{applyErr}</div>}
            </div>
          )}

          {!isLoggedIn && (
            <div style={{
              background: "#E8F0FA", border: "1px solid #b3d0f5",
              borderRadius: 10, padding: "12px", textAlign: "center",
              fontSize: "0.85rem", color: "#0A66C2",
            }}>
              <span onClick={() => navigate("/login")} style={{ fontWeight: 700, cursor: "pointer" }}>Login</span>
              {" "}or{" "}
              <span onClick={() => navigate("/register")} style={{ fontWeight: 700, cursor: "pointer" }}>Register</span>
              {" "}to apply
            </div>
          )}
        </div>

        {/* ── Meta info ── */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
          {[
            ["Location",   job.city ? `${job.city}${job.state ? `, ${job.state}` : ""}` : null],
            ["Work Mode",  job.work_mode || null],
            ["Experience", job.min_experience ? `${job.min_experience}+ years` : "Any"],
            ["Education",  job.education_required || "Any"],
            ...(job.deadline ? [["Deadline", job.deadline]] : []),
          ].filter(([, v]) => v).map(([key, val], i, arr) => (
            <div key={key} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px",
              borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{key}</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, textTransform: "capitalize" }}>{val}</span>
            </div>
          ))}
        </div>

        {/* ── Description ── */}
        {job.description && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px", marginBottom: 10 }}>
            <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: "1rem", marginBottom: 10 }}>About this role</div>
            <div style={{ fontSize: "0.85rem", lineHeight: 1.8, color: "#444", whiteSpace: "pre-wrap" }}>{job.description}</div>
          </div>
        )}

        {/* ── Skills ── */}
        {(mandatory.length > 0 || optional.length > 0) && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px", marginBottom: 10 }}>
            {mandatory.length > 0 && (
              <div style={{ marginBottom: optional.length ? 14 : 0 }}>
                <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: "1rem", marginBottom: 10 }}>Required Skills</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {mandatory.map(s => <SkillTag key={s.name} name={s.name} mandatory />)}
                </div>
              </div>
            )}
            {optional.length > 0 && (
              <div>
                <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: "1rem", marginBottom: 10 }}>Nice to Have</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {optional.map(s => <SkillTag key={s.name} name={s.name} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Report ── */}
        {isLoggedIn && (
          <div style={{ textAlign: "center", marginTop: 8, marginBottom: 4 }}>
            {reportDone ? (
              <div style={{ fontSize: "0.75rem", color: "var(--green)" }}>✓ Report submitted. Our team will review it.</div>
            ) : (
              <button onClick={() => setShowReport(true)} style={{
                background: "none", border: "none", color: "var(--muted)",
                fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline",
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
              <span style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: "1.05rem" }}>Report Job</span>
              <button onClick={() => setShowReport(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", fontWeight: 700, color: "var(--muted)", cursor: "pointer" }}>×</button>
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
      fontSize: "0.73rem", padding: "4px 11px", borderRadius: 999, fontWeight: 500,
      background: pink ? "#E8F0FA" : "var(--bg)",
      border: `1px solid ${pink ? "#b3d0f5" : "var(--border)"}`,
      color: pink ? "#0A66C2" : "var(--muted)",
    }}>{children}</span>
  );
}