import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from bioprint.config import settings
from bioprint.database import get_session
from bioprint.models.artifact import Artifact, ArtifactKind
from bioprint.models.job import PrintJob, JobStatus
from bioprint.schemas.gcode import GcodeResult
from bioprint.services.gcode_service import generate_gcode

router = APIRouter()


@router.post("/{job_id}/gcode", response_model=GcodeResult)
def create_gcode(job_id: int, session: Session = Depends(get_session)):
    """Generate G-code from the sliced and material-assigned job."""
    job = _get_job(job_id, session)

    if not job.slice_json:
        raise HTTPException(status_code=422, detail="Run /slice before generating G-code.")

    slice_data = json.loads(job.slice_json)
    output_path = settings.artifact_dir / f"job_{job_id}.gcode"

    meta = generate_gcode(slice_data, output_path)

    # Record artifact
    artifact = Artifact(
        job_id=job_id,
        kind=ArtifactKind.gcode,
        filename=output_path.name,
        path=str(output_path),
        mime_type="text/x-gcode",
        size_bytes=output_path.stat().st_size,
    )
    session.add(artifact)
    job.status = JobStatus.gcode_generated
    job.updated_at = datetime.now(timezone.utc)
    session.add(job)
    session.commit()

    return GcodeResult(**meta)


def _get_job(job_id: int, session: Session) -> PrintJob:
    job = session.get(PrintJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job
