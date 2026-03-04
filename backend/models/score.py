from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy import JSON
from sqlalchemy.sql import func
from backend.database import Base


class ReadinessScore(Base):
    __tablename__ = "readiness_scores"

    id               = Column(Integer, primary_key=True, index=True)
    candidate_id     = Column(Integer, ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    target_role      = Column(String(100))
    overall_score    = Column(Integer)
    experience_score = Column(Integer)
    project_score    = Column(Integer)
    skills_score     = Column(Integer)
    education_score  = Column(Integer)
    score_breakdown  = Column(JSON)
    calculated_at    = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("candidate_id", "target_role", name="uq_score"),)


class SkillGap(Base):
    __tablename__ = "skill_gaps"

    id           = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    target_role  = Column(String(100))
    skill_name   = Column(String(100))
    gap_level    = Column(String(20))   # critical/moderate/minor
    udemy_link   = Column(String(500))
    created_at   = Column(DateTime(timezone=True), server_default=func.now())