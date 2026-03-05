import { useState, useEffect } from "react";
import TopBar    from "../../components/TopBar";
import Spinner   from "../../components/Spinner";
import SkillTag  from "../../components/SkillTag";
import { useAuth } from "../../context/AuthContext";
import {
  getProfile, updateProfile,
  getSkills, addSkill, deleteSkill,
  getProjects, addProject, deleteProject,
  getCertifications, addCertification, deleteCertification,
  uploadResume, uploadPhoto,
} from "../../api/candidate";

// Match actual backend SkillCreate schema
const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "expert"];

export default function CandidateProfile() {
  const { logout, user } = useAuth();
  const [profile,  setProfile]  = useState(null);
  const [skills,   setSkills]   = useState([]);
  const [projects, setProjects] = useState([]);
  const [certs,    setCerts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");
  const [tab,      setTab]      = useState("profile");

  // Skill form — matches SkillCreate: skill_name, category, level
  const [newSkill, setNewSkill] = useState({ skill_name: "", category: "", level: "intermediate" });
  // Project form — matches ProjectCreate: title, description, tech_stack, project_url
  const [newProj,  setNewProj]  = useState({ title: "", description: "", tech_stack: "", project_url: "" });
  // Cert form — matches CertCreate: cert_name, platform, year_completed, cert_url
  const [newCert,  setNewCert]  = useState({ cert_name: "", platform: "", year_completed: "", cert_url: "" });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, s, pr, c] = await Promise.all([
        getProfile(), getSkills(), getProjects(), getCertifications()
      ]);
      // API returns data.profile (nested) for profile
      setProfile(p.data?.profile || null);
      setSkills(s.data || []);
      setProjects(pr.data || []);
      setCerts(c.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function saveProfile() {
    setSaving(true); setMsg("");
    try {
      // Only send fields the backend accepts (ProfileCreate schema)
      const payload = {
        gender:              profile.gender,
        date_of_birth:       profile.date_of_birth,
        state:               profile.state,
        district:            profile.district,
        city:                profile.city,
        pincode:             profile.pincode,
        education_level:     profile.education_level,
        education_field:     profile.education_field,
        institution:         profile.institution,
        passing_year:        profile.passing_year ? parseInt(profile.passing_year) : null,
        experience:          profile.experience,
        current_title:       profile.current_title,
        industry:            profile.industry,
        target_role:         profile.target_role,
        job_type:            profile.job_type,
        work_mode:           profile.work_mode,
        availability:        profile.availability,
        expected_salary_min: profile.expected_salary_min ? parseInt(profile.expected_salary_min) : null,
        expected_salary_max: profile.expected_salary_max ? parseInt(profile.expected_salary_max) : null,
      };
      await updateProfile(payload);
      setMsg("Profile saved!");
    } catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  }

  // Skills — POST expects array: [{skill_name, category, level}]
  async function handleAddSkill() {
    if (!newSkill.skill_name.trim()) return;
    try {
      await addSkill([newSkill]);
      setNewSkill({ skill_name: "", category: "", level: "intermediate" });
      const res = await getSkills();
      setSkills(res.data || []);
    } catch (e) { alert(e.message); }
  }

  async function handleDeleteSkill(id) {
    try {
      await deleteSkill(id);
      setSkills(prev => prev.filter(s => s.id !== id));
    } catch (e) { alert(e.message); }
  }

  async function handleAddProject() {
    if (!newProj.title.trim()) return;
    try {
      await addProject(newProj);
      setNewProj({ title: "", description: "", tech_stack: "", project_url: "" });
      const res = await getProjects();
      setProjects(res.data || []);
    } catch (e) { alert(e.message); }
  }

  async function handleDeleteProject(id) {
    try { await deleteProject(id); setProjects(prev => prev.filter(p => p.id !== id)); }
    catch (e) { alert(e.message); }
  }

  async function handleAddCert() {
    if (!newCert.cert_name.trim()) return;
    try {
      await addCertification({ ...newCert, year_completed: newCert.year_completed ? parseInt(newCert.year_completed) : null });
      setNewCert({ cert_name: "", platform: "", year_completed: "", cert_url: "" });
      const res = await getCertifications();
      setCerts(res.data || []);
    } catch (e) { alert(e.message); }
  }

  async function handleDeleteCert(id) {
    try { await deleteCertification(id); setCerts(prev => prev.filter(c => c.id !== id)); }
    catch (e) { alert(e.message); }
  }

  async function handleResumeUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try { await uploadResume(fd); setMsg("Resume uploaded!"); }
    catch (e) { setMsg(e.message); }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    try {
      await uploadPhoto(fd);
      setMsg("Photo updated!");
      loadAll();
    } catch (e) { setMsg(e.message); }
  }

  if (loading) return (
    <>
      <TopBar title="Profile" />
      <div className="page"><Spinner /></div>
    </>
  );

  const displayName = user?.full_name || "Candidate";

  return (
    <>
      <TopBar title="Profile" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 12px) 16px calc(var(--nav-height) + 20px)" }}>

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <img
              src={profile?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=E8398A&color=fff`}
              style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)" }}
              onError={e => { e.target.src = `https://ui-avatars.com/api/?name=U&background=E8398A&color=fff`; }}
            />
            <label style={{
              position: "absolute", bottom: 0, right: 0,
              width: 22, height: 22, borderRadius: "50%",
              background: "var(--pink)", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", border: "2px solid #fff",
            }}>
              <span style={{ color: "#fff", fontSize: "0.7rem", lineHeight: 1 }}>✎</span>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
            </label>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}>{displayName}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              {profile?.current_title || profile?.education_field || "Add your details below"}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "4px", marginBottom: "20px" }}>
          {["profile", "skills", "projects", "certs"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 4px",
              border: `1.5px solid ${tab === t ? "var(--pink)" : "var(--border)"}`,
              borderRadius: "var(--radius)",
              background: tab === t ? "var(--pink-light)" : "var(--card)",
              color: tab === t ? "var(--pink)" : "var(--muted)",
              fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
            }}>{t}</button>
          ))}
        </div>

        {msg && <div className={`alert ${msg.includes("!") ? "alert-success" : "alert-error"}`} style={{ marginBottom: "16px" }}>{msg}</div>}

        {/* ── Profile tab ── */}
        {tab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

            {profile === null && (
              <div className="alert alert-error">No profile found. Fill in your details and save to create one.</div>
            )}

            {[
              { label: "Gender",         key: "gender",         type: "text",   placeholder: "Male / Female / Other" },
              { label: "Date of Birth",  key: "date_of_birth",  type: "date" },
              { label: "City",           key: "city",           type: "text" },
              { label: "State",          key: "state",          type: "text" },
              { label: "District",       key: "district",       type: "text" },
              { label: "Pincode",        key: "pincode",        type: "text" },
              { label: "Education Level",key: "education_level",type: "text",   placeholder: "e.g. B.Tech, MBA" },
              { label: "Education Field",key: "education_field",type: "text",   placeholder: "e.g. Computer Science" },
              { label: "Institution",    key: "institution",    type: "text" },
              { label: "Passing Year",   key: "passing_year",   type: "number" },
              { label: "Experience",     key: "experience",     type: "text",   placeholder: "e.g. 2 years, Fresher" },
              { label: "Current Title",  key: "current_title",  type: "text",   placeholder: "e.g. Software Engineer" },
              { label: "Industry",       key: "industry",       type: "text" },
              { label: "Target Role",    key: "target_role",    type: "text",   placeholder: "e.g. Frontend Developer" },
              { label: "Job Type",       key: "job_type",       type: "text",   placeholder: "full-time / part-time" },
              { label: "Work Mode",      key: "work_mode",      type: "text",   placeholder: "remote / onsite / hybrid" },
              { label: "Availability",   key: "availability",   type: "text",   placeholder: "Immediate / 1 month" },
              { label: "Expected Salary Min (₹)", key: "expected_salary_min", type: "number" },
              { label: "Expected Salary Max (₹)", key: "expected_salary_max", type: "number" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input className="input" type={type} placeholder={placeholder || label}
                  value={(profile?.[key]) ?? ""}
                  onChange={e => setProfile(p => ({ ...(p || {}), [key]: e.target.value }))}
                />
              </div>
            ))}

            {/* Resume */}
            <div>
              <label className="label">Resume (PDF)</label>
              {profile?.resume_url && (
                <a href={profile.resume_url} target="_blank" rel="noreferrer"
                  style={{ display: "block", fontSize: "0.82rem", color: "var(--pink)", marginBottom: "6px" }}>
                  View current resume →
                </a>
              )}
              <input type="file" accept=".pdf" onChange={handleResumeUpload}
                style={{ fontSize: "0.85rem", color: "var(--muted)" }} />
            </div>

            <button className="btn-primary" onClick={saveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>

            <button onClick={logout} style={{
              width: "100%", padding: "12px", marginTop: "4px",
              background: "none", border: "1.5px solid var(--border)",
              borderRadius: "999px", color: "var(--red)",
              fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
            }}>Logout</button>
          </div>
        )}

        {/* ── Skills tab ── */}
        {tab === "skills" && (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
              {skills.map(s => (
                <SkillTag key={s.id} name={`${s.skill_name}${s.level ? ` · ${s.level}` : ""}`}
                  onRemove={() => handleDeleteSkill(s.id)} />
              ))}
              {skills.length === 0 && <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>No skills added yet</div>}
            </div>

            <label className="label">Add Skill</label>
            <input className="input" type="text" placeholder="Skill name" style={{ marginBottom: "8px" }}
              value={newSkill.skill_name}
              onChange={e => setNewSkill(s => ({ ...s, skill_name: e.target.value }))} />
            <input className="input" type="text" placeholder="Category (e.g. Programming)" style={{ marginBottom: "8px" }}
              value={newSkill.category}
              onChange={e => setNewSkill(s => ({ ...s, category: e.target.value }))} />
            <select className="input" style={{ marginBottom: "12px" }}
              value={newSkill.level}
              onChange={e => setNewSkill(s => ({ ...s, level: e.target.value }))}>
              {SKILL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <button className="btn-primary" onClick={handleAddSkill}>Add Skill</button>
          </div>
        )}

        {/* ── Projects tab ── */}
        {tab === "projects" && (
          <div>
            {projects.map(p => (
              <div key={p.id} className="card" style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 700 }}>{p.title}</div>
                  <button onClick={() => handleDeleteProject(p.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "0.8rem" }}>Remove</button>
                </div>
                {p.tech_stack && <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "4px" }}>{p.tech_stack}</div>}
                {p.description && <div style={{ fontSize: "0.85rem", marginTop: "6px" }}>{p.description}</div>}
              </div>
            ))}

            <label className="label" style={{ marginTop: "16px", display: "block" }}>Add Project</label>
            {[
              { label: "Title *",      key: "title",       type: "text" },
              { label: "Tech Stack",   key: "tech_stack",  type: "text", placeholder: "e.g. React, Node.js" },
              { label: "Project URL",  key: "project_url", type: "url" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: "10px" }}>
                <label className="label">{label}</label>
                <input className="input" type={type} placeholder={placeholder || label}
                  value={newProj[key]} onChange={e => setNewProj(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div style={{ marginBottom: "12px" }}>
              <label className="label">Description</label>
              <textarea className="input" rows={3} placeholder="Describe your project"
                value={newProj.description} onChange={e => setNewProj(p => ({ ...p, description: e.target.value }))}
                style={{ resize: "vertical" }} />
            </div>
            <button className="btn-primary" onClick={handleAddProject}>Add Project</button>
          </div>
        )}

        {/* ── Certs tab ── */}
        {tab === "certs" && (
          <div>
            {certs.map(c => (
              <div key={c.id} className="card" style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 700 }}>{c.cert_name}</div>
                  <button onClick={() => handleDeleteCert(c.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "0.8rem" }}>Remove</button>
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "4px" }}>
                  {c.platform}{c.year_completed ? ` · ${c.year_completed}` : ""}
                </div>
              </div>
            ))}

            <label className="label" style={{ marginTop: "16px", display: "block" }}>Add Certification</label>
            {[
              { label: "Certificate Name *", key: "cert_name",      type: "text" },
              { label: "Platform/Issuer",    key: "platform",       type: "text", placeholder: "e.g. Coursera, NPTEL" },
              { label: "Year Completed",     key: "year_completed", type: "number" },
              { label: "Certificate URL",    key: "cert_url",       type: "url" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: "10px" }}>
                <label className="label">{label}</label>
                <input className="input" type={type} placeholder={placeholder || label}
                  value={newCert[key]} onChange={e => setNewCert(c => ({ ...c, [key]: e.target.value }))} />
              </div>
            ))}
            <button className="btn-primary" onClick={handleAddCert}>Add Certification</button>
          </div>
        )}
      </div>
    </>
  );
}