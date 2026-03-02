"""
PrintVault License API
=====================
Verifiziert Lizenzen und verwaltet Lizenz-Status.
"""

import hashlib
import base64
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import platform

router = APIRouter(prefix="/license")

# ============== KONFIGURATION ==============

# Public Key (muss mit dem Private Key im Generator übereinstimmen)
# Dieser Key wird verwendet um die Signatur zu verifizieren
PUBLIC_KEY = "PV-PUB-2024-KEY-VERIFY-01"

# Lizenz-Datei Pfad
LICENSE_FILE = Path(__file__).parent.parent / "data" / "license.json"

# Tier-Konfiguration
TIER_FEATURES = {
    "free": {
        "name": "Free",
        "max_files": 10,
        "max_projects": 2,
        "max_printers": 1,
        "max_filaments": 5,
        "max_customers": 5,
        "max_orders": 3,
        "cloud_sync": False,
        "api_access": False,
        "support": False,
        "price": 0
    },
    "pro": {
        "name": "Pro",
        "max_files": -1,
        "max_projects": -1,
        "max_printers": -1,
        "max_filaments": -1,
        "max_customers": -1,
        "max_orders": -1,
        "cloud_sync": True,
        "api_access": True,
        "support": True,
        "price": 29.99
    },
}

# Geheimer Key für Signatur (MUSS geheim bleiben!)
# Dieser wird für die Verifizierung verwendet
VERIFY_KEY = "PrintVault-Lizenz-2024-Geheim-Schluessel-Aendern!"


# ============== MODELLE ==============

class LicenseVerifyRequest(BaseModel):
    license_key: str


class LicenseResponse(BaseModel):
    valid: bool
    tier: Optional[str] = None
    tier_name: Optional[str] = None
    expires: Optional[str] = None
    features: Optional[dict] = None
    hardware_bound: bool = False
    error: Optional[str] = None


class LicenseStatusResponse(BaseModel):
    installed: bool
    valid: bool
    tier: Optional[str] = None
    tier_name: Optional[str] = None
    expires: Optional[str] = None
    features: Optional[dict] = None
    hardware_id: Optional[str] = None


# ============== FUNKTIONEN ==============

def get_hardware_id() -> str:
    """Erzeugt eine eindeutige Hardware-ID für diesen PC."""
    try:
        info = []

        # System-Plattform
        info.append(platform.system())
        info.append(platform.node())

        # CPU
        try:
            info.append(platform.processor())
        except:
            pass

        combined = '|'.join(info)
        hw_hash = hashlib.sha256(combined.encode()).hexdigest()[:16]
        return hw_hash.upper()
    except:
        return "DEFAULTHWID"


def load_license() -> Optional[dict]:
    """Lädt die gespeicherte Lizenz."""
    if not LICENSE_FILE.exists():
        return None

    try:
        with open(LICENSE_FILE, 'r') as f:
            return json.load(f)
    except:
        return None


def save_license(license_data: dict):
    """Speichert die Lizenz."""
    LICENSE_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(LICENSE_FILE, 'w') as f:
        json.dump(license_data, f, indent=2)


def verify_license_signature(license_key: str) -> dict:
    """Verifiziert eine Lizenz (ohne Hardware-Binding zu prüfen)."""
    try:
        # Base64 decodieren
        decoded = base64.b64decode(license_key.encode()).decode()

        # Parsen: TIER-TIMESTAMP-SIGNATURE
        parts = decoded.split('-')
        if len(parts) < 3:
            return {"valid": False, "error": "Ungültiges Lizenzformat"}

        tier = parts[0].lower()
        expires_timestamp = int(parts[1])
        provided_signature = parts[2]

        # Tier prüfen
        if tier not in TIER_FEATURES:
            return {"valid": False, "error": f"Unbekanntes Tier: {tier}"}

        # Ablaufdatum prüfen
        if datetime.now().timestamp() > expires_timestamp:
            return {
                "valid": False,
                "error": "Lizenz abgelaufen",
                "expired": True
            }

        # Signatur verifizieren
        payload_str = json.dumps({
            "tier": tier,
            "expires_timestamp": expires_timestamp,
            "features": TIER_FEATURES[tier]
        }, sort_keys=True, separators=(',', ':'))

        expected_signature = hashlib.sha256(
            (payload_str + VERIFY_KEY).encode()
        ).hexdigest()[:32]

        if provided_signature != expected_signature:
            return {"valid": False, "error": "Ungültige Signatur - Lizenz konnte nicht verifiziert werden"}

        # Erfolgreich!
        features = TIER_FEATURES[tier]
        expires = datetime.fromtimestamp(expires_timestamp)

        return {
            "valid": True,
            "tier": tier,
            "tier_name": features["name"],
            "expires": expires.strftime("%d.%m.%Y"),
            "expires_timestamp": expires_timestamp,
            "features": features,
            "license_key": license_key
        }

    except Exception as e:
        return {"valid": False, "error": f"Verifizierungsfehler: {str(e)}"}


