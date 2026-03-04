# ── Step 6: Ranker ────────────────────────────────────────────────────────
# Ranks jobs for a candidate by match score
# Also ranks candidates for HR by match score

from sqlalchemy.orm import Session


def calculate_job_match(candidate_skills: list, job) -> int:
    """Calculate match percentage between candidate and a specific job."""
    from backend.models.job import JobSkill

    # This function is called with the job object and a db session
    # job_skills should be passed in
    return 0  # placeholder — actual logic below


def rank_jobs_for_candidate(candidate_skills: list, jobs_with_skills: list) -> list:
    """
    Score candidate against each job.
    jobs_with_skills: list of {job, mandatory_skills, optional_skills}
    Returns: sorted list of {job_id, title, company_name, match_score, city, salary_min, salary_max, missing_skills}
    """
    results = []
    candidate_lower = set(s.lower() for s in candidate_skills)

    for item in jobs_with_skills:
        job            = item["job"]
        mandatory      = [s.lower() for s in item["mandatory_skills"]]
        optional       = [s.lower() for s in item["optional_skills"]]

        if not mandatory and not optional:
            match = 50  # no skills required — neutral match
        else:
            # Mandatory skills worth 70%, optional worth 30%
            mandatory_matched = sum(1 for s in mandatory if s in candidate_lower)
            optional_matched  = sum(1 for s in optional  if s in candidate_lower)

            mandatory_score = (mandatory_matched / len(mandatory) * 70) if mandatory else 70
            optional_score  = (optional_matched  / len(optional)  * 30) if optional  else 30
            match = int(mandatory_score + optional_score)

        missing = [s for s in item["mandatory_skills"] if s.lower() not in candidate_lower]

        results.append({
            "job_id":     job.id,
            "title":      job.title,
            "match_score": match,
            "city":        job.city,
            "work_mode":   job.work_mode,
            "job_type":    job.job_type,
            "salary_min":  job.salary_min,
            "salary_max":  job.salary_max,
            "show_salary": job.show_salary,
            "missing_mandatory_skills": missing,
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results


def get_ranked_jobs(candidate_profile, candidate_skills: list, db: Session) -> list:
    """Fetch active jobs and rank them for candidate."""
    from backend.models.job import Job, JobSkill
    from backend.models.company import Company

    target_role = candidate_profile.target_role or ""
    keyword     = target_role.split()[0] if target_role else ""

    # Get active jobs — prioritize matching role, also include all active
    jobs = db.query(Job).filter(Job.status == "active").limit(100).all()

    jobs_with_skills = []
    for job in jobs:
        skills = db.query(JobSkill).filter(JobSkill.job_id == job.id).all()
        mandatory = [s.skill_name for s in skills if s.is_mandatory]
        optional  = [s.skill_name for s in skills if not s.is_mandatory]
        jobs_with_skills.append({
            "job": job,
            "mandatory_skills": mandatory,
            "optional_skills":  optional,
        })

    return rank_jobs_for_candidate(candidate_skills, jobs_with_skills)