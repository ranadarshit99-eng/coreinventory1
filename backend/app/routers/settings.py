from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import AppSettings, Warehouse
from app.dependencies import get_current_user, require_admin_or_manager
from app.models import User

router = APIRouter()

class SettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    default_warehouse_id: Optional[int] = None
    low_stock_threshold: Optional[float] = None
    currency: Optional[str] = None
    date_format: Optional[str] = None

@router.get("/")
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(AppSettings).first()
    if not s:
        s = AppSettings()
        db.add(s)
        db.commit()
        db.refresh(s)
    wh = db.query(Warehouse).filter(Warehouse.id == s.default_warehouse_id).first() if s.default_warehouse_id else None
    return {
        "id": s.id,
        "company_name": s.company_name,
        "default_warehouse_id": s.default_warehouse_id,
        "default_warehouse_name": wh.name if wh else None,
        "low_stock_threshold": s.low_stock_threshold,
        "currency": s.currency,
        "date_format": s.date_format,
    }

@router.put("/")
def update_settings(req: SettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_manager)):
    s = db.query(AppSettings).first()
    if not s:
        s = AppSettings()
        db.add(s)
    for field, value in req.dict(exclude_unset=True).items():
        setattr(s, field, value)
    db.commit()
    return {"message": "Settings updated"}
