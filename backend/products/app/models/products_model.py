from sqlalchemy import Column, Integer, String
from app.database.db import Base
from pydantic import BaseModel

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    sku = Column(String)
    unit_price = Column(Integer)
    stock_level = Column(Integer)
    
class ProductName(BaseModel):
    name: str