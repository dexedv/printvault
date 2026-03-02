import json
import os
from typing import List, Dict, Any, Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Extensions directory
EXTENSIONS_DIR = Path(__file__).parent.parent / "extensions"

router = APIRouter(prefix="/extensions", tags=["extensions"])


# Extension state management
class ExtensionManager:
    """Manages enabled/disabled state of extensions"""

    def __init__(self):
        self._enabled_extensions: Dict[str, bool] = {}

    def enable(self, ext_id: str) -> bool:
        self._enabled_extensions[ext_id] = True
        return True

    def disable(self, ext_id: str) -> bool:
        self._enabled_extensions[ext_id] = False
        return True

    def is_enabled(self, ext_id: str) -> bool:
        return self._enabled_extensions.get(ext_id, False)

    def get_enabled(self) -> List[str]:
        return [k for k, v in self._enabled_extensions.items() if v]


# Global extension manager
extension_manager = ExtensionManager()


# Built-in extension definitions
BUILTIN_EXTENSIONS = [
    {
        "id": "octoprint",
        "name": "OctoPrint Support",
        "description": "Connect to OctoPrint servers for monitoring and control",
        "version": "1.0.0",
        "enabled": False,
        "has_config": True,
        "config_fields": ["host", "api_key", "port"],
    },
    {
        "id": "bambulab",
        "name": "Bambu Lab Support",
        "description": "Connect to Bambu Lab printers via MQTT",
        "version": "1.0.0",
        "enabled": False,
        "has_config": True,
        "config_fields": ["host", "serial", "access_code", "region"],
    },
    {
        "id": "timelapse",
        "name": "Timelapse Creator",
        "description": "Create timelapse videos from print photos",
        "version": "1.0.0",
        "enabled": False,
        "has_config": True,
        "config_fields": ["frame_interval", "fps", "resolution"],
    },
    {
        "id": "cloudprint",
        "name": "Cloud Print",
        "description": "Print files directly to cloud-connected printers",
        "version": "1.0.0",
        "enabled": False,
        "has_config": True,
        "config_fields": ["provider", "api_key"],
    },
]


# Pydantic models for request bodies
class OctoPrintServerCreate(BaseModel):
    name: str
    host: str
    api_key: str
    port: int = 80


class BambuPrinterCreate(BaseModel):
    name: str
    host: str
    serial: str
    access_code: str
    region: str = "global"


class TimelapseConfig(BaseModel):
    name: str
    frame_interval: int = 5
    fps: int = 30
    resolution: str = "1920x1080"


class CloudPrintConfig(BaseModel):
    provider: str
    api_key: str


# In-memory storage for extension configurations
_octoprint_servers: Dict[str, Dict[str, Any]] = {}
_bambu_printers: Dict[str, Dict[str, Any]] = {}
_timelapse_configs: Dict[str, Dict[str, Any]] = {}
_cloud_configs: Dict[str, Dict[str, Any]] = {}


# API Routes - Extensions List
@router.get("", response_model=List[Dict[str, Any]])
def list_extensions():
    """Get list of all available extensions"""
    # Return extensions with their current enabled state
    result = []
    for ext in BUILTIN_EXTENSIONS:
        ext_copy = ext.copy()
        ext_copy["enabled"] = extension_manager.is_enabled(ext["id"])
        result.append(ext_copy)
    return result


@router.get("/builtin")
def get_builtin_extensions():
    """Get list of built-in extensions"""
    return BUILTIN_EXTENSIONS


@router.get("/{extension_id}")
def get_extension(extension_id: str):
    """Get details of a specific extension"""
    for ext in BUILTIN_EXTENSIONS:
        if ext["id"] == extension_id:
            result = ext.copy()
            result["enabled"] = extension_manager.is_enabled(extension_id)
            return result
    raise HTTPException(status_code=404, detail="Extension not found")


@router.post("/{extension_id}/enable")
def enable_ext(extension_id: str):
    """Enable an extension"""
    for ext in BUILTIN_EXTENSIONS:
        if ext["id"] == extension_id:
            extension_manager.enable(extension_id)
            ext["enabled"] = True
            return {"success": True, "extension": ext}
    return {"success": False, "error": "Extension not found"}


@router.post("/{extension_id}/disable")
def disable_ext(extension_id: str):
    """Disable an extension"""
    for ext in BUILTIN_EXTENSIONS:
        if ext["id"] == extension_id:
            extension_manager.disable(extension_id)
            ext["enabled"] = False
            return {"success": True, "extension": ext}
    return {"success": False, "error": "Extension not found"}


# ==================== OctoPrint Extension Routes ====================

@router.get("/octoprint/servers")
def list_octoprint_servers():
    """List all configured OctoPrint servers"""
    return list(_octoprint_servers.values())


@router.post("/octoprint/servers")
def add_octoprint_server(server: OctoPrintServerCreate):
    """Add an OctoPrint server"""
    config = server.model_dump()
    config["added_at"] = json.dumps({"timestamp": "now"})
    _octoprint_servers[server.name] = config
    return {"success": True, "server": config}


@router.delete("/octoprint/servers/{server_name}")
def remove_octoprint_server(server_name: str):
    """Remove an OctoPrint server"""
    if server_name in _octoprint_servers:
        del _octoprint_servers[server_name]
        return {"success": True}
    return {"success": False, "error": "Server not found"}


