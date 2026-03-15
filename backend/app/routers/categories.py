from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import Category, Product
from app.dependencies import get_current_user, require_not_viewer
from app.models import User

router = APIRouter()

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

@router.get("/")
def list_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cats = db.query(Category).all()
    result = []
    for c in cats:
        count = db.query(Product).filter(Product.category_id == c.id, Product.is_active == True).count()
        result.append({"id": c.id, "name": c.name, "description": c.description, "product_count": count, "created_at": c.created_at})
    return result

@router.post("/")
def create_category(req: CategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    if db.query(Category).filter(Category.name == req.name).first():
        raise HTTPException(400, "Category already exists")
    c = Category(name=req.name, description=req.description)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "name": c.name, "description": c.description, "product_count": 0}

@router.put("/{cat_id}")
def update_category(cat_id: int, req: CategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    c = db.query(Category).filter(Category.id == cat_id).first()
    if not c:
        raise HTTPException(404, "Category not found")
    c.name = req.name
    c.description = req.description
    db.commit()
    return {"id": c.id, "name": c.name, "description": c.description}

@router.delete("/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_not_viewer)):
    c = db.query(Category).filter(Category.id == cat_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    db.delete(c)
    db.commit()
    return {"message": "Deleted"}
