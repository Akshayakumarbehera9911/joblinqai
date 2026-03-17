import { useState, useEffect, useRef } from "react";
import TopBar  from "../../components/TopBar";
import Spinner from "../../components/Spinner";
import { getCompany, createCompany, updateCompany, uploadLogo } from "../../api/hr";
import { useAuth } from "../../context/AuthContext";

export default function HRProfile() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
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
        else { setEditing(true); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogoUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    if (!company) { setMsg("Save company first, then upload logo"); return; }
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await uploadLogo(fd);
      setCompany(c => ({ ...c, logo_url: res.data.logo_url }));
      setMsg("Logo updated!");
    } catch (e) { setMsg(e.message); }
    finally { setUploading(false); }
  }

  async function saveCompany() {
    setSaving(true); setMsg("");
    try {
      if (company) await updateCompany(form);
      else await createCompany(form);
      const res = await getCompany();
      setCompany(res.data); setForm(res.data);
      setEditing(false); setMsg("Saved!");
    } catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <>
      <TopBar title="Profile" />
      <div className="page"><Spinner /></div>
    </>
  );

  const initial = (company?.company_name || user?.full_name || "?").charAt(0).toUpperCase();

  return (
    <>
      <TopBar title="Profile" />
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 12px) 14px calc(var(--nav-height) + 14px)" }}>

        {/* ── HR user strip ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "10px 12px", marginBottom: 10,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "#0A66C2", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
              {(user?.full_name || "?").charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.full_name}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 1 }}>HR / Recruiter</div>
          </div>
        </div>

        {msg && (
          <div style={{
            marginBottom: 10, padding: "8px 12px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600,
            background: msg.includes("!") ? "rgba(45,158,107,.08)" : "rgba(220,53,53,.08)",
            color: msg.includes("!") ? "#1a7a4a" : "#c0392b",
            border: `1px solid ${msg.includes("!") ? "rgba(45,158,107,.2)" : "rgba(220,53,53,.2)"}`,
          }}>{msg}</div>
        )}

        {/* ── View mode ── */}
        {!editing && company && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>

            {/* Company header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px 10px" }}>
              {company.logo_url ? (
                <img src={company.logo_url} style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 42, height: 42, borderRadius: 8, background: "#0A66C2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>{initial}</span>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{company.company_name}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 1 }}>{company.industry}</div>
              </div>
              {company.is_verified && (
                <span style={{ fontSize: "0.62rem", color: "#1a7a4a", fontWeight: 700, background: "rgba(45,158,107,.1)", padding: "2px 7px", borderRadius: 999, flexShrink: 0, border: "1px solid rgba(45,158,107,.2)" }}>✓ Verified</span>
              )}
            </div>

            {/* Logo upload tap zone */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                margin: "0 12px 10px", padding: "8px 12px",
                background: "var(--bg)", border: "1px dashed var(--border)",
                borderRadius: 8, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                {uploading ? "Uploading…" : "Tap to update logo"}
              </span>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
            </div>

            {/* Info rows */}
            <div style={{ borderTop: "1px solid var(--border)" }}>
              {[
                ["City",    company.city],
                ["State",   company.state],
                ["Size",    company.company_size],
                ["Type",    company.company_type],
                ["Founded", company.founded_year],
                ["Website", company.website],
                ["GST/CIN", company.gst_cin],
              ].filter(([, v]) => v).map(([label, val], i, arr) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 12px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{label}</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, maxWidth: "60%", textAlign: "right", wordBreak: "break-all" }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Edit button */}
            <div style={{ padding: "10px 12px" }}>
              <button onClick={() => setEditing(true)} style={{
                width: "100%", padding: "9px",
                background: "#E8F0FA", border: "1px solid #f0b8d9",
                borderRadius: 8, color: "#0A66C2",
                fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
              }}>Edit Company Info</button>
            </div>
          </div>
        )}

        {/* ── Edit / Create form ── */}
        {editing && (
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
              <span style={{ fontWeight: 700, fontSize: "0.75rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {company ? "Edit Company" : "Create Company"}
              </span>
              {company && (
                <button onClick={() => { setEditing(false); setMsg(""); }} style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "1.2rem", color: "var(--muted)", lineHeight: 1, padding: 0, fontWeight: 700,
                }}>×</button>
              )}
            </div>

            {/* Inline rows */}
            {[
              { label: "Company Name *", key: "company_name", type: "text" },
              { label: "Industry",       key: "industry",     type: "text" },
              { label: "Type",           key: "company_type", type: "text", placeholder: "Startup, MNC, SME" },
              { label: "Size",           key: "company_size", type: "text", placeholder: "e.g. 11–50" },
              { label: "Founded",        key: "founded_year", type: "number" },
              { label: "City",           key: "city",         type: "text" },
              { label: "State",          key: "state",        type: "text" },
              { label: "Website",        key: "website",      type: "url" },
              { label: "LinkedIn",       key: "linkedin",     type: "url" },
              { label: "GST / CIN",      key: "gst_cin",      type: "text" },
            ].map(({ label, key, type, placeholder }, i, arr) => (
              <div key={key} style={{
                display: "flex", alignItems: "center",
                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                padding: "0 12px",
              }}>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)", width: 90, flexShrink: 0 }}>{label}</span>
                <input
                  type={type}
                  placeholder={placeholder || "—"}
                  value={form[key] || ""}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{
                    flex: 1, border: "none", outline: "none",
                    padding: "10px 0 10px 8px",
                    fontSize: "0.82rem", fontWeight: 500,
                    background: "transparent", color: "var(--black)",
                    fontFamily: "var(--font-sans)",
                  }}
                />
              </div>
            ))}

            {/* Description */}
            <div style={{ padding: "8px 12px", borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 5 }}>Description</div>
              <textarea
                placeholder="About your company"
                value={form.description || ""}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                style={{
                  width: "100%", border: "1px solid var(--border)", outline: "none",
                  borderRadius: 8, padding: "8px 10px",
                  fontSize: "0.82rem", fontFamily: "var(--font-sans)",
                  background: "var(--bg)", color: "var(--black)",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Save */}
            <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
              <button onClick={saveCompany} disabled={saving} style={{
                width: "100%", padding: "9px",
                background: saving ? "#f0b8d8" : "#0A66C2",
                border: "none", borderRadius: 8,
                color: "#fff", fontWeight: 700,
                fontSize: "0.85rem", cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "var(--font-sans)",
              }}>
                {saving ? "Saving…" : company ? "Save Changes" : "Create Company"}
              </button>
            </div>
          </div>
        )}

        {/* ── No company yet ── */}
        {!company && !editing && (
          <div style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 10, textAlign: "center", padding: "28px 20px", marginBottom: 10,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "#0A66C2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>No company profile yet</div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 16 }}>Create your company to start posting jobs</div>
            <button onClick={() => setEditing(true)} className="btn-primary" style={{ width: "auto", padding: "9px 24px" }}>
              Create Company
            </button>
          </div>
        )}

        {/* ── Logout ── */}
        <button onClick={logout} style={{
          width: "100%", padding: "10px 14px", marginTop: 4,
          background: "#E02020", border: "none",
          borderRadius: 999, color: "#fff", fontWeight: 600,
          fontSize: "0.82rem", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Log out
        </button>

      </div>
    </>
  );
}