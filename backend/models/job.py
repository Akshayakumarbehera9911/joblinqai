from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Date, Numeric, ForeignKey
from sqlalchemy.sql import func
from backend.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id                 = Column(Integer, primary_key=True, index=True)
    company_id         = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)

    title              = Column(String(200), nullable=False)
    category           = Column(String(100), index=True)
    role_type          = Column(String(20))   # technical/non-technical/blue-collar
    job_type           = Column(String(30))   # full-time/part-time/contract/internship
    work_mode          = Column(String(20))   # onsite/remote/hybrid
    openings           = Column(Integer, default=1)

    # Location
    state              = Column(String(100))
    district           = Column(String(100))
    city               = Column(String(100), index=True)
    full_address       = Column(Text)
    latitude           = Column(Numeric(10, 8))
    longitude          = Column(Numeric(11, 8))

    # Requirements
    min_experience     = Column(String(20))
    education_required = Column(String(50))
    description        = Column(Text)

    # Salary
    salary_min         = Column(Integer)
    salary_max         = Column(Integer)
    salary_type        = Column(String(20))   # monthly/annual/per-day
    show_salary        = Column(Boolean, default=True)

    # Settings
    deadline           = Column(Date)
    max_applicants     = Column(Integer)
    status             = Column(String(20), default="active", index=True)  # active/closed/draft

    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class JobSkill(Base):
    __tablename__ = "job_skills"

    id           = Column(Integer, primary_key=True, index=True)
    job_id       = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_name   = Column(String(100), nullable=False)
    is_mandatory = Column(Boolean, default=False)