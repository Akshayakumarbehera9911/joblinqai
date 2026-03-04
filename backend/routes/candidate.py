from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date

from backend.database import get_db
from backend.models.candidate import CandidateProfile, CandidateSkill, CandidateCertification, CandidateProject
from backend.models.user import User
from backend.utils.dependencies import require_candidate

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────
class ProfileCreate(BaseModel):
    gender:              Optional[str] = None
    date_of_birth:       Optional[date] = None
    state:               Optional[str] = None
    district:            Optional[str] = None
    city:                Optional[str] = None
    pincode:             Optional[str] = None
    education_level:     Optional[str] = None
    education_field:     Optional[str] = None
    institution:         Optional[str] = None
    passing_year:        Optional[int] = None
    experience:          Optional[str] = None
    current_title:       Optional[str] = None
    industry:            Optional[str] = None
    target_role:         Optional[str] = None
    job_type:            Optional[str] = None
    work_mode:           Optional[str] = None
    availability:        Optional[str] = None
    expected_salary_min: Optional[int] = None
    expected_salary_max: Optional[int] = None

class SkillCreate(BaseModel):
    skill_name: str
    category:   Optional[str] = None
    level:      Optional[str] = None

class CertCreate(BaseModel):
    cert_name:      str
    platform:       Optional[str] = None
    year_completed: Optional[int] = None
    cert_url:       Optional[str] = None

class ProjectCreate(BaseModel):
    title:       str
    description: Optional[str] = None
    tech_stack:  Optional[str] = None
    project_url: Optional[str] = None
    year:        Optional[int] = None


# ── Helper: get or 404 ─────────────────────────────────────────────────────
def get_profile_or_404(user_id: int, db: Session) -> CandidateProfile:
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please create your profile first.")
    return profile


