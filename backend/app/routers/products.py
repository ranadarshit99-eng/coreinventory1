from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models import Product, StockLedger, Category, Warehouse, MoveHistory, MoveType
from app.dependencies import get_current_user, require_not_viewer
from app.models import User
from app.utils.security import generate_sku
from datetime import datetime, timezone

router = APIRouter()

class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    category_id: Optional[int] = None
    uom: str = "pieces"
    reorder_point: float = 10
    description: Optional[str] = None
    initial_stock: Optional[float] = None
    warehouse_id: Optional[int] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category_id: Optional[int] = None
    uom: Optional[str] = None
    reorder_point: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

def get_product_stock(db: Session, product_id: int) -> float:
    total = db.query(func.sum(StockLedger.quantity)).filter(
        StockLedger.product_id == product_id
    ).scalar()
    return float(total or 0)

def product_to_dict(product: Product, db: Session) -> dict:
    total_stock = get_product_stock(db, product.id)
    status = "in_stock"
    if total_stock == 0:
        status = "out_of_stock"
    elif total_stock <= product.reorder_point:
        status = "low_stock"

    stock_by_warehouse = []
    ledgers = db.query(StockLedger).filter(StockLedger.product_id == product.id).all()
    for l in ledgers:
        wh = db.query(Warehouse).filter(Warehouse.id == l.warehouse_id).first()
        stock_by_warehouse.append({
            "warehouse_id": l.warehouse_id,
            "warehouse_name": wh.name if wh else "Unknown",
            "quantity": l.quantity
        })

    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "category_id": product.category_id,
        "category_name": product.category.name if product.category else None,
        "uom": product.uom,
        "reorder_point": product.reorder_point,
        "description": product.description,
        "is_active": product.is_active,
        "total_stock": total_stock,
        "stock_by_warehouse": stock_by_warehouse,
        "status": status,
        "created_at": product.created_at,
    }

@router.get("/")
def list_products(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product).filter(Product.is_active == True)
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) | (Product.sku.ilike(f"%{search}%"))
        )
    if category_id:
        query = query.filter(Product.category_id == category_id)

    products = query.offset(skip).limit(limit).all()
    result = [product_to_dict(p, db) for p in products]

    if warehouse_id:
        result = [p for p in result if any(
            s["warehouse_id"] == warehouse_id for s in p["stock_by_warehouse"]
        )]

    if status == "low_stock":
        result = [p for p in result if p["status"] == "low_stock"]
    elif status == "out_of_stock":
        result = [p for p in result if p["status"] == "out_of_stock"]
    elif status == "in_stock":
        result = [p for p in result if p["status"] == "in_stock"]

    return result

@router.post("/")
def create_product(
    req: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_viewer)
):
    sku = req.sku or generate_sku()
    existing = db.query(Product).filter(Product.sku == sku).first()
    if existing:
        raise HTTPException(400, "SKU already exists")

    product = Product(
        name=req.name,
        sku=sku,
        category_id=req.category_id,
        uom=req.uom,
        reorder_point=req.reorder_point,
        description=req.description,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    # Create initial stock if provided
    if req.initial_stock and req.initial_stock > 0:
        warehouse_id = req.warehouse_id
        if not warehouse_id:
            wh = db.query(Warehouse).first()
            if wh:
                warehouse_id = wh.id

        if warehouse_id:
            ledger = StockLedger(
                product_id=product.id,
                warehouse_id=warehouse_id,
                quantity=req.initial_stock
            )
            db.add(ledger)

            move = MoveHistory(
                move_type=MoveType.adjustment,
                reference=f"INIT-{product.sku}",
                product_id=product.id,
                to_warehouse_id=warehouse_id,
                qty=req.initial_stock,
                done_by=current_user.id
            )
            db.add(move)
            db.commit()

    return product_to_dict(product, db)

@router.get("/{product_id}")
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    return product_to_dict(product, db)

@router.put("/{product_id}")
def update_product(
    product_id: int,
    req: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_viewer)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    for field, value in req.dict(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    return product_to_dict(product, db)

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_not_viewer)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    product.is_active = False
    db.commit()
    return {"message": "Product archived"}

@router.get("/{product_id}/moves")
def get_product_moves(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    moves = db.query(MoveHistory).filter(
        MoveHistory.product_id == product_id
    ).order_by(MoveHistory.date.desc()).limit(50).all()

    result = []
    for m in moves:
        result.append({
            "id": m.id,
            "date": m.date,
            "move_type": m.move_type.value,
            "reference": m.reference,
            "from_warehouse": m.from_warehouse.name if m.from_warehouse else None,
            "to_warehouse": m.to_warehouse.name if m.to_warehouse else None,
            "qty": m.qty,
        })
    return result

@router.get("/generate-sku/")
def get_generated_sku(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sku = generate_sku()
    while db.query(Product).filter(Product.sku == sku).first():
        sku = generate_sku()
    return {"sku": sku}
