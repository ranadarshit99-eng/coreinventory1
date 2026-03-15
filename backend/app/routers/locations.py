from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import Location, LocationType, Warehouse
from app.dependencies import get_current_user, require_admin_or_manager
from app.models import User

router = APIRouter()

class LocationCreate(BaseModel):
    name: str
    warehouse_id: int
    location_type: LocationType = LocationType.internal

@router.get("/")
def list_locations(warehouse_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Location)
    if warehouse_id:
        q = q.filter(Location.warehouse_id == warehouse_id)
    locs = q.all()
    result = []
    for l in locs:
        wh = db.query(Warehouse).filter(Warehouse.id == l.warehouse_id).first()
        result.append({
            "id": l.id, "name": l.name, "warehouse_id": l.warehouse_id,
            "warehouse_name": wh.name if wh else None,
            "location_type": l.location_type.value, "created_at": l.created_at,
        })
    return result

@router.post("/")
def create_location(req: LocationCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_manager)):
    l = Location(name=req.name, warehouse_id=req.warehouse_id, location_type=req.location_type)
    db.add(l)
    db.commit()
    db.refresh(l)
    return {"id": l.id, "name": l.name, "warehouse_id": l.warehouse_id, "location_type": l.location_type.value}

@router.put("/{loc_id}")
def update_location(loc_id: int, req: LocationCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_manager)):
    l = db.query(Location).filter(Location.id == loc_id).first()
    if not l:
        raise HTTPException(404, "Not found")
    l.name = req.name
    l.warehouse_id = req.warehouse_id
    l.location_type = req.location_type
    db.commit()
    return {"id": l.id, "name": l.name}

@router.delete("/{loc_id}")
def delete_location(loc_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_manager)):
    l = db.query(Location).filter(Location.id == loc_id).first()
    if not l:
        raise HTTPException(404, "Not found")
    db.delete(l)
    db.commit()
    return {"message": "Deleted"}
