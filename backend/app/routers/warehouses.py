from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import Warehouse, StockLedger, Product, Location
from app.dependencies import get_current_user, require_admin_or_manager
from app.models import User

router = APIRouter()

class WarehouseCreate(BaseModel):
    name: str
    short_code: str
    address: Optional[str] = None
    manager: Optional[str] = None

@router.get("/")
def list_warehouses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    warehouses = db.query(Warehouse).all()
    result = []
    for w in warehouses:
        product_count = db.query(StockLedger).filter(
            StockLedger.warehouse_id == w.id, StockLedger.quantity > 0
        ).count()
        total_stock = db.query(func.sum(StockLedger.quantity)).filter(
            StockLedger.warehouse_id == w.id
        ).scalar() or 0
        result.append({
            "id": w.id, "name": w.name, "short_code": w.short_code,
            "address": w.address, "manager": w.manager,
            "product_count": product_count, "total_stock": float(total_stock),
            "created_at": w.created_at,
        })
    return result

@router.post("/")
def create_warehouse(req: WarehouseCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_manager)):
    if db.query(Warehouse).filter(Warehouse.name == req.name).first():
        raise HTTPException(400, "Warehouse name already exists")
    w = Warehouse(name=req.name, short_code=req.short_code, address=req.address, manager=req.manager)
    db.add(w)
    db.commit()
    db.refresh(w)
    return {"id": w.id, "name": w.name, "short_code": w.short_code, "address": w.address, "manager": w.manager}

@router.get("/{wh_id}")
def get_warehouse(wh_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    w = db.query(Warehouse).filter(Warehouse.id == wh_id).first()
    if not w:
        raise HTTPException(404, "Not found")
    ledgers = db.query(StockLedger).filter(StockLedger.warehouse_id == wh_id).all()
    stock = []
    for l in ledgers:
        p = db.query(Product).filter(Product.id == l.product_id).first()
        if p:
            stock.append({"product_id": p.id, "product_name": p.name, "sku": p.sku, "quantity": l.quantity, "uom": p.uom})
    return {"id": w.id, "name": w.name, "short_code": w.short_code, "address": w.address, "manager": w.manager, "stock": stock}

@router.put("/{wh_id}")
def update_warehouse(wh_id: int, req: WarehouseCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_manager)):
    w = db.query(Warehouse).filter(Warehouse.id == wh_id).first()
    if not w:
        raise HTTPException(404, "Not found")
    w.name = req.name
    w.short_code = req.short_code
    w.address = req.address
    w.manager = req.manager
    db.commit()
    return {"id": w.id, "name": w.name}

@router.delete("/{wh_id}")
def delete_warehouse(wh_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin_or_manager)):
    w = db.query(Warehouse).filter(Warehouse.id == wh_id).first()
    if not w:
        raise HTTPException(404, "Not found")
    db.delete(w)
    db.commit()
    return {"message": "Deleted"}
