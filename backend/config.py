import os
from dotenv import load_dotenv

load_dotenv()

# ── Database ───────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")

# ── JWT ───────────────────────────────────────────────────────────────────
JWT_SECRET        = os.getenv("JWT_SECRET")
JWT_ALGORITHM     = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS  = int(os.getenv("JWT_EXPIRE_HOURS", 24))

# ── Gmail SMTP ─────────────────────────────────────────────────────────────
GMAIL_ADDRESS      = os.getenv("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")

# ── Cloudinary ─────────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY    = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

# ── Resend ─────────────────────────────────────────────────────────────────
RESEND_API_KEY = os.getenv("RESEND_API_KEY")

# ── Groq ───────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# ── Validation — crash early if critical vars missing ──────────────────────
def validate():
    missing = []
    required = {
        "DATABASE_URL": DATABASE_URL,
        "JWT_SECRET": JWT_SECRET,
        "CLOUDINARY_CLOUD_NAME": CLOUDINARY_CLOUD_NAME,
        "CLOUDINARY_API_KEY": CLOUDINARY_API_KEY,
        "CLOUDINARY_API_SECRET": CLOUDINARY_API_SECRET,
        "GROQ_API_KEY": GROQ_API_KEY,
    }
    for key, val in required.items():
        if not val:
            missing.append(key)
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")