def check_limit(resource: str, current_count: int) -> dict:
    """
    Prüft ob das Limit für eine Ressource erreicht ist.
    Gibt {'allowed': True} zurück wenn OK, sonst {'allowed': False, 'error': ...}
    """
    license_data = load_license()

    # Default Free License
    if not license_data:
        tier = "free"
    else:
        result = verify_license_signature(license_data.get("license_key", ""))
        if not result.get("valid"):
            return {"allowed": False, "error": "Lizenz ungültig", "tier": "unknown"}
        tier = result.get("tier", "free")

    features = TIER_FEATURES.get(tier, TIER_FEATURES["free"])
    limit_key = f"max_{resource}"

    if limit_key not in features:
        return {"allowed": True, "tier": tier}  # Kein Limit für diese Ressource

    limit = features[limit_key]

    # -1 means unlimited
    if limit == -1:
        return {"allowed": True, "tier": tier, "limit": "unlimited"}

    if current_count >= limit:
        return {
            "allowed": False,
            "error": f"Limit erreicht! Du hast bereits {current_count} von maximal {limit} {resource}. Upgrade auf Pro für unbegrenzte Nutzung.",
            "tier": tier,
            "current": current_count,
            "limit": limit
        }

    return {"allowed": True, "tier": tier, "current": current_count, "limit": limit}


# ============== ROUTES ==============

@router.get("/status", response_model=LicenseStatusResponse)
async def get_license_status():
    """Gibt den aktuellen Lizenz-Status zurück."""
    license_data = load_license()

    # Wenn keine Lizenz installiert ist, wird Free automatisch verwendet
    if not license_data:
        return LicenseStatusResponse(
            installed=False,
            valid=True,
            tier="free",
            tier_name="Free",
            expires="Unbegrenzt",
            features=TIER_FEATURES["free"],
            hardware_id=get_hardware_id()
        )

    # Lizenz verifizieren
    hw_id = get_hardware_id()
    result = verify_license_signature(license_data.get("license_key", ""))

    if not result.get("valid"):
        return LicenseStatusResponse(
            installed=True,
            valid=False,
            error=result.get("error")
        )

    # Hardware-Binding prüfen wenn aktiviert
    if license_data.get("hardware_bound") and license_data.get("hardware_id"):
        if license_data["hardware_id"] != hw_id:
            return LicenseStatusResponse(
                installed=True,
                valid=False,
                error="Lizenz ist an einen anderen PC gebunden"
            )

    return LicenseStatusResponse(
        installed=True,
        valid=True,
        tier=result.get("tier"),
        tier_name=result.get("tier_name"),
        expires=result.get("expires"),
        features=result.get("features"),
        hardware_id=hw_id
    )


@router.post("/verify", response_model=LicenseResponse)
async def verify_license(request: LicenseVerifyRequest):
    """Verifiziert einen Lizenz-Schlüssel."""
    result = verify_license_signature(request.license_key)

    if not result.get("valid"):
        return LicenseResponse(
            valid=False,
            error=result.get("error", "Ungültige Lizenz")
        )

    return LicenseResponse(
        valid=True,
        tier=result.get("tier"),
        tier_name=result.get("tier_name"),
        expires=result.get("expires"),
        features=result.get("features"),
        hardware_bound=result.get("license_key", "") != ""
    )


@router.post("/activate")
async def activate_license(request: LicenseVerifyRequest):
    """Aktiviert eine Lizenz und speichert sie."""
    # Verifizieren
    result = verify_license_signature(request.license_key)

    if not result.get("valid"):
        raise HTTPException(status_code=400, detail=result.get("error", "Ungültige Lizenz"))

    hw_id = get_hardware_id()

    # Lizenz speichern
    license_data = {
        "license_key": request.license_key,
        "tier": result.get("tier"),
        "tier_name": result.get("tier_name"),
        "expires": result.get("expires"),
        "features": result.get("features"),
        "activated": datetime.now().isoformat(),
        "hardware_id": hw_id,
        "hardware_bound": True
    }

    save_license(license_data)

    return {
        "success": True,
        "message": f"Lizenz erfolgreich aktiviert!",
        "tier": result.get("tier_name"),
        "expires": result.get("expires")
    }


@router.post("/deactivate")
async def deactivate_license():
    """Deaktiviert die aktuelle Lizenz."""
    if LICENSE_FILE.exists():
        LICENSE_FILE.unlink()

    return {
        "success": True,
        "message": "Lizenz deaktiviert"
    }


@router.get("/features")
async def get_features():
    """Gibt die verfügbaren Features pro Tier zurück."""
    return {
        "tiers": TIER_FEATURES,
        "current_hardware_id": get_hardware_id()
    }
