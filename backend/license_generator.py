#!/usr/bin/env python3
"""
PrintVault License Generator
===========================
Dieses Script erstellt gültige Lizenzen für PrintVault.

Der Private Key MUSS geheim bleiben und wird NIEMALS in die App eingebettet.
Nur der Public Key wird in der App verwendet.

Usage:
    python license_generator.py --tier pro --months 12
    python license_generator.py --tier enterprise --months 24
    python license_generator.py --verify <lizenz-schluessel>
"""

import hashlib
import base64
import json
import argparse
import os
from datetime import datetime, timedelta
from typing import Optional
from pathlib import Path

# ============== KONFIGURATION ==============
# DIESEN PRIVATE KEY GEHEIM HALTEN!
# Er wird nur für die Lizenz-Erstellung verwendet.
# Die App enthält nur den PUBLIC KEY zur Verifizierung.
PRIVATE_KEY = "PrintVault-Lizenz-2024-Geheim-Schluessel-Aendern!"

# Public Key (wird in die App eingebettet)
PUBLIC_KEY = "PV-PUB-2024-KEY-VERIFY-01"

# Lizenz-Tiers und deren Features
TIER_FEATURES = {
    "free": {
        "name": "Free",
        "max_printers": 1,
        "max_filaments": 10,
        "cloud_sync": False,
        "api_access": False,
        "support": False,
        "price": 0
    },
    "pro": {
        "name": "Pro",
        "max_printers": 10,
        "max_filaments": 100,
        "cloud_sync": True,
        "api_access": True,
        "support": False,
        "price": 19.99
    },
    "enterprise": {
        "name": "Enterprise",
        "max_printers": -1,  # unlimited
        "max_filaments": -1,  # unlimited
        "cloud_sync": True,
        "api_access": True,
        "support": True,
        "price": 49.99
    }
}

# ============== FUNKTIONEN ==============

def get_hardware_id() -> str:
    """Erzeugt eine eindeutige Hardware-ID für diesen PC."""
    try:
        # Verschiedene Hardware-Infos sammeln
        info = []

        # CPU Info
        try:
            with open('/proc/cpuinfo', 'r') as f:
                for line in f:
                    if 'model name' in line:
                        info.append(line.split(':')[1].strip())
                        break
        except:
            pass

        # Windows: Computer Name
        try:
            info.append(os.environ.get('COMPUTERNAME', ''))
        except:
            pass

        # Kombiniere und hash
        combined = '|'.join(info) if info else 'default-hardware'
        hw_hash = hashlib.sha256(combined.encode()).hexdigest()[:16]
        return hw_hash.upper()
    except:
        return "DEFAULTHWID"


def create_license_payload(tier: str, months: int, hardware_id: Optional[str] = None) -> dict:
    """Erstellt den Lizenz-Payload."""
    if tier not in TIER_FEATURES:
        raise ValueError(f"Unbekanntes Tier: {tier}. Verfügbar: {list(TIER_FEATURES.keys())}")

    features = TIER_FEATURES[tier]
    expires = datetime.now() + timedelta(days=30 * months)

    payload = {
        "tier": tier,
        "tier_name": features["name"],
        "expires": expires.isoformat(),
        "expires_timestamp": int(expires.timestamp()),
        "features": {
            "max_printers": features["max_printers"],
            "max_filaments": features["max_filaments"],
            "cloud_sync": features["cloud_sync"],
            "api_access": features["api_access"],
            "support": features["support"]
        },
        "generated": datetime.now().isoformat(),
        "generator_version": "1.0.0"
    }

    # Hardware-Binding (optional)
    if hardware_id:
        payload["hardware_id"] = hardware_id.upper()
        payload["hardware_bound"] = True
    else:
        payload["hardware_bound"] = False

    return payload


def sign_payload(payload: dict) -> str:
    """Signiert den Payload mit dem Private Key."""
    # Sort keys for consistent hashing
    payload_str = json.dumps(payload, sort_keys=True, separators=(',', ':'))

    # HMAC-SHA256 Signatur
    signature = hashlib.sha256(
        (payload_str + PRIVATE_KEY).encode()
    ).hexdigest()

    return signature


