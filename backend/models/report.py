from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from backend.database import Base


class Report(Base):
    __tablename__ = "reports"

    id           = Column(Integer, primary_key=True, index=True)
    reporter_id  = Column(Integer, nullable=False, index=True)   # user who reported
    report_type  = Column(String(30), nullable=False)            # scam_job / fake_company / candidate_fraud / bug / other
    target_type  = Column(String(20))                            # job / company / candidate / website
    target_id    = Column(Integer)                               # id of reported entity (nullable for website bugs)
    title        = Column(String(200), nullable=False)
    description  = Column(Text, nullable=False)
    status       = Column(String(20), default="open")            # open / reviewed / resolved / dismissed
    admin_note   = Column(Text)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())