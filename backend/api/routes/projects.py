from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as UploadFileType, Form
from pydantic import BaseModel
from sqlmodel import Session, select, func
from datetime import datetime

from db.session import get_db
from db.models import Project, ProjectVersion, File as FileModel
from utils.file_utils import (
    calculate_file_hash, extract_stl_metadata, generate_thumbnail,
    get_file_type, generate_unique_filename, get_file_size_mb
)
from config import settings
from api.routes.license import check_limit

router = APIRouter(prefix="/projects", tags=["projects"])


# Pydantic models for request bodies
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tags: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None


# Project CRUD
@router.get("", response_model=List[Project])
def list_projects(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all projects with optional search"""
    query = select(Project)

    if search:
        query = query.where(
            (Project.name.contains(search)) |
            (Project.description.contains(search))
        )

    query = query.order_by(Project.updated_at.desc()).offset(skip).limit(limit)
    return db.exec(query).all()


@router.get("/{project_id}", response_model=Project)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Get a single project by ID"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("", response_model=Project)
def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db)
):
    """Create a new project"""
    # Check license limit
    current_count = len(db.exec(select(Project)).all())
    limit_check = check_limit("projects", current_count)

    if not limit_check.get("allowed"):
        raise HTTPException(
            status_code=403,
            detail=limit_check.get("error", "Limit erreicht")
        )

    tags_list = []
    if project_data.tags:
        tags_list = [t.strip() for t in project_data.tags.split(",") if t.strip()]

    project = Project(
        name=project_data.name,
        description=project_data.description,
        tags=tags_list
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=Project)
def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db)
):
    """Update a project"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description
    if project_data.tags is not None:
        project.tags = [t.strip() for t in tags.split(",") if t.strip()]

    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    """Delete a project"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}


# Project Versions
@router.get("/{project_id}/versions", response_model=List[ProjectVersion])
def list_project_versions(project_id: int, db: Session = Depends(get_db)):
    """List all versions of a project"""
    query = select(ProjectVersion).where(
        ProjectVersion.project_id == project_id
    ).order_by(ProjectVersion.version.desc())
    return db.exec(query).all()


@router.post("/{project_id}/versions", response_model=ProjectVersion)
async def upload_version(
    project_id: int,
    file: UploadFile = UploadFileType(...),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a new version to a project"""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get next version number
    query = select(func.max(ProjectVersion.version)).where(
        ProjectVersion.project_id == project_id
    )
    max_version = db.exec(query).first() or 0

    # Save file
    file_type = get_file_type(file.filename)
    unique_filename = generate_unique_filename(file.filename, settings.storage_path)
    file_path = settings.storage_path / unique_filename

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Calculate hash and metadata
    file_hash = calculate_file_hash(str(file_path))
    file_size = get_file_size_mb(str(file_path))

    metadata = {}
    thumbnail_path = None

    if file_type in ("stl", "3mf"):
        metadata = extract_stl_metadata(str(file_path))
        # Generate thumbnail
        thumb_filename = f"{unique_filename}.png"
        thumbnail_path = str(settings.thumbnails_path / thumb_filename)
        generate_thumbnail(str(file_path), thumbnail_path)

    # Create version
    version = ProjectVersion(
        project_id=project_id,
        version=max_version + 1,
        file_path=str(file_path),
        file_hash=file_hash,
        file_type=file_type,
        file_size=file_size,
        bounding_box=metadata.get("bounding_box"),
        volume=metadata.get("volume_mm3"),
        triangle_count=metadata.get("triangle_count"),
        thumbnail_path=thumbnail_path,
        notes=notes
    )

    db.add(version)
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(version)
    return version


@router.delete("/versions/{version_id}")
def delete_version(version_id: int, db: Session = Depends(get_db)):
    """Delete a project version"""
    version = db.get(ProjectVersion, version_id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Delete files
    import os
    if os.path.exists(version.file_path):
        os.remove(version.file_path)
    if version.thumbnail_path and os.path.exists(version.thumbnail_path):
        os.remove(version.thumbnail_path)

    db.delete(version)
    db.commit()
    return {"message": "Version deleted successfully"}
