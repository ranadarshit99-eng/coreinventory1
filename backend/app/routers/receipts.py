from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.database import get_db
from app.models import Receipt, ReceiptLine, StockLedger, MoveHistory, MoveType, OperationStatus, Product, Warehouse
from app.dependencies import get_current_user, require_not_viewer
from app.models import User

router = APIRouter()

class ReceiptLineIn(BaseModel):
    product_id: int
    expected_qty: float
    received_qty: Optional[float] = 0
    uom: str = "pieces"

class ReceiptCreate(BaseModel):
    supplier: str
    scheduled_date: Optional[datetime] = None
    warehouse_id: int
    notes: Optional[str] = None
    lines: List[ReceiptLineIn] = []

class ReceiptUpdate(BaseModel):
    supplier: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    warehouse_id: Optional[int] = None
    notes: Optional[str] = None
    lines: Optional[List[ReceiptLineIn]] = None

def receipt_to_dict(r: Receipt, db: Session) -> dict:
    lines = []
    for l in r.lines:
        p = db.query(Product).filter(Product.id == l.product_id).first()
        lines.append({
            "id": l.id,
            "product_id": l.product_id,
            "product_name": p.name if p else "Unknown",
            "product_sku": p.sku if p else "",
            "expected_qty": l.expected_qty,
            "received_qty": l.received_qty,
            "uom": l.uom
        })
    wh = db.query(Warehouse).filter(Warehouse.id == r.warehouse_id).first()
    return {
        "id": r.id,
        "reference": r.reference,
        "supplier": r.supplier,
        "status": r.status.value,
        "scheduled_date": r.scheduled_date,
        "warehouse_id": r.warehouse_id,
        "warehouse_name": wh.name if wh else None,
        "notes": r.notes,
        "created_at": r.created_at,
        "lines": lines,
        "total_units": sum(l.received_qty or l.expected_qty for l in r.lines),
        "lines_count": len(r.lines),
    }

def get_next_reference(db: Session, prefix: str, model) -> str:
    count = db.query(model).count()
    return f"{prefix}-{str(count + 1).zfill(4)}"

@router.get("/")
def list_receipts(
    status: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Receipt)
    if status:
        query = query.filter(Receipt.status == status)
    if warehouse_id:
        query = query.filter(Receipt.warehouse_id == warehouse_id)
    receipts = query.order_by(Receipt.created_at.desc()).all()
    return [receipt_to_dict(r, db) for r in receipts]

@router.post("/")
def create_receipt(
    req: ReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_viewer)
):
    ref = get_next_reference(db, "RCP", Receipt)
    receipt = Receipt(
        reference=ref,
        supplier=req.supplier,
        scheduled_date=req.scheduled_date,
        warehouse_id=req.warehouse_id,
        notes=req.notes,
        status=OperationStatus.draft,
        created_by=current_user.id
    )
    db.add(receipt)
    db.flush()

    for line in req.lines:
        rl = ReceiptLine(
            receipt_id=receipt.id,
            product_id=line.product_id,
            expected_qty=line.expected_qty,
            received_qty=line.received_qty or 0,
            uom=line.uom
        )
        db.add(rl)

    db.commit()
    db.refresh(receipt)
    return receipt_to_dict(receipt, db)

@router.get("/{receipt_id}")
def get_receipt(receipt_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not r:
        raise HTTPException(404, "Receipt not found")
    return receipt_to_dict(r, db)

@router.put("/{receipt_id}")
def update_receipt(
    receipt_id: int,
    req: ReceiptUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_viewer)
):
    r = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not r:
        raise HTTPException(404, "Receipt not found")
    if r.status == OperationStatus.done:
        raise HTTPException(400, "Cannot edit a validated receipt")

    if req.supplier: r.supplier = req.supplier
    if req.scheduled_date: r.scheduled_date = req.scheduled_date
    if req.warehouse_id: r.warehouse_id = req.warehouse_id
    if req.notes is not None: r.notes = req.notes

    if req.lines is not None:
        for old_line in r.lines:
            db.delete(old_line)
        db.flush()
        for line in req.lines:
            rl = ReceiptLine(
                receipt_id=r.id,
                product_id=line.product_id,
                expected_qty=line.expected_qty,
                received_qty=line.received_qty or 0,
                uom=line.uom
            )
            db.add(rl)

    db.commit()
    db.refresh(r)
    return receipt_to_dict(r, db)

@router.post("/{receipt_id}/confirm")
def confirm_receipt(receipt_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    r = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not r:
        raise HTTPException(404, "Receipt not found")
    if r.status != OperationStatus.draft:
        raise HTTPException(400, f"Cannot confirm receipt in {r.status.value} status")
    r.status = OperationStatus.waiting
    db.commit()
    return receipt_to_dict(r, db)

@router.post("/{receipt_id}/validate")
def validate_receipt(receipt_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    r = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not r:
        raise HTTPException(404, "Receipt not found")
    if r.status == OperationStatus.done:
        raise HTTPException(400, "Receipt already validated")
    if r.status == OperationStatus.canceled:
        raise HTTPException(400, "Cannot validate a canceled receipt")

    for line in r.lines:
        qty = line.received_qty if line.received_qty > 0 else line.expected_qty
        ledger = db.query(StockLedger).filter(
            StockLedger.product_id == line.product_id,
            StockLedger.warehouse_id == r.warehouse_id
        ).first()

        if ledger:
            ledger.quantity += qty
        else:
            ledger = StockLedger(
                product_id=line.product_id,
                warehouse_id=r.warehouse_id,
                quantity=qty
            )
            db.add(ledger)

        move = MoveHistory(
            move_type=MoveType.receipt,
            reference=r.reference,
            product_id=line.product_id,
            to_warehouse_id=r.warehouse_id,
            qty=qty,
            done_by=current_user.id
        )
        db.add(move)

    r.status = OperationStatus.done
    db.commit()
    return receipt_to_dict(r, db)

@router.post("/{receipt_id}/cancel")
def cancel_receipt(receipt_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    r = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not r:
        raise HTTPException(404, "Receipt not found")
    if r.status == OperationStatus.done:
        raise HTTPException(400, "Cannot cancel a validated receipt")
    r.status = OperationStatus.canceled
    db.commit()
    return receipt_to_dict(r, db)

@router.delete("/{receipt_id}")
def delete_receipt(receipt_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    r = db.query(Receipt).filter(Receipt.id == receipt_id).first()
    if not r:
        raise HTTPException(404, "Receipt not found")
    if r.status == OperationStatus.done:
        raise HTTPException(400, "Cannot delete a validated receipt")
    db.delete(r)
    db.commit()
    return {"message": "Receipt deleted"}
