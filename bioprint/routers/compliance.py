import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from bioprint.database import get_session
from bioprint.models.job import PrintJob, JobStatus
from bioprint.schemas.compliance import ConsentSummary, ValidationResult
from bioprint.services.compliance_service import generate_consent_summary, validate_job

router = APIRouter()


@router.post("/{job_id}/validate", response_model=ValidationResult)
def validate(job_id: int, session: Session = Depends(get_session)):
    """Run EU ATMP compliance checks against the current job state."""
    job = _get_job(job_id, session)

    if not job.geometry_json or not job.slice_json:
        raise HTTPException(
            status_code=422,
            detail="Complete geometry analysis and slicing before validation.",
        )

    geometry = json.loads(job.geometry_json)
    slice_data = json.loads(job.slice_json)
    result = validate_job(job.name, geometry, slice_data, job.materials_json)

    job.compliance_json = json.dumps(result.model_dump())
    job.status = JobStatus.validated
    job.updated_at = datetime.now(timezone.utc)
    session.add(job)
    session.commit()
    return result


@router.get("/{job_id}/consent", response_model=ConsentSummary)
def get_consent(job_id: int, session: Session = Depends(get_session)):
    """Generate a consent document template for this job."""
    job = _get_job(job_id, session)
    return generate_consent_summary(job.id, job.name)


def _get_job(job_id: int, session: Session) -> PrintJob:
    job = session.get(PrintJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job
