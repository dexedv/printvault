from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from pydantic import BaseModel

from db.session import get_db
from db.models import PrintJob, JobSnapshot, Printer, ProjectVersion, PrintProfile, Filament

router = APIRouter(prefix="/jobs", tags=["jobs"])


# Pydantic models for requests
class JobSnapshotCreate(BaseModel):
    job_id: int
    progress_percent: float = 0.0
    layer_current: Optional[int] = None
    layer_total: Optional[int] = None
    nozzle_temp: Optional[float] = None
    bed_temp: Optional[float] = None
    z_position: Optional[float] = None
    extrusion_mm: Optional[float] = None
    speed_percent: Optional[float] = None
    metadata: dict = {}


@router.get("", response_model=List[PrintJob])
def list_jobs(
    skip: int = 0,
    limit: int = 100,
    printer_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all print jobs"""
    query = select(PrintJob)

    if printer_id:
        query = query.where(PrintJob.printer_id == printer_id)

    if status:
        query = query.where(PrintJob.status == status)

    query = query.order_by(PrintJob.created_at.desc()).offset(skip).limit(limit)
    return db.exec(query).all()


@router.get("/{job_id}", response_model=PrintJob)
def get_job(job_id: int, db: Session = Depends(get_db)):
    """Get a single job by ID"""
    job = db.get(PrintJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("", response_model=PrintJob)
def create_job(
    printer_id: int,
    filename: str,
    project_version_id: Optional[int] = None,
    profile_id: Optional[int] = None,
    filament_id: Optional[int] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Create a new print job"""
    # Verify printer exists
    printer = db.get(Printer, printer_id)
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    job = PrintJob(
        printer_id=printer_id,
        project_version_id=project_version_id,
        profile_id=profile_id,
        filament_id=filament_id,
        filename=filename,
        status="pending",
        notes=notes
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.patch("/{job_id}", response_model=PrintJob)
def update_job(
    job_id: int,
    status: Optional[str] = None,
    started_at: Optional[str] = None,
    finished_at: Optional[str] = None,
    duration_seconds: Optional[int] = None,
    layers_completed: Optional[int] = None,
    total_layers: Optional[int] = None,
    progress_percent: Optional[float] = None,
    temperature_nozzle: Optional[float] = None,
    temperature_bed: Optional[float] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update a print job"""
    job = db.get(PrintJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if status is not None:
        job.status = status
        if status == "printing" and not job.started_at:
            job.started_at = datetime.utcnow()
        elif status in ("completed", "failed", "cancelled"):
            job.finished_at = datetime.utcnow()
            if job.started_at:
                job.duration_seconds = int((job.finished_at - job.started_at).total_seconds())

    if started_at is not None:
        job.started_at = datetime.fromisoformat(started_at)
    if finished_at is not None:
        job.finished_at = datetime.fromisoformat(finished_at)
    if duration_seconds is not None:
        job.duration_seconds = duration_seconds
    if layers_completed is not None:
        job.layers_completed = layers_completed
    if total_layers is not None:
        job.total_layers = total_layers
    if progress_percent is not None:
        job.progress_percent = progress_percent
    if temperature_nozzle is not None:
        job.temperature_nozzle = temperature_nozzle
    if temperature_bed is not None:
        job.temperature_bed = temperature_bed
    if notes is not None:
        job.notes = notes

    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    """Delete a print job"""
    job = db.get(PrintJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}


# Job Snapshots
@router.get("/{job_id}/snapshots", response_model=List[JobSnapshot])
def list_job_snapshots(job_id: int, db: Session = Depends(get_db)):
    """Get all snapshots for a job"""
    query = select(JobSnapshot).where(
        JobSnapshot.job_id == job_id
    ).order_by(JobSnapshot.timestamp)
    return db.exec(query).all()


@router.post("/snapshots", response_model=JobSnapshot)
def create_snapshot(
    job_id: int,
    progress_percent: float = 0.0,
    layer_current: Optional[int] = None,
    layer_total: Optional[int] = None,
    nozzle_temp: Optional[float] = None,
    bed_temp: Optional[float] = None,
    z_position: Optional[float] = None,
    extrusion_mm: Optional[float] = None,
    speed_percent: Optional[float] = None,
    metadata: dict = {},
    db: Session = Depends(get_db)
):
    """Create a snapshot for a job"""
    job = db.get(PrintJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    snapshot = JobSnapshot(
        job_id=job_id,
        progress_percent=progress_percent,
        layer_current=layer_current,
        layer_total=layer_total,
        nozzle_temp=nozzle_temp,
        bed_temp=bed_temp,
        z_position=z_position,
        extrusion_mm=extrusion_mm,
        speed_percent=speed_percent,
        extra_data=metadata
    )

    # Also update job with latest values
    job.progress_percent = progress_percent
    if layer_current:
        job.layers_completed = layer_current
    if nozzle_temp:
        job.temperature_nozzle = nozzle_temp
    if bed_temp:
        job.temperature_bed = bed_temp

    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot
