from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, JSON, Column, ForeignKey, func
from sqlalchemy import String, Boolean, DateTime


# Projects
class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    description: Optional[str] = None
    tags: list[str] = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column=Column(DateTime, onupdate=func.now()))


# Project Versions
class ProjectVersion(SQLModel, table=True):
    __tablename__ = "project_versions"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="projects.id", ondelete="CASCADE")
    version: int = Field(default=1)
    file_path: str
    file_hash: str = Field(max_length=64)
    file_type: str = Field(max_length=20)  # stl, 3mf, gcode, step
    file_size: int
    bounding_box: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    volume: Optional[float] = None
    triangle_count: Optional[int] = None
    thumbnail_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Files (standalone files not attached to projects)
class File(SQLModel, table=True):
    __tablename__ = "files"

    id: Optional[int] = Field(default=None, primary_key=True)
    project_version_id: Optional[int] = Field(default=None, foreign_key="project_versions.id", ondelete="SET NULL")
    filename: str
    original_name: str
    file_path: str
    file_hash: str = Field(max_length=64)
    file_type: str = Field(max_length=20)
    file_size: int
    bounding_box: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    volume: Optional[float] = None
    triangle_count: Optional[int] = None
    thumbnail_path: Optional[str] = None
    extra_data: dict = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Print Profiles
class PrintProfile(SQLModel, table=True):
    __tablename__ = "print_profiles"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    nozzle_temp: int = Field(default=200)
    bed_temp: int = Field(default=60)
    layer_height: float = Field(default=0.2)
    print_speed: int = Field(default=50)
    infill: int = Field(default=20)
    material: str = Field(default="PLA")
    notes: Optional[str] = None
    is_default: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Filaments
class Filament(SQLModel, table=True):
    __tablename__ = "filaments"

    id: Optional[int] = Field(default=None, primary_key=True)
    material: str = Field(max_length=50)
    color_name: str = Field(max_length=100)
    color_hex: str = Field(max_length=7, default="#FFFFFF")
    vendor: Optional[str] = Field(default=None, max_length=255)
    total_weight_kg: float = Field(default=1.0)
    remaining_weight_kg: float = Field(default=1.0)
    spool_cost: Optional[float] = None
    purchase_date: Optional[datetime] = None
    location: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = None
    low_stock_threshold: float = Field(default=0.1)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Printers
class Printer(SQLModel, table=True):
    __tablename__ = "printers"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    printer_type: str = Field(default="klipper", max_length=50)  # klipper, bambulab, octoprint
    host: str = Field(max_length=255)
    port: int = Field(default=7125)
    api_key: Optional[str] = Field(default=None, max_length=255)
    is_active: bool = Field(default=True)
    last_connected: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Print Jobs
class PrintJob(SQLModel, table=True):
    __tablename__ = "print_jobs"

    id: Optional[int] = Field(default=None, primary_key=True)
    printer_id: int = Field(foreign_key="printers.id", ondelete="CASCADE")
    project_version_id: Optional[int] = Field(default=None, foreign_key="project_versions.id", ondelete="SET NULL")
    profile_id: Optional[int] = Field(default=None, foreign_key="print_profiles.id", ondelete="SET NULL")
    filament_id: Optional[int] = Field(default=None, foreign_key="filaments.id", ondelete="SET NULL")
    filename: str
    status: str = Field(default="pending", max_length=20)  # pending, printing, paused, completed, failed, cancelled
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    layers_completed: Optional[int] = None
    total_layers: Optional[int] = None
    progress_percent: float = Field(default=0.0)
    temperature_nozzle: Optional[float] = None
    temperature_bed: Optional[float] = None
    notes: Optional[str] = None
    extra_data: dict = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Job Snapshots (for historical data)
class JobSnapshot(SQLModel, table=True):
    __tablename__ = "job_snapshots"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="print_jobs.id", ondelete="CASCADE")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    progress_percent: float = Field(default=0.0)
    layer_current: Optional[int] = None
    layer_total: Optional[int] = None
    nozzle_temp: Optional[float] = None
    bed_temp: Optional[float] = None
    z_position: Optional[float] = None
    extrusion_mm: Optional[float] = None
    speed_percent: Optional[float] = None
    extra_data: dict = Field(default={}, sa_column=Column(JSON))
