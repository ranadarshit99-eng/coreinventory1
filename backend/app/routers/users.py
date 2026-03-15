from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import User, UserRole
from app.dependencies import get_current_user, require_admin_or_manager
from app.utils.security import hash_password

router = APIRouter()

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    avatar_color: Optional[str] = None
    is_active: Optional[bool] = None

class UserCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    role: UserRole = UserRole.viewer

def user_to_dict(u: User) -> dict:
    return {
        "id": u.id,
        "full_name": u.full_name,
        "email": u.email,
        "phone": u.phone,
        "role": u.role.value,
        "avatar_color": u.avatar_color,
        "is_active": u.is_active,
        "created_at": u.created_at,
    }

@router.get("/")
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_manager)):
    return [user_to_dict(u) for u in db.query(User).all()]

@router.post("/")
def create_user(req: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_manager)):
    u = User(
        full_name=req.full_name,
        email=req.email,
        phone=req.phone,
        hashed_password=hash_password(req.password),
        role=req.role,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return user_to_dict(u)

@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.id != user_id and current_user.role not in [UserRole.admin, UserRole.manager]:
        raise HTTPException(403, "Access denied")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    return user_to_dict(u)

@router.put("/{user_id}")
def update_user(user_id: int, req: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.id != user_id and current_user.role not in [UserRole.admin, UserRole.manager]:
        raise HTTPException(403, "Access denied")
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    for field, value in req.dict(exclude_unset=True).items():
        setattr(u, field, value)
    db.commit()
    return user_to_dict(u)
