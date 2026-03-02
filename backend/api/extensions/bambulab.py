"""
Bambu Lab Extension - Connect to Bambu Lab printers via MQTT
"""
import json
import asyncio
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime


class BambuClient:
    """Client for interacting with Bambu Lab printers"""

    def __init__(
        self,
        host: str,
        serial: str,
        access_code: str,
        region: str = "global"
    ):
        self.host = host
        self.serial = serial
        self.access_code = access_code
        self.region = region
        self.connected = False
        self._callbacks: List[Callable] = []
        self._task: Optional[asyncio.Task] = None
        self._status: Dict[str, Any] = {}

    async def connect(self) -> Dict[str, Any]:
        """Connect to Bambu Lab printer"""
        try:
            # In a real implementation, this would use the Bambu MQTT protocol
            # For now, we'll simulate the connection
            self.connected = True
            return {
                "success": True,
                "serial": self.serial,
                "host": self.host
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def disconnect(self):
        """Disconnect from printer"""
        self.connected = False
        if self._task:
            self._task.cancel()

    async def get_status(self) -> Dict[str, Any]:
        """Get printer status"""
        if not self.connected:
            return {"error": "Not connected"}

        # Return simulated status
        return {
            "serial": self.serial,
            "mode": "LAN_MODE",
            "wifi_signal": -45,
            "temperature": {
                "bed": 60.0,
                "nozzle": 210.0
            },
            "print": {
                "progress": 0,
                "state": "IDLE",
                "filename": ""
            },
            "extruder": {
                "length": 0
            },
            "timestamp": datetime.utcnow().isoformat()
        }

    async def start_print(self, file_url: str) -> Dict[str, Any]:
        """Start a print job"""
        if not self.connected:
            return {"success": False, "error": "Not connected"}

        try:
            # In real implementation, this would send MQTT command
            return {"success": True, "message": "Print started"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def pause_print(self) -> Dict[str, Any]:
        """Pause current print"""
        if not self.connected:
            return {"success": False, "error": "Not connected"}

        return {"success": True}

    async def resume_print(self) -> Dict[str, Any]:
        """Resume paused print"""
        if not self.connected:
            return {"success": False, "error": "Not connected"}

        return {"success": True}

    async def stop_print(self) -> Dict[str, Any]:
        """Stop current print"""
        if not self.connected:
            return {"success": False, "error": "Not connected"}

        return {"success": True}

    def subscribe(self, callback: Callable):
        """Subscribe to status updates"""
        self._callbacks.append(callback)

    def unsubscribe(self, callback: Callable):
        """Unsubscribe from status updates"""
        if callback in self._callbacks:
            self._callbacks.remove(callback)

    def _notify_callbacks(self, status: Dict[str, Any]):
        """Notify all subscribers of status change"""
        for callback in self._callbacks:
            try:
                callback(status)
            except Exception:
                pass


# Printer configuration storage
_bambu_printers: Dict[str, Dict[str, Any]] = {}


def add_bambu_printer(
    name: str,
    host: str,
    serial: str,
    access_code: str,
    region: str = "global"
) -> Dict[str, Any]:
    """Add a Bambu Lab printer configuration"""
    config = {
        "name": name,
        "host": host,
        "serial": serial,
        "access_code": access_code,
        "region": region,
        "added_at": datetime.utcnow().isoformat()
    }
    _bambu_printers[name] = config
    return config


def get_bambu_printers() -> List[Dict[str, Any]]:
    """Get all configured Bambu printers"""
    return list(_bambu_printers.values())


def remove_bambu_printer(name: str) -> bool:
    """Remove a Bambu printer"""
    if name in _bambu_printers:
        del _bambu_printers[name]
        return True
    return False
