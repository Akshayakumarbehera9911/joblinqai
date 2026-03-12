from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from pydantic import BaseModel
from typing import Optional, List
from datetime import date

from backend.database import get_db
from backend.models.company import Company
from backend.models.job import Job, JobSkill
from backend.models.application import Application
from backend.models.candidate import CandidateProfile
from backend.models.user import User
from backend.utils.dependencies import require_hr

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────
class CompanyCreate(BaseModel):
    company_name: str
    description:  Optional[str] = None
    industry:     Optional[str] = None
    company_type: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    website:      Optional[str] = None
    linkedin:     Optional[str] = None
    gst_cin:      Optional[str] = None
    state:        Optional[str] = None
    district:     Optional[str] = None
    city:         Optional[str] = None

class SkillInput(BaseModel):
    skill_name:   str
    is_mandatory: bool = False

class JobCreate(BaseModel):
    title:              str
    category:           Optional[str] = None
    role_type:          Optional[str] = None  # technical/non-technical/blue-collar
    job_type:           Optional[str] = None
    work_mode:          Optional[str] = None
    openings:           Optional[int] = 1
    state:              Optional[str] = None
    district:           Optional[str] = None
    city:               Optional[str] = None
    full_address:       Optional[str] = None
    latitude:           Optional[float] = None
    longitude:          Optional[float] = None
    min_experience:     Optional[str] = None
    education_required: Optional[str] = None
    description:        Optional[str] = None
    salary_min:         Optional[int] = None
    salary_max:         Optional[int] = None
    salary_type:        Optional[str] = None
    show_salary:        Optional[bool] = True
    deadline:           Optional[date] = None
    max_applicants:     Optional[int] = None
    skills:             Optional[List[SkillInput]] = []

class StatusUpdate(BaseModel):
    status: str  # active/closed/draft

class ApplicationStatusUpdate(BaseModel):
    status: str  # viewed/shortlisted/rejected


