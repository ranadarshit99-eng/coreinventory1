from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models import Transfer, TransferLine, StockLedger, MoveHistory, MoveType, OperationStatus, Product, Warehouse
from app.dependencies import get_current_user, require_not_viewer
from app.models import User

router = APIRouter()

class TransferLineIn(BaseModel):
    product_id: int
    qty: float
    uom: str = "pieces"

class TransferCreate(BaseModel):
    from_warehouse_id: int
    to_warehouse_id: int
    date: Optional[datetime] = None
    notes: Optional[str] = None
    lines: List[TransferLineIn] = []

def transfer_to_dict(t: Transfer, db: Session) -> dict:
    lines = []
    for l in t.lines:
        p = db.query(Product).filter(Product.id == l.product_id).first()
        lines.append({"id": l.id, "product_id": l.product_id, "product_name": p.name if p else "?", "qty": l.qty, "uom": l.uom})
    return {
        "id": t.id,
        "reference": t.reference,
        "from_warehouse_id": t.from_warehouse_id,
        "from_warehouse_name": t.from_warehouse.name if t.from_warehouse else None,
        "to_warehouse_id": t.to_warehouse_id,
        "to_warehouse_name": t.to_warehouse.name if t.to_warehouse else None,
        "status": t.status.value,
        "date": t.date,
        "notes": t.notes,
        "created_at": t.created_at,
        "lines": lines,
    }

def get_next_ref(db, prefix, model):
    return f"{prefix}-{str(db.query(model).count()+1).zfill(4)}"

@router.get("/")
def list_transfers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [transfer_to_dict(t, db) for t in db.query(Transfer).order_by(Transfer.created_at.desc()).all()]

@router.post("/")
def create_transfer(req: TransferCreate, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    if req.from_warehouse_id == req.to_warehouse_id:
        raise HTTPException(400, "Source and destination cannot be the same")
    t = Transfer(
        reference=get_next_ref(db, "TRF", Transfer),
        from_warehouse_id=req.from_warehouse_id,
        to_warehouse_id=req.to_warehouse_id,
        date=req.date,
        notes=req.notes,
        status=OperationStatus.draft,
        created_by=current_user.id
    )
    db.add(t)
    db.flush()
    for line in req.lines:
        db.add(TransferLine(transfer_id=t.id, product_id=line.product_id, qty=line.qty, uom=line.uom))
    db.commit()
    db.refresh(t)
    return transfer_to_dict(t, db)

@router.get("/{transfer_id}")
def get_transfer(transfer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not t:
        raise HTTPException(404, "Transfer not found")
    return transfer_to_dict(t, db)

@router.post("/{transfer_id}/validate")
def validate_transfer(transfer_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    t = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not t or t.status == OperationStatus.done:
        raise HTTPException(400, "Invalid operation")

    for line in t.lines:
        from_ledger = db.query(StockLedger).filter(
            StockLedger.product_id == line.product_id,
            StockLedger.warehouse_id == t.from_warehouse_id
        ).first()
        if not from_ledger or from_ledger.quantity < line.qty:
            raise HTTPException(400, f"Insufficient stock in source warehouse")
        from_ledger.quantity -= line.qty

        to_ledger = db.query(StockLedger).filter(
            StockLedger.product_id == line.product_id,
            StockLedger.warehouse_id == t.to_warehouse_id
        ).first()
        if to_ledger:
            to_ledger.quantity += line.qty
        else:
            db.add(StockLedger(product_id=line.product_id, warehouse_id=t.to_warehouse_id, quantity=line.qty))

        db.add(MoveHistory(
            move_type=MoveType.transfer,
            reference=t.reference,
            product_id=line.product_id,
            from_warehouse_id=t.from_warehouse_id,
            to_warehouse_id=t.to_warehouse_id,
            qty=line.qty,
            done_by=current_user.id
        ))

    t.status = OperationStatus.done
    db.commit()
    return transfer_to_dict(t, db)

@router.post("/{transfer_id}/cancel")
def cancel_transfer(transfer_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    t = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not t or t.status == OperationStatus.done:
        raise HTTPException(400, "Cannot cancel")
    t.status = OperationStatus.canceled
    db.commit()
    return transfer_to_dict(t, db)
