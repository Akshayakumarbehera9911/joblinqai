from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from backend.database import get_db
from backend.models.user import User
from backend.models.company import Company
from backend.models.job import Job
from backend.models.application import Application
from backend.models.candidate import CandidateProfile
from backend.models.report import Report
from backend.utils.dependencies import require_admin

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────
class UserUpdate(BaseModel):
    full_name:   Optional[str] = None
    email:       Optional[str] = None
    role:        Optional[str] = None
    is_active:   Optional[bool] = None
    is_verified: Optional[bool] = None

class ReportStatusUpdate(BaseModel):
    status:     str
    admin_note: Optional[str] = None


# ── GET /api/admin/stats ───────────────────────────────────────────────────
@router.get("/stats")
def get_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    from backend.models.score import ReadinessScore

    total_users      = db.query(func.count(User.id)).scalar()
    total_candidates = db.query(func.count(User.id)).filter(User.role == "candidate").scalar()
    total_hr         = db.query(func.count(User.id)).filter(User.role == "hr").scalar()
    total_companies  = db.query(func.count(Company.id)).scalar()
    verified_cos     = db.query(func.count(Company.id)).filter(Company.is_verified == True).scalar()
    total_jobs       = db.query(func.count(Job.id)).scalar()
    active_jobs      = db.query(func.count(Job.id)).filter(Job.status == "active").scalar()
    closed_jobs      = db.query(func.count(Job.id)).filter(Job.status == "closed").scalar()
    draft_jobs       = db.query(func.count(Job.id)).filter(Job.status == "draft").scalar()
    total_apps       = db.query(func.count(Application.id)).scalar()
    viewed_apps      = db.query(func.count(Application.id)).filter(Application.status == "viewed").scalar()
    shortlisted_apps = db.query(func.count(Application.id)).filter(Application.status == "shortlisted").scalar()
    rejected_apps    = db.query(func.count(Application.id)).filter(Application.status == "rejected").scalar()
    open_reports     = db.query(func.count(Report.id)).filter(Report.status == "open").scalar()
    inactive_users   = db.query(func.count(User.id)).filter(User.is_active == False).scalar()

    avg_score_row = db.query(func.avg(ReadinessScore.overall_score)).scalar()
    avg_score = round(float(avg_score_row), 1) if avg_score_row else 0

    six_weeks_ago = datetime.utcnow() - timedelta(weeks=6)
    weekly_raw = db.query(
        func.date_trunc('week', Application.applied_at).label("week"),
        func.count(Application.id).label("count")
    ).filter(Application.applied_at >= six_weeks_ago)\
     .group_by(func.date_trunc('week', Application.applied_at))\
     .order_by(func.date_trunc('week', Application.applied_at)).all()
    weekly_apps = [{"week": str(r.week)[:10], "count": r.count} for r in weekly_raw]

    cat_raw = db.query(Job.category, func.count(Job.id).label("count"))\
               .filter(Job.category != None)\
               .group_by(Job.category)\
               .order_by(func.count(Job.id).desc())\
               .limit(5).all()
    top_categories = [{"category": r.category, "count": r.count} for r in cat_raw]

    state_raw = db.query(CandidateProfile.state, func.count(CandidateProfile.id).label("count"))\
                  .filter(CandidateProfile.state != None)\
                  .group_by(CandidateProfile.state)\
                  .order_by(func.count(CandidateProfile.id).desc())\
                  .limit(5).all()
    candidate_states = [{"state": r.state, "count": r.count} for r in state_raw]

    return {"success": True, "data": {
        "total_users": total_users,
        "total_candidates": total_candidates,
        "total_hr": total_hr,
        "total_companies": total_companies,
        "verified_companies": verified_cos,
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "closed_jobs": closed_jobs,
        "draft_jobs": draft_jobs,
        "total_applications": total_apps,
        "viewed_apps": viewed_apps,
        "shortlisted_apps": shortlisted_apps,
        "rejected_apps": rejected_apps,
        "open_reports": open_reports,
        "inactive_users": inactive_users,
        "avg_readiness_score": avg_score,
        "weekly_apps": weekly_apps,
        "top_categories": top_categories,
        "candidate_states": candidate_states,
    }, "error": None}