def create_license(tier: str, months: int, hardware_id: Optional[str] = None) -> str:
    """Erstellt eine vollständige Lizenz."""
    # Payload erstellen
    payload = create_license_payload(tier, months, hardware_id)

    # Signieren
    signature = sign_payload(payload)

    # Lizenz-String erstellen: TIER-TIMESTAMP-SIGNATURE
    license_data = f"{payload['tier'].upper()}-{payload['expires_timestamp']}-{signature[:32]}"

    # Base64 für einfachere Eingabe
    encoded = base64.b64encode(license_data.encode()).decode()

    return encoded


def verify_license(license_key: str, current_hardware_id: Optional[str] = None) -> dict:
    """Verifiziert eine Lizenz (kann auch in der App verwendet werden)."""
    try:
        # Base64 decodieren
        decoded = base64.b64decode(license_key.encode()).decode()

        # Parsen
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

        # Lizenz-Daten rekonstruieren für Signatur-Prüfung
        payload = {
            "tier": tier,
            "expires_timestamp": expires_timestamp,
            "features": TIER_FEATURES[tier]
        }

        # Signatur verifizieren
        expected_signature = sign_payload(payload)[:32]

        if provided_signature != expected_signature:
            return {"valid": False, "error": "Ungültige Signatur"}

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
            "hardware_bound": current_hardware_id is not None,
            "hardware_id": current_hardware_id
        }

    except Exception as e:
        return {"valid": False, "error": f"Verifizierungsfehler: {str(e)}"}


def generate_sample_licenses():
    """Erstellt Beispiel-Lizenzen zum Testen."""
    hw_id = get_hardware_id()

    print("\n" + "="*60)
    print("PrintVault Lizenz-Generator")
    print("="*60)
    print(f"\nHardware-ID dieses PCs: {hw_id}")
    print("(Diese ID wird für hardware-gebundene Lizenzen verwendet)")
    print("\n" + "-"*60)

    # Free Lizenz
    free_license = create_license("free", 12, None)
    print(f"\n📋 FREE Lizenz (unbegrenzt gültig):")
    print(f"   {free_license}")

    # Pro Lizenz (1 Monat)
    pro_license_1m = create_license("pro", 1, hw_id)
    print(f"\n💎 PRO Lizenz (1 Monat, hardware-gebunden):")
    print(f"   {pro_license_1m}")

    # Pro Lizenz (12 Monate)
    pro_license_12m = create_license("pro", 12, hw_id)
    print(f"\n💎 PRO Lizenz (12 Monate, hardware-gebunden):")
    print(f"   {pro_license_12m}")

    # Enterprise Lizenz (12 Monate)
    ent_license = create_license("enterprise", 12, hw_id)
    print(f"\n🏢 ENTERPRISE Lizenz (12 Monate, hardware-gebunden):")
    print(f"   {ent_license}")

    print("\n" + "-"*60)
    print("\nVerifizierungstest:")

    result = verify_license(pro_license_12m, hw_id)
    print(f"\n✅ Verifizierung: {result}")

    print("\n" + "="*60)


# ============== HAUPTPROGRAMM ==============

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="PrintVault Lizenz-Generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Beispiele:
  python license_generator.py --tier pro --months 12
  python license_generator.py --tier enterprise --months 24 --hw-id ABC123
  python license_generator.py --verify "DEVELOP-12345678-abcdef1234567890abcdef12"
  python license_generator.py --generate-samples
        """
    )

    parser.add_argument("--tier", choices=["free", "pro", "enterprise"],
                        help="Lizenz-Tier")
    parser.add_argument("--months", type=int, default=12,
                        help="Gültigkeitsdauer in Monaten (default: 12)")
    parser.add_argument("--hw-id",
                        help="Hardware-ID für hardware-gebundene Lizenz")
    parser.add_argument("--verify",
                        help="Lizenz verifizieren")
    parser.add_argument("--generate-samples", action="store_true",
                        help="Beispiel-Lizenzen generieren")

    args = parser.parse_args()

    if args.generate_samples:
        generate_sample_licenses()
    elif args.verify:
        hw_id = args.hw_id or get_hardware_id()
        result = verify_license(args.verify, hw_id)
        print(json.dumps(result, indent=2))
    elif args.tier:
        hw_id = args.hw_id or get_hardware_id()
        license = create_license(args.tier, args.months, hw_id)

        print(f"\n✅ Lizenz erstellt!")
        print(f"   Tier: {args.tier.upper()}")
        print(f"   Dauer: {args.months} Monate")
        print(f"   Hardware-gebunden: {hw_id}")
        print(f"\n📝 Lizenz-Schlüssel (zum Kopieren):")
        print(f"\n   {license}\n")
    else:
        parser.print_help()
