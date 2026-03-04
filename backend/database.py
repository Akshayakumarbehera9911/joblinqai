from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from backend.config import DATABASE_URL


# MySQL needs connect_args for charset; PostgreSQL ignores them
_is_mysql = DATABASE_URL.startswith("mysql")
_kwargs = {"connect_args": {"charset": "utf8mb4"}} if _is_mysql else {"pool_size": 5, "max_overflow": 10}

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    **_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# ── Dependency for FastAPI routes ──────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Test connection on startup ─────────────────────────────────────────────
def test_connection():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connected successfully")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False