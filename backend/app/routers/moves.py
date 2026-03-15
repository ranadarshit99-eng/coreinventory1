from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import MoveHistory, Product, Warehouse, User
from app.dependencies import get_current_user
import csv
import io
from fastapi.responses import StreamingResponse

router = APIRouter()

def move_to_dict(m: MoveHistory, db: Session) -> dict:
    p = db.query(Product).filter(Product.id == m.product_id).first()
    user = db.query(User).filter(User.id == m.done_by).first() if m.done_by else None
    return {
        "id": m.id,
        "date": m.date,
        "move_type": m.move_type.value,
        "reference": m.reference,
        "product_id": m.product_id,
        "product_name": p.name if p else "Unknown",
        "product_sku": p.sku if p else "",
        "from_warehouse": m.from_warehouse.name if m.from_warehouse else None,
        "to_warehouse": m.to_warehouse.name if m.to_warehouse else None,
        "qty": m.qty,
        "done_by": user.full_name if user else None,
    }

@router.get("/")
def list_moves(
    search: Optional[str] = None,
    move_type: Optional[str] = None,
    warehouse_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MoveHistory)
    if move_type:
        query = query.filter(MoveHistory.move_type == move_type)
    if search:
        pids = [p.id for p in db.query(Product).filter(
            (Product.name.ilike(f"%{search}%")) | (Product.sku.ilike(f"%{search}%"))
        ).all()]
        query = query.filter(MoveHistory.product_id.in_(pids))

    moves = query.order_by(MoveHistory.date.desc()).offset(skip).limit(limit).all()
    result = [move_to_dict(m, db) for m in moves]

    if warehouse_id:
        result = [m for m in result if
                  (m.get("from_warehouse_id") == warehouse_id or m.get("to_warehouse_id") == warehouse_id)]
    return result

@router.get("/export-csv")
def export_moves_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    moves = db.query(MoveHistory).order_by(MoveHistory.date.desc()).limit(1000).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Type", "Reference", "Product", "SKU", "From", "To", "Qty", "Done By"])
    for m in moves:
        d = move_to_dict(m, db)
        writer.writerow([
            d["date"], d["move_type"], d["reference"],
            d["product_name"], d["product_sku"],
            d["from_warehouse"] or "", d["to_warehouse"] or "",
            d["qty"], d["done_by"] or ""
        ])
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=move_history.csv"}
    )
