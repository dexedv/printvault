"""
Printer Adapter Interface
Defines the contract for printer adapters to support multiple printer types
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Callable, Optional


class PrinterAdapter(ABC):
    """Abstract base class for printer adapters"""

    @abstractmethod
    async def connect(self) -> bool:
        """Test connection to printer"""
        pass

    @abstractmethod
    async def disconnect(self):
        """Disconnect from printer"""
        pass

    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        """Get printer status"""
        pass

    @abstractmethod
    async def subscribe(self, callback: Callable[[Dict], None]):
        """Subscribe to status updates"""
        pass

    @abstractmethod
    async def start_print(self, filename: str) -> bool:
        """Start a print job"""
        pass

    @abstractmethod
    async def pause_print(self) -> bool:
        """Pause current print"""
        pass

    @abstractmethod
    async def resume_print(self) -> bool:
        """Resume paused print"""
        pass

    @abstractmethod
    async def cancel_print(self) -> bool:
        """Cancel current print"""
        pass
