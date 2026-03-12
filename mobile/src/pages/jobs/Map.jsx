import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMapData, getCityJobs, getRoleFamilies } from "../../api/jobs";

const PINK = "#E8398A";
const SAMPLE_CITIES = [
  { city: "Bangalore", state: "Karnataka",   latitude: 12.9716, longitude: 77.5946, job_count: 5 },
  { city: "Mumbai",    state: "Maharashtra", latitude: 19.0760, longitude: 72.8777, job_count: 8 },
  { city: "Delhi",     state: "Delhi",       latitude: 28.6139, longitude: 77.2090, job_count: 6 },
  { city: "Hyderabad", state: "Telangana",   latitude: 17.3850, longitude: 78.4867, job_count: 3 },
  { city: "Chennai",   state: "Tamil Nadu",  latitude: 13.0827, longitude: 80.2707, job_count: 4 },
  { city: "Pune",      state: "Maharashtra", latitude: 18.5204, longitude: 73.8567, job_count: 2 },
  { city: "Kolkata",   state: "West Bengal", latitude: 22.5726, longitude: 88.3639, job_count: 3 },
];

const EXP_OPTIONS = [
  { value: "",           label: "Any Experience" },
  { value: "0-1 years",  label: "Fresher / 0–1 yr" },
  { value: "1-3 years",  label: "1–3 years" },
  { value: "3-5 years",  label: "3–5 years" },
  { value: "5-8 years",  label: "5–8 years" },
  { value: "8-20 years", label: "8+ years" },
];
const SAL_OPTIONS = [
  { value: "",      label: "Any Salary" },
  { value: "15000", label: "₹15k+/mo" },
  { value: "30000", label: "₹30k+/mo" },
  { value: "50000", label: "₹50k+/mo" },
  { value: "80000", label: "₹80k+/mo" },
];

