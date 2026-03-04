from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from backend.database import get_db
from backend.models.user import User
from backend.config import JWT_SECRET, JWT_ALGORITHM

bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


def require_candidate(user: User = Depends(get_current_user)) -> User:
    if user.role != "candidate":
        raise HTTPException(status_code=403, detail="Candidate access only")
    return user


def require_hr(user: User = Depends(get_current_user)) -> User:
    if user.role != "hr":
        raise HTTPException(status_code=403, detail="HR access only")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    return user