# ── GET /api/admin/users ───────────────────────────────────────────────────
@router.get("/users")
def get_users(
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    q = db.query(User)
    if role:      q = q.filter(User.role == role)
    if is_active is not None: q = q.filter(User.is_active == is_active)
    if search:    q = q.filter(
        User.full_name.ilike(f"%{search}%") |
        User.email.ilike(f"%{search}%")
    )
    users = q.order_by(User.created_at.desc()).all()
    return {"success": True, "data": [{
        "id": u.id, "full_name": u.full_name, "email": u.email,
        "phone": u.phone, "role": u.role, "is_active": u.is_active,
        "is_verified": u.is_verified,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users], "error": None}


# ── PUT /api/admin/users/{user_id} ─────────────────────────────────────────
@router.put("/users/{user_id}")
def update_user(user_id: int, body: UserUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    if user.role == "admin" and admin.id != user.id: raise HTTPException(403, "Cannot modify other admin accounts")
    if body.full_name   is not None: user.full_name   = body.full_name
    if body.email       is not None:
        existing = db.query(User).filter(User.email == body.email, User.id != user_id).first()
        if existing: raise HTTPException(400, "Email already in use")
        user.email = body.email.lower()
    if body.role        is not None:
        if body.role not in ("candidate", "hr", "admin"): raise HTTPException(400, "Invalid role")
        user.role = body.role
    if body.is_active   is not None: user.is_active   = body.is_active
    if body.is_verified is not None: user.is_verified  = body.is_verified
    db.commit()
    return {"success": True, "data": {"message": "User updated"}, "error": None}


# ── DELETE /api/admin/users/{user_id} ──────────────────────────────────────
@router.delete("/users/{user_id}")
def delete_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    if user.role == "admin": raise HTTPException(403, "Cannot delete admin accounts")
    user.is_active = False
    db.commit()
    return {"success": True, "data": {"message": "User deactivated"}, "error": None}


# ── GET /api/admin/companies ───────────────────────────────────────────────
@router.get("/companies")
def get_companies(
    is_verified: Optional[bool] = None,
    search: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    q = db.query(Company, User).join(User, Company.user_id == User.id)
    if is_verified is not None: q = q.filter(Company.is_verified == is_verified)
    if search: q = q.filter(Company.company_name.ilike(f"%{search}%"))
    results = q.order_by(Company.created_at.desc()).all()
    return {"success": True, "data": [{
        "id": c.id, "company_name": c.company_name, "industry": c.industry,
        "company_type": c.company_type, "city": c.city, "state": c.state,
        "is_verified": c.is_verified, "gst_cin": c.gst_cin, "website": c.website,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "hr_name": u.full_name, "hr_email": u.email, "hr_id": u.id,
        "job_count": db.query(func.count(Job.id)).filter(Job.company_id == c.id).scalar(),
    } for c, u in results], "error": None}


# ── PUT /api/admin/companies/{company_id}/verify ───────────────────────────
@router.put("/companies/{company_id}/verify")
def toggle_company_verify(company_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company: raise HTTPException(404, "Company not found")
    company.is_verified = not company.is_verified
    db.commit()
    return {"success": True, "data": {"is_verified": company.is_verified}, "error": None}


# ── DELETE /api/admin/companies/{company_id} ───────────────────────────────
@router.delete("/companies/{company_id}")
def delete_company(company_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company: raise HTTPException(404, "Company not found")
    db.query(Job).filter(Job.company_id == company_id).update({"status": "closed"})
    db.delete(company)
    db.commit()
    return {"success": True, "data": {"message": "Company removed and jobs closed"}, "error": None}


# ── GET /api/admin/jobs ────────────────────────────────────────────────────
@router.get("/jobs")
def get_jobs(
    status: Optional[str] = None,
    search: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    q = db.query(Job, Company).join(Company, Job.company_id == Company.id)
    if status: q = q.filter(Job.status == status)
    if search: q = q.filter(Job.title.ilike(f"%{search}%"))
    results = q.order_by(Job.created_at.desc()).all()
    return {"success": True, "data": [{
        "id": j.id, "title": j.title, "company_name": c.company_name,
        "city": j.city, "state": j.state, "job_type": j.job_type,
        "status": j.status,
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "applicants": db.query(func.count(Application.id)).filter(Application.job_id == j.id).scalar(),
    } for j, c in results], "error": None}


# ── PUT /api/admin/jobs/{job_id}/status ────────────────────────────────────
@router.put("/jobs/{job_id}/status")
def update_job_status(job_id: int, status: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job: raise HTTPException(404, "Job not found")
    if status not in ("active", "closed", "draft"): raise HTTPException(400, "Invalid status")
    job.status = status
    db.commit()
    return {"success": True, "data": {"message": f"Job marked as {status}"}, "error": None}


# ── GET /api/admin/reports ─────────────────────────────────────────────────
@router.get("/reports")
def get_reports(status: Optional[str] = None, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    q = db.query(Report)
    if status: q = q.filter(Report.status == status)
    reports = q.order_by(Report.created_at.desc()).all()
    result = []
    for r in reports:
        reporter = db.query(User).filter(User.id == r.reporter_id).first()
        result.append({
            "id": r.id, "report_type": r.report_type, "target_type": r.target_type,
            "target_id": r.target_id, "title": r.title, "description": r.description,
            "status": r.status, "admin_note": r.admin_note,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "reporter_name": reporter.full_name if reporter else "Unknown",
            "reporter_email": reporter.email if reporter else "Unknown",
            "reporter_role": reporter.role if reporter else "Unknown",
        })
    return {"success": True, "data": result, "error": None}


# ── PUT /api/admin/reports/{report_id} ─────────────────────────────────────
@router.put("/reports/{report_id}")
def update_report(report_id: int, body: ReportStatusUpdate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report: raise HTTPException(404, "Report not found")
    if body.status not in ("reviewed", "resolved", "dismissed"): raise HTTPException(400, "Invalid status")
    report.status = body.status
    report.admin_note = body.admin_note
    db.commit()
    return {"success": True, "data": {"message": "Report updated"}, "error": None}


# ── POST /api/admin/reports ────────────────────────────────────────────────
class ReportCreate(BaseModel):
    report_type: str
    target_type: Optional[str] = None
    target_id:   Optional[int] = None
    title:       str
    description: str

from backend.utils.dependencies import get_current_user

@router.post("/reports")
def create_report(body: ReportCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.report_type not in ("scam_job","fake_company","candidate_fraud","bug","other"):
        raise HTTPException(400, "Invalid report type")
    report = Report(
        reporter_id=current_user.id, report_type=body.report_type,
        target_type=body.target_type, target_id=body.target_id,
        title=body.title, description=body.description,
    )
    db.add(report)
    db.commit()
    return {"success": True, "data": {"message": "Report submitted successfully"}, "error": None}
