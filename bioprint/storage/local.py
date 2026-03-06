"""
Local filesystem artifact storage.

TECH DEBT: This module is the only place that touches the filesystem for artifacts.
To switch to S3, implement the same interface here using boto3 / aioboto3,
controlled by a config flag (STORAGE_BACKEND=s3).
"""
import shutil
from pathlib import Path

from fastapi import UploadFile

from bioprint.config import settings


def save_upload(file: UploadFile, job_id: int, original_name: str) -> Path:
    """Save an uploaded file to the artifact directory and return its path."""
    suffix = Path(original_name).suffix
    dest = settings.artifact_dir / f"job_{job_id}_model{suffix}"
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return dest


def artifact_path(job_id: int, filename: str) -> Path:
    return settings.artifact_dir / filename


def delete_job_artifacts(job_id: int) -> None:
    """Remove all artifacts for a job (for cleanup / GDPR erasure)."""
    for p in settings.artifact_dir.glob(f"job_{job_id}_*"):
        p.unlink(missing_ok=True)
