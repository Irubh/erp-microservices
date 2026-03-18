from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database.db import SessionLocal
from app.models.purchase_orders_model import PurchaseOrder, PurchaseOrderItem
from app.dependencies import require_employee, require_vendor, get_current_user
from fastapi.security import HTTPBearer
import requests

router = APIRouter()
bearer_scheme = HTTPBearer()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/purchase-orders")
def create_purchase_order(po_data: dict, db: Session = Depends(get_db), user = Depends(require_employee)):
    items = po_data.get("items", [])
    subtotal = sum(item['unit_price'] * item['quantity'] for item in items)
    total_amount = subtotal * 1.05  
    
    new_po = PurchaseOrder(
        reference_no=po_data['reference_no'],
        vendor_id=po_data['vendor_id'],
        total_amount=total_amount
    )
    db.add(new_po)
    db.flush() 

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

@router.get("/purchase-orders")
def get_all_pos(db: Session = Depends(get_db), user = Depends(require_employee)):
    return db.query(PurchaseOrder).all()

@router.get("/purchase-orders/my")
def get_my_pos(db: Session = Depends(get_db), user = Depends(require_vendor)):
    vendor_id = user["vendor_id"]         
    return db.query(PurchaseOrder).filter(
        PurchaseOrder.vendor_id == vendor_id
    ).all()

@router.get("/purchase-orders/{po_id}")
def get_po(po_id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.items)
    ).filter(PurchaseOrder.id == po_id).first()
    
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    
    if user["role"] == "vendor" and po.vendor_id != user["vendor_id"]:
        raise HTTPException(status_code=403, detail="Access denied.")
    
    return po

@router.put("/purchase-orders/{po_id}/status")
def update_po_status(po_id: int, new_status: str, db: Session = Depends(get_db), credentials = Depends(bearer_scheme), user = Depends(require_vendor)):
    
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    if int(po.vendor_id) != int(user["vendor_id"]):
        raise HTTPException(status_code=403, detail="You can only update your own POs.")

    if new_status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Vendors can only approve or reject.")
    
    po.status = new_status
    db.commit()
    
    try:
        requests.post(
            "http://localhost:8004/notify",
            json={
                "type": "PO_STATUS_UPDATED",
                "po_id": po_id,
                "status": new_status,
                "target_user": str(po.vendor_id)
            },
            headers={"Authorization": f"Bearer {credentials.credentials}"
                     },
            timeout = 3
        )
    except requests.exceptions.RequestException:
        pass
    
    return {"status": "updated", "po_id": po_id}