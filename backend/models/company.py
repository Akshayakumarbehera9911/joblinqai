from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from backend.database import Base


class Company(Base):
    __tablename__ = "companies"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, nullable=False, unique=True, index=True)
    company_name  = Column(String(200), nullable=False)
    logo_url      = Column(Text)
    description   = Column(Text)
    industry      = Column(String(100))
    company_type  = Column(String(50))   # Private/Startup/MNC/Government/NGO
    company_size  = Column(String(20))   # 1-10/11-50/51-200/200-500/500+
    founded_year  = Column(Integer)
    website       = Column(Text)
    linkedin      = Column(Text)
    gst_cin       = Column(String(50))
    state         = Column(String(100))
    district      = Column(String(100))
    city          = Column(String(100))
    is_verified   = Column(Boolean, default=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())