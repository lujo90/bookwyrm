import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from bioprint.database import get_session
from bioprint.models.job import PrintJob, JobStatus
from bioprint.schemas.geometry import BoundsResult
from bioprint.services.geometry_service import analyse_stl

router = APIRouter()


@router.post("/{job_id}/simulate-bounds", response_model=BoundsResult)
def simulate_bounds(job_id: int, session: Session = Depends(get_session)):
    """Parse the uploaded STL and compute bounding box, volume, and layer estimate."""
    job = _get_job(job_id, session)

    if not job.model_path:
        raise HTTPException(status_code=422, detail="No model file uploaded for this job.")

    path = Path(job.model_path)
    if not path.exists():
        raise HTTPException(status_code=422, detail="Model file not found on disk.")

    try:
        result = analyse_stl(path)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    job.geometry_json = json.dumps(result.model_dump())
    job.status = JobStatus.geometry_analysed
    job.updated_at = datetime.now(timezone.utc)
    session.add(job)
    session.commit()
    return result


def _get_job(job_id: int, session: Session) -> PrintJob:
    job = session.get(PrintJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job
