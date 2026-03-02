"""
PrintVault Backend - FastAPI Application
"""
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from pathlib import Path

from config import settings
from db.session import init_db
from api.routes import projects, files, filaments, profiles, printers, jobs, slicing, extensions, system
from api.websocket import handle_printer_websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("Starting PrintVault Backend...")

    # Ensure storage directories exist
    settings.storage_path.mkdir(parents=True, exist_ok=True)
    settings.thumbnails_path.mkdir(parents=True, exist_ok=True)

    # Initialize database
    init_db()
    print("Database initialized")

    yield

    # Shutdown
    print("Shutting down PrintVault Backend...")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="3D Print Management Application",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(projects.router, prefix=settings.api_prefix)
app.include_router(files.router, prefix=settings.api_prefix)
app.include_router(filaments.router, prefix=settings.api_prefix)
app.include_router(profiles.router, prefix=settings.api_prefix)
app.include_router(printers.router, prefix=settings.api_prefix)
app.include_router(jobs.router, prefix=settings.api_prefix)
app.include_router(slicing.router, prefix=settings.api_prefix)
app.include_router(extensions.router, prefix=settings.api_prefix)
app.include_router(system.router, prefix=settings.api_prefix)


# WebSocket endpoint
@app.websocket("/ws/printer/{printer_id}")
async def websocket_endpoint(websocket: WebSocket, printer_id: int):
    await handle_printer_websocket(websocket, printer_id)


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "storage_dir": str(settings.storage_path),
        "storage_exists": settings.storage_path.exists()
    }


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=settings.debug
    )
