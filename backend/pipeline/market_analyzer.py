# ── Step 2: Market Demand Analyzer ────────────────────────────────────────────
# Reads active job postings from DB for target role
# Uses Groq to find synonym job titles (same role family) for richer skill data
# Caches synonym results in role_synonym_cache table — rebuilt every 7 days
# or when job count grows by 15+ since last cache build
# Falls back to curated static list if fewer than 5 matching jobs found

import json
import logging
from datetime import datetime, timezone, timedelta
from collections import Counter
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _normalize_role(role: str) -> str:
    """Normalize role to title case for consistent cache keys.
    Prevents duplicate cache entries for same role with different casing.
    e.g. \"data analyst\" -> \"Data Analyst\"
    """
    return role.strip().title() if role else role

# ── Cache settings ─────────────────────────────────────────────────────────────
CACHE_MAX_AGE_DAYS  = 7    # rebuild cache after 7 days
CACHE_JOB_DELTA     = 15   # rebuild if job count grew by this many since last cache

# ── Static fallback skill lists by role category ───────────────────────────────
STATIC_MARKET_DEMAND = {
    "technical": [
        "Python", "JavaScript", "SQL", "Git", "REST APIs", "Problem Solving",
        "Data Structures", "Algorithms", "Linux", "Docker", "AWS", "FastAPI",
        "Django", "React", "System Design", "Agile", "Communication"
    ],
    "non-technical": [
        "Communication", "MS Office", "Excel", "Data Analysis", "Presentation",
        "Project Management", "Leadership", "Customer Service", "CRM Tools",
        "Negotiation", "Time Management", "Teamwork", "Reporting", "Email Writing"
    ],
    "blue-collar": [
        "Physical Fitness", "Safety Awareness", "Tool Handling", "Punctuality",
        "Basic Math", "Hindi", "English (Basic)", "Team Work", "Work Ethic",
        "License (if applicable)", "Local Knowledge", "Basic Computer"
    ]
}


# ── Groq synonym call ──────────────────────────────────────────────────────────
def _fetch_synonyms_from_groq(target_role: str, all_titles: list) -> list:
    """
    Ask Groq to find all job titles from DB that belong to the same
    role family as target_role. Returns list of matched titles.
    Always includes target_role itself in the result.
    Falls back to [target_role] if Groq fails.
    """
    from groq import Groq
    from backend.config import GROQ_API_KEY

    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set — synonym mapping skipped")
        return [target_role]

    if not all_titles:
        return [target_role]

    try:
        client = Groq(api_key=GROQ_API_KEY)
        titles_str = "\n".join(f"- {t}" for t in all_titles)

        prompt = f"""You are a job market expert for the Indian job market.

Here is a list of job titles from a job portal database:
{titles_str}

The candidate's target role is: "{target_role}"

Task: From the list above, identify job titles in the SAME role family as "{target_role}".

RULES — follow exactly:
1. Only return titles from the list above, nothing new
2. Always include "{target_role}" itself if it appears
3. Include roles with significantly overlapping core skills (50%+ overlap)
4. Include specialist/senior variants of the same domain — e.g. ML Engineer is in Data Science family, DevOps is in Software family
5. Frontend roles MUST NOT include pure backend roles (Django, FastAPI only)
6. Backend roles MUST NOT include pure frontend roles (React, CSS, HTML only)
7. Full Stack roles MUST include BOTH frontend (React, Frontend Developer) AND backend (Backend Engineer, Python Developer) adjacent titles
8. Data Analytics roles MUST NOT include Data Engineering or pure ML/AI roles
9. Data Science/ML roles MUST NOT include pure Data Analytics roles (SQL/Excel focus)
10. Non-tech roles (HR, Sales, Marketing) MUST NOT include tech roles
11. Engineering roles (Electrical, Mechanical, Civil) are isolated — never mix with IT roles
12. If a role shares ONLY generic skills like Communication, Excel, SQL — NOT enough, check domain fit
13. Be deterministic — same input always gives same output

Return ONLY a valid JSON array of strings. No explanation, no markdown."""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=500,
        )

        raw = response.choices[0].message.content.strip()

        # Strip markdown code fences if present
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        matched = json.loads(raw)

        # Validate — only keep titles that actually exist in our list
        valid_set = set(t.lower() for t in all_titles)
        matched   = [t for t in matched if t.lower() in valid_set]

        # Always ensure target role is included
        if target_role not in matched:
            matched.insert(0, target_role)

        logger.info("Groq synonym mapping: '%s' -> %d titles", target_role, len(matched))
        return matched

    except Exception as e:
        logger.error("Groq synonym fetch failed for '%s': %s", target_role, str(e))
        return [target_role]   # fail silently — never break pipeline


