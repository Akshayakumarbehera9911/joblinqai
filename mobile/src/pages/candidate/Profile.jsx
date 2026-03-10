import { useState, useEffect } from "react";
import TopBar    from "../../components/TopBar";
import Spinner   from "../../components/Spinner";
import SkillTag  from "../../components/SkillTag";
import { useAuth } from "../../context/AuthContext";
import { setSkillSuggestionsCount } from "../../components/BottomNav";
import {
  getProfile, updateProfile,
  getSkills, addSkill, deleteSkill,
  getSkillSuggestions,
  getProjects, addProject, deleteProject,
  getCertifications, addCertification, deleteCertification,
  uploadResume, uploadPhoto, deletePhoto,
} from "../../api/candidate";

const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "expert"];

/* ── tiny helpers ── */
const sectionLabel = (text) => (
  <div style={{
    fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "var(--muted)", opacity: 0.7,
    marginBottom: "10px", marginTop: "4px",
  }}>{text}</div>
);

const Divider = () => (
  <div style={{ height: 1, background: "var(--border)", opacity: 0.6, margin: "4px 0 16px" }} />
);

export default function CandidateProfile() {
  const { logout, user } = useAuth();
  const [profile,  setProfile]  = useState(null);
  const [skills,   setSkills]   = useState([]);
  const [projects, setProjects] = useState([]);
  const [certs,    setCerts]    = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [addingSkill, setAddingSkill] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");
  const [tab,      setTab]      = useState("profile");

  const [newSkill, setNewSkill] = useState({ skill_name: "", category: "", level: "intermediate" });
  const [newProj,  setNewProj]  = useState({ title: "", description: "", tech_stack: "", project_url: "" });
  const [newCert,  setNewCert]  = useState({ cert_name: "", platform: "", year_completed: "", cert_url: "" });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [p, s, pr, c] = await Promise.all([
        getProfile(), getSkills(), getProjects(), getCertifications()
      ]);
      setProfile(p.data?.profile || null);
      const skillData = s.data || [];
      setSkills(skillData);
      setProjects(pr.data || []);
      setCerts(c.data || []);
      loadSuggestions(skillData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadSuggestions(currentSkills) {
    try {
      const res = await getSkillSuggestions();
      const suggested = res.data || [];
      const currentNames = new Set(currentSkills.map(s => s.skill_name.toLowerCase()));
      const filtered = suggested.filter(s => !currentNames.has(s.toLowerCase()));
      setSuggestions(filtered);
      setSkillSuggestionsCount(filtered.length);
    } catch (e) { /* non-critical */ }
  }

  async function handleAddSuggestedSkill(skillName) {
    setAddingSkill(skillName);
    try {
      await addSkill([{ skill_name: skillName, category: "", level: "intermediate" }]);
      const res = await getSkills();
      setSkills(res.data || []);
      const remaining = suggestions.filter(s => s !== skillName);
      setSuggestions(remaining);
      setSkillSuggestionsCount(remaining.length);
    } catch (e) { alert(e.message); }
    finally { setAddingSkill(null); }
  }

  function handleDismissSuggestions() {
    setSuggestions([]);
    setSkillSuggestionsCount(0);
  }

  async function saveProfile() {
    setSaving(true); setMsg("");
    try {
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
    try {
      await uploadResume(fd);
      setMsg("Resume uploaded!");
      const s = await getSkills();
      setSkills(s.data || []);
      loadSuggestions(s.data || []);
    } catch (e) { setMsg(e.message); }
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

  async function handleDeletePhoto() {
    if (!window.confirm("Remove profile photo?")) return;
    try {
      await deletePhoto();
      setMsg("Photo removed!");
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

  const TABS = [
    { key: "profile",  label: "Profile"  },
    { key: "skills",   label: "Skills"   },
    { key: "projects", label: "Projects" },
    { key: "certs",    label: "Certs"    },
  ];

  return (
    <>
      <TopBar title="Profile" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 14px) 14px calc(var(--nav-height) + 24px)" }}>

        {/* ── Avatar + name card ── */}
        <div className="card" style={{
          borderRadius: "16px", padding: "16px",
          display: "flex", alignItems: "center", gap: "14px",
          marginBottom: "16px",
        }}>
          {/* Avatar with edit button */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <img
              src={profile?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=E8398A&color=fff`}
              style={{ width: 68, height: 68, borderRadius: "50%", objectFit: "cover", border: "2.5px solid var(--border)" }}
              onError={e => { e.target.src = `https://ui-avatars.com/api/?name=U&background=E8398A&color=fff`; }}
            />
            <label style={{
              position: "absolute", bottom: 1, right: 1,
              width: 22, height: 22, borderRadius: "50%",
              background: "var(--pink)", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}>
              <span style={{ color: "#fff", fontSize: "0.65rem", lineHeight: 1 }}>✎</span>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
            </label>
            {profile?.photo_url && (
              <button onClick={handleDeletePhoto} style={{
                position: "absolute", top: 0, left: 0,
                width: 18, height: 18, borderRadius: "50%",
                background: "var(--red)", border: "2px solid #fff",
                color: "#fff", fontSize: "0.55rem", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 0,
              }}>✕</button>
            )}
          </div>

          {/* Name + subtitle */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--font-serif)", fontSize: "1.05rem", fontWeight: 600,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{displayName}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "2px" }}>
              {profile?.current_title || profile?.education_field || "Add your details below"}
            </div>
            {profile?.city && profile?.state && (
              <div style={{ fontSize: "0.73rem", color: "var(--muted)", marginTop: "3px", opacity: 0.8 }}>
                {profile.city}, {profile.state}
              </div>
            )}
          </div>
        </div>

        {/* ── Tab switcher ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px", marginBottom: "18px" }}>
          {TABS.map(t => {
            const hasSkillDot = t.key === "skills" && suggestions.length > 0 && tab !== "skills";
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "8px 4px",
                border: `1.5px solid ${tab === t.key ? "var(--pink)" : "var(--border)"}`,
                borderRadius: "10px",
                background: tab === t.key ? "var(--pink-light)" : "var(--card)",
                color: tab === t.key ? "var(--pink)" : "var(--muted)",
                fontSize: "0.7rem", fontWeight: tab === t.key ? 700 : 500,
                cursor: "pointer", position: "relative",
                transition: "border-color 0.15s, background 0.15s, color 0.15s",
              }}>
                {t.label}
                {hasSkillDot && (
                  <span style={{
                    position: "absolute", top: 4, right: 6,
                    width: 7, height: 7, borderRadius: "50%",
                    background: "var(--pink)", border: "1.5px solid var(--card)",
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Inline message ── */}
        {msg && (
          <div className={`alert ${msg.includes("!") ? "alert-success" : "alert-error"}`}
            style={{ marginBottom: "14px", borderRadius: "10px" }}>
            {msg}
          </div>
        )}

        {/* ══ Profile tab ══ */}
        {tab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

            {profile === null && (
              <div className="alert alert-error" style={{ marginBottom: "14px", borderRadius: "10px" }}>
                No profile found. Fill in your details and save to create one.
              </div>
            )}

            {/* Personal */}
            {sectionLabel("Personal")}
            {[
              { label: "Gender",        key: "gender",        type: "text", placeholder: "Male / Female / Other" },
              { label: "Date of Birth", key: "date_of_birth", type: "date" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: "10px" }}>
                <label className="label">{label}</label>
                <input className="input" type={type} placeholder={placeholder || label}
                  value={(profile?.[key]) ?? ""}
                  onChange={e => setProfile(p => ({ ...(p || {}), [key]: e.target.value }))} />
              </div>
            ))}

            <Divider />
            {sectionLabel("Location")}
            {[
              { label: "City",     key: "city",     type: "text" },
              { label: "District", key: "district", type: "text" },
              { label: "State",    key: "state",    type: "text" },
              { label: "Pincode",  key: "pincode",  type: "text" },
            ].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: "10px" }}>
                <label className="label">{label}</label>
                <input className="input" type={type} placeholder={label}
                  value={(profile?.[key]) ?? ""}
                  onChange={e => setProfile(p => ({ ...(p || {}), [key]: e.target.value }))} />
              </div>
            ))}

            <Divider />
            {sectionLabel("Education")}
            {[
              { label: "Education Level", key: "education_level", type: "text", placeholder: "e.g. B.Tech, MBA" },
              { label: "Education Field", key: "education_field", type: "text", placeholder: "e.g. Computer Science" },
              { label: "Institution",     key: "institution",     type: "text" },
              { label: "Passing Year",    key: "passing_year",    type: "number" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: "10px" }}>
                <label className="label">{label}</label>
                <input className="input" type={type} placeholder={placeholder || label}
                  value={(profile?.[key]) ?? ""}
                  onChange={e => setProfile(p => ({ ...(p || {}), [key]: e.target.value }))} />
              </div>
            ))}

            <Divider />
            {sectionLabel("Career")}
            {[
              { label: "Experience",    key: "experience",    type: "text", placeholder: "e.g. 2 years, Fresher" },
              { label: "Current Title", key: "current_title", type: "text", placeholder: "e.g. Software Engineer" },
              { label: "Industry",      key: "industry",      type: "text" },
              { label: "Target Role",   key: "target_role",   type: "text", placeholder: "e.g. Frontend Developer" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: "10px" }}>
                <label className="label">{label}</label>
                <input className="input" type={type} placeholder={placeholder || label}
                  value={(profile?.[key]) ?? ""}
                  onChange={e => setProfile(p => ({ ...(p || {}), [key]: e.target.value }))} />
              </div>
            ))}

            <Divider />
            {sectionLabel("Preferences")}
            {[
              { label: "Job Type",     key: "job_type",     type: "text", placeholder: "full-time / part-time" },
              { label: "Work Mode",    key: "work_mode",    type: "text", placeholder: "remote / onsite / hybrid" },
              { label: "Availability", key: "availability", type: "text", placeholder: "Immediate / 1 month" },
              { label: "Expected Salary Min (₹)", key: "expected_salary_min", type: "number" },
              { label: "Expected Salary Max (₹)", key: "expected_salary_max", type: "number" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: "10px" }}>
                <label className="label">{label}</label>
                <input className="input" type={type} placeholder={placeholder || label}
                  value={(profile?.[key]) ?? ""}
                  onChange={e => setProfile(p => ({ ...(p || {}), [key]: e.target.value }))} />
              </div>
            ))}

            <Divider />
            {sectionLabel("Resume")}
            <div style={{ marginBottom: "16px" }}>
              {profile?.resume_url && (
                <a href={profile.resume_url} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.82rem", color: "var(--pink)", marginBottom: "8px" }}>
                  View current resume →
                </a>
              )}
              <input type="file" accept=".pdf" onChange={handleResumeUpload}
                style={{ fontSize: "0.82rem", color: "var(--muted)", display: "block" }} />
            </div>

            <button className="btn-primary" onClick={saveProfile} disabled={saving} style={{ marginBottom: "10px" }}>
              {saving ? "Saving…" : "Save Profile"}
            </button>

            <button onClick={logout} style={{
              width: "100%", padding: "12px",
              background: "none", border: "1.5px solid var(--border)",
              borderRadius: "999px", color: "var(--red)",
              fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
              letterSpacing: "0.01em",
            }}>Logout</button>
          </div>
        )}

        {/* ══ Skills tab ══ */}
        {tab === "skills" && (
          <div>
            {/* ── Resume Skill Suggestions ── */}
            {suggestions.length > 0 && (
              <div style={{
                background: "var(--pink-light)", border: "1.5px solid #f8c5e0",
                borderRadius: 12, padding: "12px 14px", marginBottom: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--pink)" }}>
                    📄 Found in your resume
                  </span>
                  <button onClick={handleDismissSuggestions} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "0.7rem", color: "var(--muted)", fontWeight: 600,
                  }}>Dismiss all</button>
                </div>
                <div style={{ fontSize: "0.73rem", color: "var(--muted)", marginBottom: 10 }}>
                  These skills were detected in your resume but aren't in your profile yet. Add the ones that apply.
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {suggestions.map(skill => (
                    <button key={skill} onClick={() => handleAddSuggestedSkill(skill)}
                      disabled={addingSkill === skill}
                      style={{
                        padding: "5px 11px",
                        background: addingSkill === skill ? "#f0b8d8" : "#fff",
                        border: "1.5px solid #f8c5e0", borderRadius: 999,
                        cursor: "pointer", fontSize: "0.75rem", fontWeight: 700,
                        color: "var(--pink)",
                      }}>
                      {addingSkill === skill ? "Adding…" : `+ ${skill}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Existing skills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px", minHeight: "32px" }}>
              {skills.length === 0
                ? <div style={{ fontSize: "0.83rem", color: "var(--muted)" }}>No skills added yet</div>
                : skills.map(s => (
                    <SkillTag key={s.id}
                      name={`${s.skill_name}${s.level ? ` · ${s.level}` : ""}`}
                      onRemove={() => handleDeleteSkill(s.id)} />
                  ))
              }
            </div>

            <div style={{ height: 1, background: "var(--border)", opacity: 0.6, marginBottom: "14px" }} />
            {sectionLabel("Add Skill")}

            <input className="input" type="text" placeholder="Skill name *" style={{ marginBottom: "8px" }}
              value={newSkill.skill_name}
              onChange={e => setNewSkill(s => ({ ...s, skill_name: e.target.value }))} />

            <select className="input" style={{ marginBottom: "8px" }}
              value={newSkill.category}
              onChange={e => setNewSkill(s => ({ ...s, category: e.target.value }))}>
              <option value="">Category (optional)</option>
              <option value="Programming">Programming Language</option>
              <option value="Framework">Framework / Library</option>
              <option value="Database">Database</option>
              <option value="Tool">Tool / Software</option>
              <option value="Cloud">Cloud / DevOps</option>
              <option value="Soft Skill">Soft Skill</option>
              <option value="Domain">Domain Knowledge</option>
              <option value="Other">Other</option>
            </select>

            <select className="input" style={{ marginBottom: "14px" }}
              value={newSkill.level}
              onChange={e => setNewSkill(s => ({ ...s, level: e.target.value }))}>
              {SKILL_LEVELS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>

            <button className="btn-primary" onClick={handleAddSkill}>Add Skill</button>
          </div>
        )}

        {/* ══ Projects tab ══ */}
        {tab === "projects" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: projects.length ? "20px" : "0" }}>
              {projects.map(p => (
                <div key={p.id} className="card" style={{ borderRadius: "14px", padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{
                      fontWeight: 700, fontSize: "0.9rem",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                    }}>{p.title}</div>
                    <button onClick={() => handleDeleteProject(p.id)} style={{
                      flexShrink: 0, background: "none", border: "none",
                      color: "var(--red)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, padding: 0,
                    }}>Remove</button>
                  </div>

                  {p.tech_stack && (
                    <div style={{ fontSize: "0.75rem", color: "var(--pink)", fontWeight: 600, marginTop: "5px" }}>
                      {p.tech_stack}
                    </div>
                  )}
                  {p.description && (
                    <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "6px", lineHeight: 1.5 }}>
                      {p.description}
                    </div>
                  )}
                  {p.project_url && (
                    <a href={p.project_url} target="_blank" rel="noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.76rem", color: "var(--pink)", marginTop: "8px", fontWeight: 600 }}>
                      View project →
                    </a>
                  )}
                </div>
              ))}
            </div>

            {projects.length > 0 && <div style={{ height: 1, background: "var(--border)", opacity: 0.6, marginBottom: "14px" }} />}
            {sectionLabel("Add Project")}

            {[
              { label: "Title *",     key: "title",       type: "text" },
              { label: "Tech Stack",  key: "tech_stack",  type: "text", placeholder: "e.g. React, Node.js" },
              { label: "Project URL", key: "project_url", type: "url" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: "10px" }}>
                <label className="label">{label}</label>
                <input className="input" type={type} placeholder={placeholder || label}
                  value={newProj[key]} onChange={e => setNewProj(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}

            <div style={{ marginBottom: "14px" }}>
              <label className="label">Description</label>
              <textarea className="input" rows={3} placeholder="Describe your project"
                value={newProj.description} onChange={e => setNewProj(p => ({ ...p, description: e.target.value }))}
                style={{ resize: "vertical" }} />
            </div>
            <button className="btn-primary" onClick={handleAddProject}>Add Project</button>
          </div>
        )}

        {/* ══ Certs tab ══ */}
        {tab === "certs" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: certs.length ? "20px" : "0" }}>
              {certs.map(c => (
                <div key={c.id} className="card" style={{ borderRadius: "14px", padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", flex: 1 }}>{c.cert_name}</div>
                    <button onClick={() => handleDeleteCert(c.id)} style={{
                      flexShrink: 0, background: "none", border: "none",
                      color: "var(--red)", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, padding: 0,
                    }}>Remove</button>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "5px" }}>
                    {c.platform && (
                      <span style={{
                        padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600,
                        background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)",
                      }}>{c.platform}</span>
                    )}
                    {c.year_completed && (
                      <span style={{ fontSize: "0.73rem", color: "var(--muted)" }}>{c.year_completed}</span>
                    )}
                  </div>

                  {c.cert_url && (
                    <a href={c.cert_url} target="_blank" rel="noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.76rem", color: "var(--pink)", marginTop: "8px", fontWeight: 600 }}>
                      View certificate →
                    </a>
                  )}
                </div>
              ))}
            </div>

            {certs.length > 0 && <div style={{ height: 1, background: "var(--border)", opacity: 0.6, marginBottom: "14px" }} />}
            {sectionLabel("Add Certification")}

            {[
              { label: "Certificate Name *", key: "cert_name",      type: "text" },
              { label: "Platform / Issuer",  key: "platform",       type: "text", placeholder: "e.g. Coursera, NPTEL" },
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