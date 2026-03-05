import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TopBar  from "../../components/TopBar";
import Spinner from "../../components/Spinner";
import { getCompany, createJob } from "../../api/hr";

const JOB_TYPES    = ["full-time", "part-time", "contract", "internship"];
const WORK_MODES   = ["onsite", "remote", "hybrid"];
const ROLE_TYPES   = ["technical", "non-technical", "blue-collar"];
const SALARY_TYPES = ["per month", "per year", "per hour", "per day", "fixed"];

export default function HRPostJob() {
  const [company,   setCompany]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState("");
  const [job, setJob] = useState({
    title: "", category: "", role_type: "", job_type: "", work_mode: "",
    openings: 1, state: "", district: "", city: "", full_address: "",
    latitude: "", longitude: "", min_experience: "", education_required: "",
    description: "", salary_min: "", salary_max: "", salary_type: "per month",
    show_salary: true, deadline: "", max_applicants: "",
  });
  const [skills,     setSkills]     = useState([]);
  const [skillInput, setSkillInput] = useState({ skill_name: "", is_mandatory: false });
  const [locationQuery,       setLocationQuery]       = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const locationTimer = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    getCompany()
      .then(res => setCompany(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function searchLocation(q) {
    if (q.length < 3) { setLocationSuggestions([]); return; }
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=in&limit=5&format=json&addressdetails=1`);
      const data = await res.json();
      setLocationSuggestions(data);
    } catch { setLocationSuggestions([]); }
  }

  function handleLocationInput(val) {
    setLocationQuery(val);
    clearTimeout(locationTimer.current);
    locationTimer.current = setTimeout(() => searchLocation(val), 400);
  }

  function selectLocation(place) {
    const addr = place.address || {};
    setJob(j => ({
      ...j,
      city:        addr.city || addr.town || addr.village || addr.county || "",
      state:       addr.state || "",
      district:    addr.county || addr.state_district || "",
      latitude:    parseFloat(place.lat),
      longitude:   parseFloat(place.lon),
      full_address: place.display_name,
    }));
    setLocationQuery(place.display_name);
    setLocationSuggestions([]);
  }

  async function postJob() {
    if (!company) { setMsg("Create a company profile first (go to Profile tab)"); return; }
    if (!job.title.trim()) { setMsg("Job title is required"); return; }
    setSaving(true); setMsg("");
    try {
      const payload = {
        ...job,
        openings:       parseInt(job.openings) || 1,
        salary_min:     job.salary_min     ? parseInt(job.salary_min)     : null,
        salary_max:     job.salary_max     ? parseInt(job.salary_max)     : null,
        max_applicants: job.max_applicants ? parseInt(job.max_applicants) : null,
        latitude:       job.latitude       ? parseFloat(job.latitude)     : null,
        longitude:      job.longitude      ? parseFloat(job.longitude)    : null,
        deadline:       job.deadline || null,
        skills,
      };
      await createJob(payload);
      setMsg("Job posted!");
      setTimeout(() => navigate("/hr/dashboard"), 1500);
    } catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <>
      <TopBar title="Post Job" back backTo="/hr/dashboard" />
      <div className="page"><Spinner /></div>
    </>
  );

  return (
    <>
      <TopBar title="Post Job" back backTo="/hr/dashboard" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 16px) 16px calc(var(--nav-height) + 20px)" }}>

        {!company && (
          <div className="alert alert-error" style={{ marginBottom: "16px" }}>
            No company profile found. Go to <span onClick={() => navigate("/hr/profile")} style={{ fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>Profile</span> to create one first.
          </div>
        )}

        {msg && <div className={`alert ${msg.includes("!") ? "alert-success" : "alert-error"}`} style={{ marginBottom: "16px" }}>{msg}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          <Field label="Job Title *">
            <input className="input" type="text" placeholder="e.g. Frontend Developer"
              value={job.title} onChange={e => setJob(j => ({ ...j, title: e.target.value }))} />
          </Field>

          <Field label="Category">
            <input className="input" type="text" placeholder="e.g. Technology, Finance"
              value={job.category} onChange={e => setJob(j => ({ ...j, category: e.target.value }))} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Field label="Job Type">
              <select className="input" value={job.job_type} onChange={e => setJob(j => ({ ...j, job_type: e.target.value }))}>
                <option value="">Select</option>
                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Work Mode">
              <select className="input" value={job.work_mode} onChange={e => setJob(j => ({ ...j, work_mode: e.target.value }))}>
                <option value="">Select</option>
                {WORK_MODES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Role Type">
            <select className="input" value={job.role_type} onChange={e => setJob(j => ({ ...j, role_type: e.target.value }))}>
              <option value="">Select</option>
              {ROLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Location">
            <input className="input" type="text" placeholder="Search city, area..."
              value={locationQuery} onChange={e => handleLocationInput(e.target.value)} />
            {locationSuggestions.length > 0 && (
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", marginTop: "4px", overflow: "hidden" }}>
                {locationSuggestions.map((s, i) => (
                  <div key={i} onClick={() => selectLocation(s)} style={{
                    padding: "10px 14px", fontSize: "0.82rem", cursor: "pointer", borderBottom: "1px solid var(--border)",
                  }}>{s.display_name}</div>
                ))}
              </div>
            )}
            {job.city && (
              <div style={{ fontSize: "0.78rem", color: "var(--green)", marginTop: "4px" }}>
                ✓ {job.city}{job.state ? `, ${job.state}` : ""}
              </div>
            )}
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Field label="Min Experience">
              <input className="input" type="text" placeholder="e.g. 2 years"
                value={job.min_experience} onChange={e => setJob(j => ({ ...j, min_experience: e.target.value }))} />
            </Field>
            <Field label="Openings">
              <input className="input" type="number" min="1"
                value={job.openings} onChange={e => setJob(j => ({ ...j, openings: e.target.value }))} />
            </Field>
          </div>

          <Field label="Education Required">
            <input className="input" type="text" placeholder="e.g. B.Tech, Any Graduate"
              value={job.education_required} onChange={e => setJob(j => ({ ...j, education_required: e.target.value }))} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Field label="Salary Min (₹)">
              <input className="input" type="number" placeholder="e.g. 30000"
                value={job.salary_min} onChange={e => setJob(j => ({ ...j, salary_min: e.target.value }))} />
            </Field>
            <Field label="Salary Max (₹)">
              <input className="input" type="number" placeholder="e.g. 50000"
                value={job.salary_max} onChange={e => setJob(j => ({ ...j, salary_max: e.target.value }))} />
            </Field>
          </div>

          <Field label="Salary Type">
            <select className="input" value={job.salary_type} onChange={e => setJob(j => ({ ...j, salary_type: e.target.value }))}>
              {SALARY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.88rem", cursor: "pointer" }}>
            <input type="checkbox" checked={job.show_salary} onChange={e => setJob(j => ({ ...j, show_salary: e.target.checked }))} />
            Show salary to candidates
          </label>

          <Field label="Application Deadline">
            <input className="input" type="date" value={job.deadline} onChange={e => setJob(j => ({ ...j, deadline: e.target.value }))} />
          </Field>

          <Field label="Description">
            <textarea className="input" rows={5} placeholder="Describe the role, responsibilities..."
              value={job.description} onChange={e => setJob(j => ({ ...j, description: e.target.value }))}
              style={{ resize: "vertical" }} />
          </Field>

          {/* Skills */}
          <div>
            <label className="label">Skills Required</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
              {skills.map((s, i) => (
                <span key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  padding: "4px 10px", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600,
                  background: s.is_mandatory ? "var(--black)" : "var(--bg)",
                  color: s.is_mandatory ? "#fff" : "var(--muted)",
                  border: s.is_mandatory ? "none" : "1px solid var(--border)",
                }}>
                  {s.skill_name}
                  <button onClick={() => setSkills(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input className="input" type="text" placeholder="Skill name" style={{ flex: 1 }}
                value={skillInput.skill_name}
                onChange={e => setSkillInput(s => ({ ...s, skill_name: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (skillInput.skill_name.trim()) {
                      setSkills(prev => [...prev, { ...skillInput }]);
                      setSkillInput({ skill_name: "", is_mandatory: false });
                    }
                  }
                }}
              />
              <button onClick={() => {
                if (skillInput.skill_name.trim()) {
                  setSkills(prev => [...prev, { ...skillInput }]);
                  setSkillInput({ skill_name: "", is_mandatory: false });
                }
              }} style={{
                padding: "0 14px", background: "var(--pink)", color: "#fff",
                border: "none", borderRadius: "var(--radius)", fontWeight: 700, cursor: "pointer",
              }}>Add</button>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", cursor: "pointer" }}>
              <input type="checkbox" checked={skillInput.is_mandatory}
                onChange={e => setSkillInput(s => ({ ...s, is_mandatory: e.target.checked }))} />
              Mark as mandatory
            </label>
          </div>

          <button className="btn-primary" onClick={postJob} disabled={saving}>
            {saving ? "Posting..." : "Post Job"}
          </button>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}