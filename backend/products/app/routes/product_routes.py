from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.db import SessionLocal
from app.models.products_model import Product, ProductName
from app.services.ai_descriptions import generate_product_description

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        

@router.get("/products")
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()

@router.post("/products/auto-description")
def auto_description(data: ProductName):

    description = generate_product_description(data.name)

    return {
        "product_name": data.name,
        "description": description
    }