# ── GET /api/candidate/profile ─────────────────────────────────────────────
@router.get("/profile")
def get_profile(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not profile:
        return {"success": True, "data": None, "error": None}

    skills = db.query(CandidateSkill).filter(CandidateSkill.candidate_id == profile.id).all()
    certs  = db.query(CandidateCertification).filter(CandidateCertification.candidate_id == profile.id).all()
    projects = db.query(CandidateProject).filter(CandidateProject.candidate_id == profile.id).all()

    return {
        "success": True,
        "data": {
            "profile": {
                "id": profile.id,
                "user_id": profile.user_id,
                "photo_url": profile.photo_url,
                "gender": profile.gender,
                "date_of_birth": str(profile.date_of_birth) if profile.date_of_birth else None,
                "state": profile.state,
                "district": profile.district,
                "city": profile.city,
                "pincode": profile.pincode,
                "education_level": profile.education_level,
                "education_field": profile.education_field,
                "institution": profile.institution,
                "passing_year": profile.passing_year,
                "experience": profile.experience,
                "current_title": profile.current_title,
                "industry": profile.industry,
                "resume_url": profile.resume_url,
                "target_role": profile.target_role,
                "job_type": profile.job_type,
                "work_mode": profile.work_mode,
                "availability": profile.availability,
                "expected_salary_min": profile.expected_salary_min,
                "expected_salary_max": profile.expected_salary_max,
                "profile_complete": profile.profile_complete,
            },
            "skills":   [{"id": s.id, "skill_name": s.skill_name, "category": s.category, "level": s.level} for s in skills],
            "certs":    [{"id": c.id, "cert_name": c.cert_name, "platform": c.platform, "year_completed": c.year_completed, "cert_url": c.cert_url} for c in certs],
            "projects": [{"id": p.id, "title": p.title, "description": p.description, "tech_stack": p.tech_stack, "project_url": p.project_url, "year": p.year} for p in projects],
        },
        "error": None
    }


# ── POST /api/candidate/profile ────────────────────────────────────────────
@router.post("/profile")
def create_profile(body: ProfileCreate, current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    existing = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists. Use PUT to update.")

    profile = CandidateProfile(user_id=current_user.id, **body.model_dump(exclude_none=True))
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return {"success": True, "data": {"profile_id": profile.id}, "error": None}


# ── PUT /api/candidate/profile ─────────────────────────────────────────────
@router.put("/profile")
def update_profile(body: ProfileCreate, current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    # Check if profile is complete enough
    required = [profile.state, profile.city, profile.education_level, profile.experience, profile.target_role]
    profile.profile_complete = all(required)

    db.commit()
    return {"success": True, "data": {"message": "Profile updated"}, "error": None}


# ── POST /api/candidate/resume ─────────────────────────────────────────────
@router.post("/resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db)
):
    profile = get_profile_or_404(current_user.id, db)

    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Validate file size (5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be under 5MB")

    try:
        from backend.utils.cloudinary_helper import upload_file
        url = upload_file(contents, folder="jobportal/resumes", resource_type="raw")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    # Extract text from PDF
    resume_text = ""
    try:
        import io
        import pdfplumber
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    resume_text += text + "\n"
    except Exception:
        pass  # Text extraction failure is non-fatal

    profile.resume_url  = url
    profile.resume_text = resume_text.strip()
    db.commit()

    return {
        "success": True,
        "data": {"resume_url": url, "text_extracted": bool(resume_text)},
        "error": None
    }


# ── DELETE /api/candidate/resume ───────────────────────────────────────────
@router.delete("/resume")
def delete_resume(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)
    if not profile.resume_url:
        raise HTTPException(status_code=404, detail="No resume found")

    try:
        from backend.utils.cloudinary_helper import delete_file, url_to_public_id
        public_id = url_to_public_id(profile.resume_url)
        if public_id:
            delete_file(public_id, resource_type="raw")
    except Exception:
        pass  # Even if Cloudinary delete fails, clear from DB

    profile.resume_url  = None
    profile.resume_text = None
    db.commit()

    return {"success": True, "data": {"message": "Resume deleted"}, "error": None}


# ── GET /api/candidate/skills ──────────────────────────────────────────────
@router.get("/skills")
def get_skills(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)
    skills = db.query(CandidateSkill).filter(CandidateSkill.candidate_id == profile.id).all()
    return {
        "success": True,
        "data": [{"id": s.id, "skill_name": s.skill_name, "category": s.category, "level": s.level} for s in skills],
        "error": None
    }


# ── POST /api/candidate/skills ─────────────────────────────────────────────
@router.post("/skills")
def add_skills(skills: List[SkillCreate], current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)

    added = []
    for s in skills:
        skill = CandidateSkill(candidate_id=profile.id, **s.model_dump())
        db.add(skill)
        added.append(s.skill_name)

    db.commit()
    return {"success": True, "data": {"added": added}, "error": None}


# ── DELETE /api/candidate/skills/{id} ─────────────────────────────────────
@router.delete("/skills")
def delete_all_skills(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)
    db.query(CandidateSkill).filter(CandidateSkill.candidate_id == profile.id).delete()
    db.commit()
    return {"success": True, "data": {"message": "All skills removed"}, "error": None}

@router.delete("/skills/{skill_id}")
def delete_skill(skill_id: int, current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)
    skill = db.query(CandidateSkill).filter(
        CandidateSkill.id == skill_id,
        CandidateSkill.candidate_id == profile.id
    ).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    db.delete(skill)
    db.commit()
    return {"success": True, "data": {"message": "Skill removed"}, "error": None}


# ── GET/POST /api/candidate/certifications ─────────────────────────────────
@router.get("/certifications")
def get_certs(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)
    certs = db.query(CandidateCertification).filter(CandidateCertification.candidate_id == profile.id).all()
    return {
        "success": True,
        "data": [{"id": c.id, "cert_name": c.cert_name, "platform": c.platform, "year_completed": c.year_completed, "cert_url": c.cert_url} for c in certs],
        "error": None
    }

@router.post("/certifications")
def add_cert(body: CertCreate, current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)
    cert = CandidateCertification(candidate_id=profile.id, **body.model_dump(exclude_none=True))
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return {"success": True, "data": {"id": cert.id, "cert_name": cert.cert_name, "platform": cert.platform, "year_completed": cert.year_completed, "cert_url": cert.cert_url}, "error": None}

@router.delete("/certifications/{cert_id}")
def delete_cert(cert_id: int, current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)
    cert = db.query(CandidateCertification).filter(
        CandidateCertification.id == cert_id,
        CandidateCertification.candidate_id == profile.id
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    db.delete(cert)
    db.commit()
    return {"success": True, "data": {"message": "Certification removed"}, "error": None}


# ── GET/POST /api/candidate/projects ──────────────────────────────────────
@router.get("/projects")
def get_projects(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)
    projects = db.query(CandidateProject).filter(CandidateProject.candidate_id == profile.id).all()
    return {
        "success": True,
        "data": [{"id": p.id, "title": p.title, "description": p.description, "tech_stack": p.tech_stack, "project_url": p.project_url, "year": p.year} for p in projects],
        "error": None
    }

@router.post("/projects")
def add_project(body: ProjectCreate, current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)
    project = CandidateProject(candidate_id=profile.id, **body.model_dump(exclude_none=True))
    db.add(project)
    db.commit()
    db.refresh(project)
    return {"success": True, "data": {"id": project.id, "title": project.title, "description": project.description, "tech_stack": project.tech_stack, "project_url": project.project_url, "year": project.year}, "error": None}

@router.delete("/projects/{project_id}")
def delete_project(project_id: int, current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = get_profile_or_404(current_user.id, db)
    project = db.query(CandidateProject).filter(
        CandidateProject.id == project_id,
        CandidateProject.candidate_id == profile.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"success": True, "data": {"message": "Project removed"}, "error": None}



# ── POST /api/candidate/photo ───────────────────────────────────────────────
@router.post("/photo")
async def upload_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db)
):
    profile = get_profile_or_404(current_user.id, db)

    allowed = [".jpg", ".jpeg", ".png", ".webp"]
    ext = "." + file.filename.lower().split(".")[-1]
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Only JPG, PNG or WEBP images allowed")

    contents = await file.read()
    if len(contents) > 3 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 3MB")

    try:
        from backend.utils.cloudinary_helper import upload_file
        url = upload_file(contents, folder="jobportal/photos", resource_type="image")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    profile.photo_url = url
    db.commit()

    return {"success": True, "data": {"photo_url": url}, "error": None}


# ── GET /api/candidate/dashboard ──────────────────────────────────────────
@router.get("/dashboard")
def dashboard(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    from backend.models.score import ReadinessScore, SkillGap
    from backend.pipeline.ranker import get_ranked_jobs
    from backend.models.candidate import CandidateSkill

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()

    if not profile:
        return {
            "success": True,
            "data": {
                "profile_complete": False,
                "score": None,
                "gaps": [],
                "top_jobs": [],
                "message": "Please complete your profile to see your readiness score."
            },
            "error": None
        }

    # Fetch cached score (never recalculate on dashboard view)
    score = db.query(ReadinessScore).filter(
        ReadinessScore.candidate_id == profile.id,
        ReadinessScore.target_role  == profile.target_role
    ).first()

    # Fetch gaps
    gaps = db.query(SkillGap).filter(
        SkillGap.candidate_id == profile.id,
        SkillGap.target_role  == profile.target_role
    ).all()

    # Fetch top matching jobs
    skills     = db.query(CandidateSkill).filter(CandidateSkill.candidate_id == profile.id).all()
    skill_names = [s.skill_name for s in skills]
    top_jobs   = get_ranked_jobs(profile, skill_names, db)[:5]

    return {
        "success": True,
        "data": {
            "profile_complete": profile.profile_complete,
            "full_name":    current_user.full_name,
            "photo_url":    profile.photo_url,
            "target_role":  profile.target_role,
            "score": {
                "overall":    score.overall_score,
                "experience": score.experience_score,
                "projects":   score.project_score,
                "skills":     score.skills_score,
                "education":  score.education_score,
                "breakdown":  score.score_breakdown,
            } if score else None,
            "gaps": [
                {"skill_name": g.skill_name, "gap_level": g.gap_level, "udemy_link": g.udemy_link}
                for g in gaps
            ],
            "top_jobs": top_jobs,
            # Profile completeness fields for dashboard
            "has_basic":       bool(profile.city and profile.state and profile.gender),
            "has_education":   bool(profile.education_level),
            "has_experience":  bool(profile.experience is not None),
            "has_skills":      len(skill_names) > 0,
            "has_resume":      bool(profile.resume_url),
            "has_preferences": bool(profile.target_role),
            "profile_complete_pct": (
                (5 if profile.city else 0) + (5 if profile.state else 0) + (5 if profile.gender else 0) +
                (8 if profile.education_level else 0) + (4 if profile.institution else 0) + (3 if profile.passing_year else 0) +
                (7 if profile.experience and profile.experience != "0" else 0) + (3 if profile.current_title else 0) +
                (5 if len(skill_names) >= 1 else 0) + (10 if len(skill_names) >= 5 else 0) + (10 if len(skill_names) >= 10 else 0) +
                (20 if profile.resume_url else 0) +
                (8 if profile.target_role else 0) + (4 if profile.job_type else 0) + (3 if profile.availability else 0)
            ),
        },
        "error": None
    }


# ── GET /api/candidate/applications ────────────────────────────────────────
@router.get("/applications")
def get_my_applications(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    from backend.models.application import Application
    from backend.models.job import Job
    from backend.models.company import Company

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not profile:
        return {"success": True, "data": [], "error": None}

    apps = db.query(Application).filter(Application.candidate_id == profile.id)\
             .order_by(Application.applied_at.desc()).all()

    result = []
    for a in apps:
        job = db.query(Job).filter(Job.id == a.job_id).first()
        if not job: continue
        company = db.query(Company).filter(Company.id == job.company_id).first()
        result.append({
            "application_id": a.id,
            "job_id":         job.id,
            "job_title":      job.title,
            "company_name":   company.company_name if company else "Unknown",
            "city":           job.city,
            "work_mode":      job.work_mode,
            "job_type":       job.job_type,
            "salary_min":     job.salary_min,
            "salary_max":     job.salary_max,
            "status":         a.status,
            "match_score":    a.match_score,
            "applied_at":     a.applied_at.isoformat() if a.applied_at else None,
        })
    return {"success": True, "data": result, "error": None}