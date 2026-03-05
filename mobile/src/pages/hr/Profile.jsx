import { useState, useEffect } from "react";
import TopBar  from "../../components/TopBar";
import Spinner from "../../components/Spinner";
import { getCompany, createCompany, updateCompany, uploadLogo } from "../../api/hr";
import { useAuth } from "../../context/AuthContext";

export default function HRProfile() {
  const [company,  setCompany]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");
  const { user, logout } = useAuth();

  const [form, setForm] = useState({
    company_name: "", description: "", industry: "", company_type: "",
    company_size: "", founded_year: "", website: "", linkedin: "",
    gst_cin: "", state: "", district: "", city: "",
  });

  useEffect(() => {
    getCompany()
      .then(res => {
        if (res.data) { setCompany(res.data); setForm(res.data); }
        else { setEditing(true); } // no company yet — open form immediately
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogoUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    if (!company) { setMsg("Save company first, then upload logo"); return; }
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await uploadLogo(fd);
      setCompany(c => ({ ...c, logo_url: res.data.logo_url }));
      setMsg("Logo updated!");
    } catch (e) { setMsg(e.message); }
  }

  async function saveCompany() {
    setSaving(true); setMsg("");
    try {
      if (company) await updateCompany(form);
      else await createCompany(form);
      const res = await getCompany();
      setCompany(res.data);
      setForm(res.data);
      setEditing(false);
      setMsg("Company saved!");
    } catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <>
      <TopBar title="Profile" />
      <div className="page"><Spinner /></div>
    </>
  );

  return (
    <>
      <TopBar title="Profile" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 16px) 16px calc(var(--nav-height) + 20px)" }}>

        {/* HR user info */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--pink-light)", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>👤</div>
          <div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}>{user?.full_name}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>HR / Recruiter</div>
          </div>
        </div>

        {msg && <div className={`alert ${msg.includes("!") ? "alert-success" : "alert-error"}`} style={{ marginBottom: "16px" }}>{msg}</div>}

        {/* View mode */}
        {!editing && company && (
          <div className="card" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
              {company.logo_url ? (
                <img src={company.logo_url} style={{ width: 56, height: 56, borderRadius: "10px", objectFit: "cover", border: "1px solid var(--border)" }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: "10px", background: "var(--pink-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>🏢</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "1rem" }}>{company.company_name}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{company.industry}</div>
                {company.is_verified && <div style={{ fontSize: "0.72rem", color: "var(--green)", fontWeight: 700, marginTop: "2px" }}>✓ Verified</div>}
              </div>
            </div>

            {/* Logo upload */}
            <div style={{ marginBottom: "14px" }}>
              <label className="label">Update Logo</label>
              <input type="file" accept="image/*" onChange={handleLogoUpload}
                style={{ fontSize: "0.82rem", color: "var(--muted)" }} />
            </div>

            {[
              ["City",     company.city],
              ["State",    company.state],
              ["Size",     company.company_size],
              ["Type",     company.company_type],
              ["Founded",  company.founded_year],
              ["Website",  company.website],
              ["GST/CIN",  company.gst_cin],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{label}</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, maxWidth: "60%", textAlign: "right", wordBreak: "break-all" }}>{val}</span>
              </div>
            ))}

            <button onClick={() => setEditing(true)} style={{
              width: "100%", marginTop: "14px", padding: "11px",
              background: "var(--pink-light)", border: "1.5px solid #f8c5e0",
              borderRadius: "999px", color: "var(--pink)",
              fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
            }}>Edit Company Info</button>
          </div>
        )}

        {/* Edit / Create form */}
        {editing && (
          <div className="card" style={{ marginBottom: "16px" }}>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "1rem", marginBottom: "16px" }}>
              {company ? "Edit Company" : "Create Company"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Company Name *", key: "company_name", type: "text" },
                { label: "Industry",       key: "industry",     type: "text" },
                { label: "Company Type",   key: "company_type", type: "text", placeholder: "Startup, MNC, SME" },
                { label: "Company Size",   key: "company_size", type: "text", placeholder: "e.g. 11-50" },
                { label: "Founded Year",   key: "founded_year", type: "number" },
                { label: "City",           key: "city",         type: "text" },
                { label: "State",          key: "state",        type: "text" },
                { label: "Website",        key: "website",      type: "url" },
                { label: "LinkedIn",       key: "linkedin",     type: "url" },
                { label: "GST / CIN",      key: "gst_cin",      type: "text" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input className="input" type={type} placeholder={placeholder || label}
                    value={form[key] || ""}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={3} placeholder="About your company"
                  value={form.description || ""}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-primary" onClick={saveCompany} disabled={saving} style={{ flex: 1 }}>
                  {saving ? "Saving..." : company ? "Update" : "Create"}
                </button>
                {company && (
                  <button onClick={() => { setEditing(false); setMsg(""); }} style={{
                    flex: 1, padding: "12px", background: "none",
                    border: "1.5px solid var(--border)", borderRadius: "999px",
                    fontWeight: 700, cursor: "pointer", color: "var(--muted)",
                  }}>Cancel</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No company yet and not editing */}
        {!company && !editing && (
          <div className="card" style={{ textAlign: "center", padding: "24px", marginBottom: "16px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🏢</div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "1rem", marginBottom: "6px" }}>No company profile yet</div>
            <button onClick={() => setEditing(true)} className="btn-primary" style={{ width: "auto", padding: "10px 24px" }}>
              Create Company
            </button>
          </div>
        )}

        <button onClick={logout} style={{
          width: "100%", padding: "12px",
          background: "none", border: "1.5px solid var(--border)",
          borderRadius: "999px", color: "var(--red)",
          fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
        }}>Logout</button>
      </div>
    </>
  );
}