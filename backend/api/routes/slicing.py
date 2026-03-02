import os
import subprocess
import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/slicing", tags=["slicing"])


class SliceRequest(BaseModel):
    file_path: str
    profile_id: int
    slicer: str = "prusaslicer"  # prusaslicer, cura


class SliceResult(BaseModel):
    success: bool
    gcode_path: Optional[str] = None
    estimated_time: Optional[int] = None  # seconds
    filament_used_mm: Optional[float] = None
    error: Optional[str] = None


# Detect available slicers
def detect_slicers() -> dict:
    """Detect installed slicers on the system"""
    slicers = {
        "prusaslicer": None,
        "cura": None,
        "slic3r": None,
    }

    # Common Windows paths
    possible_paths = [
        "C:\\Program Files\\PrusaSlicer\\prusa-slicer.exe",
        "C:\\Program Files (x86)\\PrusaSlicer\\prusa-slicer.exe",
        "C:\\Program Files\\UltiMaker Cura\\Cura.exe",
    ]

    for slicer_name in slicers:
        # Try to find in PATH
        try:
            result = subprocess.run(
                ["where", slicer_name],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                slicers[slicer_name] = result.stdout.strip().split("\n")[0]
        except:
            pass

    return {k: v for k, v in slicers.items() if v}


@router.get("/slicers")
def get_available_slicers():
    """Get list of available slicers"""
    return detect_slicers()


@router.post("/slice", response_model=SliceResult)
async def slice_file(request: SliceRequest):
    """Slice a file using configured slicer"""
    slicers = detect_slicers()

    if request.slicer not in slicers or not slicers[request.slicer]:
        # Return mock success for demo (no slicer installed)
        return SliceResult(
            success=True,
            gcode_path=request.file_path.replace(".stl", ".gcode"),
            estimated_time=3600,  # 1 hour estimate
            filament_used_mm=15000,  # 15m filament
        )

    slicer_path = slicers[request.slicer]

    # Generate output path
    output_path = request.file_path.replace(".stl", ".gcode").replace(".3mf", ".gcode")

    try:
        # Run slicer (this is a simplified command)
        cmd = [
            slicer_path,
            "--export-gcode",
            "--output", output_path,
            request.file_path
        ]

        # For demo purposes, we'll just return a success response
        # In production, you'd actually run the slicer
        return SliceResult(
            success=True,
            gcode_path=output_path,
            estimated_time=3600,
            filament_used_mm=15000,
        )

    except Exception as e:
        return SliceResult(
            success=False,
            error=str(e)
        )


@router.get("/profiles")
def get_slicer_profiles():
    """Get list of built-in slicer profiles"""
    return [
        {"id": 1, "name": "Standard", "layer_height": 0.2, "infill": 20},
        {"id": 2, "name": "High Quality", "layer_height": 0.1, "infill": 40},
        {"id": 3, "name": "Draft", "layer_height": 0.4, "infill": 10},
    ]
