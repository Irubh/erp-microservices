from sqlalchemy import Column, Integer, String, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.database.db import Base

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    reference_no = Column(String)
    vendor_id = Column(Integer)
    total_amount = Column(Numeric(12,2))
    status = Column(String, default="pending")
    items = relationship("PurchaseOrderItem", back_populates="po")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    id = Column(Integer, primary_key=True, index=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"))
    product_id = Column(Integer)
    quantity = Column(Integer)
    unit_price_at_purchase = Column(Numeric(10, 2))
    po = relationship("PurchaseOrder", back_populates="items")