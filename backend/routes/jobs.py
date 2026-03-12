from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional

from backend.database import get_db
from backend.models.job import Job, JobSkill
from backend.models.company import Company
from backend.models.application import Application
from backend.models.candidate import CandidateProfile
from backend.utils.dependencies import require_candidate

router = APIRouter()


# ── GET /api/jobs/search ──────────────────────────────────────────────────
@router.get("/search")
def search_jobs(
    q:           Optional[str] = Query(None, description="Search by title or keyword"),
    city:        Optional[str] = Query(None),
    state:       Optional[str] = Query(None),
    job_type:    Optional[str] = Query(None),   # full-time/part-time/contract/internship
    work_mode:   Optional[str] = Query(None),   # onsite/remote/hybrid
    role_type:   Optional[str] = Query(None),   # technical/non-technical/blue-collar
    category:    Optional[str] = Query(None),
    salary_min:  Optional[int] = Query(None),
    salary_max:  Optional[int] = Query(None),
    experience:  Optional[str] = Query(None),
    page:        int = Query(1, ge=1),
    limit:       int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db)
):
    query = db.query(Job).filter(Job.status == "active")

    if q:
        query = query.filter(
            or_(Job.title.ilike(f"%{q}%"), Job.description.ilike(f"%{q}%"), Job.category.ilike(f"%{q}%"))
        )
    if city:        query = query.filter(Job.city.ilike(f"%{city}%"))
    if state:       query = query.filter(Job.state.ilike(f"%{state}%"))
    if job_type:    query = query.filter(Job.job_type == job_type)
    if work_mode:   query = query.filter(Job.work_mode == work_mode)
    if role_type:   query = query.filter(Job.role_type == role_type)
    if category:    query = query.filter(Job.category.ilike(f"%{category}%"))
    if salary_min:  query = query.filter(Job.salary_min >= salary_min, Job.show_salary == True)
    if salary_max:  query = query.filter(Job.salary_max <= salary_max, Job.show_salary == True)
    if experience:  query = query.filter(Job.min_experience <= experience)

    total  = query.count()
    jobs   = query.order_by(Job.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    result = []
    for j in jobs:
        company = db.query(Company).filter(Company.id == j.company_id).first()
        skills  = db.query(JobSkill).filter(JobSkill.job_id == j.id).all()
        result.append({
            "id":           j.id,
            "title":        j.title,
            "company_name": company.company_name if company else "Unknown",
            "company_logo": company.logo_url if company else None,
            "is_verified":  company.is_verified if company else False,
            "city":         j.city,
            "state":        j.state,
            "work_mode":    j.work_mode,
            "job_type":     j.job_type,
            "role_type":    j.role_type,
            "salary_min":   j.salary_min if j.show_salary else None,
            "salary_max":   j.salary_max if j.show_salary else None,
            "salary_type":  j.salary_type if j.show_salary else None,
            "min_experience": j.min_experience,
            "skills":       [{"name": s.skill_name, "mandatory": s.is_mandatory} for s in skills],
            "created_at":   str(j.created_at),
        })

    return {
        "success": True,
        "data": {
            "jobs":  result,
            "total": total,
            "page":  page,
            "pages": (total + limit - 1) // limit,
        },
        "error": None
    }



# ── GET /api/jobs/map (page route handled separately) ─────────────────────
@router.get("/map")
def map_page_redirect():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/jobs/map")
@router.get("/map/role-families")
def map_role_families(db: Session = Depends(get_db)):
    from backend.models.score import RoleSynonymCache
    from sqlalchemy import distinct
    rows = db.query(distinct(RoleSynonymCache.target_role)).all()
    families = sorted(list(set(r[0] for r in rows if r[0] and r[0].strip())))
    return {"success": True, "data": families, "error": None}
# Static fallback coordinates for Indian cities (used when job has no lat/long)
CITY_COORDS = {
    "bangalore": (12.9716, 77.5946), "bengaluru": (12.9716, 77.5946),
    "mumbai": (19.0760, 72.8777), "delhi": (28.6139, 77.2090),
    "hyderabad": (17.3850, 78.4867), "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639), "pune": (18.5204, 73.8567),
    "ahmedabad": (23.0225, 72.5714), "jaipur": (26.9124, 75.7873),
    "lucknow": (26.8467, 80.9462), "noida": (28.5355, 77.3910),
    "gurugram": (28.4595, 77.0266), "bhubaneswar": (20.2961, 85.8245),
    "berhampur": (19.3150, 84.7941), "visakhapatnam": (17.6868, 83.2185),
    "indore": (22.7196, 75.8577), "nagpur": (21.1458, 79.0882),
    "coimbatore": (11.0168, 76.9558), "kochi": (9.9312, 76.2673),
    "surat": (21.1702, 72.8311), "vadodara": (22.3072, 73.1812),
    "patna": (25.5941, 85.1376), "chandigarh": (30.7333, 76.7794),
}

# ── GET /api/jobs/map/data ────────────────────────────────────────────────
@router.get("/map/data")
def map_data(
    role_family: Optional[str] = Query(None),
    experience:  Optional[str] = Query(None),
    salary_min:  Optional[int] = Query(None),
    near_lat:    Optional[float] = Query(None),
    near_lng:    Optional[float] = Query(None),
    near_km:     Optional[float] = Query(50),
    db: Session = Depends(get_db)
):
    from backend.models.score import RoleSynonymCache
    import math

    query = db.query(Job.city, Job.state, Job.latitude, Job.longitude).filter(
        Job.status == "active",
        Job.city.isnot(None)
    )

    # Role family filter — fetch matched_titles from cache, filter by job title
    if role_family:
        cache = db.query(RoleSynonymCache).filter(
            RoleSynonymCache.target_role == role_family
        ).first()
        if cache and cache.matched_titles:
            from sqlalchemy import or_
            title_filters = [Job.title.ilike(f"%{t}%") for t in cache.matched_titles]
            query = query.filter(or_(*title_filters))

    # Experience filter
    if experience:
        query = query.filter(Job.min_experience == experience)

    # Salary filter
    if salary_min:
        query = query.filter(Job.salary_min >= salary_min, Job.show_salary == True)

    # Near me — bounding box (1 deg lat ≈ 111km)
    if near_lat is not None and near_lng is not None:
        delta_lat = near_km / 111.0
        delta_lng = near_km / (111.0 * math.cos(math.radians(near_lat)))
        query = query.filter(
            Job.latitude.between(near_lat - delta_lat, near_lat + delta_lat),
            Job.longitude.between(near_lng - delta_lng, near_lng + delta_lng)
        )

    all_jobs = query.all()

    city_data = {}
    for j in all_jobs:
        key = (j.city or "").lower().strip()
        if key not in city_data:
            city_data[key] = {"city": j.city, "state": j.state, "latitude": None, "longitude": None, "job_count": 0}
        city_data[key]["job_count"] += 1
        if city_data[key]["latitude"] is None and j.latitude is not None:
            city_data[key]["latitude"]  = float(j.latitude)
            city_data[key]["longitude"] = float(j.longitude)

    out = []
    for key, r in city_data.items():
        lat, lng = r["latitude"], r["longitude"]
        if lat is None or lng is None:
            coords = CITY_COORDS.get(key)
            if coords: lat, lng = coords
        if lat is None or lng is None:
            continue
        out.append({"city": r["city"], "state": r["state"], "latitude": lat, "longitude": lng, "job_count": r["job_count"]})

    return {"success": True, "data": out, "error": None}

# ── GET /api/jobs/map/city/{city} ─────────────────────────────────────────
@router.get("/map/city/{city}")
def map_city_jobs(city: str, db: Session = Depends(get_db)):
    """Returns individual job markers for a city — for Leaflet street map."""
    jobs = db.query(Job).filter(
        Job.status == "active",
        Job.city.ilike(f"%{city}%")
    ).all()

    result = []
    for idx, j in enumerate(jobs):
        company = db.query(Company).filter(Company.id == j.company_id).first()
        # Use stored coords or fallback to city center + spiral offset
        lat = float(j.latitude) if j.latitude else None
        lng = float(j.longitude) if j.longitude else None
        if lat is None or lng is None:
            import math
            base = CITY_COORDS.get((j.city or "").lower().strip(), (None, None))
            if base[0]:
                angle = idx * 2.4
                dist  = 0 if idx == 0 else 0.008 + (idx * 0.003)
                lat = base[0] + dist * math.sin(angle)
                lng = base[1] + dist * math.cos(angle)
        result.append({
            "id":           j.id,
            "title":        j.title,
            "company_name": company.company_name if company else "Unknown",
            "latitude":     lat,
            "longitude":    lng,
            "job_type":     j.job_type,
            "salary_min":   j.salary_min if j.show_salary else None,
            "salary_max":   j.salary_max if j.show_salary else None,
        })

    return {"success": True, "data": result, "error": None}


# ── GET /api/jobs/cities/suggest ──────────────────────────────────────────
INDIAN_CITIES = [
    "Ahmedabad","Bangalore","Bengaluru","Bhopal","Bhubaneswar","Chandigarh","Chennai",
    "Coimbatore","Delhi","Faridabad","Ghaziabad","Gurugram","Guwahati","Hyderabad",
    "Indore","Jaipur","Kochi","Kolkata","Lucknow","Ludhiana","Mumbai","Nagpur","Noida",
    "Patna","Pune","Raipur","Rajkot","Surat","Thiruvananthapuram","Vadodara","Visakhapatnam"
]

INDIAN_STATES = [
    "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana",
    "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
    "Manipur","Meghalaya","Odisha","Punjab","Rajasthan","Tamil Nadu","Telangana",
    "Uttar Pradesh","Uttarakhand","West Bengal"
]

@router.get("/cities/suggest")
def suggest_cities(q: str = Query("", min_length=0), db: Session = Depends(get_db)):
    if len(q) < 2:
        return {"success": True, "data": [], "error": None}

    q_lower = q.lower()

    # First: match from active jobs in DB
    from sqlalchemy import distinct
    db_cities = db.query(distinct(Job.city)).filter(
        Job.status == "active",
        Job.city.ilike(f"%{q}%"),
        Job.city.isnot(None)
    ).limit(5).all()
    db_results = [c[0] for c in db_cities if c[0]]

    # Also match from static Indian cities list
    static_results = [c for c in INDIAN_CITIES if q_lower in c.lower()][:5]

    # Merge, deduplicate, DB results first
    seen = set(c.lower() for c in db_results)
    merged = db_results[:]
    for c in static_results:
        if c.lower() not in seen:
            merged.append(c)
            seen.add(c.lower())

    return {"success": True, "data": merged[:8], "error": None}


@router.get("/states/suggest")
def suggest_states(q: str = Query("", min_length=0)):
    if len(q) < 2:
        return {"success": True, "data": [], "error": None}
    q_lower = q.lower()
    results = [s for s in INDIAN_STATES if q_lower in s.lower()][:6]
    return {"success": True, "data": results, "error": None}


# ── GET /api/jobs/{id} ────────────────────────────────────────────────────
@router.get("/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id, Job.status == "active").first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    company  = db.query(Company).filter(Company.id == job.company_id).first()
    skills   = db.query(JobSkill).filter(JobSkill.job_id == job.id).all()
    app_count = db.query(Application).filter(Application.job_id == job.id).count()

    return {
        "success": True,
        "data": {
            "id":           job.id,
            "title":        job.title,
            "description":  job.description,
            "category":     job.category,
            "role_type":    job.role_type,
            "job_type":     job.job_type,
            "work_mode":    job.work_mode,
            "openings":     job.openings,
            "city":         job.city,
            "state":        job.state,
            "district":     job.district,
            "full_address": job.full_address,
            "latitude":     float(job.latitude) if job.latitude else None,
            "longitude":    float(job.longitude) if job.longitude else None,
            "min_experience": job.min_experience,
            "education_required": job.education_required,
            "salary_min":   job.salary_min if job.show_salary else None,
            "salary_max":   job.salary_max if job.show_salary else None,
            "salary_type":  job.salary_type if job.show_salary else None,
            "deadline":     str(job.deadline) if job.deadline else None,
            "applicant_count": app_count,
            "skills":       [{"name": s.skill_name, "mandatory": s.is_mandatory} for s in skills],
            "company": {
                "name":        company.company_name if company else "Unknown",
                "logo_url":    company.logo_url if company else None,
                "industry":    company.industry if company else None,
                "company_size": company.company_size if company else None,
                "website":     company.website if company else None,
                "is_verified": company.is_verified if company else False,
                "city":        company.city if company else None,
            },
            "created_at": str(job.created_at),
        },
        "error": None
    }


# ── POST /api/jobs/{id}/apply ─────────────────────────────────────────────
@router.post("/{job_id}/apply")
def apply_job(
    job_id: int,
    current_user = Depends(require_candidate),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == job_id, Job.status == "active").first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or closed")

    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=400, detail="Please complete your profile before applying")

    # Check duplicate application
    existing = db.query(Application).filter(
        Application.job_id == job_id,
        Application.candidate_id == profile.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this job")

    # Check max applicants
    if job.max_applicants:
        count = db.query(Application).filter(Application.job_id == job_id).count()
        if count >= job.max_applicants:
            raise HTTPException(status_code=400, detail="This job is no longer accepting applications")

    application = Application(
        job_id       = job_id,
        candidate_id = profile.id,
        status       = "applied"
    )
    db.add(application)
    db.commit()

    return {"success": True, "data": {"message": "Application submitted successfully"}, "error": None}


# ── POST /api/jobs/{id}/geocode — backfill lat/long for existing jobs ──────
@router.post("/{job_id}/geocode")
def geocode_job(job_id: int, db: Session = Depends(get_db)):
    import requests as _req, time
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job: raise HTTPException(404, "Job not found")
    if not job.city: raise HTTPException(400, "Job has no city")
    try:
        q = f"{job.city}, {job.state or ''}, India"
        r = _req.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": q, "format": "json", "limit": 1},
            headers={"User-Agent": "JobPortal/1.0"}, timeout=5
        )
        data = r.json()
        if data:
            job.latitude  = float(data[0]["lat"])
            job.longitude = float(data[0]["lon"])
            db.commit()
            return {"success": True, "data": {"lat": job.latitude, "lng": job.longitude}}
    except Exception as e:
        raise HTTPException(500, str(e))
    raise HTTPException(404, "Location not found")