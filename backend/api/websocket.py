from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import asyncio
import json
from datetime import datetime

from adapters.klipper import KlipperAdapter, AdapterRegistry
from db.session import get_db
from db.models import Printer, PrintJob, JobSnapshot


class ConnectionManager:
    """Manages WebSocket connections for live monitoring"""

    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, printer_id: int):
        """Add a WebSocket connection"""
        await websocket.accept()
        if printer_id not in self.active_connections:
            self.active_connections[printer_id] = []
        self.active_connections[printer_id].append(websocket)

    def disconnect(self, websocket: WebSocket, printer_id: int):
        """Remove a WebSocket connection"""
        if printer_id in self.active_connections:
            if websocket in self.active_connections[printer_id]:
                self.active_connections[printer_id].remove(websocket)
            if not self.active_connections[printer_id]:
                del self.active_connections[printer_id]

    async def send_to_printer(self, printer_id: int, message: dict):
        """Send message to all connections for a printer"""
        if printer_id in self.active_connections:
            for connection in self.active_connections[printer_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending to WebSocket: {e}")


manager = ConnectionManager()


async def handle_printer_websocket(websocket: WebSocket, printer_id: int):
    """
    WebSocket endpoint for live printer monitoring
    """
    await manager.connect(websocket, printer_id)

    # Get printer info
    from sqlalchemy.orm import Session
    session = Session(bind=engine)
    printer = session.get(Printer, printer_id)
    session.close()

    if not printer:
        await websocket.send_json({"error": "Printer not found"})
        await websocket.close()
        return

    # Create adapter and subscribe to status updates
    from utils.security import encryption
    from config import settings

    api_key = encryption.decrypt(printer.api_key) if printer.api_key else None
    adapter = KlipperAdapter(printer.host, printer.port, api_key)
    AdapterRegistry.register(printer_id, adapter)

    async def status_callback(status: dict):
        """Handle status updates"""
        message = {
            "type": "status_update",
            "timestamp": datetime.utcnow().isoformat(),
            "data": status
        }
        await manager.send_to_printer(printer_id, message)

        # Save snapshot to database
        await save_job_snapshot(printer_id, status)

    await adapter.subscribe(status_callback)

    try:
        # Send initial status
        initial_status = await adapter.get_status()
        await websocket.send_json({
            "type": "status_update",
            "timestamp": datetime.utcnow().isoformat(),
            "data": initial_status
        })

        # Keep connection alive
        while True:
            try:
                # Wait for any message from client (ping/pong)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
                message = json.loads(data)

                # Handle commands
                if message.get("type") == "command":
                    command = message.get("command")
                    if command == "pause":
                        await adapter.pause_print()
                    elif command == "resume":
                        await adapter.resume_print()
                    elif command == "cancel":
                        await adapter.cancel_print()

            except asyncio.TimeoutError:
                # Send ping
                await websocket.send_json({"type": "ping"})

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, printer_id)
        AdapterRegistry.unregister(printer_id)


async def save_job_snapshot(printer_id: int, status: dict):
    """Save a job snapshot to database"""
    from sqlalchemy.orm import Session
    from config import engine

    try:
        session = Session(bind=engine)

        # Find active print job
        job = session.query(PrintJob).filter(
            PrintJob.printer_id == printer_id,
            PrintJob.status == "printing"
        ).first()

        if job:
            temps = status.get("temperatures", {})
            layer = status.get("layer", {})

            snapshot = JobSnapshot(
                job_id=job.id,
                progress_percent=status.get("progress", 0),
                layer_current=layer.get("current"),
                layer_total=layer.get("total"),
                nozzle_temp=temps.get("extruder", {}).get("actual"),
                bed_temp=temps.get("heater_bed", {}).get("actual"),
            )

            # Update job as well
            job.progress_percent = status.get("progress", 0)
            job.temperature_nozzle = temps.get("extruder", {}).get("actual")
            job.temperature_bed = temps.get("heater_bed", {}).get("actual")

            session.add(snapshot)
            session.commit()

        session.close()
    except Exception as e:
        print(f"Error saving snapshot: {e}")
