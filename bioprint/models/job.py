from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class JobStatus(str, Enum):
    created = "created"
    geometry_analysed = "geometry_analysed"
    sliced = "sliced"
    materials_assigned = "materials_assigned"
    validated = "validated"
    gcode_generated = "gcode_generated"
    report_generated = "report_generated"
    exported = "exported"


class PrintJob(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    status: JobStatus = JobStatus.created
    model_filename: Optional[str] = None         # original uploaded STL filename
    model_path: Optional[str] = None             # path on disk / storage key

    # Geometry results (stored as JSON strings — avoids extra tables for MVP)
    geometry_json: Optional[str] = None          # bounds, volume, layer_count, etc.
    slice_json: Optional[str] = None             # layer definitions
    materials_json: Optional[str] = None         # layer → material assignments
    compliance_json: Optional[str] = None        # validation results + consent text

    # Audit
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        # TECH DEBT: geometry/slice/materials/compliance stored as JSON strings.
        # When schemas stabilise, migrate to dedicated tables or a JSONB column (Postgres).
        pass
