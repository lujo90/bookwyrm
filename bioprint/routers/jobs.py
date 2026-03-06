from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select

from bioprint.database import get_session
from bioprint.models.job import PrintJob
from bioprint.schemas.job import JobCreate, JobRead
from bioprint.storage.local import save_upload

router = APIRouter()


@router.post("", response_model=JobRead, status_code=201)
def create_job(
    name: str,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    """Create a new print job and upload the STL model file."""
    if not file.filename.lower().endswith(".stl"):
        raise HTTPException(status_code=422, detail="Only .stl files are accepted.")

    job = PrintJob(name=name)
    session.add(job)
    session.commit()
    session.refresh(job)

    saved_path = save_upload(file, job_id=job.id, original_name=file.filename)
    job.model_filename = file.filename
    job.model_path = str(saved_path)
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


@router.get("", response_model=list[JobRead])
def list_jobs(session: Session = Depends(get_session)):
    return session.exec(select(PrintJob)).all()


@router.get("/{job_id}", response_model=JobRead)
def get_job(job_id: int, session: Session = Depends(get_session)):
    job = session.get(PrintJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job