@router.get("/octoprint/servers/{server_name}/status")
async def get_octoprint_status(server_name: str):
    """Get status of an OctoPrint server"""
    if server_name not in _octoprint_servers:
        raise HTTPException(status_code=404, detail="Server not found")

    server = _octoprint_servers[server_name]

    # Import and use the OctoPrint client
    try:
        from api.extensions.octoprint import OctoPrintClient
        client = OctoPrintClient(
            host=server["host"],
            api_key=server["api_key"],
            port=server.get("port", 80)
        )
        status = await client.get_printer_status()
        await client.close()
        return status
    except Exception as e:
        return {"error": str(e)}


# ==================== Bambu Lab Extension Routes ====================

@router.get("/bambulab/printers")
def list_bambu_printers():
    """List all configured Bambu Lab printers"""
    return list(_bambu_printers.values())


@router.post("/bambulab/printers")
def add_bambu_printer(printer: BambuPrinterCreate):
    """Add a Bambu Lab printer"""
    config = printer.model_dump()
    config["added_at"] = json.dumps({"timestamp": "now"})
    _bambu_printers[printer.name] = config
    return {"success": True, "printer": config}


@router.delete("/bambulab/printers/{printer_name}")
def remove_bambu_printer(printer_name: str):
    """Remove a Bambu Lab printer"""
    if printer_name in _bambu_printers:
        del _bambu_printers[printer_name]
        return {"success": True}
    return {"success": False, "error": "Printer not found"}


@router.get("/bambulab/printers/{printer_name}/status")
async def get_bambu_status(printer_name: str):
    """Get status of a Bambu Lab printer"""
    if printer_name not in _bambu_printers:
        raise HTTPException(status_code=404, detail="Printer not found")

    printer = _bambu_printers[printer_name]

    try:
        from api.extensions.bambulab import BambuClient
        client = BambuClient(
            host=printer["host"],
            serial=printer["serial"],
            access_code=printer["access_code"],
            region=printer.get("region", "global")
        )
        await client.connect()
        status = await client.get_status()
        await client.disconnect()
        return status
    except Exception as e:
        return {"error": str(e)}


# ==================== Timelapse Extension Routes ====================

@router.get("/timelapse/sessions")
def list_timelapse_sessions():
    """List all timelapse sessions"""
    # Return stored configs
    return list(_timelapse_configs.values())


@router.post("/timelapse/sessions")
def create_timelapse_session(config: TimelapseConfig):
    """Create a new timelapse session"""
    import uuid
    from datetime import datetime

    session_id = str(uuid.uuid4())
    session = {
        "session_id": session_id,
        "name": config.name,
        "frame_interval": config.frame_interval,
        "fps": config.fps,
        "resolution": config.resolution,
        "status": "active",
        "frame_count": 0,
        "created_at": datetime.utcnow().isoformat()
    }
    _timelapse_configs[session_id] = session
    return {"success": True, "session": session}


@router.get("/timelapse/sessions/{session_id}")
def get_timelapse_session(session_id: str):
    """Get timelapse session details"""
    if session_id not in _timelapse_configs:
        raise HTTPException(status_code=404, detail="Session not found")
    return _timelapse_configs[session_id]


@router.delete("/timelapse/sessions/{session_id}")
def delete_timelapse_session(session_id: str):
    """Delete a timelapse session"""
    if session_id in _timelapse_configs:
        del _timelapse_configs[session_id]
        return {"success": True}
    return {"success": False, "error": "Session not found"}


@router.post("/timelapse/sessions/{session_id}/render")
def render_timelapse(session_id: str):
    """Render a timelapse session to video"""
    if session_id not in _timelapse_configs:
        raise HTTPException(status_code=404, detail="Session not found")

    session = _timelapse_configs[session_id]
    # In a real implementation, this would call the timelapse manager
    return {
        "success": True,
        "session_id": session_id,
        "video_path": f"/storage/timelapses/timelapse_{session_id}.mp4",
        "message": "Rendering started"
    }


# ==================== Cloud Print Extension Routes ====================

@router.get("/cloudprint/configs")
def list_cloud_configs():
    """List all cloud print configurations"""
    return list(_cloud_configs.values())


@router.post("/cloudprint/configs")
def add_cloud_config(config: CloudPrintConfig):
    """Add a cloud print configuration"""
    config_data = config.model_dump()
    config_data["added_at"] = json.dumps({"timestamp": "now"})
    _cloud_configs[config.provider] = config_data
    return {"success": True, "config": config_data}


@router.delete("/cloudprint/configs/{provider}")
def remove_cloud_config(provider: str):
    """Remove a cloud print configuration"""
    if provider in _cloud_configs:
        del _cloud_configs[provider]
        return {"success": True}
    return {"success": False, "error": "Config not found"}


@router.get("/cloudprint/providers")
def list_cloud_providers():
    """List available cloud print providers"""
    return [
        {"id": "local", "name": "Local Network Print", "status": "available"},
        {"id": "octoprint", "name": "OctoPrint", "status": "available"},
    ]


@router.post("/cloudprint/print")
def send_to_cloud_print(
    file_path: str,
    printer_id: str,
    provider: str = "local"
):
    """Send a file to cloud print"""
    from datetime import datetime
    import uuid

    job_id = str(uuid.uuid4())
    job = {
        "job_id": job_id,
        "file_path": file_path,
        "printer_id": printer_id,
        "provider": provider,
        "status": "queued",
        "created_at": datetime.utcnow().isoformat()
    }

    return {
        "success": True,
        "job": job,
        "message": "Print job queued"
    }


@router.get("/cloudprint/jobs")
def list_print_jobs():
    """List all print jobs"""
    return []
