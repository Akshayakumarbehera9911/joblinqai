import random
import string
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt
from typing import Optional

from backend.database import get_db
from backend.models.user import User, OTPToken
from backend.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

OTP_EXPIRE_MINUTES = 10


# ── Schemas ────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    full_name: str
    email:     EmailStr
    phone:     str
    password:  str
    role:      str

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

class VerifyOTPRequest(BaseModel):
    email:    EmailStr
    otp_code: str

class ResendOTPRequest(BaseModel):
    email: EmailStr


# ── Helpers ────────────────────────────────────────────────────────────────
def create_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub":  str(user_id),
        "role": role,
        "exp":  expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def create_and_save_otp(user_id: int, db: Session) -> str:
    """Invalidate old OTPs, create new one, return the code."""
    # Mark all previous OTPs for this user as used
    db.query(OTPToken).filter(
        OTPToken.user_id == user_id,
        OTPToken.is_used == False
    ).update({"is_used": True})

    code = generate_otp()
    otp  = OTPToken(
        user_id    = user_id,
        otp_code   = code,
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
        is_used    = False,
    )
    db.add(otp)
    db.commit()
    return code


# ── POST /api/auth/register ────────────────────────────────────────────────
@router.post("/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):

    if body.role not in ("candidate", "hr"):
        raise HTTPException(status_code=400, detail="role must be 'candidate' or 'hr'")

    if body.role == "hr":
        personal_domains = ["gmail.com","yahoo.com","hotmail.com","outlook.com","rediffmail.com","ymail.com","icloud.com","live.com"]
        email_domain = body.email.lower().split("@")[-1] if "@" in body.email else ""
        if email_domain in personal_domains:
            raise HTTPException(status_code=400, detail="HR must register with a company email address (not Gmail, Yahoo, or other personal email)")

    if not body.phone.isdigit() or len(body.phone) < 10:
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit phone number")

    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    hashed = pwd_context.hash(body.password)

    user = User(
        full_name     = body.full_name.strip(),
        email         = body.email.lower().strip(),
        phone         = body.phone.strip(),
        password_hash = hashed,
        role          = body.role,
        is_verified   = False,   # ← requires OTP verification now
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError as e:
        db.rollback()
        error = str(e.orig)
        if "email" in error:
            raise HTTPException(status_code=400, detail="This email is already registered")
        if "phone" in error:
            raise HTTPException(status_code=400, detail="This phone number is already registered")
        raise HTTPException(status_code=400, detail="Registration failed — duplicate entry")

    # Generate OTP and send email
    otp_code = create_and_save_otp(user.id, db)

    from backend.utils.email import send_otp_email
    email_sent = send_otp_email(user.email, otp_code, user.full_name)

    return {
        "success": True,
        "data": {
            "user_id":    user.id,
            "email":      user.email,
            "role":       user.role,
            "email_sent": email_sent,
            "message":    "Account created. Please check your email for the verification code."
                          if email_sent else
                          "Account created but OTP email could not be sent. Please use Resend OTP on the next page.",
            "email_failed": not email_sent,
        },
        "error": None
    }


# ── POST /api/auth/verify-otp ──────────────────────────────────────────────
@router.post("/verify-otp")
def verify_otp(body: VerifyOTPRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(
        User.email == body.email.lower().strip()
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Account is already verified")

    # Find latest unused valid OTP for this user
    now = datetime.now(timezone.utc)
    otp = db.query(OTPToken).filter(
        OTPToken.user_id  == user.id,
        OTPToken.otp_code == body.otp_code.strip(),
        OTPToken.is_used  == False,
        OTPToken.expires_at > now,
    ).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP. Try resending.")

    # Mark OTP as used
    otp.is_used = True

    # Mark user as verified
    user.is_verified = True
    db.commit()

    # Auto-login — return token immediately
    token = create_token(user.id, user.role)

    return {
        "success": True,
        "data": {
            "access_token": token,
            "token_type":   "bearer",
            "user_id":      user.id,
            "full_name":    user.full_name,
            "role":         user.role,
            "message":      "Email verified successfully!"
        },
        "error": None
    }


# ── POST /api/auth/resend-otp ──────────────────────────────────────────────
@router.post("/resend-otp")
def resend_otp(body: ResendOTPRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(
        User.email == body.email.lower().strip()
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Account not found")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Account is already verified")

    otp_code = create_and_save_otp(user.id, db)

    from backend.utils.email import send_otp_email
    email_sent = send_otp_email(user.email, otp_code, user.full_name)

    if not email_sent:
        raise HTTPException(status_code=500, detail="Could not send email. Check Gmail credentials.")

    return {
        "success": True,
        "data": {"message": "New OTP sent to your email."},
        "error": None
    }


# ── POST /api/auth/login ───────────────────────────────────────────────────
@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(
        User.email == body.email.lower().strip()
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Block unverified users
    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in. Check your inbox for the OTP."
        )

    token = create_token(user.id, user.role)

    return {
        "success": True,
        "data": {
            "access_token": token,
            "token_type":   "bearer",
            "user_id":      user.id,
            "full_name":    user.full_name,
            "role":         user.role
        },
        "error": None
    }


# ── GET /api/auth/me ───────────────────────────────────────────────────────
from backend.utils.dependencies import get_current_user

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "success": True,
        "data": {
            "user_id":   current_user.id,
            "full_name": current_user.full_name,
            "email":     current_user.email,
            "role":      current_user.role
        },
        "error": None
    }


# ── PUT /api/auth/account ──────────────────────────────────────────────────
from pydantic import BaseModel as _BM
class AccountUpdate(_BM):
    full_name: Optional[str] = None
    phone:     Optional[str] = None

@router.put("/account")
def update_account(body: AccountUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.full_name:
        current_user.full_name = body.full_name.strip()
    if body.phone:
        if not body.phone.isdigit() or len(body.phone) < 10:
            raise HTTPException(400, "Enter a valid 10-digit phone number")
        existing = db.query(User).filter(User.phone == body.phone, User.id != current_user.id).first()
        if existing:
            raise HTTPException(400, "This phone number is already registered")
        current_user.phone = body.phone.strip()
    db.commit()
    return {"success": True, "data": {"full_name": current_user.full_name, "phone": current_user.phone}, "error": None}