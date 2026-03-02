"""
Klipper/Moonraker adapter for PrintVault
Handles communication with Klipper printers via Moonraker API and WebSocket
"""
import json
import asyncio
from typing import Optional, Dict, Any, Callable
from datetime import datetime
import httpx
import websockets
from websockets.exceptions import ConnectionClosed


class MoonrakerClient:
    """HTTP client for Moonraker REST API"""

    def __init__(self, host: str, port: int = 7125, api_key: Optional[str] = None):
        self.host = host
        self.port = port
        self.api_key = api_key
        self.base_url = f"http://{host}:{port}"
        self.headers = {}
        if api_key:
            self.headers["X-API-Key"] = api_key

    async def get(self, endpoint: str) -> Dict[str, Any]:
        """Make GET request to Moonraker"""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.base_url}{endpoint}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()

    async def query_objects(self, objects: list[str]) -> Dict[str, Any]:
        """Query printer objects via Moonraker API"""
        # Moonraker expects objects as query parameters, not in body
        query_params = "&".join(objects)
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.base_url}/printer/objects/query?{query_params}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()

    async def post(self, endpoint: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make POST request to Moonraker"""
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.base_url}{endpoint}",
                json=data,
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()


class KlipperAdapter:
    """
    Adapter for Klipper printers using Moonraker
    Implements the PrinterAdapter interface for future adapter switching
    """

    # Common ports to try for Moonraker
    COMMON_PORTS = [7125, 80, 81, 8080]

    def __init__(self, host: str, port: int = 7125, api_key: Optional[str] = None):
        self.host = host
        self.port = port  # Initial port to try first
        self.api_key = api_key
        self.client = MoonrakerClient(host, port, api_key)
        self.ws_client: Optional[websockets.WebSocketClientProtocol] = None
        self._ws_task: Optional[asyncio.Task] = None
        self._status_callbacks: list[Callable[[Dict], None]] = []

    async def connect(self) -> bool:
        """Test connection to printer - tries multiple ports automatically"""
        # First try the configured port
        ports_to_try = [self.port] + [p for p in self.COMMON_PORTS if p != self.port]

        for try_port in ports_to_try:
            print(f"KlipperAdapter: Trying {self.host}:{try_port}...")
            test_client = MoonrakerClient(self.host, try_port, self.api_key)

            try:
                # Try the new Moonraker API endpoint
                await test_client.query_objects(["print_stats"])
                # Success! Update the port
                self.port = try_port
                self.client = test_client
                print(f"KlipperAdapter: Connected successfully on port {try_port}!")
                return True
            except Exception as e:
                print(f"KlipperAdapter: Port {try_port} failed: {type(e).__name__}")
                continue

        print(f"KlipperAdapter: All ports failed")
        return False

    async def disconnect(self):
        """Disconnect from printer"""
        if self.ws_client:
            await self.ws_client.close()
        if self._ws_task:
            self._ws_task.cancel()
            try:
                await self._ws_task
            except asyncio.CancelledError:
                pass

    async def get_status(self) -> Dict[str, Any]:
        """Get printer status from Moonraker"""
        try:
            # Try new Moonraker API endpoint first
            result = await self.client.query_objects([
                "print_stats",
                "extruder",
                "heater_bed",
                "toolhead",
                "bed_mesh"
            ])
            # Convert to legacy format for backward compatibility
            legacy_format = {"result": {"status": result.get("result", {})}}
            normalized = self._normalize_status(legacy_format)
            return normalized
        except Exception as e:
            # Try other common ports as fallback
            for try_port in self.COMMON_PORTS:
                if try_port == self.port:
                    continue
                print(f"KlipperAdapter: get_status trying port {try_port}...")
                try:
                    test_client = MoonrakerClient(self.host, try_port, self.api_key)
                    result = await test_client.query_objects(["print_stats"])
                    # Success! Update the client
                    self.port = try_port
                    self.client = test_client
                    legacy_format = {"result": {"status": result.get("result", {})}}
                    return self._normalize_status(legacy_format)
                except:
                    continue

            print(f"Failed to get status: {e}")
            raise Exception(f"Failed to connect to printer on any port")

    def _normalize_status(self, status: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize Moonraker status to PrintVault format"""
        normalized = {
            "printer": {
                "state": status.get("result", {}).get("status", {}).get("print_stats", {}).get("state", "unknown"),
                "filename": status.get("result", {}).get("status", {}).get("print_stats", {}).get("filename", ""),
                "total_duration": status.get("result", {}).get("status", {}).get("print_stats", {}).get("total_duration", 0),
                "print_duration": status.get("result", {}).get("status", {}).get("print_stats", {}).get("print_duration", 0),
            },
            "temperatures": {
                "heater_bed": {
                    "actual": status.get("result", {}).get("status", {}).get("heater_bed", {}).get("temperature", 0),
                    "target": status.get("result", {}).get("status", {}).get("heater_bed", {}).get("target", 0),
                },
                "extruder": {
                    "actual": status.get("result", {}).get("status", {}).get("extruder", {}).get("temperature", 0),
                    "target": status.get("result", {}).get("status", {}).get("extruder", {}).get("target", 0),
                }
            },
            "progress": self._calculate_progress(status),
            "layer": {
                "current": status.get("result", {}).get("status", {}).get("print_stats", {}).get("info", {}).get("current_layer", 0),
                "total": status.get("result", {}).get("status", {}).get("print_stats", {}).get("info", {}).get("total_layer", 0),
            }
        }
        return normalized

    def _calculate_progress(self, status: Dict[str, Any]) -> float:
        """Calculate print progress percentage"""
        print_stats = status.get("result", {}).get("status", {}).get("print_stats", {})
        print_duration = print_stats.get("print_duration", 0)
        total_duration = print_stats.get("total_duration", 0)

        if total_duration > 0:
            return min(100, (print_duration / total_duration) * 100)
        return 0

    async def subscribe(self, callback: Callable[[Dict], None]):
        """Subscribe to printer status updates via WebSocket"""
        self._status_callbacks.append(callback)

        # Start WebSocket connection if not already running
        if not self._ws_task or self._ws_task.done():
            self._ws_task = asyncio.create_task(self._ws_loop())

    async def _ws_loop(self):
        """WebSocket connection loop"""
        ws_url = f"ws://{self.host}:{self.port}/websocket"

        headers = {}
        if self.api_key:
            headers["X-API-Key"] = self.api_key

        try:
            async with websockets.connect(ws_url, extra_headers=headers) as ws:
                self.ws_client = ws

                # Subscribe to status updates
                await ws.send(json.dumps({
                    "jsonrpc": "2.0",
                    "method": "subscribe_objects",
                    "params": {"objects": ["print_stats", "extruder", "heater_bed"]},
                    "id": 1
                }))

                # Listen for messages
                async for message in ws:
                    try:
                        data = json.loads(message)
                        if "method" in data and "params" in data:
                            params = data["params"]
                            if "objects" in params:
                                normalized = self._normalize_status(params)
                                for callback in self._status_callbacks:
                                    try:
                                        callback(normalized)
                                    except Exception as e:
                                        print(f"Callback error: {e}")
                    except json.JSONDecodeError:
                        continue

        except ConnectionClosed as e:
            print(f"WebSocket closed: {e}")
            # Try to reconnect after delay
            await asyncio.sleep(5)
            if self._status_callbacks:
                self._ws_task = asyncio.create_task(self._ws_loop())
        except Exception as e:
            print(f"WebSocket error: {e}")

    async def start_print(self, filename: str) -> bool:
        """Start a print job"""
        try:
            await self.client.post("/api/files/local", {"action": "start"})
            return True
        except Exception as e:
            print(f"Start print failed: {e}")
            return False

    async def pause_print(self):
        """Pause current print"""
        try:
            await self.client.post("/api/print/pause", {})
            return True
        except Exception:
            return False

    async def resume_print(self):
        """Resume paused print"""
        try:
            await self.client.post("/api/print/resume", {})
            return True
        except Exception:
            return False

    async def cancel_print(self):
        """Cancel current print"""
        try:
            await self.client.post("/api/print/cancel", {})
            return True
        except Exception:
            return False


# Registry for managing active adapters
class AdapterRegistry:
    """Registry for managing printer adapters"""

    _adapters: Dict[int, KlipperAdapter] = {}

    @classmethod
    def register(cls, printer_id: int, adapter: KlipperAdapter):
        cls._adapters[printer_id] = adapter

    @classmethod
    def get(cls, printer_id: int) -> Optional[KlipperAdapter]:
        return cls._adapters.get(printer_id)

    @classmethod
    def unregister(cls, printer_id: int):
        if printer_id in cls._adapters:
            adapter = cls._adapters[printer_id]
            asyncio.create_task(adapter.disconnect())
            del cls._adapters[printer_id]
