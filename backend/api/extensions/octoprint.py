"""
OctoPrint Extension - Connect to OctoPrint servers for monitoring and control
"""
import httpx
from typing import Dict, Any, Optional, List
from datetime import datetime


class OctoPrintClient:
    """Client for interacting with OctoPrint API"""

    def __init__(self, host: str, api_key: str, port: int = 80):
        self.host = host.rstrip('/')
        self.port = port
        self.api_key = api_key
        self.base_url = f"{self.host}:{port}/api"
        self.session = httpx.AsyncClient(
            headers={"X-Api-Key": api_key},
            timeout=30.0
        )

    async def get_printer_status(self) -> Dict[str, Any]:
        """Get current printer status"""
        try:
            response = await self.session.get(f"{self.base_url}/printer")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    async def get_job_info(self) -> Dict[str, Any]:
        """Get current job info"""
        try:
            response = await self.session.get(f"{self.base_url}/job")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    async def get_files(self) -> List[Dict[str, Any]]:
        """Get list of files"""
        try:
            response = await self.session.get(f"{self.base_url}/files")
            response.raise_for_status()
            data = response.json()
            return data.get("files", [])
        except Exception as e:
            return [{"error": str(e)}]

    async def start_print(self, file_path: str) -> Dict[str, Any]:
        """Start a print job"""
        try:
            response = await self.session.post(
                f"{self.base_url}/files/{file_path}/print"
            )
            response.raise_for_status()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def pause_print(self) -> Dict[str, Any]:
        """Pause current print"""
        try:
            response = await self.session.post(
                f"{self.base_url}/job/pause",
                json={"action": "pause"}
            )
            response.raise_for_status()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def cancel_print(self) -> Dict[str, Any]:
        """Cancel current print"""
        try:
            response = await self.session.post(
                f"{self.base_url}/job",
                json={"action": "cancel"}
            )
            response.raise_for_status()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def close(self):
        """Close the HTTP session"""
        await self.session.aclose()


# Extension configuration storage
_octoprint_configs: Dict[str, Dict[str, Any]] = {}


def add_octoprint_server(
    name: str,
    host: str,
    api_key: str,
    port: int = 80
) -> Dict[str, Any]:
    """Add an OctoPrint server configuration"""
    config = {
        "name": name,
        "host": host,
        "api_key": api_key,
        "port": port,
        "added_at": datetime.utcnow().isoformat()
    }
    _octoprint_configs[name] = config
    return config


def get_octoprint_servers() -> List[Dict[str, Any]]:
    """Get all configured OctoPrint servers"""
    return list(_octoprint_configs.values())


def remove_octoprint_server(name: str) -> bool:
    """Remove an OctoPrint server"""
    if name in _octoprint_configs:
        del _octoprint_configs[name]
        return True
    return False
