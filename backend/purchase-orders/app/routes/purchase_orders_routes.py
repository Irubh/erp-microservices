from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database.db import SessionLocal
from app.models.purchase_orders_model import PurchaseOrder, PurchaseOrderItem
import requests

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/purchase-orders")
def create_purchase_order(po_data: dict, db: Session = Depends(get_db)):
    # 1. Calculate subtotal & 5% tax
    items = po_data.get("items", [])
    subtotal = sum(item['unit_price'] * item['quantity'] for item in items)
    total_amount = subtotal * 1.05  # Applying 5% tax
    
    # 2. Create PO Header
    new_po = PurchaseOrder(
        reference_no=po_data['reference_no'],
        vendor_id=po_data['vendor_id'],
        total_amount=total_amount
    )
    db.add(new_po)
    db.flush() 
    
    # 3. Create PO Items
    for item in items:
        db_item = PurchaseOrderItem(
            po_id=new_po.id,
            product_id=item['product_id'],
            quantity=item['quantity'],
            unit_price_at_purchase=item['unit_price']
        )
        db.add(db_item)
        
    db.commit()
    return {"status": "success", "po_id": new_po.id}


# 1. GET all Purchase Orders
@router.get("/purchase-orders")
def get_all_pos(db: Session = Depends(get_db)):
    return db.query(PurchaseOrder).all()

# 2. GET a single Purchase Order by ID (with its items)
@router.get("/purchase-orders/{po_id}")
def get_po(po_id: int, db: Session = Depends(get_db)):
    # Use joinedload to fetch the items in the same query for performance
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.items)
    ).filter(PurchaseOrder.id == po_id).first()
    
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    
    return po

@router.put("/purchase-orders/{po_id}/status")
def update_po_status(po_id: int, new_status: str, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    po.status = new_status
    db.commit()
    
    requests.post(
        "http://localhost:8004/notify",
        json={
            "type": "PO_STATUS_UPDATED",
            "po_id": po_id,
            "status": new_status,
            "target_user": po.vendor_id
        }
    )
    
    # After committing the change, trigger the notification
    # You can send an HTTP POST request to your Node.js Notification Service here
    return {"status": "updated", "po_id": po_id}