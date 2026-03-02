from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session, select
import os
from pathlib import Path

from db.session import get_db
from db.models import File as FileModel
from utils.file_utils import (
    calculate_file_hash, extract_stl_metadata, generate_thumbnail,
    get_file_type, generate_unique_filename, get_file_size_mb
)
from config import settings
from api.routes.license import check_limit

router = APIRouter(prefix="/files", tags=["files"])


@router.get("", response_model=List[FileModel])
def list_files(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    file_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all standalone files"""
    query = select(FileModel)

    if search:
        query = query.where(FileModel.filename.contains(search))

    if file_type:
        query = query.where(FileModel.file_type == file_type)

    query = query.order_by(FileModel.created_at.desc()).offset(skip).limit(limit)
    return db.exec(query).all()


@router.get("/{file_id}", response_model=FileModel)
def get_file(file_id: int, db: Session = Depends(get_db)):
    """Get a single file by ID"""
    file = db.get(FileModel, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return file


@router.post("", response_model=FileModel)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a new file to the library"""
    # Check license limit
    current_count = len(db.exec(select(FileModel)).all())
    limit_check = check_limit("files", current_count)

    if not limit_check.get("allowed"):
        raise HTTPException(
            status_code=403,
            detail=limit_check.get("error", "Limit erreicht")
        )

    file_type = get_file_type(file.filename)
    unique_filename = generate_unique_filename(file.filename, settings.storage_path)
    file_path = settings.storage_path / unique_filename

    # Save file
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Calculate hash and metadata
    file_hash = calculate_file_hash(str(file_path))
    file_size = get_file_size_mb(str(file_path))

    # Check for duplicates
    query = select(FileModel).where(FileModel.file_hash == file_hash)
    existing = db.exec(query).first()
    if existing:
        os.remove(file_path)
        return existing

    metadata = {}
    thumbnail_path = None

    if file_type in ("stl", "3mf"):
        metadata = extract_stl_metadata(str(file_path))
        # Generate thumbnail
        thumb_filename = f"{unique_filename}.png"
        thumbnail_path = str(settings.thumbnails_path / thumb_filename)
        generate_thumbnail(str(file_path), thumbnail_path)

    # Create file record
    file_record = FileModel(
        filename=unique_filename,
        original_name=file.filename,
        file_path=str(file_path),
        file_hash=file_hash,
        file_type=file_type,
        file_size=file_size,
        bounding_box=metadata.get("bounding_box"),
        volume=metadata.get("volume_mm3"),
        triangle_count=metadata.get("triangle_count"),
        thumbnail_path=thumbnail_path,
        extra_data=metadata
    )

    db.add(file_record)
    db.commit()
    db.refresh(file_record)
    return file_record


@router.delete("/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db)):
    """Delete a file"""
    file = db.get(FileModel, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Delete physical file
    if os.path.exists(file.file_path):
        os.remove(file.file_path)
    if file.thumbnail_path and os.path.exists(file.thumbnail_path):
        os.remove(file.thumbnail_path)

    db.delete(file)
    db.commit()
    return {"message": "File deleted successfully"}


@router.get("/{file_id}/download")
def download_file(file_id: int, db: Session = Depends(get_db)):
    """Get file for download"""
    file = db.get(FileModel, file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if not os.path.exists(file.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return {
        "filename": file.original_name,
        "path": file.file_path
    }
