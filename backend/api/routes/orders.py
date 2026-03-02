from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from pydantic import BaseModel

from db.session import get_db
from db.models import Order, Customer
from api.routes.license import check_limit

router = APIRouter(prefix="/orders", tags=["orders"])


# Pydantic models
class OrderCreate(BaseModel):
    customer_id: int
    quantity: int = 1
    stl_file_path: Optional[str] = None
    stl_filename: Optional[str] = None
    stl_volume: Optional[float] = None
    filament_type: Optional[str] = None
    filament_color: Optional[str] = None
    price: Optional[float] = None
    priority: str = "normal"
    due_date: Optional[str] = None
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    customer_id: Optional[int] = None
    status: Optional[str] = None
    quantity: Optional[int] = None
    printed_count: Optional[int] = None
    stl_file_path: Optional[str] = None
    stl_filename: Optional[str] = None
    stl_volume: Optional[float] = None
    filament_type: Optional[str] = None
    filament_color: Optional[str] = None
    price: Optional[float] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None


@router.get("", response_model=List[dict])
def list_orders(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all orders with customer info"""
    query = select(Order)

    if status:
        query = query.where(Order.status == status)
    if customer_id:
        query = query.where(Order.customer_id == customer_id)
    if priority:
        query = query.where(Order.priority == priority)

    query = query.order_by(Order.created_at.desc()).offset(skip).limit(limit)
    orders = db.exec(query).all()

    # Add customer info to each order
    result = []
    for order in orders:
        customer = db.get(Customer, order.customer_id)
        order_dict = {
            "id": order.id,
            "customer_id": order.customer_id,
            "customer_name": customer.name if customer else "Unknown",
            "status": order.status,
            "quantity": order.quantity,
            "printed_count": order.printed_count,
            "stl_file_path": order.stl_file_path,
            "stl_filename": order.stl_filename,
            "stl_volume": order.stl_volume,
            "filament_type": order.filament_type,
            "filament_color": order.filament_color,
            "price": order.price,
            "priority": order.priority,
            "due_date": order.due_date.isoformat() if order.due_date else None,
            "notes": order.notes,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        }
        result.append(order_dict)

    return result


@router.get("/{order_id}", response_model=dict)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """Get a single order by ID"""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    customer = db.get(Customer, order.customer_id)

    return {
        "id": order.id,
        "customer_id": order.customer_id,
        "customer_name": customer.name if customer else "Unknown",
        "customer_email": customer.email if customer else None,
        "status": order.status,
        "quantity": order.quantity,
        "printed_count": order.printed_count,
        "stl_file_path": order.stl_file_path,
        "stl_filename": order.stl_filename,
        "stl_volume": order.stl_volume,
        "filament_type": order.filament_type,
        "filament_color": order.filament_color,
        "price": order.price,
        "priority": order.priority,
        "due_date": order.due_date.isoformat() if order.due_date else None,
        "notes": order.notes,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
    }


@router.post("", response_model=dict)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    """Create a new order"""
    # Check license limit
    current_count = len(db.exec(select(Order)).all())
    limit_check = check_limit("orders", current_count)

    if not limit_check.get("allowed"):
        raise HTTPException(
            status_code=403,
            detail=limit_check.get("error", "Limit erreicht")
        )

    # Verify customer exists
    customer = db.get(Customer, order.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    due_date = None
    if order.due_date:
        due_date = datetime.fromisoformat(order.due_date)

    db_order = Order(
        customer_id=order.customer_id,
        quantity=order.quantity,
        stl_file_path=order.stl_file_path,
        stl_filename=order.stl_filename,
        stl_volume=order.stl_volume,
        filament_type=order.filament_type,
        filament_color=order.filament_color,
        price=order.price,
        priority=order.priority,
        due_date=due_date,
        notes=order.notes,
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    return {
        "id": db_order.id,
        "customer_id": db_order.customer_id,
        "customer_name": customer.name,
        "status": db_order.status,
        "quantity": db_order.quantity,
        "printed_count": db_order.printed_count,
        "created_at": db_order.created_at.isoformat() if db_order.created_at else None,
    }


@router.patch("/{order_id}", response_model=dict)
def update_order(order_id: int, order: OrderUpdate, db: Session = Depends(get_db)):
    """Update an order"""
    db_order = db.get(Order, order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")

    update_data = order.dict(exclude_unset=True)

    if "due_date" in update_data and update_data["due_date"]:
        update_data["due_date"] = datetime.fromisoformat(update_data["due_date"])
    elif "due_date" in update_data:
        update_data["due_date"] = None

    for key, value in update_data.items():
        setattr(db_order, key, value)

    db_order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_order)

    customer = db.get(Customer, db_order.customer_id)

    return {
        "id": db_order.id,
        "customer_id": db_order.customer_id,
        "customer_name": customer.name if customer else "Unknown",
        "status": db_order.status,
        "quantity": db_order.quantity,
        "printed_count": db_order.printed_count,
    }


@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """Delete an order"""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    db.delete(order)
    db.commit()
    return {"message": "Order deleted successfully"}


@router.post("/{order_id}/increment")
def increment_printed(order_id: int, db: Session = Depends(get_db)):
    """Increment printed count by 1"""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.printed_count < order.quantity:
        order.printed_count += 1
        if order.printed_count >= order.quantity:
            order.status = "completed"
        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)

    return {"printed_count": order.printed_count, "status": order.status}


@router.post("/{order_id}/decrement")
def decrement_printed(order_id: int, db: Session = Depends(get_db)):
    """Decrement printed count by 1"""
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.printed_count > 0:
        order.printed_count -= 1
        if order.status == "completed":
            order.status = "in_progress"
        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)

    return {"printed_count": order.printed_count, "status": order.status}


@router.get("/count")
def count_orders(status: Optional[str] = None, db: Session = Depends(get_db)):
    """Get total number of orders"""
    query = select(Order)
    if status:
        query = query.where(Order.status == status)
    orders = db.exec(query).all()
    return {"count": len(orders)}
