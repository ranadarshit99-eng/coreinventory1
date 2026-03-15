# deliveries.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models import Delivery, DeliveryLine, StockLedger, MoveHistory, MoveType, OperationStatus, Product, Warehouse
from app.dependencies import get_current_user, require_not_viewer
from app.models import User

router = APIRouter()

class DeliveryLineIn(BaseModel):
    product_id: int
    qty: float
    uom: str = "pieces"

class DeliveryCreate(BaseModel):
    customer: str
    scheduled_date: Optional[datetime] = None
    warehouse_id: int
    notes: Optional[str] = None
    lines: List[DeliveryLineIn] = []

def delivery_to_dict(d: Delivery, db: Session) -> dict:
    lines = []
    for l in d.lines:
        p = db.query(Product).filter(Product.id == l.product_id).first()
        lines.append({
            "id": l.id,
            "product_id": l.product_id,
            "product_name": p.name if p else "Unknown",
            "product_sku": p.sku if p else "",
            "qty": l.qty,
            "uom": l.uom,
        })
    wh = db.query(Warehouse).filter(Warehouse.id == d.warehouse_id).first()
    return {
        "id": d.id,
        "reference": d.reference,
        "customer": d.customer,
        "status": d.status.value,
        "step": d.step,
        "scheduled_date": d.scheduled_date,
        "warehouse_id": d.warehouse_id,
        "warehouse_name": wh.name if wh else None,
        "notes": d.notes,
        "created_at": d.created_at,
        "lines": lines,
        "lines_count": len(d.lines),
    }

def get_next_ref(db, prefix, model):
    count = db.query(model).count()
    return f"{prefix}-{str(count+1).zfill(4)}"

@router.get("/")
def list_deliveries(status: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Delivery)
    if status:
        q = q.filter(Delivery.status == status)
    return [delivery_to_dict(d, db) for d in q.order_by(Delivery.created_at.desc()).all()]

@router.post("/")
def create_delivery(req: DeliveryCreate, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    d = Delivery(
        reference=get_next_ref(db, "DEL", Delivery),
        customer=req.customer,
        scheduled_date=req.scheduled_date,
        warehouse_id=req.warehouse_id,
        notes=req.notes,
        status=OperationStatus.draft,
        step="pick",
        created_by=current_user.id
    )
    db.add(d)
    db.flush()
    for line in req.lines:
        db.add(DeliveryLine(delivery_id=d.id, product_id=line.product_id, qty=line.qty, uom=line.uom))
    db.commit()
    db.refresh(d)
    return delivery_to_dict(d, db)

@router.get("/{delivery_id}")
def get_delivery(delivery_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    d = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not d:
        raise HTTPException(404, "Delivery not found")
    return delivery_to_dict(d, db)

@router.post("/{delivery_id}/next-step")
def advance_step(delivery_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    d = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not d:
        raise HTTPException(404, "Delivery not found")

    if d.status == OperationStatus.done:
        raise HTTPException(400, "Already done")

    if d.step == "pick":
        d.step = "pack"
        d.status = OperationStatus.ready
    elif d.step == "pack":
        # Validate - reduce stock
        for line in d.lines:
            ledger = db.query(StockLedger).filter(
                StockLedger.product_id == line.product_id,
                StockLedger.warehouse_id == d.warehouse_id
            ).first()
            if not ledger or ledger.quantity < line.qty:
                p = db.query(Product).filter(Product.id == line.product_id).first()
                raise HTTPException(400, f"Insufficient stock for {p.name if p else line.product_id}")
            ledger.quantity -= line.qty
            db.add(MoveHistory(
                move_type=MoveType.delivery,
                reference=d.reference,
                product_id=line.product_id,
                from_warehouse_id=d.warehouse_id,
                qty=line.qty,
                done_by=current_user.id
            ))
        d.step = "done"
        d.status = OperationStatus.done
    db.commit()
    return delivery_to_dict(d, db)

@router.post("/{delivery_id}/cancel")
def cancel_delivery(delivery_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    d = db.query(Delivery).filter(Delivery.id == delivery_id).first()
    if not d or d.status == OperationStatus.done:
        raise HTTPException(400, "Cannot cancel")
    d.status = OperationStatus.canceled
    db.commit()
    return delivery_to_dict(d, db)
