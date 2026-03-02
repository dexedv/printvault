from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
import httpx
import asyncio

from db.session import get_db
from db.models import Printer, PrintJob
from utils.security import encryption
from adapters.klipper import KlipperAdapter
from config import settings

router = APIRouter(prefix="/printers", tags=["printers"])


@router.get("", response_model=List[Printer])
def list_printers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all printers"""
    query = select(Printer).order_by(Printer.name).offset(skip).limit(limit)
    return db.exec(query).all()


@router.get("/{printer_id}", response_model=Printer)
def get_printer(printer_id: int, db: Session = Depends(get_db)):
    """Get a single printer by ID"""
    printer = db.get(Printer, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    # Don't return API key
    printer.api_key = "***" if printer.api_key else None
    return printer


@router.post("", response_model=Printer)
def create_printer(
    name: str,
    host: str,
    printer_type: str = "klipper",
    port: int = 7125,
    api_key: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Add a new printer"""
    # Encrypt API key
    encrypted_key = encryption.encrypt(api_key) if api_key else None

    printer = Printer(
        name=name,
        printer_type=printer_type,
        host=host,
        port=port,
        api_key=encrypted_key
    )
    db.add(printer)
    db.commit()
    db.refresh(printer)

    # Don't return API key
    printer.api_key = "***" if printer.api_key else None
    return printer


@router.patch("/{printer_id}", response_model=Printer)
def update_printer(
    printer_id: int,
    name: Optional[str] = None,
    host: Optional[str] = None,
    port: Optional[int] = None,
    api_key: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Update a printer"""
    printer = db.get(Printer, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    if name is not None:
        printer.name = name
    if host is not None:
        printer.host = host
    if port is not None:
        printer.port = port
    if api_key is not None and api_key != "***":
        printer.api_key = encryption.encrypt(api_key)
    if is_active is not None:
        printer.is_active = is_active

    db.commit()
    db.refresh(printer)

    # Don't return API key
    printer.api_key = "***" if printer.api_key else None
    return printer


@router.delete("/{printer_id}")
def delete_printer(printer_id: int, db: Session = Depends(get_db)):
    """Delete a printer"""
    printer = db.get(Printer, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    db.delete(printer)
    db.commit()
    return {"message": "Printer deleted successfully"}


@router.post("/{printer_id}/connect")
async def connect_printer(printer_id: int, db: Session = Depends(get_db)):
    """Test connection to printer"""
    printer = db.get(Printer, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    if printer.printer_type != "klipper":
        raise HTTPException(status_code=400, detail="Only Klipper printers supported in MVP")

    # Decrypt API key
    api_key = encryption.decrypt(printer.api_key) if printer.api_key else None

    try:
        adapter = KlipperAdapter(printer.host, printer.port, api_key)
        status = await adapter.get_status()

        printer.last_connected = datetime.utcnow()
        db.commit()

        return {
            "connected": True,
            "status": status
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }


@router.get("/{printer_id}/status")
async def get_printer_status(printer_id: int, db: Session = Depends(get_db)):
    """Get current printer status"""
    printer = db.get(Printer, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    if printer.printer_type != "klipper":
        raise HTTPException(status_code=400, detail="Only Klipper printers supported in MVP")

    api_key = encryption.decrypt(printer.api_key) if printer.api_key else None

    try:
        adapter = KlipperAdapter(printer.host, printer.port, api_key)
        status = await adapter.get_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
