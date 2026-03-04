from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt

from backend.database import get_db
from backend.models.user import User
from backend.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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


# ── Helpers ────────────────────────────────────────────────────────────────
def create_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub":  str(user_id),
        "role": role,
        "exp":  expire
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ── POST /api/auth/register ────────────────────────────────────────────────
@router.post("/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):

    if body.role not in ("candidate", "hr"):
        raise HTTPException(status_code=400, detail="role must be 'candidate' or 'hr'")

    # SRS: HR must use company email, not personal email
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
        is_verified   = True,
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

    return {
        "success": True,
        "data": {
            "user_id": user.id,
            "email":   user.email,
            "role":    user.role,
            "message": "Registration successful."
        },
        "error": None
    }


# ── POST /api/auth/login ───────────────────────────────────────────────────
@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):

    # Find user by email
    user = db.query(User).filter(
        User.email == body.email.lower().strip()
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check password
    if not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check account is active
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Generate token
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


# ── GET /api/auth/me — test protected route ────────────────────────────────
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


# ── PUT /api/auth/account ─ update name/phone ──────────────────────────────
from pydantic import BaseModel as _BM
from typing import Optional as _Opt
class AccountUpdate(_BM):
    full_name: _Opt[str] = None
    phone:     _Opt[str] = None

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