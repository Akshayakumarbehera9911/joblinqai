import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TopBar     from "../../components/TopBar";
import JobCard    from "../../components/JobCard";
import Spinner    from "../../components/Spinner";
import EmptyState from "../../components/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { searchJobs } from "../../api/jobs";

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
    </svg>
  );
}

const JOB_TYPES  = ["full-time", "part-time", "contract", "internship"];
const WORK_MODES = ["onsite", "remote", "hybrid"];
const ROLE_TYPES = ["technical", "non-technical", "blue-collar"];

export default function Search() {
  const [query,   setQuery]   = useState("");
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);
  const [showFilter, setShowFilter] = useState(false);

  const [filters, setFilters] = useState({ job_type: "", work_mode: "", role_type: "", city: "", state: "" });
  const [applied, setApplied] = useState({});

  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  }

  function dismissInstallBanner() {
    setShowInstallBanner(false);
    localStorage.setItem("pwa-install-dismissed", "1");
  }

  async function fetchJobs(params, pageNum = 1) {
    setLoading(true);
    try {
      const res = await searchJobs({ ...params, page: pageNum, limit: 20 });
      if (pageNum === 1) setJobs(res.data.jobs);
      else setJobs(prev => [...prev, ...res.data.jobs]);
      setPages(res.data.pages);
      setTotal(res.data.total);
      setPage(pageNum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchJobs({}); }, []);

  function handleSearch(e) {
    e.preventDefault();
    fetchJobs({ q: query, ...applied });
  }

  function applyFilters() {
    setApplied({ ...filters });
    setShowFilter(false);
    fetchJobs({ q: query, ...filters });
  }

  function clearFilters() {
    const empty = { job_type: "", work_mode: "", role_type: "", city: "", state: "" };
    setFilters(empty);
    setApplied(empty);
    setShowFilter(false);
    fetchJobs({ q: query });
  }

  const activeFilterCount = Object.values(applied).filter(Boolean).length;

  return (
    <>
      <TopBar title="Find Jobs" right={
        !isLoggedIn ? (
          <button onClick={() => navigate("/login")} style={{
            padding: "6px 14px",
            background: "var(--pink)", color: "#fff",
            border: "none", borderRadius: 999,
            fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
          }}>Login</button>
        ) : null
      } />

      <div className="page" style={{ padding: "calc(var(--topbar-height) + 12px) 14px calc(var(--nav-height) + 20px)" }}>

        {/* Install banner */}
        {showInstallBanner && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--pink-light)", border: "1.5px solid #f8c5e0",
            borderRadius: 12, padding: "10px 14px", marginBottom: 12, gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <img src="https://jobportal-api-a2dcfwh8dfcaesf4.southindia-01.azurewebsites.net/static/icons/icon-192.png"
                width={32} height={32} style={{ borderRadius: 8, flexShrink: 0 }}
                onError={e => e.target.style.display = "none"} />
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--pink)" }}>Add JobPortal to Home Screen</div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Install for faster access & offline use</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={handleInstall} style={{
                padding: "6px 12px", background: "var(--pink)", color: "#fff",
                border: "none", borderRadius: 999,
                fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <DownloadIcon /> Install
              </button>
              <button onClick={dismissInstallBanner} style={{
                padding: "6px 10px", background: "none",
                border: "1.5px solid var(--border)", borderRadius: 999,
                fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", color: "var(--muted)",
              }}>✕</button>
            </div>
          </div>
        )}

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center",
            background: "var(--card)", border: "1.5px solid var(--border)",
            borderRadius: 12, overflow: "hidden", paddingLeft: 12,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search jobs, skills..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                flex: 1, border: "none", outline: "none", padding: "11px 10px",
                fontSize: "0.88rem", background: "transparent",
                fontFamily: "var(--font-sans)", color: "var(--black)",
              }}
            />
          </div>
          <button type="submit" style={{
            padding: "0 16px", background: "var(--pink)", color: "#fff",
            border: "none", borderRadius: 12, cursor: "pointer",
            fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap",
          }}>Search</button>
          <button type="button" onClick={() => navigate("/jobs/map")} style={{
            width: 44, height: 44, flexShrink: 0,
            background: "var(--card)", border: "1.5px solid var(--border)",
            borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "var(--muted)",
          }}><GlobeIcon /></button>
        </form>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 7, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
          {/* Filter button */}
          <button onClick={() => setShowFilter(true)} style={{
            flexShrink: 0, padding: "6px 12px",
            border: `1.5px solid ${activeFilterCount > 0 ? "var(--pink)" : "var(--border)"}`,
            borderRadius: 999,
            background: activeFilterCount > 0 ? "var(--pink)" : "var(--card)",
            color: activeFilterCount > 0 ? "#fff" : "var(--muted)",
            fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <FilterIcon />
            Filters {activeFilterCount > 0 ? `· ${activeFilterCount}` : ""}
          </button>

          {[
            { label: "Remote",     key: "work_mode", val: "remote" },
            { label: "Full-time",  key: "job_type",  val: "full-time" },
            { label: "Internship", key: "job_type",  val: "internship" },
            { label: "Technical",  key: "role_type", val: "technical" },
          ].map(chip => {
            const isActive = applied[chip.key] === chip.val;
            return (
              <button key={chip.label} onClick={() => {
                const newApplied = isActive
                  ? { ...applied, [chip.key]: "" }
                  : { ...applied, [chip.key]: chip.val };
                setApplied(newApplied);
                setFilters(newApplied);
                fetchJobs({ q: query, ...newApplied });
              }} style={{
                flexShrink: 0, padding: "6px 13px",
                border: `1.5px solid ${isActive ? "var(--pink)" : "var(--border)"}`,
                borderRadius: 999,
                background: isActive ? "var(--pink-light)" : "var(--card)",
                color: isActive ? "var(--pink)" : "var(--muted)",
                fontSize: "0.78rem", fontWeight: isActive ? 700 : 500, cursor: "pointer",
              }}>{chip.label}</button>
            );
          })}
        </div>

        {/* Results count */}
        {!loading && total > 0 && (
          <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: 10 }}>
            {total} job{total !== 1 ? "s" : ""} found
          </div>
        )}

        {/* Job list */}
        {loading && page === 1 ? <Spinner /> : jobs.length === 0 && !loading ? (
          <EmptyState icon="empty-search.png" title="No jobs found" subtitle="Try different keywords or filters" />
        ) : (
          <>
            {jobs.map(job => <JobCard key={job.id} job={job} />)}
            {page < pages && (
              <button onClick={() => fetchJobs({ q: query, ...applied }, page + 1)} style={{
                width: "100%", padding: "11px",
                background: "var(--card)", border: "1.5px solid var(--border)",
                borderRadius: 10, color: "var(--pink)",
                fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", marginTop: 8,
              }}>
                {loading ? "Loading…" : "Load more"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Filter bottom sheet */}
      {showFilter && (
        <>
          <div className="overlay" onClick={() => setShowFilter(false)} />
          <div className="bottom-sheet">
            <div className="sheet-handle" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem" }}>Filters</span>
              <button onClick={clearFilters} style={{ background: "none", border: "none", color: "var(--pink)", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>Clear all</button>
            </div>

            <FilterSection label="Job Type">
              {JOB_TYPES.map(v => (
                <FilterChip key={v} label={v} active={filters.job_type === v}
                  onClick={() => setFilters(f => ({ ...f, job_type: f.job_type === v ? "" : v }))} />
              ))}
            </FilterSection>

            <FilterSection label="Work Mode">
              {WORK_MODES.map(v => (
                <FilterChip key={v} label={v} active={filters.work_mode === v}
                  onClick={() => setFilters(f => ({ ...f, work_mode: f.work_mode === v ? "" : v }))} />
              ))}
            </FilterSection>

            <FilterSection label="Role Type">
              {ROLE_TYPES.map(v => (
                <FilterChip key={v} label={v} active={filters.role_type === v}
                  onClick={() => setFilters(f => ({ ...f, role_type: f.role_type === v ? "" : v }))} />
              ))}
            </FilterSection>

            <div style={{ marginBottom: 12 }}>
              <label className="label">City</label>
              <input className="input" type="text" placeholder="e.g. Bangalore"
                value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label className="label">State</label>
              <input className="input" type="text" placeholder="e.g. Karnataka"
                value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value }))} />
            </div>

            <button className="btn-primary" onClick={applyFilters}>Apply Filters</button>
          </div>
        </>
      )}
    </>
  );
}

function FilterSection({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label className="label">{label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
        {children}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 13px",
      border: `1.5px solid ${active ? "var(--pink)" : "var(--border)"}`,
      borderRadius: 999,
      background: active ? "var(--pink)" : "var(--card)",
      color: active ? "#fff" : "var(--muted)",
      fontSize: "0.78rem", fontWeight: 600,
      cursor: "pointer", textTransform: "capitalize",
    }}>{label}</button>
  );
}