# ── Helper ─────────────────────────────────────────────────────────────────
def get_company_or_404(user_id: int, db: Session) -> Company:
    company = db.query(Company).filter(Company.user_id == user_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found. Please create it first.")
    return company


# ── GET /api/hr/company ────────────────────────────────────────────────────
@router.get("/company")
def get_company(current_user: User = Depends(require_hr), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        return {"success": True, "data": None, "error": None}
    return {
        "success": True,
        "data": {
            "id": company.id,
            "company_name": company.company_name,
            "logo_url": company.logo_url,
            "description": company.description,
            "industry": company.industry,
            "company_type": company.company_type,
            "company_size": company.company_size,
            "founded_year": company.founded_year,
            "website": company.website,
            "linkedin": company.linkedin,
            "gst_cin": company.gst_cin,
            "state": company.state,
            "district": company.district,
            "city": company.city,
            "is_verified": company.is_verified,
        },
        "error": None
    }


# ── POST /api/hr/company ───────────────────────────────────────────────────
@router.post("/company")
def create_company(body: CompanyCreate, current_user: User = Depends(require_hr), db: Session = Depends(get_db)):
    existing = db.query(Company).filter(Company.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Company profile already exists. Use PUT to update.")

    data = body.model_dump(exclude_none=True)
    # Set verified if GST/CIN provided
    is_verified = bool(data.get("gst_cin"))
    company = Company(user_id=current_user.id, is_verified=is_verified, **data)
    db.add(company)
    db.commit()
    db.refresh(company)

    return {"success": True, "data": {"company_id": company.id, "is_verified": company.is_verified}, "error": None}


# ── PUT /api/hr/company ────────────────────────────────────────────────────
@router.put("/company")
def update_company(body: CompanyCreate, current_user: User = Depends(require_hr), db: Session = Depends(get_db)):
    company = get_company_or_404(current_user.id, db)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(company, field, value)

    company.is_verified = bool(company.gst_cin)
    db.commit()
    return {"success": True, "data": {"message": "Company updated"}, "error": None}


# ── POST /api/hr/company/logo ──────────────────────────────────────────────
@router.post("/company/logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    company = get_company_or_404(current_user.id, db)

    allowed = [".jpg", ".jpeg", ".png", ".webp"]
    ext = "." + file.filename.lower().split(".")[-1]
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP allowed")

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File must be under 2MB")

    try:
        from backend.utils.cloudinary_helper import upload_file
        url = upload_file(contents, folder="jobportal/logos")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    company.logo_url = url
    db.commit()
    return {"success": True, "data": {"logo_url": url}, "error": None}


# ── GET /api/hr/jobs ───────────────────────────────────────────────────────
@router.get("/jobs")
def get_jobs(current_user: User = Depends(require_hr), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        return {"success": True, "data": [], "error": None}
    jobs = db.query(Job).filter(Job.company_id == company.id).order_by(Job.created_at.desc()).all()

    result = []
    for j in jobs:
        count = db.query(Application).filter(Application.job_id == j.id).count()
        skills = db.query(JobSkill).filter(JobSkill.job_id == j.id).all()
        result.append({
            "id": j.id,
            "title": j.title,
            "category": j.category,
            "role_type": j.role_type,
            "job_type": j.job_type,
            "work_mode": j.work_mode,
            "openings": j.openings,
            "city": j.city,
            "state": j.state,
            "district": j.district,
            "full_address": j.full_address,
            "latitude": float(j.latitude) if j.latitude else None,
            "longitude": float(j.longitude) if j.longitude else None,
            "min_experience": j.min_experience,
            "salary_min": j.salary_min,
            "salary_max": j.salary_max,
            "salary_type": j.salary_type,
            "description": j.description,
            "status": j.status,
            "applicant_count": count,
            "skills": [{"name": s.skill_name, "mandatory": s.is_mandatory} for s in skills],
            "created_at": str(j.created_at),
        })

    return {"success": True, "data": result, "error": None}


# ── POST /api/hr/jobs ──────────────────────────────────────────────────────
@router.post("/jobs")
def create_job(body: JobCreate, current_user: User = Depends(require_hr), db: Session = Depends(get_db)):
    company = get_company_or_404(current_user.id, db)

    skills_data = body.skills or []
    job_data = body.model_dump(exclude={"skills"}, exclude_none=True)

    job = Job(company_id=company.id, **job_data)
    db.add(job)
    db.flush()  # get job.id before committing

    for s in skills_data:
        skill = JobSkill(job_id=job.id, skill_name=s.skill_name, is_mandatory=s.is_mandatory)
        db.add(skill)

    db.commit()
    db.refresh(job)
    return {"success": True, "data": {"job_id": job.id}, "error": None}


# ── GET /api/hr/jobs/{id} ─────────────────────────────────────────────────
@router.get("/jobs/{job_id}")
def get_job_for_edit(job_id: int, current_user: User = Depends(require_hr), db: Session = Depends(get_db)):
    """Full job detail for HR edit modal — no status restriction."""
    company = get_company_or_404(current_user.id, db)
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    skills = db.query(JobSkill).filter(JobSkill.job_id == job.id).all()
    return {
        "success": True,
        "data": {
            "id": job.id,
            "title": job.title,
            "category": job.category,
            "role_type": job.role_type,
            "job_type": job.job_type,
            "work_mode": job.work_mode,
            "openings": job.openings,
            "city": job.city,
            "state": job.state,
            "district": job.district,
            "full_address": job.full_address,
            "latitude": float(job.latitude) if job.latitude else None,
            "longitude": float(job.longitude) if job.longitude else None,
            "min_experience": job.min_experience,
            "education_required": job.education_required,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "salary_type": job.salary_type,
            "description": job.description,
            "status": job.status,
            "skills": [{"name": s.skill_name, "mandatory": s.is_mandatory} for s in skills],
        },
        "error": None
    }


# ── PUT /api/hr/jobs/{id} ──────────────────────────────────────────────────
@router.put("/jobs/{job_id}")
def update_job(job_id: int, body: JobCreate, current_user: User = Depends(require_hr), db: Session = Depends(get_db)):
    company = get_company_or_404(current_user.id, db)
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    skills_data = body.skills or []
    for field, value in body.model_dump(exclude={"skills"}, exclude_none=True).items():
        setattr(job, field, value)

    # Replace skills
    db.query(JobSkill).filter(JobSkill.job_id == job.id).delete()
    for s in skills_data:
        skill = JobSkill(job_id=job.id, skill_name=s.skill_name, is_mandatory=s.is_mandatory)
        db.add(skill)

    db.commit()
    return {"success": True, "data": {"message": "Job updated"}, "error": None}


# ── DELETE /api/hr/jobs/{id} ───────────────────────────────────────────────
@router.delete("/jobs/{job_id}")
def delete_job(job_id: int, current_user: User = Depends(require_hr), db: Session = Depends(get_db)):
    company = get_company_or_404(current_user.id, db)
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"success": True, "data": {"message": "Job deleted"}, "error": None}


# ── PATCH /api/hr/jobs/{id}/status ────────────────────────────────────────
@router.patch("/jobs/{job_id}/status")
def update_job_status(job_id: int, body: StatusUpdate, current_user: User = Depends(require_hr), db: Session = Depends(get_db)):
    if body.status not in ("active", "closed", "draft"):
        raise HTTPException(status_code=400, detail="Status must be active, closed, or draft")
    company = get_company_or_404(current_user.id, db)
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = body.status
    db.commit()
    return {"success": True, "data": {"message": f"Job status set to {body.status}"}, "error": None}


# ── GET /api/hr/jobs/{id}/applicants ──────────────────────────────────────
@router.get("/jobs/{job_id}/applicants")
def get_applicants(
    job_id: int,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    company = get_company_or_404(current_user.id, db)
    job = db.query(Job).filter(Job.id == job_id, Job.company_id == company.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    applications = db.query(Application).filter(Application.job_id == job_id).order_by(
        case((Application.match_score == None, 0), else_=1).desc(), Application.match_score.desc()
    ).all()

    result = []
    for app in applications:
        profile = db.query(CandidateProfile).filter(CandidateProfile.id == app.candidate_id).first()
        user    = db.query(User).filter(User.id == profile.user_id).first() if profile else None

        # Only reveal contact info if shortlisted
        contact = {}
        if app.status == "shortlisted" and user:
            contact = {"email": user.email, "phone": user.phone}

        # Fall back to live job-skill match if no per-application score
        match_score = app.match_score
        if match_score is None and profile:
            from backend.models.candidate import CandidateSkill
            from backend.pipeline.ranker import rank_jobs_for_candidate
            cand_skills = [s.skill_name for s in db.query(CandidateSkill).filter(
                CandidateSkill.candidate_id == profile.id).all()]
            job_skills_rows = db.query(JobSkill).filter(JobSkill.job_id == job_id).all()
            mandatory = [s.skill_name for s in job_skills_rows if s.is_mandatory]
            optional  = [s.skill_name for s in job_skills_rows if not s.is_mandatory]
            ranked = rank_jobs_for_candidate(cand_skills, [{
                "job": job, "mandatory_skills": mandatory, "optional_skills": optional
            }])
            if ranked:
                match_score = ranked[0]["match_score"]

        result.append({
            "application_id": app.id,
            "status":         app.status,
            "match_score":    match_score,
            "applied_at":     str(app.applied_at),
            "full_name":      user.full_name if user else "Unknown",
            "photo_url":    profile.photo_url if profile else None,
            "city":           profile.city if profile else None,
            "experience":     profile.experience if profile else None,
            "target_role":    profile.target_role if profile else None,
            "availability":   profile.availability if profile else None,
            **contact,
        })

    return {"success": True, "data": result, "error": None}


# ── PATCH /api/hr/applicants/{id} ─────────────────────────────────────────
@router.patch("/applicants/{application_id}")
def update_application_status(
    application_id: int,
    body: ApplicationStatusUpdate,
    current_user: User = Depends(require_hr),
    db: Session = Depends(get_db)
):
    if body.status not in ("viewed", "shortlisted", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be viewed, shortlisted, or rejected")

    company = get_company_or_404(current_user.id, db)

    # Verify this application belongs to this company's job
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job = db.query(Job).filter(Job.id == app.job_id, Job.company_id == company.id).first()
    if not job:
        raise HTTPException(status_code=403, detail="Not authorized")

    app.status = body.status
    db.commit()

    # Send push notification to candidate
    try:
        from backend.utils.firebase import send_push_to_candidate
        if body.status == "shortlisted":
            send_push_to_candidate(
                app.candidate_id,
                title="🎉 You've been shortlisted!",
                body=f"Congratulations! Your application for {job.title} has been shortlisted.",
                db=db
            )
        elif body.status == "rejected":
            send_push_to_candidate(
                app.candidate_id,
                title="Application Update",
                body=f"Your application for {job.title} has been reviewed. Keep applying!",
                db=db
            )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error("Push failed: %s", str(e), exc_info=True)

# ── GET /api/hr/dashboard ─────────────────────────────────────────────────
@router.get("/dashboard")
def hr_dashboard(current_user: User = Depends(require_hr), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        return {
            "success": True,
            "data": {
                "company_exists": False,
                "message": "Please create your company profile first."
            },
            "error": None
        }

    total_jobs       = db.query(Job).filter(Job.company_id == company.id).count()
    active_jobs      = db.query(Job).filter(Job.company_id == company.id, Job.status == "active").count()
    total_applicants = db.query(Application).join(Job).filter(Job.company_id == company.id).count()
    shortlisted      = db.query(Application).join(Job).filter(
        Job.company_id == company.id, Application.status == "shortlisted"
    ).count()

    return {
        "success": True,
        "data": {
            "company_exists":  True,
            "company_name":    company.company_name,
            "logo_url":        company.logo_url,
            "industry":        company.industry,
            "company_size":    company.company_size,
            "city":            company.city,
            "state":           company.state,
            "website":         company.website,
            "gst_cin":         company.gst_cin,
            "description":     company.description,
            "is_verified":     company.is_verified,
            "total_jobs":      total_jobs,
            "active_jobs":     active_jobs,
            "total_applicants": total_applicants,
            "shortlisted":     shortlisted,
        },
        "error": None
    }