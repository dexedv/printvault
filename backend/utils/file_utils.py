import hashlib
import os
import uuid
import json
from pathlib import Path
from typing import Optional
from datetime import datetime
import trimesh
import numpy as np
from PIL import Image, ImageDraw, ImageFont


def calculate_file_hash(file_path: str) -> str:
    """Calculate SHA256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def extract_stl_metadata(file_path: str) -> dict:
    """Extract metadata from STL file using trimesh"""
    try:
        mesh = trimesh.load_mesh(file_path)

        # Get bounding box
        bounds = mesh.bounds
        bounding_box = {
            "min": bounds[0].tolist(),
            "max": bounds[1].tolist(),
            "dimensions": (bounds[1] - bounds[0]).tolist()
        }

        # Get volume and area
        volume = float(mesh.volume)
        area = float(mesh.area)

        # Get triangle count
        triangle_count = len(mesh.faces)

        # Calculate estimated print time and weight (rough estimates)
        # Assuming PLA density ~1.24 g/cm³
        volume_cm3 = volume / 1000  # mm³ to cm³
        weight_grams = volume_cm3 * 1.24

        return {
            "bounding_box": bounding_box,
            "volume_mm3": volume,
            "volume_cm3": volume_cm3,
            "area_mm2": area,
            "triangle_count": triangle_count,
            "estimated_weight_grams": round(weight_grams, 2),
            "centroid": mesh.centroid.tolist() if hasattr(mesh, 'centroid') else None
        }
    except Exception as e:
        return {"error": str(e)}


def generate_thumbnail(
    file_path: str,
    output_path: str,
    size: tuple[int, int] = (256, 256)
) -> bool:
    """Generate thumbnail for STL/3MF file using trimesh"""
    try:
        mesh = trimesh.load_mesh(file_path)

        # Get the scene with default lighting
        scene = mesh.scene()

        # Compute center and scale for camera
        center = mesh.centroid
        scale = np.max(np.abs(mesh.bounds)) / 2

        # Generate thumbnail using trimesh's built-in method
        png = scene.to_png()

        # Convert to PIL for resizing
        image = Image.open(png).convert("RGBA")

        # Resize
        image.thumbnail(size, Image.Resampling.LANCZOS)

        # Save
        image.save(output_path, "PNG")

        return True
    except Exception as e:
        print(f"Thumbnail generation failed: {e}")
        return False


def get_file_type(filename: str) -> str:
    """Get file type from extension"""
    ext = Path(filename).suffix.lower()
    type_map = {
        ".stl": "stl",
        ".3mf": "3mf",
        ".gcode": "gcode",
        ".gco": "gcode",
        ".nc": "gcode",
        ".step": "step",
        ".stp": "step"
    }
    return type_map.get(ext, "unknown")


def generate_unique_filename(original_name: str, storage_dir: Path) -> str:
    """Generate unique filename to avoid collisions"""
    ext = Path(original_name).suffix
    unique_name = f"{uuid.uuid4().hex}{ext}"
    while (storage_dir / unique_name).exists():
        unique_name = f"{uuid.uuid4().hex}{ext}"
    return unique_name


def get_file_size_mb(file_path: str) -> float:
    """Get file size in MB"""
    return os.path.getsize(file_path) / (1024 * 1024)


def format_timestamp(dt: Optional[datetime] = None) -> str:
    """Format datetime to ISO string"""
    if dt is None:
        dt = datetime.utcnow()
    return dt.isoformat()


def parse_timestamp(ts: str) -> datetime:
    """Parse ISO string to datetime"""
    return datetime.fromisoformat(ts)
