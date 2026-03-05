import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TopBar     from "../../components/TopBar";
import JobCard    from "../../components/JobCard";
import Spinner    from "../../components/Spinner";
import EmptyState from "../../components/EmptyState";
import { searchJobs } from "../../api/jobs";

const GLOBE_BTN = {
  flexShrink: 0,
  width: 42, height: 42,
  background: "var(--card)",
  border: "1.5px solid var(--border)",
  borderRadius: "var(--radius)",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
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

  // Filter state
  const [filters, setFilters] = useState({ job_type: "", work_mode: "", role_type: "", city: "", state: "" });
  const [applied, setApplied] = useState({});

  const navigate = useNavigate();

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
      <TopBar title="Find Jobs" />

      <div className="page" style={{ padding: "calc(var(--topbar-height) + 12px) 16px calc(var(--nav-height) + 20px)" }}>

        {/* Search bar + filter button */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <input
            className="input"
            type="text"
            placeholder="Search jobs, skills..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" style={{
            padding: "0 14px",
            background: "var(--pink)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
          }}>Search</button>
          <button
            type="button"
            title="Job Map"
            onClick={() => navigate("/jobs/map")}
            style={GLOBE_BTN}
          ><GlobeIcon /></button>
        </form>

        {/* Filter chips row */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", overflowX: "auto", paddingBottom: "4px" }}>
          <button onClick={() => setShowFilter(true)} style={{
            flexShrink: 0,
            padding: "6px 14px",
            border: `1.5px solid ${activeFilterCount > 0 ? "var(--pink)" : "var(--border)"}`,
            borderRadius: "999px",
            background: activeFilterCount > 0 ? "var(--pink-light)" : "var(--card)",
            color: activeFilterCount > 0 ? "var(--pink)" : "var(--muted)",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}>
            ⚙ Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
          </button>

          {/* Quick filter chips */}
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
                flexShrink: 0,
                padding: "6px 14px",
                border: `1.5px solid ${isActive ? "var(--pink)" : "var(--border)"}`,
                borderRadius: "999px",
                background: isActive ? "var(--pink-light)" : "var(--card)",
                color: isActive ? "var(--pink)" : "var(--muted)",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: "pointer",
              }}>{chip.label}</button>
            );
          })}
        </div>

        {/* Results count */}
        {!loading && total > 0 && (
          <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "12px" }}>
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
                width: "100%", padding: "12px",
                background: "var(--card)", border: "1.5px solid var(--border)",
                borderRadius: "var(--radius)", color: "var(--pink)",
                fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", marginTop: "8px",
              }}>
                {loading ? "Loading..." : "Load more"}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}>Filters</span>
              <button onClick={clearFilters} style={{ background: "none", border: "none", color: "var(--pink)", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>Clear all</button>
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

            <div style={{ marginBottom: "16px" }}>
              <label className="label">City</label>
              <input className="input" type="text" placeholder="e.g. Bangalore"
                value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} />
            </div>

            <div style={{ marginBottom: "24px" }}>
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
    <div style={{ marginBottom: "20px" }}>
      <label className="label">{label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
        {children}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 14px",
      border: `1.5px solid ${active ? "var(--pink)" : "var(--border)"}`,
      borderRadius: "999px",
      background: active ? "var(--pink-light)" : "var(--card)",
      color: active ? "var(--pink)" : "var(--muted)",
      fontSize: "0.82rem", fontWeight: 600,
      cursor: "pointer", transition: "all 0.15s",
      textTransform: "capitalize",
    }}>{label}</button>
  );
}