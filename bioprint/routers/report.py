import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from bioprint.config import settings
from bioprint.database import get_session
from bioprint.models.artifact import Artifact, ArtifactKind
from bioprint.models.job import PrintJob, JobStatus
from bioprint.services.report_service import generate_report

router = APIRouter()


@router.post("/{job_id}/report")
def create_report(job_id: int, session: Session = Depends(get_session)):
    """Generate an HTML technical report for the job."""
    job = _get_job(job_id, session)

    if not job.compliance_json:
        raise HTTPException(
            status_code=422,
            detail="Run /validate before generating the report.",
        )

    geometry = json.loads(job.geometry_json)
    slice_data = json.loads(job.slice_json)
    compliance = json.loads(job.compliance_json)

    # Grab G-code artifact metadata if available
    gcode_meta = None
    gcode_artifact = session.exec(
        select(Artifact)
        .where(Artifact.job_id == job_id)
        .where(Artifact.kind == ArtifactKind.gcode)
    ).first()
    if gcode_artifact:
        gcode_meta = {
            "artifact_filename": gcode_artifact.filename,
            "line_count": "—",
            "estimated_print_time_s": "—",
        }

    output_path = settings.artifact_dir / f"job_{job_id}_report.html"
    filename = generate_report(
        job_id=job_id,
        job_name=job.name,
        geometry=geometry,
        slice_data=slice_data,
        compliance=compliance,
        gcode_meta=gcode_meta,
        output_path=output_path,
    )

    artifact = Artifact(
        job_id=job_id,
        kind=ArtifactKind.report,
        filename=filename,
        path=str(output_path),
        mime_type="text/html",
        size_bytes=output_path.stat().st_size,
    )
    session.add(artifact)
    job.status = JobStatus.report_generated
    job.updated_at = datetime.now(timezone.utc)
    session.add(job)
    session.commit()

    return {"report_filename": filename, "message": "Report generated."}


def _get_job(job_id: int, session: Session) -> PrintJob:
    job = session.get(PrintJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job
