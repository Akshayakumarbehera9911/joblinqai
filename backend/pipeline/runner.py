# ── Pipeline Runner ────────────────────────────────────────────────────────
# Orchestrates all 6 steps in sequence
# Called when candidate profile is created or updated
from sqlalchemy.orm import Session
from backend.models.candidate import CandidateProfile, CandidateSkill, CandidateCertification, CandidateProject
from backend.models.score import ReadinessScore, SkillGap
from backend.pipeline.role_detector    import detect_role_type
from backend.pipeline.market_analyzer  import analyze_market_demand
from backend.pipeline.profile_analyzer import analyze_profile
from backend.pipeline.gap_identifier   import identify_gaps
from backend.pipeline.scorer           import calculate_score
from backend.pipeline.resume_parser    import extract_skills_from_resume
from backend.pipeline.ml_scorer        import get_ml_verdict

def run_pipeline(candidate_id: int, db: Session) -> dict:
    """Run full AI scoring pipeline for a candidate."""
    # Load candidate data
    profile  = db.query(CandidateProfile).filter(CandidateProfile.id == candidate_id).first()
    if not profile or not profile.target_role:
        return {"error": "Profile incomplete — target_role required"}
    skills   = db.query(CandidateSkill).filter(CandidateSkill.candidate_id == candidate_id).all()
    certs    = db.query(CandidateCertification).filter(CandidateCertification.candidate_id == candidate_id).all()
    projects = db.query(CandidateProject).filter(CandidateProject.candidate_id == candidate_id).all()

    # Step 1 — Detect role type and weights
    role_info  = detect_role_type(profile.target_role)
    role_type  = role_info["role_type"]
    weights    = role_info["weights"]

    # Step 2 — Analyze market demand
    market_demand = analyze_market_demand(profile.target_role, role_type, db)

    # Step 3 — Analyze profile
    structured = analyze_profile(profile, skills, certs, projects)
    structured["role_type"] = role_type

    # Step 3b — Enrich skills with resume text (if available)
    existing_skill_names = [s.skill_name for s in skills]

    # Resume enrichment — only used for scoring, NOT for gap analysis
    # Gap analysis uses only DB skills (what candidate has manually confirmed)
    if profile.resume_text:
        resume_skills = extract_skills_from_resume(profile.resume_text, existing_skill_names)
        enriched_skills = list(set(existing_skill_names + resume_skills))
    else:
        enriched_skills = existing_skill_names

    # Step 4 — Identify gaps (using ONLY DB skills — resume skills are suggestions, not confirmed)
    gaps = identify_gaps(existing_skill_names, market_demand, profile.target_role, db)

    # Step 5 — Calculate score
    score_result = calculate_score(structured, market_demand, weights)

    # ── ML Verdict ───────────────────────────────────────────────────────────
    # Raw skills match percent (before cert bonus) — what model was trained on
    if market_demand:
        candidate_lower = set(s.lower() for s in enriched_skills)
        matched = sum(1 for s in market_demand if s.lower() in candidate_lower)
        skills_match_pct = int((matched / len(market_demand)) * 100)
    else:
        skills_match_pct = 0

    ml_verdict = get_ml_verdict(
        experience_years     = profile.experience,
        education_level      = profile.education_level,
        skills_match_percent = skills_match_pct,
        num_projects         = len(projects),
        num_certifications   = len(certs),
        role_type            = role_type
    )

    # ── Save score to DB (upsert) ────────────────────────────────────────────
    existing_score = db.query(ReadinessScore).filter(
        ReadinessScore.candidate_id == candidate_id,
        ReadinessScore.target_role  == profile.target_role
    ).first()
    if existing_score:
        existing_score.overall_score    = score_result["overall_score"]
        existing_score.experience_score = score_result["experience_score"]
        existing_score.project_score    = score_result["project_score"]
        existing_score.skills_score     = score_result["skills_score"]
        existing_score.education_score  = score_result["education_score"]
        existing_score.score_breakdown  = score_result["breakdown"]
        existing_score.ml_verdict       = ml_verdict
    else:
        new_score = ReadinessScore(
            candidate_id     = candidate_id,
            target_role      = profile.target_role,
            overall_score    = score_result["overall_score"],
            experience_score = score_result["experience_score"],
            project_score    = score_result["project_score"],
            skills_score     = score_result["skills_score"],
            education_score  = score_result["education_score"],
            score_breakdown  = score_result["breakdown"],
            ml_verdict       = ml_verdict,
        )
        db.add(new_score)

    # ── Save gaps to DB (replace old gaps for this role) ────────────────────
    db.query(SkillGap).filter(
        SkillGap.candidate_id == candidate_id,
        SkillGap.target_role  == profile.target_role
    ).delete()
    for gap in gaps:
        db.add(SkillGap(
            candidate_id = candidate_id,
            target_role  = profile.target_role,
            skill_name   = gap["skill_name"],
            gap_level    = gap["gap_level"],
            udemy_link   = gap["udemy_link"],
        ))
    db.commit()

    return {
        "role_type":     role_type,
        "overall_score": score_result["overall_score"],
        "breakdown":     score_result["breakdown"],
        "gaps_count":    len(gaps),
        "gaps":          gaps,
        "ml_verdict":    ml_verdict,   # None if profile too incomplete
    }