"""
System API routes - logs, diagnostics
"""
from fastapi import APIRouter
from utils.logger import get_log_content, clear_logs

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/logs")
def get_logs():
    """Get all log content"""
    return {"logs": get_log_content()}


@router.post("/logs/clear")
def clear_system_logs():
    """Clear log file"""
    clear_logs()
    return {"message": "Logs cleared"}


@router.get("/info")
def get_system_info():
    """Get system information"""
    import platform
    import sys

    return {
        "platform": platform.platform(),
        "python_version": sys.version,
        "architecture": platform.architecture(),
    }
