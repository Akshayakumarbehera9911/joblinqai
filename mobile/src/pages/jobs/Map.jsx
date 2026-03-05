import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { getMapData, getCityJobs } from "../../api/jobs";

const PINK = "#E8398A";
const BASE_SCALE_FACTOR = 0.44;
const TOPO_URL = "https://unpkg.com/world-atlas@2/countries-110m.json";
const SAMPLE_CITIES = [
  { city: "Bangalore",   state: "Karnataka",    latitude: 12.9716, longitude: 77.5946, job_count: 1 },
  { city: "Mumbai",      state: "Maharashtra",  latitude: 19.0760, longitude: 72.8777, job_count: 1 },
  { city: "Delhi",       state: "Delhi",        latitude: 28.6139, longitude: 77.2090, job_count: 1 },
  { city: "Hyderabad",   state: "Telangana",    latitude: 17.3850, longitude: 78.4867, job_count: 1 },
  { city: "Chennai",     state: "Tamil Nadu",   latitude: 13.0827, longitude: 80.2707, job_count: 1 },
];

export default function MapPage() {
  const navigate = useNavigate();
  const svgRef   = useRef(null);
  const wrapRef  = useRef(null);

  /* ── Globe state (refs to avoid re-render on every frame) ── */
  const stateRef = useRef({
    rotation:     [-78, -20],
    scale:        1,
    isDragging:   false,
    autoRotating: true,
    lastPos:      null,
    lastDist:     null,        // for pinch zoom
    projection:   null,
    path:         null,
    svg:          null,
    timer:        null,
    mapData:      [],
    width:        0,
    height:       0,
  });

  /* ── React state ── */
  const [drawerCity,   setDrawerCity]   = useState(null);   // { city, job_count, latitude, longitude }
  const [drawerJobs,   setDrawerJobs]   = useState([]);
  const [drawerLoading,setDrawerLoading]= useState(false);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [tooltip,      setTooltip]      = useState(null);   // { x, y, city, job_count } | null
  const [dataLoaded,   setDataLoaded]   = useState(false);
  const [globeReady,   setGlobeReady]   = useState(false);

  /* ── Load map data ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await getMapData();
        const data = res.data?.data || res.data || [];
        stateRef.current.mapData = data.length ? data : SAMPLE_CITIES;
      } catch {
        stateRef.current.mapData = SAMPLE_CITIES;
      }
      setDataLoaded(true);
    })();
  }, []);

  /* ── Init globe (once both data + topo loaded + wrap sized) ── */
  const initGlobe = useCallback((world) => {
    const s    = stateRef.current;
    const wrap = wrapRef.current;
    const el   = svgRef.current;
    if (!wrap || !el) return;

    const W = wrap.clientWidth;
    const H = wrap.clientHeight;
    s.width  = W;
    s.height = H;

    el.setAttribute("width",  W);
    el.setAttribute("height", H);

    s.projection = d3.geoOrthographic()
      .scale(Math.min(W, H) * BASE_SCALE_FACTOR)
      .translate([W / 2, H / 2])
      .rotate(s.rotation)
      .clipAngle(90);

    s.path = d3.geoPath().projection(s.projection);
    s.svg  = d3.select(el);
    s.svg.selectAll("*").remove();

    const countries = topojson.feature(world, world.objects.countries);
    const graticule = d3.geoGraticule();

    /* ocean sphere */
    s.svg.append("circle")
      .attr("class", "ocean")
      .attr("cx", W / 2).attr("cy", H / 2)
      .attr("r", s.projection.scale())
      .attr("fill", "#E8E3DC")
      .attr("stroke", PINK).attr("stroke-width", 0.5);

    /* graticule */
    s.svg.append("g").attr("class", "grat")
      .append("path").datum(graticule())
      .attr("fill", "none")
      .attr("stroke", "#D5CFCA").attr("stroke-width", 0.4);

    /* countries */
    s.svg.append("g").attr("class", "countries")
      .selectAll("path").data(countries.features).enter()
      .append("path")
      .attr("fill", "#E0DAD3")
      .attr("stroke", "#C8C2BB")
      .attr("stroke-width", 0.5);

    /* pins layer */
    s.svg.append("g").attr("class", "pins");

    renderGlobe();
    setGlobeReady(true);

    /* Auto-rotate */
    s.timer = d3.interval(() => {
      if (s.autoRotating) {
        s.rotation[0] += 0.15;
        s.projection.rotate(s.rotation);
        renderGlobe();
      }
    }, 30);
  }, []); // eslint-disable-line

  function renderGlobe() {
    const s = stateRef.current;
    if (!s.svg || !s.projection || !s.path) return;

    s.projection.rotate(s.rotation);
    const r = s.projection.scale();

    s.svg.select(".ocean").attr("r", r);
    s.svg.select(".grat path").attr("d", s.path(d3.geoGraticule()()));
    s.svg.selectAll(".countries path").attr("d", s.path);

    s.svg.select(".pins").selectAll("circle").remove();
    s.svg.select(".pins").selectAll("circle")
      .data(s.mapData)
      .enter().append("circle")
      .attr("cx", d => {
        const p = s.projection([d.longitude, d.latitude]);
        return p ? p[0] : -9999;
      })
      .attr("cy", d => {
        const p = s.projection([d.longitude, d.latitude]);
        return p ? p[1] : -9999;
      })
      .attr("visibility", d => {
        const rot = s.projection.rotate();
        const viewCenter = [-rot[0], -rot[1]];
        const dist = d3.geoDistance([d.longitude, d.latitude], viewCenter);
        return dist < Math.PI / 2 ? "visible" : "hidden";
      })
      .attr("r", d => Math.min(3 + Math.log(d.job_count + 1) * 1.8, 9))
      .attr("fill", PINK)
      .attr("fill-opacity", d => Math.min(0.55 + d.job_count * 0.1, 0.95))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer");
  }

  /* ── Fetch topology + init once data ready ── */
  useEffect(() => {
    if (!dataLoaded) return;
    fetch(TOPO_URL)
      .then(r => r.json())
      .then(world => initGlobe(world))
      .catch(console.error);

    return () => {
      const s = stateRef.current;
      if (s.timer) s.timer.stop();
    };
  }, [dataLoaded, initGlobe]);

  /* ── Touch & click handlers ── */
  useEffect(() => {
    if (!globeReady) return;
    const el = svgRef.current;
    if (!el) return;

    /* Helper: get raw page coordinates of touches relative to el */
    function relTouches(e) {
      const rect = el.getBoundingClientRect();
      return Array.from(e.touches).map(t => ({
        x: t.clientX - rect.left,
        y: t.clientY - rect.top,
        cx: t.clientX,
        cy: t.clientY,
      }));
    }

    /* Track touch start position to detect tap vs drag */
    let touchStartX = 0, touchStartY = 0;

    function onTouchStart(e) {
      /* DO NOT call e.preventDefault() here — it kills the tap/click event.
         Instead we control scrolling via CSS touch-action on the element.     */
      const s = stateRef.current;
      s.autoRotating = false;
      const touches = relTouches(e);

      if (touches.length === 1) {
        s.isDragging  = true;
        s.lastPos     = [touches[0].x, touches[0].y];
        s.lastDist    = null;
        touchStartX   = touches[0].x;
        touchStartY   = touches[0].y;
      } else if (touches.length === 2) {
        s.isDragging = false;
        const dx = touches[1].cx - touches[0].cx;
        const dy = touches[1].cy - touches[0].cy;
        s.lastDist = Math.sqrt(dx * dx + dy * dy);
        s.lastPos  = null;
      }
    }

    function onTouchMove(e) {
      e.preventDefault();   // prevent page scroll only during active move
      const s = stateRef.current;
      const touches = relTouches(e);

      if (touches.length === 1 && s.isDragging && s.lastPos) {
        const dx = touches[0].x - s.lastPos[0];
        const dy = touches[0].y - s.lastPos[1];
        s.rotation[0] += dx * 0.5;
        s.rotation[1]  = Math.max(-90, Math.min(90, s.rotation[1] - dy * 0.5));
        s.lastPos      = [touches[0].x, touches[0].y];
        renderGlobe();
      } else if (touches.length === 2 && s.lastDist !== null) {
        const dx   = touches[1].cx - touches[0].cx;
        const dy   = touches[1].cy - touches[0].cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = dist / s.lastDist;
        s.scale    = Math.max(0.4, Math.min(4, s.scale * ratio));
        s.projection.scale(Math.min(s.width, s.height) * BASE_SCALE_FACTOR * s.scale);
        s.lastDist = dist;
        renderGlobe();
      }
    }

    function onTouchEnd(e) {
      const s = stateRef.current;

      /* Detect tap: single finger, moved < 10px → treat as pin click */
      if (e.changedTouches.length === 1 && s.isDragging) {
        const rect = el.getBoundingClientRect();
        const ex = e.changedTouches[0].clientX - rect.left;
        const ey = e.changedTouches[0].clientY - rect.top;
        const moved = Math.sqrt((ex - touchStartX) ** 2 + (ey - touchStartY) ** 2);
        if (moved < 10) {
          hitTestPin(ex, ey);
        }
      }

      s.isDragging = false;
      s.lastPos    = null;
      s.lastDist   = null;
    }

    /* Desktop click (also fires on mobile if no touch handler consumed it) */
    function onClick(e) {
      const rect = el.getBoundingClientRect();
      hitTestPin(e.clientX - rect.left, e.clientY - rect.top);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true });
    el.addEventListener("click",      onClick);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
      el.removeEventListener("click",      onClick);
    };
  }, [globeReady]); // eslint-disable-line

  /* ── Mouse wheel zoom (desktop) ── */
  useEffect(() => {
    if (!globeReady) return;
    const el = svgRef.current;
    if (!el) return;
    function onWheel(e) {
      e.preventDefault();
      const s = stateRef.current;
      s.autoRotating = false;
      s.scale *= e.deltaY > 0 ? 0.92 : 1.08;
      s.scale = Math.max(0.4, Math.min(4, s.scale));
      s.projection.scale(Math.min(s.width, s.height) * BASE_SCALE_FACTOR * s.scale);
      renderGlobe();
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [globeReady]);

  /* ── Mouse drag (desktop) ── */
  useEffect(() => {
    if (!globeReady) return;
    const el = svgRef.current;
    if (!el) return;
    let dragging = false, last = null;
    function onDown(e) {
      dragging = true;
      last = [e.clientX, e.clientY];
      stateRef.current.autoRotating = false;
    }
    function onMove(e) {
      if (!dragging || !last) return;
      const s = stateRef.current;
      const dx = e.clientX - last[0];
      const dy = e.clientY - last[1];
      s.rotation[0] += dx * 0.4;
      s.rotation[1] = Math.max(-90, Math.min(90, s.rotation[1] - dy * 0.4));
      last = [e.clientX, e.clientY];
      renderGlobe();
    }
    function onUp() { dragging = false; last = null; }
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [globeReady]);
  function hitTestPin(mx, my) {
    const s = stateRef.current;
    let best = null, bestDist = 32; // px tap radius
    for (const d of s.mapData) {
      const p = s.projection([d.longitude, d.latitude]);
      if (!p) continue;
      /* Skip pins on back hemisphere */
      const rot = s.projection.rotate();
      const gDist = d3.geoDistance([d.longitude, d.latitude], [-rot[0], -rot[1]]);
      if (gDist >= Math.PI / 2) continue;
      const dist = Math.sqrt((p[0] - mx) ** 2 + (p[1] - my) ** 2);
      if (dist < bestDist) { bestDist = dist; best = d; }
    }
    if (best) openDrawer(best);
  }
  async function openDrawer(cityData) {
    setDrawerCity(cityData);
    setDrawerOpen(true);
    setDrawerJobs([]);
    setDrawerLoading(true);

    /* Fly globe to city */
    flyTo(cityData.latitude, cityData.longitude);

    try {
      const res  = await getCityJobs(cityData.city);
      const jobs = res.data?.data || res.data || [];
      setDrawerJobs(jobs);
    } catch {
      setDrawerJobs([]);
    } finally {
      setDrawerLoading(false);
    }
  }

  function flyTo(lat, lng) {
    const s      = stateRef.current;
    const target = [-lng, -lat];
    const start  = [...s.rotation];
    let step = 0;
    const iv = setInterval(() => {
      step++;
      const t    = step / 40;
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      s.rotation[0] = start[0] + (target[0] - start[0]) * ease;
      s.rotation[1] = start[1] + (target[1] - start[1]) * ease;
      s.projection.rotate(s.rotation);
      renderGlobe();
      if (step >= 40) clearInterval(iv);
    }, 16);
  }

  /* ── Salary formatter ── */
  function fmtSalary(min, max) {
    if (!min) return null;
    const toK = n => (n / 1000).toFixed(0);
    return `₹${toK(min)}k–₹${toK(max)}k`;
  }

  /* ── Render ── */
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", display: "flex", flexDirection: "column", zIndex: 1 }}>

      {/* Back button overlay */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: "absolute", top: 14, left: 16, zIndex: 50,
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "8px 14px",
          fontFamily: "var(--font-sans)", fontSize: "0.85rem", fontWeight: 700,
          color: "var(--black)", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
        }}
      >
        ← Back
      </button>

      {/* Title badge */}
      <div style={{
        position: "absolute", top: 14, right: 16, zIndex: 50,
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "8px 14px",
        fontFamily: "var(--font-serif)", fontSize: "0.95rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
      }}>
        Job<span style={{ color: "var(--pink)" }}>Map</span>
      </div>

      {/* Globe area */}
      <div
        ref={wrapRef}
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
      >
        <svg
          ref={svgRef}
          style={{ display: "block", width: "100%", height: "100%", cursor: "grab", touchAction: "none" }}
        />

        {/* Hint */}
        {globeReady && (
          <div style={{
            position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
            fontSize: "0.72rem", color: "var(--muted)", fontWeight: 500,
            background: "var(--card)", padding: "5px 14px", borderRadius: 999,
            border: "1px solid var(--border)", whiteSpace: "nowrap", pointerEvents: "none",
          }}>
            Drag to rotate · Pinch to zoom · Tap city
          </div>
        )}

        {/* Loading state */}
        {!globeReady && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", flexDirection: "column", gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              border: "3px solid var(--border)",
              borderTopColor: "var(--pink)",
              animation: "spin 0.8s linear infinite",
            }} />
            <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Loading globe…</div>
          </div>
        )}
      </div>

      {/* Bottom drawer overlay */}
      {drawerOpen && (
        <div
          className="overlay"
          onClick={() => setDrawerOpen(false)}
          style={{ zIndex: 98 }}
        />
      )}

      {/* Bottom drawer */}
      <div
        className="bottom-sheet"
        style={{
          zIndex: 99,
          transform: drawerOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
          maxHeight: "52vh",
          display: "flex",
          flexDirection: "column",
          visibility: drawerCity ? "visible" : "hidden",
        }}
      >
        <div className="sheet-handle" onClick={() => setDrawerOpen(false)} />

        {drawerCity && (
          <>
            {/* Drawer header */}
            <div style={{ padding: "0 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--pink)", flexShrink: 0,
                }} />
                <div>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem" }}>{drawerCity.city}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: 8 }}>
                    {drawerCity.job_count} job{drawerCity.job_count !== 1 ? "s" : ""}
                    {drawerCity.state ? ` · ${drawerCity.state}` : ""}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ background: "none", border: "none", fontSize: "1.1rem", color: "var(--muted)", cursor: "pointer", padding: "0 2px" }}
              >×</button>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "var(--border)", marginBottom: 8 }} />

            {/* Jobs list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 16px" }}>
              {drawerLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    border: "2.5px solid var(--border)", borderTopColor: "var(--pink)",
                    animation: "spin 0.8s linear infinite",
                  }} />
                </div>
              ) : drawerJobs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 12px" }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>📍</div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 3 }}>No jobs listed yet</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Explore another city</div>
                </div>
              ) : (
                drawerJobs.map(job => (
                  <div
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    style={{
                      display: "flex", alignItems: "center",
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "9px 12px",
                      marginBottom: 6,
                      cursor: "pointer",
                      gap: 10,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {job.title}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 1 }}>
                        {job.company_name}
                        {fmtSalary(job.salary_min, job.salary_max) &&
                          <span style={{ color: "var(--pink)", fontWeight: 600, marginLeft: 6 }}>
                            {fmtSalary(job.salary_min, job.salary_max)}
                          </span>
                        }
                      </div>
                    </div>
                    <span style={{ color: "var(--muted)", fontSize: "1rem", flexShrink: 0 }}>›</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}