# ── Cache helpers ──────────────────────────────────────────────────────────────
def _is_cache_valid(cache_entry, current_job_count: int) -> bool:
    """Check if cached synonym entry is still fresh."""
    if cache_entry is None:
        return False

    now = datetime.now(timezone.utc)
    age = now - cache_entry.created_at.replace(tzinfo=timezone.utc)
    if age > timedelta(days=CACHE_MAX_AGE_DAYS):
        return False

    delta = abs(current_job_count - (cache_entry.job_count_snapshot or 0))
    if delta >= CACHE_JOB_DELTA:
        return False

    return True


def _get_matched_titles(target_role: str, db: Session) -> list:
    """
    Return list of job titles in same family as target_role.
    Uses cache if fresh, otherwise calls Groq and refreshes cache.
    Normalizes target_role to title case before cache lookup to prevent
    duplicate entries for same role with different casing.
    """
    from backend.models.job import Job
    from backend.models.score import RoleSynonymCache

    target_role = _normalize_role(target_role)
    current_job_count = db.query(Job).filter(Job.status == "active").count()

    cache = db.query(RoleSynonymCache).filter(
        RoleSynonymCache.target_role == target_role
    ).first()

    if _is_cache_valid(cache, current_job_count):
        logger.debug("Synonym cache hit for '%s'", target_role)
        return cache.matched_titles

    logger.info("Rebuilding synonym cache for '%s'", target_role)

    distinct_titles = [
        row[0] for row in
        db.query(Job.title).filter(Job.status == "active").distinct().all()
        if row[0]
    ]

    matched_titles = _fetch_synonyms_from_groq(target_role, distinct_titles)

    # Upsert cache
    if cache:
        cache.matched_titles     = matched_titles
        cache.job_count_snapshot = current_job_count
        cache.created_at         = datetime.now(timezone.utc)
    else:
        db.add(RoleSynonymCache(
            target_role        = target_role,
            matched_titles     = matched_titles,
            job_count_snapshot = current_job_count,
        ))

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error("Failed to save synonym cache: %s", str(e))

    return matched_titles


# ── Main function ──────────────────────────────────────────────────────────────
def analyze_market_demand(target_role: str, role_type: str, db: Session) -> list:
    from backend.models.job import Job, JobSkill
    from sqlalchemy import or_

    matched_titles = _get_matched_titles(target_role, db)

    title_filters = [Job.title.ilike(f"%{t}%") for t in matched_titles]

    matching_jobs = db.query(Job).filter(
        Job.status == "active",
        or_(*title_filters)
    ).limit(100).all()

    if len(matching_jobs) < 2:
        logger.debug(
            "Not enough jobs for '%s' (found %d) — using static fallback (threshold: 2)",
            target_role, len(matching_jobs)
        )
        return STATIC_MARKET_DEMAND.get(role_type, STATIC_MARKET_DEMAND["non-technical"])

    job_ids = [j.id for j in matching_jobs]
    skills  = db.query(JobSkill).filter(JobSkill.job_id.in_(job_ids)).all()

    counter = Counter(s.skill_name for s in skills)

    logger.info(
        "Market demand for '%s': %d jobs, %d unique skills",
        target_role, len(matching_jobs), len(counter)
    )

    return [skill for skill, _ in counter.most_common(20)]