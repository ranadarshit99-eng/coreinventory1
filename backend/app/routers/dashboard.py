from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import (Product, StockLedger, Receipt, Delivery, MoveHistory,
                         OperationStatus, MoveType, Warehouse, Category)
from app.dependencies import get_current_user
from app.models import User

router = APIRouter()

@router.get("/")
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # KPIs
    total_products = db.query(Product).filter(Product.is_active == True).count()

    all_products = db.query(Product).filter(Product.is_active == True).all()
    low_stock = 0
    out_of_stock = 0
    stock_alerts = []

    for p in all_products:
        total_qty = db.query(func.sum(StockLedger.quantity)).filter(StockLedger.product_id == p.id).scalar() or 0
        if total_qty == 0:
            out_of_stock += 1
            stock_alerts.append({"product_id": p.id, "name": p.name, "sku": p.sku, "qty": 0, "reorder": p.reorder_point, "status": "out"})
        elif total_qty <= p.reorder_point:
            low_stock += 1
            stock_alerts.append({"product_id": p.id, "name": p.name, "sku": p.sku, "qty": total_qty, "reorder": p.reorder_point, "status": "low"})

    pending_receipts = db.query(Receipt).filter(
        Receipt.status.in_([OperationStatus.draft, OperationStatus.waiting, OperationStatus.ready])
    ).count()

    pending_deliveries = db.query(Delivery).filter(
        Delivery.status != OperationStatus.done,
        Delivery.status != OperationStatus.canceled
    ).count()

    # Recent operations
    recent_receipts = db.query(Receipt).order_by(Receipt.created_at.desc()).limit(5).all()
    recent_deliveries = db.query(Delivery).order_by(Delivery.created_at.desc()).limit(5).all()
    recent_ops = []

    for r in recent_receipts:
        wh = db.query(Warehouse).filter(Warehouse.id == r.warehouse_id).first()
        recent_ops.append({
            "id": r.id,
            "type": "receipt",
            "reference": r.reference,
            "party": r.supplier,
            "status": r.status.value,
            "date": r.created_at,
            "warehouse": wh.name if wh else None,
            "lines_count": len(r.lines),
        })
    for d in recent_deliveries:
        wh = db.query(Warehouse).filter(Warehouse.id == d.warehouse_id).first()
        recent_ops.append({
            "id": d.id,
            "type": "delivery",
            "reference": d.reference,
            "party": d.customer,
            "status": d.status.value,
            "date": d.created_at,
            "warehouse": wh.name if wh else None,
            "lines_count": len(d.lines),
        })

    recent_ops.sort(key=lambda x: x["date"] if x["date"] else "", reverse=True)

    return {
        "kpis": {
            "total_products": total_products,
            "low_stock": low_stock,
            "out_of_stock": out_of_stock,
            "pending_receipts": pending_receipts,
            "pending_deliveries": pending_deliveries,
        },
        "stock_alerts": stock_alerts[:10],
        "recent_operations": recent_ops[:10],
    }
