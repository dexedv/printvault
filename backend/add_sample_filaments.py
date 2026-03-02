#!/usr/bin/env python3
"""Add sample filaments to the database"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime
from db.session import get_db
from db.models import Filament

# Sample filament data with different manufacturers, materials, colors
FILAMENTS = [
    # PLA filaments
    {"material": "PLA", "color_name": "Weiß", "color_hex": "#FFFFFF", "vendor": "Prusament", "total_weight_kg": 1.0, "remaining_weight_kg": 0.85},
    {"material": "PLA", "color_name": "Schwarz", "color_hex": "#000000", "vendor": "Prusament", "total_weight_kg": 1.0, "remaining_weight_kg": 0.72},
    {"material": "PLA", "color_name": "Fire Orange", "color_hex": "#FF6B35", "vendor": "Prusament", "total_weight_kg": 1.0, "remaining_weight_kg": 0.65},
    {"material": "PLA", "color_name": "Galaxy Purple", "color_hex": "#6B5B95", "vendor": "Hatchbox", "total_weight_kg": 1.0, "remaining_weight_kg": 0.9},
    {"material": "PLA", "color_name": "Midnight Blue", "color_hex": "#1B365D", "vendor": "Hatchbox", "total_weight_kg": 1.0, "remaining_weight_kg": 0.55},
    {"material": "PLA", "color_name": "Forest Green", "color_hex": "#228B22", "vendor": "eSun", "total_weight_kg": 1.0, "remaining_weight_kg": 0.4},
    {"material": "PLA", "color_name": "Polar White", "color_hex": "#F5F5F5", "vendor": "eSun", "total_weight_kg": 1.0, "remaining_weight_kg": 0.78},
    {"material": "PLA", "color_name": "Candy Red", "color_hex": "#D90429", "vendor": "Sunlu", "total_weight_kg": 1.0, "remaining_weight_kg": 0.62},

    # PETG filaments
    {"material": "PETG", "color_name": "Transparent", "color_hex": "#E8F1F2", "vendor": "Prusament", "total_weight_kg": 1.0, "remaining_weight_kg": 0.88},
    {"material": "PETG", "color_name": "Urban Grey", "color_hex": "#808080", "vendor": "Prusament", "total_weight_kg": 1.0, "remaining_weight_kg": 0.45},
    {"material": "PETG", "color_name": "Signal Orange", "color_hex": "#FE7F2D", "vendor": "Hatchbox", "total_weight_kg": 1.0, "remaining_weight_kg": 0.7},
    {"material": "PETG", "color_name": "Deep Sea Blue", "color_hex": "#006994", "vendor": "Hatchbox", "total_weight_kg": 1.0, "remaining_weight_kg": 0.33},
    {"material": "PETG", "color_name": "Traffic Yellow", "color_hex": "#F7D716", "vendor": "eSun", "total_weight_kg": 1.0, "remaining_weight_kg": 0.56},
    {"material": "PETG", "color_name": "Olive Green", "color_hex": "#6B8E23", "vendor": "eSun", "total_weight_kg": 1.0, "remaining_weight_kg": 0.42},
    {"material": "PETG", "color_name": "Magenta", "color_hex": "#CA1F7B", "vendor": "Sunlu", "total_weight_kg": 1.0, "remaining_weight_kg": 0.68},
    {"material": "PETG", "color_name": "Pearl Grey", "color_hex": "#B0B7C6", "vendor": "Sunlu", "total_weight_kg": 1.0, "remaining_weight_kg": 0.21},

    # ABS filaments
    {"material": "ABS", "color_name": "Weiß", "color_hex": "#FFFFFF", "vendor": "Prusament", "total_weight_kg": 1.0, "remaining_weight_kg": 0.6},
    {"material": "ABS", "color_name": "Schwarz", "color_hex": "#000000", "vendor": "Prusament", "total_weight_kg": 1.0, "remaining_weight_kg": 0.48},
    {"material": "ABS", "color_name": "Rot", "color_hex": "#CC0000", "vendor": "Hatchbox", "total_weight_kg": 1.0, "remaining_weight_kg": 0.75},
    {"material": "ABS", "color_name": "Blau", "color_hex": "#0033CC", "vendor": "Hatchbox", "total_weight_kg": 1.0, "remaining_weight_kg": 0.52},
    {"material": "ABS", "color_name": "Lemon Yellow", "color_hex": "#FFF44F", "vendor": "eSun", "total_weight_kg": 1.0, "remaining_weight_kg": 0.39},
    {"material": "ABS", "color_name": "Natur", "color_hex": "#F5F5DC", "vendor": "eSun", "total_weight_kg": 1.0, "remaining_weight_kg": 0.27},

    # TPU filaments
    {"material": "TPU", "color_name": "Schwarz", "color_hex": "#1A1A1A", "vendor": "Prusament", "total_weight_kg": 0.5, "remaining_weight_kg": 0.42},
    {"material": "TPU", "color_name": "Weiß", "color_hex": "#FFFFFF", "vendor": "Prusament", "total_weight_kg": 0.5, "remaining_weight_kg": 0.35},
    {"material": "TPU", "color_name": "Rot", "color_hex": "#E63946", "vendor": "eSun", "total_weight_kg": 0.5, "remaining_weight_kg": 0.28},
    {"material": "TPU", "color_name": "Blau", "color_hex": "#457B9D", "vendor": "eSun", "total_weight_kg": 0.5, "remaining_weight_kg": 0.15},
    {"material": "TPU", "color_name": "Orange", "color_hex": "#F77F00", "vendor": "Sunlu", "total_weight_kg": 0.5, "remaining_weight_kg": 0.4},
    {"material": "TPU", "color_name": "Lime Green", "color_hex": "#80B918", "vendor": "Sunlu", "total_weight_kg": 0.5, "remaining_weight_kg": 0.22},

    # ASA filaments
    {"material": "ASA", "color_name": "Weiß", "color_hex": "#FFFFFF", "vendor": "Prusament", "total_weight_kg": 1.0, "remaining_weight_kg": 0.82},
    {"material": "ASA", "color_name": "Schwarz", "color_hex": "#000000", "vendor": "Prusament", "total_weight_kg": 1.0, "remaining_weight_kg": 0.7},
    {"material": "ASA", "color_name": "Grau", "color_hex": "#6C757D", "vendor": "Hatchbox", "total_weight_kg": 1.0, "remaining_weight_kg": 0.55},
    {"material": "ASA", "color_name": "Beige", "color_hex": "#F5F5DC", "vendor": "Hatchbox", "total_weight_kg": 1.0, "remaining_weight_kg": 0.38},
    {"material": "ASA", "color_name": "Ivory", "color_hex": "#FFFFF0", "vendor": "eSun", "total_weight_kg": 1.0, "remaining_weight_kg": 0.25},

    # PC (Polycarbonate) filaments
    {"material": "PC", "color_name": "Transparent", "color_hex": "#D4E5ED", "vendor": "Prusament", "total_weight_kg": 0.75, "remaining_weight_kg": 0.6},
    {"material": "PC", "color_name": "Smoked Black", "color_hex": "#2B2B2B", "vendor": "Prusament", "total_weight_kg": 0.75, "remaining_weight_kg": 0.45},
    {"material": "PC", "color_name": "Clear", "color_hex": "#F0F8FF", "vendor": "eSun", "total_weight_kg": 0.75, "remaining_weight_kg": 0.32},
    {"material": "PC", "color_name": "Red Tint", "color_hex": "#C41E3A", "vendor": "eSun", "total_weight_kg": 0.75, "remaining_weight_kg": 0.18},

    # PA (Nylon) filaments
    {"material": "PA", "color_name": "Natur", "color_hex": "#EADDCA", "vendor": "Prusament", "total_weight_kg": 0.75, "remaining_weight_kg": 0.55},
    {"material": "PA", "color_name": "Schwarz", "color_hex": "#1A1A1A", "vendor": "Prusament", "total_weight_kg": 0.75, "remaining_weight_kg": 0.4},
    {"material": "PA", "color_name": "Grau", "color_hex": "#708090", "vendor": "Hatchbox", "total_weight_kg": 0.75, "remaining_weight_kg": 0.28},
    {"material": "PA", "color_name": "Weiß", "color_hex": "#F5F5F5", "vendor": "eSun", "total_weight_kg": 0.75, "remaining_weight_kg": 0.15},

    # PVB filaments
    {"material": "PVB", "color_name": "Transparent", "color_hex": "#F8F8FF", "vendor": "Prusament", "total_weight_kg": 1.0, "remaining_weight_kg": 0.75},
    {"material": "PVB", "color_name": "Orange Clear", "color_hex": "#FF8C00", "vendor": "eSun", "total_weight_kg": 1.0, "remaining_weight_kg": 0.58},
    {"material": "PVB", "color_name": "Blue Clear", "color_hex": "#4682B4", "vendor": "eSun", "total_weight_kg": 1.0, "remaining_weight_kg": 0.35},

    # PP (Polypropylene) filaments
    {"material": "PP", "color_name": "Natural", "color_hex": "#FAF0E6", "vendor": "Prusament", "total_weight_kg": 0.5, "remaining_weight_kg": 0.42},
    {"material": "PP", "color_name": "Weiß", "color_hex": "#FFFFFF", "vendor": "eSun", "total_weight_kg": 0.5, "remaining_weight_kg": 0.3},
    {"material": "PP", "color_name": "Schwarz", "color_hex": "#000000", "vendor": "eSun", "total_weight_kg": 0.5, "remaining_weight_kg": 0.22},

    # PEI (Ultem) filaments
    {"material": "PEI", "color_name": "Amber", "color_hex": "#FFBF00", "vendor": "Prusament", "total_weight_kg": 0.5, "remaining_weight_kg": 0.4},
    {"material": "PEI", "color_name": "Schwarz", "color_hex": "#000000", "vendor": "Prusament", "total_weight_kg": 0.5, "remaining_weight_kg": 0.35},
    {"material": "PEI", "color_name": "Natural", "color_hex": "#D4A574", "vendor": "eSun", "total_weight_kg": 0.5, "remaining_weight_kg": 0.28},
    {"material": "PEI", "color_name": "Grau", "color_hex": "#808080", "vendor": "eSun", "total_weight_kg": 0.5, "remaining_weight_kg": 0.12},
]

def add_filaments():
    db = next(get_db())

    # Delete existing filaments
    db.query(Filament).delete()
    db.commit()
    print(f"Deleted existing filaments.")

    print(f"Adding {len(FILAMENTS)} filaments...")

    for data in FILAMENTS:
        filament = Filament(
            material=data["material"],
            color_name=data["color_name"],
            color_hex=data["color_hex"],
            vendor=data["vendor"],
            total_weight_kg=data["total_weight_kg"],
            remaining_weight_kg=data["remaining_weight_kg"],
            low_stock_threshold=0.1,
            created_at=datetime.utcnow(),
        )
        db.add(filament)

    db.commit()
    print(f"Successfully added {len(FILAMENTS)} filaments!")

    # Print summary by material
    print("\nSummary by material:")
    for material in ["PLA", "PETG", "ABS", "TPU", "ASA", "PC", "PA", "PVB", "PP", "PEI"]:
        count = len([f for f in FILAMENTS if f["material"] == material])
        print(f"  {material}: {count}")

    # Print summary by vendor
    print("\nSummary by vendor:")
    vendors = {}
    for f in FILAMENTS:
        vendors[f["vendor"]] = vendors.get(f["vendor"], 0) + 1
    for vendor, count in sorted(vendors.items()):
        print(f"  {vendor}: {count}")

if __name__ == "__main__":
    add_filaments()
