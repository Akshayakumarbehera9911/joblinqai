from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.candidate import CandidateProfile, CandidateSkill
from backend.models.score import ReadinessScore, SkillGap
from backend.models.user import User
from backend.utils.dependencies import require_candidate
from backend.pipeline.runner import run_pipeline
from backend.pipeline.ranker import get_ranked_jobs

router = APIRouter()


def get_profile_or_404(user_id: int, db: Session) -> CandidateProfile:
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


# ── POST /api/scoring/calculate ───────────────────────────────────────────
@router.post("/calculate")
def calculate(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)

    if not profile.target_role:
        raise HTTPException(status_code=400, detail="Please set your target role before scoring")

    result = run_pipeline(profile.id, db)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {"success": True, "data": result, "error": None}


# ── GET /api/scoring/score ────────────────────────────────────────────────
@router.get("/score")
def get_score(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)

    score = db.query(ReadinessScore).filter(
        ReadinessScore.candidate_id == profile.id,
        ReadinessScore.target_role  == profile.target_role
    ).first()

    if not score:
        return {
            "success": True,
            "data": {
                "scored": False,
                "message": "Score not yet calculated. Call POST /api/scoring/calculate first."
            },
            "error": None
        }

    return {
        "success": True,
        "data": {
            "scored":           True,
            "target_role":      score.target_role,
            "overall_score":    score.overall_score,
            "experience_score": score.experience_score,
            "project_score":    score.project_score,
            "skills_score":     score.skills_score,
            "education_score":  score.education_score,
            "breakdown":        score.score_breakdown,
            "calculated_at":    str(score.calculated_at),
        },
        "error": None
    }


# ── GET /api/scoring/gaps ─────────────────────────────────────────────────
@router.get("/gaps")
def get_gaps(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)

    gaps = db.query(SkillGap).filter(
        SkillGap.candidate_id == profile.id,
        SkillGap.target_role  == profile.target_role
    ).all()

    return {
        "success": True,
        "data": [
            {
                "skill_name": g.skill_name,
                "gap_level":  g.gap_level,
                "udemy_link": g.udemy_link,
            }
            for g in gaps
        ],
        "error": None
    }


# ── GET /api/scoring/ranked-jobs ──────────────────────────────────────────
@router.get("/ranked-jobs")
def ranked_jobs(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)
    skills  = db.query(CandidateSkill).filter(CandidateSkill.candidate_id == profile.id).all()
    skill_names = [s.skill_name for s in skills]

    ranked = get_ranked_jobs(profile, skill_names, db)

    return {"success": True, "data": ranked[:20], "error": None}  # top 20