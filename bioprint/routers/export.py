import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from bioprint.config import settings
from bioprint.database import get_session
from bioprint.models.artifact import Artifact, ArtifactKind
from bioprint.models.job import PrintJob, JobStatus
from bioprint.services.export_service import (
    build_regulatory_metadata,
    create_export_zip,
    write_regulatory_metadata,
)

router = APIRouter()


@router.post("/{job_id}/export")
def export_job(job_id: int, session: Session = Depends(get_session)):
    """
    Bundle all artifacts + regulatory metadata JSON into a downloadable zip.
    Returns the zip file directly.
    """
    job = _get_job(job_id, session)

    if not job.compliance_json:
        raise HTTPException(
            status_code=422, detail="Run /validate before exporting."
        )

    geometry = json.loads(job.geometry_json)
    slice_data = json.loads(job.slice_json)
    compliance = json.loads(job.compliance_json)

    # Write regulatory metadata
    meta = build_regulatory_metadata(job_id, job.name, geometry, slice_data, compliance)
    meta_path = settings.artifact_dir / f"job_{job_id}_regulatory_metadata.json"
    write_regulatory_metadata(meta, meta_path)

    reg_artifact = Artifact(
        job_id=job_id,
        kind=ArtifactKind.regulatory_metadata,
        filename=meta_path.name,
        path=str(meta_path),
        mime_type="application/json",
        size_bytes=meta_path.stat().st_size,
    )
    session.add(reg_artifact)
    session.commit()

    # Collect all artifacts for this job
    artifacts = session.exec(select(Artifact).where(Artifact.job_id == job_id)).all()
    artifact_paths = [Path(a.path) for a in artifacts]

    zip_path = settings.artifact_dir / f"job_{job_id}_export.zip"
    size = create_export_zip(artifact_paths, zip_path)

    zip_artifact = Artifact(
        job_id=job_id,
        kind=ArtifactKind.export_zip,
        filename=zip_path.name,
        path=str(zip_path),
        mime_type="application/zip",
        size_bytes=size,
    )
    session.add(zip_artifact)
    job.status = JobStatus.exported
    job.updated_at = datetime.now(timezone.utc)
    session.add(job)
    session.commit()

    return FileResponse(
        path=str(zip_path),
        filename=zip_path.name,
        media_type="application/zip",
    )


@router.get("/{job_id}/artifacts/{filename}")
def download_artifact(job_id: int, filename: str, session: Session = Depends(get_session)):
    """Download a single artifact file by name."""
    _get_job(job_id, session)
    artifact = session.exec(
        select(Artifact)
        .where(Artifact.job_id == job_id)
        .where(Artifact.filename == filename)
    ).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found.")
    path = Path(artifact.path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Artifact file missing from storage.")
    return FileResponse(path=str(path), filename=filename, media_type=artifact.mime_type)


def _get_job(job_id: int, session: Session) -> PrintJob:
    job = session.get(PrintJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job
