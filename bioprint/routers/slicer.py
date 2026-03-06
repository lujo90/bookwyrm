import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from bioprint.database import get_session
from bioprint.models.job import PrintJob, JobStatus
from bioprint.services.slicer_service import slice_geometry

router = APIRouter()


@router.post("/{job_id}/slice")
def slice_model(
    job_id: int,
    layer_height_mm: float = Query(default=0.2, ge=0.05, le=1.0),
    session: Session = Depends(get_session),
):
    """Slice the geometry into layers. Requires geometry analysis to have run first."""
    job = _get_job(job_id, session)

    if not job.geometry_json:
        raise HTTPException(
            status_code=422, detail="Run /simulate-bounds before slicing."
        )

    geometry = json.loads(job.geometry_json)
    slice_data = slice_geometry(geometry, layer_height_mm=layer_height_mm)

    job.slice_json = json.dumps(slice_data)
    job.status = JobStatus.sliced
    job.updated_at = datetime.now(timezone.utc)
    session.add(job)
    session.commit()

    return {
        "layer_count": slice_data["layer_count"],
        "layer_height_mm": slice_data["layer_height_mm"],
        "message": f"Model sliced into {slice_data['layer_count']} layers.",
    }


def _get_job(job_id: int, session: Session) -> PrintJob:
    job = session.get(PrintJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job
