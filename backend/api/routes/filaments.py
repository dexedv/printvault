from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select, func
from datetime import datetime

from db.session import get_db
from db.models import Filament
from api.routes.license import check_limit

router = APIRouter(prefix="/filaments", tags=["filaments"])


# Pydantic models for request bodies
class FilamentCreate(BaseModel):
    material: str
    color_name: str
    color_hex: str = "#FFFFFF"
    vendor: Optional[str] = None
    total_weight_kg: float = 1.0
    remaining_weight_kg: Optional[float] = None
    spool_cost: Optional[float] = None
    purchase_date: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    low_stock_threshold: float = 0.1


class FilamentUpdate(BaseModel):
    material: Optional[str] = None
    color_name: Optional[str] = None
    color_hex: Optional[str] = None
    vendor: Optional[str] = None
    total_weight_kg: Optional[float] = None
    remaining_weight_kg: Optional[float] = None
    spool_cost: Optional[float] = None
    purchase_date: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    low_stock_threshold: Optional[float] = None


@router.get("", response_model=List[Filament])
def list_filaments(
    skip: int = 0,
    limit: int = 100,
    material: Optional[str] = None,
    low_stock: bool = False,
    db: Session = Depends(get_db)
):
    """List all filaments"""
    query = select(Filament)

    if material:
        query = query.where(Filament.material == material)

    query = query.order_by(Filament.created_at.desc()).offset(skip).limit(limit)
    filaments = db.exec(query).all()

    if low_stock:
        filaments = [f for f in filaments if f.remaining_weight_kg <= f.low_stock_threshold]

    return filaments


@router.get("/{filament_id}", response_model=Filament)
def get_filament(filament_id: int, db: Session = Depends(get_db)):
    """Get a single filament by ID"""
    filament = db.get(Filament, filament_id)
    if not filament:
        raise HTTPException(status_code=404, detail="Filament not found")
    return filament


@router.post("", response_model=Filament)
def create_filament(
    filament_data: FilamentCreate,
    db: Session = Depends(get_db)
):
    """Create a new filament"""
    # Check license limit
    current_count = db.exec(select(func.count(Filament.id))).first() or 0
    limit_check = check_limit("filaments", current_count)

    if not limit_check.get("allowed"):
        raise HTTPException(
            status_code=403,
            detail=limit_check.get("error", "Limit erreicht")
        )

    remaining_weight = filament_data.remaining_weight_kg
    if remaining_weight is None:
        remaining_weight = filament_data.total_weight_kg

    filament = Filament(
        material=filament_data.material,
        color_name=filament_data.color_name,
        color_hex=filament_data.color_hex,
        vendor=filament_data.vendor,
        total_weight_kg=filament_data.total_weight_kg,
        remaining_weight_kg=remaining_weight,
        spool_cost=filament_data.spool_cost,
        purchase_date=datetime.fromisoformat(filament_data.purchase_date) if filament_data.purchase_date else None,
        location=filament_data.location,
        notes=filament_data.notes,
        low_stock_threshold=filament_data.low_stock_threshold
    )
    db.add(filament)
    db.commit()
    db.refresh(filament)
    return filament


@router.patch("/{filament_id}", response_model=Filament)
def update_filament(
    filament_id: int,
    filament_data: FilamentUpdate,
    db: Session = Depends(get_db)
):
    """Update a filament"""
    filament = db.get(Filament, filament_id)
    if not filament:
        raise HTTPException(status_code=404, detail="Filament not found")

    if filament_data.material is not None:
        filament.material = filament_data.material
    if filament_data.color_name is not None:
        filament.color_name = filament_data.color_name
    if filament_data.color_hex is not None:
        filament.color_hex = filament_data.color_hex
    if filament_data.vendor is not None:
        filament.vendor = filament_data.vendor
    if filament_data.total_weight_kg is not None:
        filament.total_weight_kg = filament_data.total_weight_kg
    if filament_data.remaining_weight_kg is not None:
        filament.remaining_weight_kg = filament_data.remaining_weight_kg
    if filament_data.spool_cost is not None:
        filament.spool_cost = filament_data.spool_cost
    if filament_data.purchase_date is not None:
        filament.purchase_date = datetime.fromisoformat(filament_data.purchase_date) if filament_data.purchase_date else None
    if filament_data.location is not None:
        filament.location = filament_data.location
    if filament_data.notes is not None:
        filament.notes = filament_data.notes
    if filament_data.low_stock_threshold is not None:
        filament.low_stock_threshold = filament_data.low_stock_threshold

    db.commit()
    db.refresh(filament)
    return filament


@router.delete("/{filament_id}")
def delete_filament(filament_id: int, db: Session = Depends(get_db)):
    """Delete a filament"""
    filament = db.get(Filament, filament_id)
    if not filament:
        raise HTTPException(status_code=404, detail="Filament not found")

    db.delete(filament)
    db.commit()
    return {"message": "Filament deleted successfully"}


@router.get("/low-stock/check")
def check_low_stock(db: Session = Depends(get_db)):
    """Get filaments that are below stock threshold"""
    query = select(Filament)
    filaments = db.exec(query).all()
    low_stock = [f for f in filaments if f.remaining_weight_kg <= f.low_stock_threshold]
    return {
        "count": len(low_stock),
        "filaments": low_stock
    }
