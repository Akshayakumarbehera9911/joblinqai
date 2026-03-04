from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy import JSON
from sqlalchemy.sql import func
from backend.database import Base


class Application(Base):
    __tablename__ = "applications"

    id           = Column(Integer, primary_key=True, index=True)
    job_id       = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    match_score  = Column(Integer)
    status       = Column(String(20), default="applied")  # applied/viewed/shortlisted/rejected
    answers      = Column(JSON)
    applied_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("job_id", "candidate_id", name="uq_application"),)