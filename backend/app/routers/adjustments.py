from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models import Adjustment, AdjustmentLine, StockLedger, MoveHistory, MoveType, OperationStatus, Product, Warehouse
from app.dependencies import get_current_user, require_not_viewer
from app.models import User

router = APIRouter()

class AdjLineIn(BaseModel):
    product_id: int
    counted_qty: float

class AdjustmentCreate(BaseModel):
    warehouse_id: int
    reason: str = "Physical Count"
    date: Optional[datetime] = None
    notes: Optional[str] = None
    lines: List[AdjLineIn] = []

def adj_to_dict(a: Adjustment, db: Session) -> dict:
    lines = []
    for l in a.lines:
        p = db.query(Product).filter(Product.id == l.product_id).first()
        lines.append({
            "id": l.id,
            "product_id": l.product_id,
            "product_name": p.name if p else "?",
            "product_sku": p.sku if p else "",
            "system_qty": l.system_qty,
            "counted_qty": l.counted_qty,
            "difference": l.difference,
        })
    wh = db.query(Warehouse).filter(Warehouse.id == a.warehouse_id).first()
    return {
        "id": a.id,
        "reference": a.reference,
        "warehouse_id": a.warehouse_id,
        "warehouse_name": wh.name if wh else None,
        "reason": a.reason,
        "status": a.status.value,
        "date": a.date,
        "notes": a.notes,
        "created_at": a.created_at,
        "lines": lines,
    }

def get_next_ref(db, prefix, model):
    return f"{prefix}-{str(db.query(model).count()+1).zfill(4)}"

def get_system_qty(db: Session, product_id: int, warehouse_id: int) -> float:
    ledger = db.query(StockLedger).filter(
        StockLedger.product_id == product_id,
        StockLedger.warehouse_id == warehouse_id
    ).first()
    return float(ledger.quantity if ledger else 0)

@router.get("/")
def list_adjustments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [adj_to_dict(a, db) for a in db.query(Adjustment).order_by(Adjustment.created_at.desc()).all()]

@router.post("/")
def create_adjustment(req: AdjustmentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    a = Adjustment(
        reference=get_next_ref(db, "ADJ", Adjustment),
        warehouse_id=req.warehouse_id,
        reason=req.reason,
        date=req.date,
        notes=req.notes,
        status=OperationStatus.draft,
        created_by=current_user.id
    )
    db.add(a)
    db.flush()
    for line in req.lines:
        sys_qty = get_system_qty(db, line.product_id, req.warehouse_id)
        db.add(AdjustmentLine(
            adjustment_id=a.id,
            product_id=line.product_id,
            system_qty=sys_qty,
            counted_qty=line.counted_qty,
            difference=line.counted_qty - sys_qty
        ))
    db.commit()
    db.refresh(a)
    return adj_to_dict(a, db)

@router.get("/{adj_id}")
def get_adjustment(adj_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    a = db.query(Adjustment).filter(Adjustment.id == adj_id).first()
    if not a:
        raise HTTPException(404, "Adjustment not found")
    return adj_to_dict(a, db)

@router.post("/{adj_id}/validate")
def validate_adjustment(adj_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    a = db.query(Adjustment).filter(Adjustment.id == adj_id).first()
    if not a:
        raise HTTPException(404, "Adjustment not found")
    if a.status == OperationStatus.done:
        raise HTTPException(400, "Already validated")

    for line in a.lines:
        ledger = db.query(StockLedger).filter(
            StockLedger.product_id == line.product_id,
            StockLedger.warehouse_id == a.warehouse_id
        ).first()
        if ledger:
            ledger.quantity = line.counted_qty
        else:
            db.add(StockLedger(product_id=line.product_id, warehouse_id=a.warehouse_id, quantity=line.counted_qty))

        db.add(MoveHistory(
            move_type=MoveType.adjustment,
            reference=a.reference,
            product_id=line.product_id,
            to_warehouse_id=a.warehouse_id if line.difference > 0 else None,
            from_warehouse_id=a.warehouse_id if line.difference < 0 else None,
            qty=abs(line.difference),
            done_by=current_user.id
        ))

    a.status = OperationStatus.done
    db.commit()
    return adj_to_dict(a, db)

@router.post("/{adj_id}/cancel")
def cancel_adjustment(adj_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    a = db.query(Adjustment).filter(Adjustment.id == adj_id).first()
    if not a or a.status == OperationStatus.done:
        raise HTTPException(400, "Cannot cancel")
    a.status = OperationStatus.canceled
    db.commit()
    return adj_to_dict(a, db)
