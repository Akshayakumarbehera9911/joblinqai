from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from backend.database import Base


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Personal
    photo_url        = Column(Text)
    gender           = Column(String(20))
    date_of_birth    = Column(Date)

    # Location
    state            = Column(String(100))
    district         = Column(String(100))
    city             = Column(String(100))
    pincode          = Column(String(10))

    # Education
    education_level  = Column(String(50))
    education_field  = Column(String(100))
    institution      = Column(String(200))
    passing_year     = Column(Integer)

    # Experience
    experience       = Column(String(20))
    current_title    = Column(String(100))
    industry         = Column(String(100))

    # Resume
    resume_url       = Column(Text)
    resume_text      = Column(Text)

    # Job preferences
    target_role      = Column(String(100))
    job_type         = Column(String(50))
    work_mode        = Column(String(20))
    availability     = Column(String(50))
    expected_salary_min = Column(Integer)
    expected_salary_max = Column(Integer)

    profile_complete = Column(Boolean, default=False)
    fcm_token        = Column(String(500), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CandidateSkill(Base):
    __tablename__ = "candidate_skills"

    id           = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_name   = Column(String(100), nullable=False)
    category     = Column(String(100))
    level        = Column(String(20))


class CandidateCertification(Base):
    __tablename__ = "candidate_certifications"

    id             = Column(Integer, primary_key=True, index=True)
    candidate_id   = Column(Integer, ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False)
    cert_name      = Column(String(200), nullable=False)
    platform       = Column(String(100))
    year_completed = Column(Integer)
    cert_url       = Column(Text)


class CandidateProject(Base):
    __tablename__ = "candidate_projects"

    id           = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False)
    title        = Column(String(200), nullable=False)
    description  = Column(Text)
    tech_stack   = Column(Text)
    project_url  = Column(Text)
    year         = Column(Integer)