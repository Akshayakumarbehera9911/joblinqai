import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TopBar  from "../../components/TopBar";
import Spinner from "../../components/Spinner";
import { getCompany, createJob } from "../../api/hr";

const JOB_TYPES    = ["full-time", "part-time", "contract", "internship"];
const WORK_MODES   = ["onsite", "remote", "hybrid"];
const ROLE_TYPES   = ["technical", "non-technical", "blue-collar"];
const SALARY_TYPES = ["per month", "per year", "per hour", "per day", "fixed"];

/* ── Chip selector ── */
function ChipGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(value === o ? "" : o)} style={{
          padding: "5px 12px", borderRadius: 999, border: "none",
          fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
          background: value === o ? "var(--black)" : "var(--bg)",
          color: value === o ? "#fff" : "var(--muted)",
          transition: "all 0.15s",
        }}>{o}</button>
      ))}
    </div>
  );
}

/* ── Section card ── */
function Section({ title, children }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ── Inline row field ── */
function InlineField({ label, children, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      padding: "0 12px",
      borderBottom: last ? "none" : "1px solid var(--border)",
      minHeight: 44,
    }}>
      <span style={{ fontSize: "0.75rem", color: "var(--muted)", width: 110, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

/* ── Inline text input ── */
function InlineInput({ value, onChange, type = "text", placeholder }) {
  return (
    <input
      type={type}
      placeholder={placeholder || "—"}
      value={value}
      onChange={onChange}
      style={{
        width: "100%", border: "none", outline: "none",
        padding: "10px 0 10px 8px",
        fontSize: "0.82rem", fontWeight: 500,
        background: "transparent", color: "var(--black)",
        fontFamily: "var(--font-sans)",
      }}
    />
  );
}

/* ── Mini Leaflet map picker ── */
function MapPicker({ lat, lng, onPick, onClose }) {
  const mapRef     = useRef(null);
  const mapObjRef  = useRef(null);
  const markerRef  = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !mapRef.current) return;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const initLat = lat || 20.5937;
      const initLng = lng || 78.9629;
      const initZoom = lat ? 13 : 5;

      const map = L.map(mapRef.current, { center: [initLat, initLng], zoom: initZoom, zoomControl: true });
      mapObjRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);

      if (lat && lng) {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }

      map.on("click", async (e) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = L.marker([clickLat, clickLng]).addTo(map);
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${clickLat}&lon=${clickLng}&format=json`);
          const data = await res.json();
          const addr = data.address || {};
          onPick({
            latitude:     clickLat,
            longitude:    clickLng,
            city:         addr.city || addr.town || addr.village || addr.county || "",
            state:        addr.state || "",
            district:     addr.county || addr.state_district || "",
            full_address: data.display_name || "",
          });
        } catch {
          onPick({ latitude: clickLat, longitude: clickLng, city: "", state: "", district: "", full_address: "" });
        }
      });
    }
    init();
    return () => {
      cancelled = true;
      if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; }
    };
  }, []);

  return (
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex: 200 }} />
      <div style={{
        position: "fixed", inset: "auto 0 0 0", zIndex: 201,
        height: "72vh", background: "var(--card)",
        borderRadius: "20px 20px 0 0",
        display: "flex", flexDirection: "column",
        overflow: "hidden", boxShadow: "0 -4px 32px rgba(0,0,0,.15)",
      }}>
        <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "1rem" }}>Pick Location</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", fontWeight: 700, color: "var(--muted)", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)", padding: "8px 16px", background: "var(--bg)", flexShrink: 0 }}>
          Tap anywhere on the map to set the job location
        </div>
        <div ref={mapRef} style={{ flex: 1 }} />
      </div>
    </>
  );
}

export default function HRPostJob() {
  const [company,   setCompany]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState("");
  const [showMapPicker, setShowMapPicker] = useState(false);
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
    getCompany().then(res => setCompany(res.data)).catch(() => {}).finally(() => setLoading(false));
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
      city:         addr.city || addr.town || addr.village || addr.county || "",
      state:        addr.state || "",
      district:     addr.county || addr.state_district || "",
      latitude:     parseFloat(place.lat),
      longitude:    parseFloat(place.lon),
      full_address: place.display_name,
    }));
    setLocationQuery(place.display_name);
    setLocationSuggestions([]);
  }

  function handleMapPick(loc) {
    setJob(j => ({ ...j, ...loc }));
    setLocationQuery(loc.full_address || `${loc.latitude?.toFixed(4)}, ${loc.longitude?.toFixed(4)}`);
  }

  async function postJob() {
    if (!company) { setMsg("Create a company profile first (go to Profile tab)"); return; }
    if (!job.title.trim()) { setMsg("Job title is required"); return; }
    if (!job.state || !job.state.trim()) { setMsg("State is required — please pick a location on the map"); return; }
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
      <div className="page" style={{ padding: "calc(var(--topbar-height) + 14px) 14px calc(var(--nav-height) + 20px)" }}>

        {!company && (
          <div className="alert alert-error" style={{ marginBottom: 12 }}>
            No company profile. Go to <span onClick={() => navigate("/hr/profile")} style={{ fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>Profile</span> to create one first.
          </div>
        )}

        {msg && (
          <div style={{
            marginBottom: 12, padding: "8px 12px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600,
            background: msg.includes("!") ? "rgba(45,158,107,.08)" : "rgba(220,53,53,.08)",
            color: msg.includes("!") ? "#1a7a4a" : "#c0392b",
            border: `1px solid ${msg.includes("!") ? "rgba(45,158,107,.2)" : "rgba(220,53,53,.2)"}`,
          }}>{msg}</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* ── Basic Info ── */}
          <Section title="Basic Info">
            <InlineField label="Job Title *">
              <InlineInput value={job.title} placeholder="e.g. Frontend Developer"
                onChange={e => setJob(j => ({ ...j, title: e.target.value }))} />
            </InlineField>
            <InlineField label="Category">
              <InlineInput value={job.category} placeholder="e.g. Technology, Finance"
                onChange={e => setJob(j => ({ ...j, category: e.target.value }))} />
            </InlineField>
            <InlineField label="Openings">
              <InlineInput type="number" value={job.openings} placeholder="1"
                onChange={e => setJob(j => ({ ...j, openings: e.target.value }))} />
            </InlineField>
            <InlineField label="Education" last>
              <InlineInput value={job.education_required} placeholder="e.g. B.Tech, Any Graduate"
                onChange={e => setJob(j => ({ ...j, education_required: e.target.value }))} />
            </InlineField>
          </Section>

          {/* ── Job Type ── */}
          <Section title="Job Type">
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 7 }}>Type</div>
              <ChipGroup options={JOB_TYPES} value={job.job_type} onChange={v => setJob(j => ({ ...j, job_type: v }))} />
            </div>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 7 }}>Work Mode</div>
              <ChipGroup options={WORK_MODES} value={job.work_mode} onChange={v => setJob(j => ({ ...j, work_mode: v }))} />
            </div>
            <div style={{ padding: "10px 12px" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 7 }}>Role Type</div>
              <ChipGroup options={ROLE_TYPES} value={job.role_type} onChange={v => setJob(j => ({ ...j, role_type: v }))} />
            </div>
          </Section>

          {/* ── Location ── */}
          <Section title="Location">
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
              <input
                type="text"
                placeholder="Search city, area..."
                value={locationQuery}
                onChange={e => handleLocationInput(e.target.value)}
                style={{
                  width: "100%", border: "1px solid var(--border)", borderRadius: 8,
                  padding: "9px 12px", fontSize: "0.82rem", outline: "none",
                  background: "var(--bg)", fontFamily: "var(--font-sans)", color: "var(--black)",
                }}
              />
              {locationSuggestions.length > 0 && (
                <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, marginTop: 6, overflow: "hidden" }}>
                  {locationSuggestions.map((s, i) => (
                    <div key={i} onClick={() => selectLocation(s)} style={{
                      padding: "9px 12px", fontSize: "0.78rem", cursor: "pointer",
                      borderBottom: i < locationSuggestions.length - 1 ? "1px solid var(--border)" : "none",
                    }}>{s.display_name}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: "10px 12px" }}>
              <button onClick={() => setShowMapPicker(true)} style={{
                width: "100%", padding: "9px",
                background: "var(--bg)", border: "1.5px dashed var(--border)",
                borderRadius: 8, fontSize: "0.8rem", fontWeight: 600,
                color: "var(--muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                Pick on Map
              </button>
              {job.city && (
                <div style={{ fontSize: "0.75rem", color: "var(--green)", marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {job.city}{job.state ? `, ${job.state}` : ""}
                  {job.latitude && <span style={{ color: "var(--muted)" }}>· ({parseFloat(job.latitude).toFixed(4)}, {parseFloat(job.longitude).toFixed(4)})</span>}
                </div>
              )}
            </div>
          </Section>

          {/* ── Experience ── */}
          <Section title="Experience">
            <InlineField label="Min Experience" last>
              <InlineInput value={job.min_experience} placeholder="e.g. 2 years"
                onChange={e => setJob(j => ({ ...j, min_experience: e.target.value }))} />
            </InlineField>
          </Section>

          {/* ── Salary ── */}
          <Section title="Salary">
            <InlineField label="Min (₹)">
              <InlineInput type="number" value={job.salary_min} placeholder="e.g. 30000"
                onChange={e => setJob(j => ({ ...j, salary_min: e.target.value }))} />
            </InlineField>
            <InlineField label="Max (₹)">
              <InlineInput type="number" value={job.salary_max} placeholder="e.g. 50000"
                onChange={e => setJob(j => ({ ...j, salary_max: e.target.value }))} />
            </InlineField>
            <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 7 }}>Salary Type</div>
              <ChipGroup options={SALARY_TYPES} value={job.salary_type} onChange={v => setJob(j => ({ ...j, salary_type: v }))} />
            </div>
            <div style={{ padding: "10px 12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: "0.82rem", cursor: "pointer" }}>
                <input type="checkbox" checked={job.show_salary} onChange={e => setJob(j => ({ ...j, show_salary: e.target.checked }))} />
                Show salary to candidates
              </label>
            </div>
          </Section>

          {/* ── More Details ── */}
          <Section title="More Details">
            <InlineField label="Deadline">
              <input type="date" value={job.deadline}
                onChange={e => setJob(j => ({ ...j, deadline: e.target.value }))}
                style={{
                  border: "none", outline: "none", padding: "10px 0 10px 8px",
                  fontSize: "0.82rem", fontWeight: 500, background: "transparent",
                  color: "var(--black)", fontFamily: "var(--font-sans)", width: "100%",
                }}
              />
            </InlineField>
            <InlineField label="Max Applicants" last>
              <InlineInput type="number" value={job.max_applicants} placeholder="Leave blank for unlimited"
                onChange={e => setJob(j => ({ ...j, max_applicants: e.target.value }))} />
            </InlineField>
          </Section>

          {/* ── Description ── */}
          <Section title="Description">
            <div style={{ padding: "10px 12px" }}>
              <textarea
                rows={5}
                placeholder="Describe the role, responsibilities, and requirements..."
                value={job.description}
                onChange={e => setJob(j => ({ ...j, description: e.target.value }))}
                style={{
                  width: "100%", border: "1px solid var(--border)", outline: "none",
                  borderRadius: 8, padding: "8px 10px",
                  fontSize: "0.82rem", fontFamily: "var(--font-sans)",
                  background: "var(--bg)", color: "var(--black)", resize: "vertical",
                }}
              />
            </div>
          </Section>

          {/* ── Skills ── */}
          <Section title="Skills Required">
            <div style={{ padding: "10px 12px", borderBottom: skills.length > 0 ? "1px solid var(--border)" : "none" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="Skill name"
                  value={skillInput.skill_name}
                  onChange={e => setSkillInput(s => ({ ...s, skill_name: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (skillInput.skill_name.trim()) { setSkills(prev => [...prev, { ...skillInput }]); setSkillInput({ skill_name: "", is_mandatory: false }); }
                    }
                  }}
                  style={{
                    flex: 1, border: "1px solid var(--border)", outline: "none",
                    borderRadius: 8, padding: "8px 12px",
                    fontSize: "0.82rem", fontFamily: "var(--font-sans)",
                    background: "var(--bg)", color: "var(--black)",
                  }}
                />
                <button onClick={() => {
                  if (skillInput.skill_name.trim()) { setSkills(prev => [...prev, { ...skillInput }]); setSkillInput({ skill_name: "", is_mandatory: false }); }
                }} style={{
                  padding: "0 14px", background: "var(--pink)", color: "#fff",
                  border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: "0.82rem",
                }}>Add</button>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", cursor: "pointer", color: "var(--muted)" }}>
                <input type="checkbox" checked={skillInput.is_mandatory} onChange={e => setSkillInput(s => ({ ...s, is_mandatory: e.target.checked }))} />
                Mark as mandatory
              </label>
            </div>
            {skills.length > 0 && (
              <div style={{ padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                {skills.map((s, i) => (
                  <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 600,
                    background: s.is_mandatory ? "var(--black)" : "var(--bg)",
                    color: s.is_mandatory ? "#fff" : "var(--muted)",
                    border: s.is_mandatory ? "none" : "1px solid var(--border)",
                  }}>
                    {s.skill_name}
                    <button onClick={() => setSkills(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, lineHeight: 1, fontWeight: 700 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </Section>

          {/* ── Post button ── */}
          <button onClick={postJob} disabled={saving} style={{
            width: "100%", padding: "12px",
            background: saving ? "#f0b8d8" : "var(--pink)",
            border: "none", borderRadius: 10,
            color: "#fff", fontWeight: 700,
            fontSize: "0.92rem", cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "var(--font-sans)",
          }}>
            {saving ? "Posting…" : "Post Job"}
          </button>

        </div>
      </div>

      {showMapPicker && (
        <MapPicker
          lat={job.latitude ? parseFloat(job.latitude) : null}
          lng={job.longitude ? parseFloat(job.longitude) : null}
          onPick={(loc) => { handleMapPick(loc); setShowMapPicker(false); }}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </>
  );
}