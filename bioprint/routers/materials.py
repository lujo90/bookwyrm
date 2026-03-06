import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from bioprint.database import get_session
from bioprint.models.job import PrintJob, JobStatus
from bioprint.schemas.material import MaterialAssignmentRequest, MaterialCreate, MaterialRead
from bioprint.services.material_service import (
    create_material,
    list_materials,
    seed_materials,
    validate_assignments,
)
from bioprint.services.slicer_service import apply_material_assignments

router = APIRouter()


# ---------------------------------------------------------------------------
# Material library
# ---------------------------------------------------------------------------

@router.get("/materials", response_model=list[MaterialRead], tags=["Materials"])
def get_materials(
    bioink_type: Optional[str] = Query(default=None),
    session: Session = Depends(get_session),
):
    """List all available bioink materials, optionally filtered by type."""
    seed_materials(session)
    return list_materials(session, bioink_type=bioink_type)


@router.post("/materials", response_model=MaterialRead, status_code=201, tags=["Materials"])
def add_material(data: MaterialCreate, session: Session = Depends(get_session)):
    """Add a new material to the library."""
    return create_material(session, data)


# ---------------------------------------------------------------------------
# Per-job material assignment
# ---------------------------------------------------------------------------

@router.post("/{job_id}/materials")
def assign_materials(
    job_id: int,
    body: MaterialAssignmentRequest,
    session: Session = Depends(get_session),
):
    """Assign materials to layers. Requires slicing to have run first."""
    job = _get_job(job_id, session)

    if not job.slice_json:
        raise HTTPException(
            status_code=422, detail="Run /slice before assigning materials."
        )

    assignments = [a.model_dump() for a in body.assignments]
    warnings = validate_assignments(session, assignments)

    slice_data = json.loads(job.slice_json)
    updated_slice = apply_material_assignments(slice_data, assignments)

    job.slice_json = json.dumps(updated_slice)
    job.materials_json = json.dumps(assignments)
    job.status = JobStatus.materials_assigned
    job.updated_at = datetime.now(timezone.utc)
    session.add(job)
    session.commit()

    return {
        "assigned_count": len(assignments),
        "warnings": warnings,
        "message": "Material assignments saved.",
    }


def _get_job(job_id: int, session: Session) -> PrintJob:
    job = session.get(PrintJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job
