from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class ArtifactKind(str, Enum):
    gcode = "gcode"
    report = "report"
    regulatory_metadata = "regulatory_metadata"
    consent = "consent"
    export_zip = "export_zip"


class Artifact(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="printjob.id")
    kind: ArtifactKind
    filename: str
    path: str                              # relative to ARTIFACT_DIR
    mime_type: str = "application/octet-stream"
    size_bytes: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