export default function MapPage() {
  const navigate   = useNavigate();
  const { isLoggedIn } = useAuth();
  const mapRef     = useRef(null);
  const mapObjRef  = useRef(null);
  const markersRef    = useRef([]);
  const userMarkerRef = useRef(null);
  const jobMarkersRef = useRef([]);
  const cityJobsCache = useRef({});

  const [drawerCity,    setDrawerCity]    = useState(null);
  const [drawerJobs,    setDrawerJobs]    = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [mapReady,      setMapReady]      = useState(false);
  const [zoomLevel,     setZoomLevel]     = useState(5);

  // Filter state
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [roleFamilies,  setRoleFamilies]  = useState([]);
  const [fRole,         setFRole]         = useState("");
  const [fExp,          setFExp]          = useState("");
  const [fSalary,       setFSalary]       = useState("");
  const [nearMeActive,  setNearMeActive]  = useState(false);
  const [nearCoords,    setNearCoords]    = useState(null);
  const activeFilterCount = [fRole, fExp, fSalary, nearMeActive].filter(Boolean).length;
  const markersDataRef = useRef([]);

  useEffect(() => { loadRoleFamiliesData(); }, []);

  async function loadRoleFamiliesData() {
    try {
      const res = await getRoleFamilies();
      setRoleFamilies(res.data || []);
    } catch {}
  }

  const loadCities = useCallback(async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.role)       params.set("role_family", filters.role);
    if (filters.experience) params.set("experience",  filters.experience);
    if (filters.salary)     params.set("salary_min",  filters.salary);
    if (filters.nearMe && filters.lat && filters.lng) {
      params.set("near_lat", filters.lat);
      params.set("near_lng", filters.lng);
      params.set("near_km",  "50");
    }
    try {
      const res   = await getMapData(params.toString());
      const data  = res.data?.data || res.data || [];
      const cities = data.length ? data : SAMPLE_CITIES;
      markersDataRef.current = cities;
      // Rebuild markers on map
      if (mapObjRef.current) {
        markersRef.current.forEach(m => mapObjRef.current.removeLayer(m));
        markersRef.current = [];
        const L = (await import("leaflet")).default || await import("leaflet");
        cities.forEach(city => {
          const size = Math.min(10 + Math.log(city.job_count + 1) * 5, 28);
          const icon = L.divIcon({
            className: "",
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${PINK};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:${Math.max(8,size*0.38)}px;font-weight:700;color:#fff;font-family:DM Sans,sans-serif;">${city.job_count}</div>`,
            iconSize: [size, size], iconAnchor: [size/2, size/2],
          });
          const m = L.marker([city.latitude, city.longitude], { icon })
            .addTo(mapObjRef.current)
            .on("click", () => openDrawer(city));
          markersRef.current.push(m);
        });
      }
    } catch {}
  }, []);

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

      const map = L.map(mapRef.current, {
        center: [20.5937, 78.9629],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
      });
      mapObjRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
      L.control.attribution({ prefix: false, position: "bottomright" })
        .addAttribution('© <a href="https://openstreetmap.org">OSM</a>')
        .addTo(map);

      await loadCities({});
      setMapReady(true);

      // Zoom listener — switch between city clusters and job pins
      map.on("zoomend", async () => {
        const z = map.getZoom();
        setZoomLevel(z);
        if (z >= 10) {
          // Hide city markers, show individual job pins
          markersRef.current.forEach(m => map.removeLayer(m));
          const bounds = map.getBounds();
          // Find cities in current view
          const visibleCities = markersDataRef.current.filter(c =>
            bounds.contains([c.latitude, c.longitude])
          );
          for (const city of visibleCities) {
            await loadJobPins(city.city, city.latitude, city.longitude);
          }
        } else {
          // Remove job pins, show city markers
          jobMarkersRef.current.forEach(m => map.removeLayer(m));
          jobMarkersRef.current = [];
          markersRef.current.forEach(m => map.addTo ? m.addTo(map) : null);
          // Re-render city markers cleanly
          markersRef.current.forEach(m => { try { m.addTo(map); } catch {} });
        }
      });
    }

    // Silent location preload
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setNearCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => {});
    }

    init();
    return () => {
      cancelled = true;
      if (mapObjRef.current) { mapObjRef.current.remove(); mapObjRef.current = null; }
    };
  }, []);

  async function openDrawer(cityData) {
    setDrawerCity(cityData);
    setDrawerOpen(true);
    setDrawerJobs([]);

    // Guest — just show login prompt, no jobs fetch
    if (!isLoggedIn) {
      setDrawerLoading(false);
      return;
    }

    setDrawerLoading(true);
    if (mapObjRef.current) {
      mapObjRef.current.flyTo([cityData.latitude, cityData.longitude], 12, { duration: 0.8 });
    }
    try {
      let jobs = cityJobsCache.current[cityData.city];
      if (!jobs) {
        const res = await getCityJobs(cityData.city);
        jobs = res.data?.data || res.data || [];
        cityJobsCache.current[cityData.city] = jobs;
      }
      setDrawerJobs(jobs);
    } catch {
      setDrawerJobs([]);
    } finally {
      setDrawerLoading(false);
    }
  }

  function applyFilters() {
    const filters = { role: fRole, experience: fExp, salary: fSalary, nearMe: nearMeActive };
    if (nearMeActive && nearCoords) { filters.lat = nearCoords.lat; filters.lng = nearCoords.lng; }
    loadCities(filters);
    setFilterOpen(false);
    setDrawerOpen(false);
    // Fly to user if Near Me, else reset to India
    if (nearMeActive && nearCoords && mapObjRef.current) {
      mapObjRef.current.flyTo([nearCoords.lat, nearCoords.lng], 9, { duration: 1.2 });
      showUserMarker(nearCoords.lat, nearCoords.lng);
    } else {
      removeUserMarker();
      if (mapObjRef.current) mapObjRef.current.flyTo([20.5937, 78.9629], 5, { duration: 1 });
    }
  }

  async function showUserMarker(lat, lng) {
    const L = (await import("leaflet")).default || await import("leaflet");
    if (userMarkerRef.current && mapObjRef.current) mapObjRef.current.removeLayer(userMarkerRef.current);
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:16px;height:16px;position:relative;">
        <div style="position:absolute;inset:0;border-radius:50%;background:#3B5BDB;opacity:0.3;animation:pulse 2s ease-out infinite;"></div>
        <div style="position:absolute;top:3px;left:3px;width:10px;height:10px;border-radius:50%;background:#3B5BDB;border:2px solid #fff;box-shadow:0 1px 4px rgba(59,91,219,.5);"></div>
      </div>`,
      iconSize: [16, 16], iconAnchor: [8, 8],
    });
    userMarkerRef.current = L.marker([lat, lng], { icon, zIndexOffset: 1000 })
      .addTo(mapObjRef.current)
      .bindPopup('<div style="padding:6px 10px;font-size:12px;font-weight:700;">📍 You are here</div>', { closeButton: false });
  }

  function removeUserMarker() {
    if (userMarkerRef.current && mapObjRef.current) {
      mapObjRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
  }

  function clearFilters() {
    setFRole(""); setFExp(""); setFSalary("");
    setNearMeActive(false); setNearCoords(null);
    loadCities({});
    setFilterOpen(false);
    setDrawerOpen(false);
    if (mapObjRef.current) mapObjRef.current.flyTo([20.5937, 78.9629], 5, { duration: 1 });
  }

  function handleNearMe() {
    if (nearMeActive) {
      setNearMeActive(false);
      return;
    }
    // If already preloaded — instant toggle
    if (nearCoords) { setNearMeActive(true); return; }
    // Fallback request
    if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      setNearCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setNearMeActive(true);
    }, () => alert("Location access denied. Enable in browser settings."));
  }


  function fmtDist(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return km < 1 ? `${Math.round(km*1000)}m` : `${km.toFixed(1)}km`;
  }

  async function loadJobPins(cityName, cityLat, cityLng) {
    const L = (await import("leaflet")).default || await import("leaflet");
    // Use cache to avoid refetching
    let jobs = cityJobsCache.current[cityName];
    if (!jobs) {
      try {
        const res = await getCityJobs(cityName);
        jobs = res.data?.data || res.data || [];
        cityJobsCache.current[cityName] = jobs;
      } catch { return; }
    }
    if (!jobs.length) return;

    // Group by rounded coords
    const groups = {};
    jobs.forEach(j => {
      const lat = j.latitude  || cityLat;
      const lng = j.longitude || cityLng;
      const key = `${parseFloat(lat).toFixed(5)},${parseFloat(lng).toFixed(5)}`;
      if (!groups[key]) groups[key] = { lat: parseFloat(lat), lng: parseFloat(lng), jobs: [] };
      groups[key].jobs.push(j);
    });

    Object.values(groups).forEach(group => {
      const { lat, lng, jobs: gjobs } = group;
      const count = gjobs.length;
      const size = 26;
      const icon = L.divIcon({
        className: "",
        html: count > 1
          ? `<div style="position:relative;">
              <svg width="26" height="36" viewBox="0 0 26 36"><path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 23 13 23S26 22.75 26 13C26 5.82 20.18 0 13 0z" fill="${PINK}" stroke="#fff" stroke-width="1.5"/><circle cx="13" cy="12" r="5" fill="#fff"/></svg>
              <div style="position:absolute;top:-5px;right:-6px;min-width:16px;height:16px;border-radius:999px;background:#111;border:1.5px solid #fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;padding:0 3px;">${count}</div>
            </div>`
          : `<svg width="26" height="36" viewBox="0 0 26 36"><path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 23 13 23S26 22.75 26 13C26 5.82 20.18 0 13 0z" fill="${PINK}" stroke="#fff" stroke-width="1.5"/><circle cx="13" cy="12" r="5" fill="#fff"/></svg>`,
        iconSize: [26, 36], iconAnchor: [13, 36],
      });
      const m = L.marker([lat, lng], { icon })
        .addTo(mapObjRef.current)
        .on("click", () => {
          // Open drawer with just these jobs
          setDrawerCity({ city: cityName, state: "", job_count: gjobs.length, latitude: lat, longitude: lng });
          setDrawerJobs(gjobs);
          setDrawerLoading(false);
          setDrawerOpen(true);
        });
      jobMarkersRef.current.push(m);
    });
  }

  function fmtSalary(min, max) {
    if (!min) return null;
    const toK = n => n >= 100000 ? (n/100000).toFixed(1)+"L" : (n/1000).toFixed(0)+"k";
    return `₹${toK(min)}–₹${toK(max)}`;
  }

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", zIndex: 1 }}>

      {/* ── Filter pill ── */}
      {mapReady && (
        <button onClick={() => setFilterOpen(true)} style={{
          position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
          zIndex: 1000, background: activeFilterCount > 0 ? PINK : "var(--card)",
          color: activeFilterCount > 0 ? "#fff" : "var(--muted)",
          border: `1.5px solid ${activeFilterCount > 0 ? PINK : "var(--border)"}`,
          borderRadius: 999, padding: "7px 16px",
          fontSize: "0.78rem", fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
          transition: "all 0.15s",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
        </button>
      )}

      {/* ── Filter overlay ── */}
      {filterOpen && (
        <div onClick={() => setFilterOpen(false)} style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1001,
        }} />
      )}

      {/* ── Filter bottom sheet ── */}
      <div style={{
        position: "absolute", bottom: "var(--nav-height)", left: 0, right: 0, zIndex: 1002,
        background: "var(--card)", borderRadius: "20px 20px 0 0",
        transform: filterOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.14)",
        padding: "0 0 20px",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, background: "var(--border)", borderRadius: 999 }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 16px 14px" }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Filter Jobs on Map</div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} style={{ background: "none", border: "none", color: "var(--red)", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
              Clear all
            </button>
          )}
        </div>

        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Role */}
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Role Family</div>
            <select className="input" value={fRole} onChange={e => setFRole(e.target.value)}>
              <option value="">All Roles</option>
              {roleFamilies.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Experience */}
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Experience</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {EXP_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setFExp(o.value)} style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: "0.77rem", fontWeight: 600,
                  border: `1.5px solid ${fExp === o.value ? PINK : "var(--border)"}`,
                  background: fExp === o.value ? "var(--pink-light)" : "var(--card)",
                  color: fExp === o.value ? PINK : "var(--muted)",
                  cursor: "pointer",
                }}>{o.label}</button>
              ))}
            </div>
          </div>

          {/* Salary */}
          <div>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Min Salary</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {SAL_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setFSalary(o.value)} style={{
                  padding: "6px 12px", borderRadius: 999, fontSize: "0.77rem", fontWeight: 600,
                  border: `1.5px solid ${fSalary === o.value ? PINK : "var(--border)"}`,
                  background: fSalary === o.value ? "var(--pink-light)" : "var(--card)",
                  color: fSalary === o.value ? PINK : "var(--muted)",
                  cursor: "pointer",
                }}>{o.label}</button>
              ))}
            </div>
          </div>

          {/* Near Me toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Near Me</div>
              <div style={{ fontSize: "0.78rem", color: nearMeActive ? PINK : "var(--muted)", fontWeight: 600 }}>
                {nearMeActive ? "📍 50km radius active" : "Show jobs within 50km"}
              </div>
            </div>
            <div onClick={handleNearMe} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
              <div style={{
                width: 40, height: 22, borderRadius: 999,
                background: nearMeActive ? PINK : "var(--border)",
                position: "relative", transition: "background 0.2s",
              }}>
                <div style={{
                  position: "absolute", top: 3, left: nearMeActive ? 21 : 3,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  transition: "left 0.2s",
                }} />
              </div>
            </div>
          </div>

          <button onClick={applyFilters} style={{
            padding: "12px", borderRadius: 999, background: PINK, color: "#fff",
            border: "none", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
          }}>
            Apply Filters
          </button>
        </div>
      </div>

      {/* ── Back ── */}
      <button onClick={() => navigate(-1)} style={{
        position: "absolute", top: 14, left: 14, zIndex: 1000,
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "7px 12px",
        fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)",
        cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back
      </button>

      {/* ── Title ── */}
      <div style={{
        position: "absolute", top: 14, right: 14, zIndex: 1000,
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 8, padding: "7px 12px",
        fontSize: "0.82rem", fontWeight: 700,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        display: "flex", alignItems: "center", gap: 5,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        Job<span style={{ color: PINK }}>Map</span>
      </div>

      {/* ── Map ── */}
      <div ref={mapRef} style={{ flex: 1, width: "100%", zIndex: 1 }} />

      {/* ── Loading ── */}
      {!mapReady && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 999,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 10, background: "#e8f4f8",
        }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #ddd", borderTopColor: PINK, animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontSize: "0.78rem", color: "#777" }}>Loading map…</div>
        </div>
      )}

      {/* ── Hint ── */}
      {mapReady && !drawerOpen && (
        <div style={{
          position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
          fontSize: "0.7rem", color: "var(--muted)", fontWeight: 500,
          background: "var(--card)", padding: "5px 12px", borderRadius: 999,
          border: "1px solid var(--border)", whiteSpace: "nowrap",
          pointerEvents: "none", zIndex: 999,
          display: "flex", alignItems: "center", gap: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: PINK, display: "inline-block", flexShrink: 0 }} />
          Tap a city pin to see jobs
        </div>
      )}

      {/* ── Overlay ── */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: "var(--nav-height)",
          background: "rgba(0,0,0,0.25)", zIndex: 998,
        }} />
      )}

      {/* ── Drawer ── */}
      <div style={{
        position: "absolute", bottom: "var(--nav-height)", left: 0, right: 0, zIndex: 999,
        background: "var(--card)", borderRadius: "16px 16px 0 0",
        maxHeight: "55vh", display: "flex", flexDirection: "column",
        transform: drawerOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
        visibility: drawerCity ? "visible" : "hidden",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.14)",
      }}>

        {/* Handle */}
        <div style={{ paddingTop: 10, paddingBottom: 2, display: "flex", justifyContent: "center", flexShrink: 0 }}>
          <div onClick={() => setDrawerOpen(false)} style={{
            width: 36, height: 4, background: "var(--border)", borderRadius: 999, cursor: "pointer",
          }} />
        </div>

        {drawerCity && (
          <>
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 14px 10px", flexShrink: 0,
              borderBottom: "1px solid var(--border)",
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{drawerCity.city}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 1 }}>
                  {drawerCity.state && `${drawerCity.state} · `}
                  {drawerCity.job_count} job{drawerCity.job_count !== 1 ? "s" : ""}
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 6, width: 28, height: 28,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "var(--muted)", fontSize: "1rem",
              }}>×</button>
            </div>

            {/* Jobs */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px 24px" }}>
              {drawerLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2.5px solid var(--border)", borderTopColor: PINK, animation: "spin 0.8s linear infinite" }} />
                </div>
              ) : drawerJobs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--pink-light)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>No jobs listed yet</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 3 }}>Try another city</div>
                </div>
              ) : !isLoggedIn ? (
                <div style={{ textAlign:"center", padding:"28px 16px" }}>
                  <div style={{
                    width:48,height:48,borderRadius:12,background:"var(--pink-light)",
                    display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <div style={{fontWeight:700,fontSize:"0.88rem",marginBottom:6}}>Login to view jobs</div>
                  <div style={{fontSize:"0.75rem",color:"var(--muted)",marginBottom:16,lineHeight:1.6}}>
                    Create a free account to explore jobs, get directions, and apply
                  </div>
                  <div style={{display:"flex",gap:8,justifyContent:"center"}}>
                    <button onClick={()=>navigate("/login")} style={{
                      padding:"8px 20px",borderRadius:999,background:PINK,color:"#fff",
                      border:"none",fontWeight:700,fontSize:"0.8rem",cursor:"pointer",
                      fontFamily:"DM Sans,sans-serif",
                    }}>Login</button>
                    <button onClick={()=>navigate("/register")} style={{
                      padding:"8px 20px",borderRadius:999,background:"none",color:PINK,
                      border:`1.5px solid ${PINK}`,fontWeight:700,fontSize:"0.8rem",cursor:"pointer",
                      fontFamily:"DM Sans,sans-serif",
                    }}>Register</button>
                  </div>
                </div>
              ) : drawerJobs.map(job => {
                const jobLat = job.latitude || drawerCity?.latitude;
                const jobLng = job.longitude || drawerCity?.longitude;
                const dist = (nearMeActive && nearCoords && jobLat && jobLng)
                  ? fmtDist(nearCoords.lat, nearCoords.lng, jobLat, jobLng) : null;
                const dirUrl = (nearCoords && jobLat && jobLng)
                  ? `https://www.google.com/maps/dir/?api=1&origin=${nearCoords.lat},${nearCoords.lng}&destination=${jobLat},${jobLng}` : null;
                return (
                  <div key={job.id} style={{
                    background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "10px 12px", marginBottom: 7,
                  }}>
                    <div style={{ fontWeight: 700, fontSize: "0.84rem", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.title}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: dist ? 3 : 8 }}>
                      {job.company_name}
                      {fmtSalary(job.salary_min, job.salary_max) && (
                        <span style={{ color: PINK, fontWeight: 600, marginLeft: 6 }}>{fmtSalary(job.salary_min, job.salary_max)}</span>
                      )}
                    </div>
                    {dist && <div style={{ fontSize: "0.7rem", color: "#3B5BDB", fontWeight: 600, marginBottom: 8 }}>📍 {dist} away</div>}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => navigate(`/jobs/${job.id}`)} style={{
                        padding: "5px 12px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700,
                        background: PINK, color: "#fff", border: "none", cursor: "pointer",
                      }}>View Job</button>
                      {dirUrl && (
                        <a href={dirUrl} target="_blank" rel="noreferrer" style={{
                          padding: "5px 12px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700,
                          background: "#3B5BDB", color: "#fff", textDecoration: "none", display: "inline-flex", alignItems: "center",
                        }}>Directions</a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%{transform:scale(1);opacity:.4} 70%{transform:scale(2.5);opacity:0} 100%{transform:scale(1);opacity:0} }
      `}</style>
    </div>
  );
}