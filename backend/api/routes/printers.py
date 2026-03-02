from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from datetime import datetime
import httpx
import asyncio

from db.session import get_db
from db.models import Printer, PrintJob
from utils.security import encryption
from adapters.klipper import KlipperAdapter
from config import settings
from api.routes.license import check_limit

router = APIRouter(prefix="/printers", tags=["printers"])


# Pydantic models
class PrinterCreate(BaseModel):
    name: str
    host: str
    printer_type: str = "klipper"
    port: int = 7125
    api_key: Optional[str] = None
    webcam_url: Optional[str] = None


class PrinterUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    printer_type: Optional[str] = None
    port: Optional[int] = None
    api_key: Optional[str] = None
    webcam_url: Optional[str] = None


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
    printer_data: PrinterCreate,
    db: Session = Depends(get_db)
):
    """Add a new printer"""
    # Check license limit
    current_count = len(db.exec(select(Printer)).all())
    limit_check = check_limit("printers", current_count)

    if not limit_check.get("allowed"):
        raise HTTPException(
            status_code=403,
            detail=limit_check.get("error", "Limit erreicht")
        )

    # Encrypt API key
    encrypted_key = encryption.encrypt(printer_data.api_key) if printer_data.api_key else None

    printer = Printer(
        name=printer_data.name,
        printer_type=printer_data.printer_type,
        host=printer_data.host,
        port=printer_data.port,
        api_key=encrypted_key,
        webcam_url=printer_data.webcam_url
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
    printer_data: PrinterUpdate,
    db: Session = Depends(get_db)
):
    """Update a printer"""
    printer = db.get(Printer, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    if printer_data.name is not None:
        printer.name = printer_data.name
    if printer_data.host is not None:
        printer.host = printer_data.host
    if printer_data.port is not None:
        printer.port = printer_data.port
    if printer_data.api_key is not None and printer_data.api_key != "***":
        printer.api_key = encryption.encrypt(printer_data.api_key)
    if printer_data.webcam_url is not None:
        printer.webcam_url = printer_data.webcam_url
    if printer_data.is_active is not None:
        printer.is_active = printer_data.is_active

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

        # First test basic connection
        is_connected = await adapter.connect()
        if not is_connected:
            return {
                "connected": False,
                "error": f"Verbindung zu Moonraker unter {printer.host}:{printer.port} fehlgeschlagen.\n\nMögliche Ursachen:\n• Moonraker läuft nicht auf dem Drucker\n• Falsche IP-Adresse oder Port\n• Firewall blockiert die Verbindung\n• Drucker ist nicht im Netzwerk erreichbar"
            }

        # Try to get full status
        status = await adapter.get_status()

        printer.last_connected = datetime.utcnow()
        db.commit()

        return {
            "connected": True,
            "status": status
        }
    except httpx.ConnectError as e:
        return {
            "connected": False,
            "error": f"Verbindung abgelehnt von {printer.host}:{printer.port}.\n\nMoonraker ist wahrscheinlich nicht gestartet.\nIP und Port prüfen."
        }
    except httpx.TimeoutException:
        return {
            "connected": False,
            "error": f"Zeitüberschreitung bei Verbindung zu {printer.host}:{printer.port}.\n\nDrucker ist nicht erreichbar."
        }
    except Exception as e:
        return {
            "connected": False,
            "error": f"Fehler: {str(e)}"
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


@router.get("/{printer_id}/webcam")
async def get_printer_webcam(printer_id: int, db: Session = Depends(get_db)):
    """Get webcam info from printer"""
    printer = db.get(Printer, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    # First return stored webcam URL if available
    if printer.webcam_url:
        return {
            "url": printer.webcam_url,
            "stream_url": printer.webcam_url,
            "name": "Webcam",
            "enabled": True,
            "source": "stored"
        }

    # Try to get from Klipper/Moonraker
    if printer.printer_type != "klipper":
        return {"url": "", "stream_url": "", "name": "Webcam", "enabled": False, "source": "none"}

    api_key = encryption.decrypt(printer.api_key) if printer.api_key else None

    try:
        adapter = KlipperAdapter(printer.host, printer.port, api_key)
        webcam_info = await adapter.get_webcam_info()
        webcam_info["source"] = "printer"
        return webcam_info
    except Exception as e:
        return {"url": "", "stream_url": "", "name": "Webcam", "enabled": False, "source": "error", "error": str(e)}
