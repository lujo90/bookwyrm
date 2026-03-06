from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from bioprint.models.job import JobStatus


class JobCreate(BaseModel):
    name: str


class JobRead(BaseModel):
    id: int
    name: str
    status: JobStatus
    model_filename: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
