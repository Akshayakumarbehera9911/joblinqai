# ── Step 2: Market Demand Analyzer ────────────────────────────────────────
# Reads active job postings from DB for target role
# Returns ordered list of in-demand skills
# Falls back to curated static list if fewer than 5 jobs exist

from sqlalchemy.orm import Session
from collections import Counter

# ── Static fallback skill lists by role category ───────────────────────────
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


def analyze_market_demand(target_role: str, role_type: str, db: Session) -> list:
    from backend.models.job import Job, JobSkill

    # Find active jobs matching target role
    matching_jobs = db.query(Job).filter(
        Job.status == "active",
        Job.title.ilike(f"%{target_role.split()[0]}%")  # match on first keyword
    ).limit(50).all()

    if len(matching_jobs) < 5:
        # Not enough data — use static fallback
        return STATIC_MARKET_DEMAND.get(role_type, STATIC_MARKET_DEMAND["non-technical"])

    # Count skill frequency across matching jobs
    job_ids = [j.id for j in matching_jobs]
    skills  = db.query(JobSkill).filter(JobSkill.job_id.in_(job_ids)).all()

    counter = Counter(s.skill_name for s in skills)
    # Return skills ordered by frequency
    return [skill for skill, _ in counter.most_common(20)]