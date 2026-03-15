from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.database import get_db
from app.models import User, OTPCode, UserRole
from app.utils.security import (
    hash_password, verify_password, create_access_token,
    generate_otp, generate_sku
)
from app.utils.notifications import send_otp_email, send_otp_sms
from app.config import settings
from app.dependencies import get_current_user
import re

router = APIRouter()

# --- Schemas ---
class RegisterRequest(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    role: Optional[UserRole] = UserRole.viewer

class SendOTPRequest(BaseModel):
    identifier: str  # email or phone
    purpose: str = "login"  # login or reset

class VerifyOTPRequest(BaseModel):
    identifier: str
    otp: str
    purpose: str = "login"

class LoginWithPasswordRequest(BaseModel):
    identifier: str
    password: str

class ResetPasswordRequest(BaseModel):
    identifier: str
    otp: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

def is_email(value: str) -> bool:
    return '@' in value

def is_phone(value: str) -> bool:
    return bool(re.match(r'^\+?[\d\s\-]{7,15}$', value))

# --- Routes ---
@router.post("/register")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if not req.email and not req.phone:
        raise HTTPException(400, "Either email or phone is required")

    if req.email:
        existing = db.query(User).filter(User.email == req.email).first()
        if existing:
            raise HTTPException(400, "Email already registered")

    if req.phone:
        existing = db.query(User).filter(User.phone == req.phone).first()
        if existing:
            raise HTTPException(400, "Phone already registered")

    user = User(
        full_name=req.full_name,
        email=req.email,
        phone=req.phone,
        hashed_password=hash_password(req.password),
        role=req.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.value,
        }
    }

@router.post("/login")
async def login_with_password(req: LoginWithPasswordRequest, db: Session = Depends(get_db)):
    identifier = req.identifier.strip()
    user = None
    if is_email(identifier):
        user = db.query(User).filter(User.email == identifier).first()
    else:
        user = db.query(User).filter(User.phone == identifier).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    if not user.is_active:
        raise HTTPException(403, "Account deactivated")

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.value,
        }
    }

@router.post("/send-otp")
async def send_otp(req: SendOTPRequest, db: Session = Depends(get_db)):
    identifier = req.identifier.strip()

    # Verify user exists for login purpose
    if req.purpose == "login" or req.purpose == "reset":
        user = None
        if is_email(identifier):
            user = db.query(User).filter(User.email == identifier).first()
        elif is_phone(identifier):
            user = db.query(User).filter(User.phone == identifier).first()

        if not user:
            raise HTTPException(404, "No account found with this email/phone")
        if not user.is_active:
            raise HTTPException(403, "Account deactivated")

    # Invalidate old OTPs
    db.query(OTPCode).filter(
        OTPCode.identifier == identifier,
        OTPCode.purpose == req.purpose,
        OTPCode.used == False
    ).delete()

    otp = generate_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    otp_record = OTPCode(
        identifier=identifier,
        code=otp,
        purpose=req.purpose,
        expires_at=expires
    )
    db.add(otp_record)
    db.commit()

    # Send OTP
    sent = False
    if is_email(identifier):
        sent = await send_otp_email(identifier, otp, req.purpose)
    elif is_phone(identifier):
        sent = await send_otp_sms(identifier, otp, req.purpose)

    return {
        "message": f"OTP sent to {identifier[:3]}***",
        "sent": sent,
        "expires_in_minutes": settings.OTP_EXPIRE_MINUTES
    }

@router.post("/verify-otp")
async def verify_otp(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    identifier = req.identifier.strip()
    now = datetime.now(timezone.utc)

    otp_record = db.query(OTPCode).filter(
        OTPCode.identifier == identifier,
        OTPCode.code == req.otp,
        OTPCode.purpose == req.purpose,
        OTPCode.used == False,
        OTPCode.expires_at > now
    ).first()

    if not otp_record:
        raise HTTPException(400, "Invalid or expired OTP")

    otp_record.used = True
    db.commit()

    if req.purpose == "login":
        user = None
        if is_email(identifier):
            user = db.query(User).filter(User.email == identifier).first()
        else:
            user = db.query(User).filter(User.phone == identifier).first()

        if not user:
            raise HTTPException(404, "User not found")

        token = create_access_token({"sub": str(user.id), "role": user.role.value})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "phone": user.phone,
                "role": user.role.value,
            }
        }

    return {"message": "OTP verified", "verified": True}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    identifier = req.identifier.strip()
    now = datetime.now(timezone.utc)

    otp_record = db.query(OTPCode).filter(
        OTPCode.identifier == identifier,
        OTPCode.code == req.otp,
        OTPCode.purpose == "reset",
        OTPCode.used == False,
        OTPCode.expires_at > now
    ).first()

    if not otp_record:
        raise HTTPException(400, "Invalid or expired OTP")

    otp_record.used = True

    user = None
    if is_email(identifier):
        user = db.query(User).filter(User.email == identifier).first()
    else:
        user = db.query(User).filter(User.phone == identifier).first()

    if not user:
        raise HTTPException(404, "User not found")

    user.hashed_password = hash_password(req.new_password)
    db.commit()

    return {"message": "Password reset successfully"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role.value,
        "avatar_color": current_user.avatar_color,
        "created_at": current_user.created_at,
    }

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    current_user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"message": "Password changed successfully"}
