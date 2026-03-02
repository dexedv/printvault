from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from db.session import get_db
from db.models import PrintProfile

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("", response_model=List[PrintProfile])
def list_profiles(
    skip: int = 0,
    limit: int = 100,
    material: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all print profiles"""
    query = select(PrintProfile)

    if material:
        query = query.where(PrintProfile.material == material)

    query = query.order_by(PrintProfile.name).offset(skip).limit(limit)
    return db.exec(query).all()


@router.get("/{profile_id}", response_model=PrintProfile)
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    """Get a single profile by ID"""
    profile = db.get(PrintProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.post("", response_model=PrintProfile)
def create_profile(
    name: str,
    nozzle_temp: int = 200,
    bed_temp: int = 60,
    layer_height: float = 0.2,
    print_speed: int = 50,
    infill: int = 20,
    material: str = "PLA",
    notes: Optional[str] = None,
    is_default: bool = False,
    db: Session = Depends(get_db)
):
    """Create a new print profile"""
    # If setting as default, unset other defaults for this material
    if is_default:
        query = select(PrintProfile).where(
            (PrintProfile.material == material) &
            (PrintProfile.is_default == True)
        )
        for p in db.exec(query).all():
            p.is_default = False

    profile = PrintProfile(
        name=name,
        nozzle_temp=nozzle_temp,
        bed_temp=bed_temp,
        layer_height=layer_height,
        print_speed=print_speed,
        infill=infill,
        material=material,
        notes=notes,
        is_default=is_default
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.patch("/{profile_id}", response_model=PrintProfile)
def update_profile(
    profile_id: int,
    name: Optional[str] = None,
    nozzle_temp: Optional[int] = None,
    bed_temp: Optional[int] = None,
    layer_height: Optional[float] = None,
    print_speed: Optional[int] = None,
    infill: Optional[int] = None,
    material: Optional[str] = None,
    notes: Optional[str] = None,
    is_default: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Update a print profile"""
    profile = db.get(PrintProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if is_default and is_default != profile.is_default:
        # Unset other defaults for this material
        query = select(PrintProfile).where(
            (PrintProfile.material == profile.material) &
            (PrintProfile.is_default == True) &
            (PrintProfile.id != profile_id)
        )
        for p in db.exec(query).all():
            p.is_default = False

    if name is not None:
        profile.name = name
    if nozzle_temp is not None:
        profile.nozzle_temp = nozzle_temp
    if bed_temp is not None:
        profile.bed_temp = bed_temp
    if layer_height is not None:
        profile.layer_height = layer_height
    if print_speed is not None:
        profile.print_speed = print_speed
    if infill is not None:
        profile.infill = infill
    if material is not None:
        profile.material = material
    if notes is not None:
        profile.notes = notes
    if is_default is not None:
        profile.is_default = is_default

    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}")
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    """Delete a print profile"""
    profile = db.get(PrintProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    db.delete(profile)
    db.commit()
    return {"message": "Profile deleted successfully"}


@router.get("/defaults/{material}")
def get_default_profile(material: str, db: Session = Depends(get_db)):
    """Get default profile for a material"""
    query = select(PrintProfile).where(
        (PrintProfile.material == material) &
        (PrintProfile.is_default == True)
    )
    profile = db.exec(query).first()
    if not profile:
        # Fallback: get any profile for material
        query = select(PrintProfile).where(PrintProfile.material == material)
        profile = db.exec(query).first()
    return profile
