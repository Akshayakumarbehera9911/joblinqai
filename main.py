from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from contextlib import asynccontextmanager

from backend.config import validate
from backend.database import test_connection, Base, engine
from backend.models import user, candidate, company, job, application, score, report

validate()

@asynccontextmanager
async def lifespan(app: FastAPI):
    test_connection()
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables ready")
    yield

app = FastAPI(title="JobPortal API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="frontend/static"), name="static")
templates = Jinja2Templates(directory="frontend/templates")

# ── Routes ─────────────────────────────────────────────────────────────────
from backend.routes.auth      import router as auth_router
from backend.routes.candidate import router as candidate_router
from backend.routes.hr        import router as hr_router
from backend.routes.scoring   import router as scoring_router

app.include_router(auth_router,      prefix="/api/auth",      tags=["auth"])
app.include_router(candidate_router, prefix="/api/candidate", tags=["candidate"])
app.include_router(hr_router,        prefix="/api/hr",        tags=["hr"])
app.include_router(scoring_router,   prefix="/api/scoring",   tags=["scoring"])

# ── Health check ───────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"success": True, "data": {"status": "running"}, "error": None}

# ── Frontend pages ─────────────────────────────────────────────────────────
@app.get("/register")
def page_register(request: Request):
    return templates.TemplateResponse("auth/register.html", {"request": request})

@app.get("/login")
def page_login(request: Request):
    return templates.TemplateResponse("auth/login.html", {"request": request})

@app.get("/")
def page_home(request: Request):
    return templates.TemplateResponse("auth/login.html", {"request": request})

from backend.routes.jobs  import router as jobs_router
from backend.routes.admin import router as admin_router
app.include_router(jobs_router,  prefix="/api/jobs",  tags=["jobs"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])

@app.get("/dashboard")
def page_dashboard(request: Request):
    return templates.TemplateResponse("candidate/dashboard.html", {"request": request})

@app.get("/hr/dashboard")
def page_hr_dashboard(request: Request):
    return templates.TemplateResponse("hr/dashboard.html", {"request": request})

@app.get("/jobs")
def page_jobs(request: Request):
    return templates.TemplateResponse("jobs/search.html", {"request": request})

@app.get("/account/settings")
def page_account_settings(request: Request):
    return templates.TemplateResponse("account/settings.html", {"request": request})

@app.get("/candidate/profile")
def page_candidate_profile(request: Request):
    return templates.TemplateResponse("candidate/profile.html", {"request": request})

@app.get("/candidate/applications")
def page_candidate_applications(request: Request):
    return templates.TemplateResponse("candidate/applications.html", {"request": request})

@app.get("/jobs/map")
def page_jobs_map(request: Request):
    return templates.TemplateResponse("jobs/map.html", {"request": request})

@app.get("/jobs/{job_id}")
def page_job_detail(request: Request, job_id: int):
    return templates.TemplateResponse("jobs/detail.html", {"request": request})

@app.get("/admin/dashboard")
def page_admin(request: Request):
    return templates.TemplateResponse("admin/dashboard.html", {"request": request})
#python -m uvicorn main:app --reload